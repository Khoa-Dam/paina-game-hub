import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { buildClientQuestion } from "@/lib/gameEngine";
import { z } from "zod";

const schema = z.object({ gameId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu gameId." }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: parsed.data.gameId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!game) return NextResponse.json({ error: "Không tìm thấy game." }, { status: 404 });

  const now = new Date();
  const withinWindow = (!game.startAt || game.startAt <= now) && (!game.endAt || game.endAt >= now);
  if (game.status !== "ACTIVE" || !withinWindow) {
    return NextResponse.json({ error: "Game hiện không mở để chơi." }, { status: 409 });
  }

  const [existingInProgress, playsUsed] = await Promise.all([
    prisma.gameSession.findFirst({
      where: { gameId: game.id, employeeId: employee.id, status: "IN_PROGRESS" },
    }),
    prisma.gameResult.count({
      where: { gameId: game.id, employeeId: employee.id },
    }),
  ]);
  if (existingInProgress) {
    return NextResponse.json({ error: "Bạn đang có một lượt chơi chưa hoàn thành." }, { status: 409 });
  }
  if (playsUsed >= game.maxPlaysPerUser) {
    return NextResponse.json({ error: "Bạn đã dùng hết số lượt chơi cho game này." }, { status: 409 });
  }
  if (game.questions.length === 0) {
    return NextResponse.json({ error: "Game chưa có câu hỏi." }, { status: 422 });
  }

  const session = await prisma.gameSession.create({
    data: { gameId: game.id, employeeId: employee.id },
  });

  const questions = game.questions.map((q) =>
    buildClientQuestion(q, game.type, q.correctJson, session.id, false)
  );

  return NextResponse.json({
    sessionId: session.id,
    durationSeconds: game.durationSeconds,
    gameType: game.type,
    questions,
  });
}
