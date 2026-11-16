import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { gameUpsertSchema } from "@/lib/validators";
import { slugify } from "@/lib/slug";
import { logAdminAction } from "@/lib/auditLog";

export async function GET() {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, results: true } } },
  });
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const json = await req.json().catch(() => null);
  const parsed = gameUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let slug = slugify(data.title);
  const existing = await prisma.game.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const game = await prisma.game.create({
    data: {
      slug,
      title: data.title,
      description: data.description || null,
      type: data.type,
      coverImageUrl: data.coverImageUrl || null,
      instructions: data.instructions || null,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      durationSeconds: data.durationSeconds,
      maxPlaysPerUser: data.maxPlaysPerUser,
      pointsPerQuestion: data.pointsPerQuestion,
      speedBonusMax: data.speedBonusMax,
      hintPenalty: data.hintPenalty,
      status: "DRAFT",
    },
  });

  await logAdminAction({
    actor: admin.username,
    action: "CREATE_GAME",
    targetType: "Game",
    targetId: game.id,
    detail: { title: game.title },
  });

  return NextResponse.json({ game }, { status: 201 });
}
