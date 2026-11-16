import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { questionUpdateSchema } from "@/lib/validators";
import { logAdminAction } from "@/lib/auditLog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id, qid } = await params;

  const json = await req.json().catch(() => null);
  const parsed = questionUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const question = await prisma.question.update({
    where: { id: qid },
    data: {
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.prompt !== undefined ? { prompt: data.prompt } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.choices !== undefined ? { choicesJson: JSON.stringify(data.choices) } : {}),
      ...(data.correctIndex !== undefined ? { correctJson: JSON.stringify(data.correctIndex) } : {}),
      ...(data.correctValue !== undefined ? { correctJson: JSON.stringify(data.correctValue ? 0 : 1) } : {}),
      ...(data.correctAnswer !== undefined ? { correctJson: JSON.stringify(data.correctAnswer.trim()) } : {}),
      ...(data.correctPhrase !== undefined
        ? { correctJson: JSON.stringify(data.correctPhrase.trim().split(/\s+/)) }
        : {}),
      ...(data.hint !== undefined ? { hint: data.hint || null } : {}),
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "UPDATE_QUESTION",
    targetType: "Question",
    targetId: question.id,
    detail: { gameId: id },
  });

  return NextResponse.json({ question });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id, qid } = await params;

  await prisma.question.delete({ where: { id: qid } });

  await logAdminAction({
    actor: admin.username,
    action: "DELETE_QUESTION",
    targetType: "Question",
    targetId: qid,
    detail: { gameId: id },
  });

  return NextResponse.json({ ok: true });
}
