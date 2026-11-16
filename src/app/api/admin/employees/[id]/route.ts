import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { employeeUpsertSchema } from "@/lib/validators";
import { logAdminAction } from "@/lib/auditLog";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = employeeUpsertSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(data.employeeCode !== undefined ? { employeeCode: data.employeeCode } : {}),
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.department !== undefined ? { department: data.department || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "UPDATE_EMPLOYEE",
    targetType: "Employee",
    targetId: employee.id,
  });

  return NextResponse.json({ employee });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  await prisma.employee.delete({ where: { id } });

  await logAdminAction({
    actor: admin.username,
    action: "DELETE_EMPLOYEE",
    targetType: "Employee",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
