import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [employeeCount, gameCount, activeGameCount, resultCount] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.game.count(),
    prisma.game.count({ where: { status: "ACTIVE" } }),
    prisma.gameResult.count(),
  ]);

  const recentResults = await prisma.gameResult.findMany({
    orderBy: { playedAt: "desc" },
    take: 8,
    include: { employee: { select: { fullName: true } }, game: { select: { title: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Nhân sự hoạt động" value={employeeCount} />
        <Stat label="Tổng số game" value={gameCount} />
        <Stat label="Game đang mở" value={activeGameCount} />
        <Stat label="Tổng lượt chơi" value={resultCount} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-heading text-lg font-bold text-ink">Kết quả gần đây</h2>
        {recentResults.length === 0 && <p className="text-sm text-muted">Chưa có kết quả nào.</p>}
        <ul className="divide-y divide-border/60 text-sm">
          {recentResults.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span className="text-ink">
                {r.employee.fullName} — {r.game.title}
              </span>
              <span className="font-bold text-lime-700">{r.totalScore} điểm</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-heading text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
