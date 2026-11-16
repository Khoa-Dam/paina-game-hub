import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { sessionId } = await params;

  const result = await prisma.gameResult.findUnique({
    where: { sessionId },
    include: { game: { select: { title: true, pointsPerQuestion: true } } },
  });
  if (!result || result.employeeId !== employee.id) {
    return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
  }

  return NextResponse.json({ result });
}
