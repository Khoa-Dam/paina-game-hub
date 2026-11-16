import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { employeeUpsertSchema } from "@/lib/validators";
import { logAdminAction } from "@/lib/auditLog";

export async function GET() {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const employees = await prisma.employee.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const json = await req.json().catch(() => null);
  const parsed = employeeUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.employee.findUnique({ where: { employeeCode: data.employeeCode } });
  if (existing) {
    return NextResponse.json({ error: "Mã nhân viên đã tồn tại." }, { status: 409 });
  }

  const employee = await prisma.employee.create({
    data: {
      employeeCode: data.employeeCode,
      fullName: data.fullName,
      email: data.email || null,
      department: data.department || null,
      status: data.status,
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "CREATE_EMPLOYEE",
    targetType: "Employee",
    targetId: employee.id,
  });

  return NextResponse.json({ employee }, { status: 201 });
}
