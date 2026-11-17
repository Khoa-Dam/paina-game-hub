import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const GET = withApiErrorHandling(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;
  const { slug } = await params;

  const game = await prisma.game.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      coverImageUrl: true,
      instructions: true,
      status: true,
      startAt: true,
      endAt: true,
      durationSeconds: true,
      maxPlaysPerUser: true,
      pointsPerQuestion: true,
      speedBonusMax: true,
      hintPenalty: true,
      _count: { select: { questions: true } },
    },
  });
  if (!game || !["PUBLISHED", "ACTIVE", "CLOSED"].includes(game.status)) {
    return NextResponse.json(
      { error: "Không tìm thấy game." },
      { status: 404 },
    );
  }

  const playsUsed = await prisma.gameResult.count({
    where: { gameId: game.id, employeeId: employee.id },
  });

  const now = new Date();
  const withinWindow =
    (!game.startAt || game.startAt <= now) &&
    (!game.endAt || game.endAt >= now);
  const canPlay =
    game.status === "ACTIVE" &&
    withinWindow &&
    playsUsed < game.maxPlaysPerUser;

  return NextResponse.json({ game, playsUsed, canPlay });
});
