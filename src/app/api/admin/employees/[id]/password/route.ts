import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { logAdminAction } from "@/lib/auditLog";
import { adminEmployeePasswordSchema } from "@/lib/validators";
import { employeePasswordError } from "@/lib/passwordPolicy";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const { id } = await params;
  const parsed = adminEmployeePasswordSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Mật khẩu mới phải có ít nhất 10 ký tự và không quá 72 ký tự." },
      { status: 400 },
    );
  }

  const passwordError = employeePasswordError(parsed.data.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Không tìm thấy nhân viên." },
      { status: 404 },
    );
  }
  if (employee.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Chỉ có thể đặt lại mật khẩu cho tài khoản đang hoạt động." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { passwordHash } }),
    prisma.employeePasswordSetup.deleteMany({ where: { employeeId: id } }),
  ]);
  await logAdminAction({
    actor: admin.username,
    action: "ADMIN_SET_EMPLOYEE_PASSWORD",
    targetType: "Employee",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
