import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { logAdminAction } from "@/lib/auditLog";
import { departmentUpdateSchema } from "@/lib/departmentSchemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = departmentUpdateSchema.safeParse(json);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json(
      { error: parsed.success ? "Không có thông tin cần cập nhật." : parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  try {
    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    await logAdminAction({
      actor: admin.username,
      action: "UPDATE_DEPARTMENT",
      targetType: "Department",
      targetId: department.id,
      detail: data,
    });
    return NextResponse.json({ department });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Mã hoặc tên phòng ban đã tồn tại." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy phòng ban." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({ where: { id } });
      if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
      const assignedCount = await tx.employee.count({ where: { departmentId: id } });
      if (assignedCount > 0) throw new Error("DEPARTMENT_IN_USE");
      await tx.department.delete({ where: { id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEPARTMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy phòng ban." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "DEPARTMENT_IN_USE") {
      return NextResponse.json(
        { error: "Phòng ban đang có nhân viên. Hãy chuyển nhân viên hoặc ngừng hoạt động phòng ban." },
        { status: 409 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Phòng ban vừa được gán cho nhân viên và không thể xóa." },
        { status: 409 }
      );
    }
    throw error;
  }

  await logAdminAction({
    actor: admin.username,
    action: "DELETE_DEPARTMENT",
    targetType: "Department",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
