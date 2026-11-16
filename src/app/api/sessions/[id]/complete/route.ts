import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { speedBonus } from "@/lib/scoring";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { id } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: { game: true, answers: true },
  });
  if (!session || session.employeeId !== employee.id) {
    return NextResponse.json({ error: "Phiên chơi không hợp lệ." }, { status: 404 });
  }
  if (session.status === "COMPLETED") {
    const existingResult = await prisma.gameResult.findUnique({ where: { sessionId: session.id } });
    return NextResponse.json({ result: existingResult });
  }

  const completionTimeSeconds = Math.max(
    0,
    Math.round((Date.now() - session.startedAt.getTime()) / 1000)
  );
  const correctCount = session.answers.filter((a) => a.isCorrect).length;
  const wrongCount = session.answers.length - correctCount;
  const answerPoints = session.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
  const bonus = speedBonus({ game: session.game, correctCount, completionTimeSeconds });
  const totalScore = answerPoints + bonus;

  const result = await prisma.$transaction(async (tx) => {
    await tx.gameSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return tx.gameResult.create({
      data: {
        sessionId: session.id,
        gameId: session.gameId,
        employeeId: session.employeeId,
        totalScore,
        correctCount,
        wrongCount,
        completionTimeSeconds,
      },
    });
  });

  return NextResponse.json({ result });
}
