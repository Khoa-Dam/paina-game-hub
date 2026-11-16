import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/guards";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const GET = withApiErrorHandling(async function GET() {
  const { employee, response } = await requireEmployee();
  if (!employee) return response;

  const [games, playCounts] = await Promise.all([
    prisma.game.findMany({
      where: { status: { in: ["PUBLISHED", "ACTIVE", "CLOSED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        coverImageUrl: true,
        status: true,
        startAt: true,
        endAt: true,
        durationSeconds: true,
        maxPlaysPerUser: true,
        pointsPerQuestion: true,
        _count: { select: { questions: true } },
      },
    }),
    prisma.gameResult.groupBy({
      by: ["gameId"],
      where: { employeeId: employee.id },
      _count: { _all: true },
    }),
  ]);
  const playedMap = new Map(playCounts.map((p) => [p.gameId, p._count._all]));

  return NextResponse.json({
    games: games.map((g) => ({
      ...g,
      playsUsed: playedMap.get(g.id) ?? 0,
    })),
  });
});
