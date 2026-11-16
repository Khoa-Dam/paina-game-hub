import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { questionInputSchema } from "@/lib/validators";
import { encodeQuestionStorage } from "@/lib/gameEngine";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = questionInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  if (data.type !== game.type) {
    return NextResponse.json(
      { error: `Loại câu hỏi (${data.type}) không khớp với loại game (${game.type}).` },
      { status: 400 }
    );
  }
  if (data.type === "QUIZ" && data.correctIndex >= data.choices.length) {
    return NextResponse.json({ error: "correctIndex vượt ngoài số lựa chọn." }, { status: 400 });
  }

  const { choicesJson, correctJson } = encodeQuestionStorage(data);

  const question = await prisma.question.create({
    data: {
      gameId: game.id,
      order: data.order,
      prompt: data.prompt || "",
      imageUrl: data.imageUrl || null,
      choicesJson,
      correctJson,
      hint: data.hint || null,
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "CREATE_QUESTION",
    targetType: "Question",
    targetId: question.id,
    detail: { gameId: game.id },
  });

  return NextResponse.json({ question }, { status: 201 });
}
