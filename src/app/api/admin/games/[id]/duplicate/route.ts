import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { slugify } from "@/lib/slug";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const source = await prisma.game.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const title = `${source.title} (Copy)`;
  // A timestamp suffix can collide when the base slug already exists and
  // duplicate requests happen within the same millisecond. Use a random
  // suffix so concurrent copies receive distinct unique slugs.
  const slug = `${slugify(title)}-${randomUUID()}`;

  const copy = await prisma.game.create({
    data: {
      slug,
      title,
      description: source.description,
      type: source.type,
      coverImageUrl: source.coverImageUrl,
      instructions: source.instructions,
      durationSeconds: source.durationSeconds,
      maxPlaysPerUser: source.maxPlaysPerUser,
      pointsPerQuestion: source.pointsPerQuestion,
      speedBonusMax: source.speedBonusMax,
      hintPenalty: source.hintPenalty,
      status: "DRAFT",
      questions: {
        create: source.questions.map((q) => ({
          order: q.order,
          prompt: q.prompt,
          imageUrl: q.imageUrl,
          choicesJson: q.choicesJson,
          correctJson: q.correctJson,
          hint: q.hint,
        })),
      },
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "DUPLICATE_GAME",
    targetType: "Game",
    targetId: copy.id,
    detail: { from: source.id },
  });

  return NextResponse.json({ game: copy }, { status: 201 });
}
