import { prisma } from "@/lib/prisma";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>;
}) {
  const sp = await searchParams;
  const games = await prisma.game.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } });
  const results = await prisma.gameResult.findMany({
    where: sp.gameId ? { gameId: sp.gameId } : undefined,
    orderBy: { playedAt: "desc" },
    take: 300,
    include: {
      employee: {
        select: {
          fullName: true,
          employeeCode: true,
          legacyDepartment: true,
          departmentInfo: { select: { name: true } },
        },
      },
      game: { select: { title: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Kết quả</h1>
      <form method="get" className="flex gap-2">
        <select name="gameId" defaultValue={sp.gameId || ""} className="input max-w-sm">
          <option value="">Tất cả game</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">
          Lọc
        </button>
      </form>

      {results.length === 0 && <p className="card text-muted">Chưa có kết quả.</p>}
      {results.length > 0 && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4">Mã NV</th>
              <th className="py-2 pr-4">Họ tên</th>
              <th className="py-2 pr-4">Phòng ban</th>
              <th className="py-2 pr-4">Game</th>
              <th className="py-2 pr-4">Điểm</th>
              <th className="py-2 pr-4">Đúng/Sai</th>
              <th className="py-2 pr-4">Thời gian</th>
              <th className="py-2 pr-4">Thời điểm</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4">{r.employee.employeeCode}</td>
                <td className="py-2 pr-4 font-medium text-ink">{r.employee.fullName}</td>
                <td className="py-2 pr-4">{r.employee.departmentInfo?.name ?? r.employee.legacyDepartment ?? "-"}</td>
                <td className="py-2 pr-4">{r.game.title}</td>
                <td className="py-2 pr-4 font-bold text-lime-700">{r.totalScore}</td>
                <td className="py-2 pr-4">
                  {r.correctCount}/{r.correctCount + r.wrongCount}
                </td>
                <td className="py-2 pr-4">{r.completionTimeSeconds}s</td>
                <td className="py-2 pr-4 text-muted">{new Date(r.playedAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
