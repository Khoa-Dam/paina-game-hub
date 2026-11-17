import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { gameUpdateSchema } from "@/lib/validators";
import { logAdminAction } from "@/lib/auditLog";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ game });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = gameUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const game = await prisma.game.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl || null } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions || null } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt ? new Date(data.startAt) : null } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt ? new Date(data.endAt) : null } : {}),
      ...(data.durationSeconds !== undefined ? { durationSeconds: data.durationSeconds } : {}),
      ...(data.maxPlaysPerUser !== undefined ? { maxPlaysPerUser: data.maxPlaysPerUser } : {}),
      ...(data.pointsPerQuestion !== undefined ? { pointsPerQuestion: data.pointsPerQuestion } : {}),
      ...(data.speedBonusMax !== undefined ? { speedBonusMax: data.speedBonusMax } : {}),
      ...(data.hintPenalty !== undefined ? { hintPenalty: data.hintPenalty } : {}),
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "UPDATE_GAME",
    targetType: "Game",
    targetId: game.id,
  });

  return NextResponse.json({ game });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  await prisma.game.delete({ where: { id } });

  await logAdminAction({
    actor: admin.username,
    action: "DELETE_GAME",
    targetType: "Game",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
