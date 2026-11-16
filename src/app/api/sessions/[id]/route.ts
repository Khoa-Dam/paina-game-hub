import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { buildClientQuestion } from "@/lib/gameEngine";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { id } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      game: { include: { questions: { orderBy: { order: "asc" } } } },
      answers: true,
    },
  });
  if (!session || session.employeeId !== employee.id) {
    return NextResponse.json({ error: "Không tìm thấy phiên chơi." }, { status: 404 });
  }

  const answeredIds = new Set(session.answers.map((a) => a.questionId));

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt,
    durationSeconds: session.game.durationSeconds,
    gameType: session.game.type,
    gameTitle: session.game.title,
    questions: session.game.questions.map((q) =>
      buildClientQuestion(q, session.game.type, q.correctJson, session.id, answeredIds.has(q.id))
    ),
  });
}
