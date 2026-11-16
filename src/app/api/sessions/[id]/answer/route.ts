import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { answerSubmitSchema } from "@/lib/validators";
import { scoreAnswer } from "@/lib/scoring";
import { normalizeAnswer } from "@/lib/gameEngine";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const POST = withApiErrorHandling(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = answerSubmitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: { game: true },
  });
  if (
    !session ||
    session.employeeId !== employee.id ||
    session.status !== "IN_PROGRESS"
  ) {
    return NextResponse.json(
      { error: "Phiên chơi không hợp lệ." },
      { status: 404 },
    );
  }

  const question = await prisma.question.findFirst({
    where: { id: parsed.data.questionId, gameId: session.gameId },
  });
  if (!question)
    return NextResponse.json(
      { error: "Không tìm thấy câu hỏi." },
      { status: 404 },
    );

  const alreadyAnswered = await prisma.answer.findUnique({
    where: {
      sessionId_questionId: { sessionId: session.id, questionId: question.id },
    },
  });
  if (alreadyAnswered) {
    return NextResponse.json(
      { error: "Câu hỏi này đã được trả lời." },
      { status: 409 },
    );
  }

  let isCorrect = false;
  let selectedJson: string;
  let feedback: Record<string, unknown> = {};

  if (session.game.type === "QUIZ" || session.game.type === "TRUE_FALSE") {
    if (parsed.data.selectedIndex === undefined) {
      return NextResponse.json({ error: "Thiếu lựa chọn." }, { status: 400 });
    }
    const correctIndex = JSON.parse(question.correctJson) as number;
    isCorrect = correctIndex === parsed.data.selectedIndex;
    selectedJson = JSON.stringify(parsed.data.selectedIndex);
    feedback = { correctIndex };
  } else if (session.game.type === "PICTURE_GUESSING") {
    if (!parsed.data.answerText) {
      return NextResponse.json(
        { error: "Thiếu câu trả lời." },
        { status: 400 },
      );
    }
    const correctAnswer = JSON.parse(question.correctJson) as string;
    isCorrect =
      normalizeAnswer(correctAnswer) ===
      normalizeAnswer(parsed.data.answerText);
    selectedJson = JSON.stringify(parsed.data.answerText);
    feedback = { correctAnswer };
  } else if (session.game.type === "WORD_PUZZLE") {
    if (!parsed.data.orderedTokens) {
      return NextResponse.json(
        { error: "Thiếu thứ tự sắp xếp." },
        { status: 400 },
      );
    }
    const correctOrder = JSON.parse(question.correctJson) as string[];
    isCorrect =
      correctOrder.length === parsed.data.orderedTokens.length &&
      correctOrder.every((t, i) => t === parsed.data.orderedTokens![i]);
    selectedJson = JSON.stringify(parsed.data.orderedTokens);
    feedback = { correctOrder };
  } else {
    return NextResponse.json(
      { error: "Loại game không hỗ trợ." },
      { status: 400 },
    );
  }

  const pointsEarned = scoreAnswer({
    game: session.game,
    isCorrect,
    usedHint: parsed.data.usedHint,
  });

  await prisma.answer.create({
    data: {
      sessionId: session.id,
      questionId: question.id,
      selectedJson,
      isCorrect,
      pointsEarned,
      usedHint: parsed.data.usedHint,
    },
  });

  return NextResponse.json({ isCorrect, pointsEarned, ...feedback });
});
