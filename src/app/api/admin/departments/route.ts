import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { logAdminAction } from "@/lib/auditLog";
import { departmentCreateSchema } from "@/lib/departmentSchemas";

export async function GET() {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const departments = await prisma.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { employees: true } } },
  });
  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const json = await req.json().catch(() => null);
  const parsed = departmentCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code || null,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    await logAdminAction({
      actor: admin.username,
      action: "CREATE_DEPARTMENT",
      targetType: "Department",
      targetId: department.id,
      detail: { name: department.name, code: department.code },
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Mã hoặc tên phòng ban đã tồn tại." }, { status: 409 });
    }
    throw error;
  }
}
