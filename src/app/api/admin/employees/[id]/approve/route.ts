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
  const result = await prisma.employee.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "ACTIVE" },
  });
  if (result.count !== 1) {
    return NextResponse.json(
      { error: "Không tìm thấy yêu cầu đăng ký đang chờ duyệt." },
      { status: 409 },
    );
  }

  await logAdminAction({
    actor: admin.username,
    action: "APPROVE_EMPLOYEE_REGISTRATION",
    targetType: "Employee",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
