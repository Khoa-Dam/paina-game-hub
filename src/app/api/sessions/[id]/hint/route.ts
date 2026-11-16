import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { id } = await params;

  const questionId = req.nextUrl.searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ error: "Thiếu questionId." }, { status: 400 });

  const session = await prisma.gameSession.findUnique({ where: { id } });
  if (!session || session.employeeId !== employee.id || session.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Phiên chơi không hợp lệ." }, { status: 404 });
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, gameId: session.gameId },
  });
  if (!question) return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });

  return NextResponse.json({ hint: question.hint || null });
}
