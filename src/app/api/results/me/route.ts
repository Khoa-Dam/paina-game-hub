import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";

export async function GET() {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;

  const results = await prisma.gameResult.findMany({
    where: { employeeId: employee.id },
    orderBy: { playedAt: "desc" },
    include: { game: { select: { title: true, slug: true, type: true } } },
  });

  return NextResponse.json({ results });
}
