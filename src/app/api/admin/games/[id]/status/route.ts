import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { gameStatusSchema } from "@/lib/validators";
import { logAdminAction } from "@/lib/auditLog";

const ALLOWED: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ACTIVE", "DRAFT", "CLOSED", "ARCHIVED"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["ARCHIVED", "ACTIVE"],
  ARCHIVED: [],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = gameStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStatus = parsed.data.status;
  if (!ALLOWED[game.status]?.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Không thể chuyển từ ${game.status} sang ${nextStatus}.` },
      { status: 409 }
    );
  }

  if (nextStatus === "PUBLISHED" || nextStatus === "ACTIVE") {
    const questionCount = await prisma.question.count({ where: { gameId: game.id } });
    if (questionCount === 0) {
      return NextResponse.json(
        { error: "Game cần ít nhất 1 câu hỏi trước khi xuất bản." },
        { status: 422 }
      );
    }
  }

  const updated = await prisma.game.update({ where: { id }, data: { status: nextStatus } });

  await logAdminAction({
    actor: admin.username,
    action: "CHANGE_GAME_STATUS",
    targetType: "Game",
    targetId: game.id,
    detail: { from: game.status, to: nextStatus },
  });

  return NextResponse.json({ game: updated });
}
