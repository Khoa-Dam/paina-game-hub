import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { employeeRegistrationSchema } from "@/lib/validators";
import { employeePasswordError } from "@/lib/passwordPolicy";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const POST = withApiErrorHandling(async function POST(req: NextRequest) {
  const parsed = employeeRegistrationSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Thông tin đăng ký không hợp lệ." },
      { status: 400 },
    );
  const {
    employeeCode,
    fullName,
    departmentId,
    password,
    passwordConfirmation,
  } = parsed.data;

  const passwordError = employeePasswordError(password);
  if (passwordError)
    return NextResponse.json({ error: passwordError }, { status: 400 });
  if (password !== passwordConfirmation) {
    return NextResponse.json(
      { error: "Mật khẩu xác nhận không khớp." },
      { status: 400 },
    );
  }

  const existing = await prisma.employee.findUnique({
    where: { employeeCode },
    select: { id: true, passwordHash: true, status: true },
  });
  if (existing?.passwordHash)
    return NextResponse.json(
      {
        error:
          "Mã nhân viên đã có tài khoản. Hãy đăng nhập hoặc liên hệ Admin để đặt lại mật khẩu.",
      },
      { status: 409 },
    );
  if (existing && existing.status !== "ACTIVE")
    return NextResponse.json(
      { error: "Tài khoản hiện không thể đăng ký. Vui lòng liên hệ Admin." },
      { status: 409 },
    );

  const department = await prisma.department.findFirst({
    where: { id: departmentId, isActive: true },
    select: { id: true },
  });
  if (!department)
    return NextResponse.json(
      { error: "Phòng ban không hợp lệ hoặc đã ngừng hoạt động." },
      { status: 400 },
    );

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    if (existing) {
      const claimed = await prisma.employee.updateMany({
        where: { id: existing.id, passwordHash: null, status: "ACTIVE" },
        data: {
          fullName,
          departmentId: department.id,
          passwordHash,
          status: "PENDING",
        },
      });
      if (claimed.count !== 1) {
        return NextResponse.json(
          {
            error:
              "Tài khoản đã được đăng ký. Hãy đăng nhập hoặc liên hệ Admin để đặt lại mật khẩu.",
          },
          { status: 409 },
        );
      }
    } else {
      await prisma.employee.create({
        data: {
          employeeCode,
          fullName,
          departmentId: department.id,
          passwordHash,
          status: "PENDING",
        },
      });
    }
    return NextResponse.json({ status: "PENDING" }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Mã nhân viên đã được đăng ký. Vui lòng đăng nhập hoặc liên hệ Admin.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
});
