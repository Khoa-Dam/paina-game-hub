import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function GET(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const gameId = req.nextUrl.searchParams.get("gameId") || undefined;

  const results = await prisma.gameResult.findMany({
    where: gameId ? { gameId } : undefined,
    orderBy: { playedAt: "desc" },
    include: {
      employee: {
        select: {
          fullName: true,
          employeeCode: true,
          legacyDepartment: true,
          departmentInfo: { select: { name: true } },
        },
      },
      game: { select: { title: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    results: results.map((result) => ({
      ...result,
      employee: {
        ...result.employee,
        department: result.employee.departmentInfo?.name ?? result.employee.legacyDepartment,
      },
    })),
  });
}
