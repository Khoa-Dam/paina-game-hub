import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!employee)
    return NextResponse.json(
      { error: "Không tìm thấy nhân viên." },
      { status: 404 },
    );
  if (employee.status !== "ACTIVE")
    return NextResponse.json(
      { error: "Mở khóa tài khoản trước khi cấp link đặt mật khẩu." },
      { status: 409 },
    );

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.employeePasswordSetup.deleteMany({
      where: { employeeId: id, usedAt: null },
    });
    await tx.employeePasswordSetup.create({
      data: { employeeId: id, tokenHash, expiresAt },
    });
  });
  await logAdminAction({
    actor: admin.username,
    action: "ISSUE_EMPLOYEE_PASSWORD_SETUP",
    targetType: "Employee",
    targetId: id,
  });

  const origin = new URL(_req.url).origin;
  return NextResponse.json({
    url: `${origin}/set-password/${token}`,
    expiresAt,
  });
}
