import { prisma } from "./prisma";

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  department: string | null;
  score: number;
  completionTimeSeconds?: number;
};

export async function getLeaderboard(params: {
  scope: string;
  gameId?: string;
  month?: string;
}): Promise<{ scope: string; entries: LeaderboardEntry[] } | { error: string; status: number }> {
  const { scope, gameId, month } = params;

  if (scope === "game") {
    if (!gameId) return { error: "Thiếu gameId.", status: 400 };
    const results = await prisma.gameResult.findMany({
      where: { gameId },
      orderBy: [{ totalScore: "desc" }, { completionTimeSeconds: "asc" }],
      include: { employee: { select: { fullName: true, department: true } } },
      take: 100,
    });
    return {
      scope,
      entries: results.map((r, i) => ({
        rank: i + 1,
        displayName: r.employee.fullName,
        department: r.employee.department,
        score: r.totalScore,
        completionTimeSeconds: r.completionTimeSeconds,
      })),
    };
  }

  if (scope === "month" || scope === "total") {
    let playedAtFilter: { gte: Date; lt: Date } | undefined;
    if (scope === "month") {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const [y, m] = targetMonth.split("-").map(Number);
      const start = new Date(y, (m ?? 1) - 1, 1);
      const end = new Date(y, m ?? 1, 1);
      playedAtFilter = { gte: start, lt: end };
    }

    const grouped = await prisma.gameResult.groupBy({
      by: ["employeeId"],
      where: playedAtFilter ? { playedAt: playedAtFilter } : undefined,
      _sum: { totalScore: true },
    });

    const employeeIds = grouped.map((g) => g.employeeId);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true, department: true },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const entries = grouped
      .map((g) => ({ employee: empMap.get(g.employeeId), score: g._sum.totalScore ?? 0 }))
      .filter((e) => e.employee)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((e, i) => ({
        rank: i + 1,
        displayName: e.employee!.fullName,
        department: e.employee!.department,
        score: e.score,
      }));

    return { scope, entries };
  }

  if (scope === "department") {
    const grouped = await prisma.gameResult.groupBy({ by: ["employeeId"], _sum: { totalScore: true } });
    const employees = await prisma.employee.findMany({ select: { id: true, department: true } });
    const deptMap = new Map(employees.map((e) => [e.id, e.department || "Chưa phân loại"]));

    const byDept = new Map<string, number>();
    for (const g of grouped) {
      const dept = deptMap.get(g.employeeId) || "Chưa phân loại";
      byDept.set(dept, (byDept.get(dept) || 0) + (g._sum.totalScore ?? 0));
    }

    const entries = [...byDept.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([department, score], i) => ({ rank: i + 1, displayName: department, department, score }));

    return { scope, entries };
  }

  return { error: "scope không hợp lệ.", status: 400 };
}
