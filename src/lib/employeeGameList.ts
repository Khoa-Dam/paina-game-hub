import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type GameListRow = {
  employeeActive: boolean;
  gameId: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  type: string | null;
  coverImageUrl: string | null;
  status: string | null;
  startAt: Date | null;
  endAt: Date | null;
  durationSeconds: number | null;
  maxPlaysPerUser: number | null;
  pointsPerQuestion: number | null;
  questionCount: number | null;
  playsUsed: number | null;
  createdAt: Date | null;
};

export async function getEmployeeGameList(employeeId: string) {
  const rows = await prisma.$queryRaw<GameListRow[]>(Prisma.sql`
    WITH active_employee AS (
      SELECT e."id"
      FROM "Employee" e
      WHERE e."id" = ${employeeId}
        AND e."status" = 'ACTIVE'
    ), game_rows AS (
      SELECT
        g."id" AS "gameId",
        g."slug",
        g."title",
        g."description",
        g."type",
        g."coverImageUrl",
        g."status",
        g."startAt",
        g."endAt",
        g."durationSeconds",
        g."maxPlaysPerUser",
        g."pointsPerQuestion",
        g."createdAt",
        (
          SELECT COUNT(*)::int
          FROM "Question" q
          WHERE q."gameId" = g."id"
        ) AS "questionCount",
        (
          SELECT COUNT(*)::int
          FROM "GameResult" r
          WHERE r."gameId" = g."id"
            AND r."employeeId" = ${employeeId}
        ) AS "playsUsed"
      FROM "Game" g
      CROSS JOIN active_employee
      WHERE g."status" IN ('PUBLISHED', 'ACTIVE', 'CLOSED')
    )
    SELECT
      EXISTS (SELECT 1 FROM active_employee) AS "employeeActive",
      game_rows.*
    FROM (VALUES (1)) AS one_row(dummy)
    LEFT JOIN game_rows ON TRUE
    ORDER BY game_rows."createdAt" DESC NULLS LAST
  `);

  if (!rows[0]?.employeeActive) return null;

  return rows.flatMap((row) => {
    if (!row.gameId) return [];

    return [{
      id: row.gameId,
      slug: row.slug!,
      title: row.title!,
      description: row.description,
      type: row.type!,
      coverImageUrl: row.coverImageUrl,
      status: row.status!,
      startAt: row.startAt,
      endAt: row.endAt,
      durationSeconds: row.durationSeconds!,
      maxPlaysPerUser: row.maxPlaysPerUser!,
      pointsPerQuestion: row.pointsPerQuestion!,
      _count: { questions: row.questionCount ?? 0 },
      playsUsed: row.playsUsed ?? 0,
    }];
  });
}
