import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setEmployeeSession } from "@/lib/session";
import { employeeLoginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const parsed = employeeLoginSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Thông tin đăng nhập không hợp lệ." },
      { status: 400 },
    );

  const employee = await prisma.employee.findUnique({
    where: { employeeCode: parsed.data.employeeCode },
    select: { id: true, fullName: true, status: true, passwordHash: true },
  });
  if (
    !employee?.passwordHash ||
    !(await bcrypt.compare(parsed.data.password, employee.passwordHash))
  ) {
    return NextResponse.json(
      { error: "Mã nhân viên hoặc mật khẩu không đúng." },
      { status: 401 },
    );
  }
  if (employee.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Tài khoản hiện không hoạt động. Vui lòng liên hệ Admin." },
      { status: 403 },
    );
  }

  await setEmployeeSession(employee.id);
  return NextResponse.json({
    employee: { id: employee.id, fullName: employee.fullName },
  });
}
