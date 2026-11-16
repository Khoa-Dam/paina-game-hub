import { prisma } from "@/lib/prisma";

export default async function AdminReportsPage() {
  const games = await prisma.game.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Báo cáo</h1>
      <div className="card space-y-3">
        <p className="text-sm text-muted">Xuất toàn bộ kết quả chơi game ra file CSV (mở được bằng Excel).</p>
        <form method="get" action="/api/admin/reports/export" className="flex gap-2">
          <select name="gameId" className="input max-w-sm">
            <option value="">Tất cả game</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button className="btn-primary" type="submit">
            Xuất CSV
          </button>
        </form>
      </div>
    </div>
  );
}
