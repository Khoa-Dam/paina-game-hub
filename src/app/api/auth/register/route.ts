import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setEmployeeSession } from "@/lib/session";
import { employeeRegistrationSchema } from "@/lib/validators";
import { employeePasswordError } from "@/lib/passwordPolicy";

export async function POST(req: NextRequest) {
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
    select: { id: true },
  });
  if (existing)
    return NextResponse.json(
      {
        error:
          "Mã nhân viên đã có tài khoản. Hãy đăng nhập hoặc liên hệ Admin.",
      },
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
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        departmentId: department.id,
        passwordHash,
        status: "ACTIVE",
      },
      select: { id: true, fullName: true },
    });
    await setEmployeeSession(employee.id);
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Mã nhân viên đã có tài khoản. Hãy đăng nhập." },
        { status: 409 },
      );
    }
    throw error;
  }
}
