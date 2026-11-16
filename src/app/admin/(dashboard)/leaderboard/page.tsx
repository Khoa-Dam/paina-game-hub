import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";

const SCOPES = [
  { value: "total", label: "Tổng điểm" },
  { value: "month", label: "Theo tháng" },
  { value: "game", label: "Theo game" },
  { value: "department", label: "Theo phòng ban" },
];

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; gameId?: string }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope || "total";
  const games = await prisma.game.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } });
  const gameId = sp.gameId || games[0]?.id;

  const result = await getLeaderboard({ scope, gameId });
  const entries = "entries" in result ? result.entries : [];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Bảng xếp hạng</h1>
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Link
            key={s.value}
            href={`/admin/leaderboard?scope=${s.value}${s.value === "game" && gameId ? `&gameId=${gameId}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              scope === s.value ? "bg-ink text-lime-300" : "border border-border bg-white text-ink"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {scope === "game" && (
        <form method="get" className="flex gap-2">
          <input type="hidden" name="scope" value="game" />
          <select name="gameId" defaultValue={gameId} className="input max-w-sm">
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="submit">
            Xem
          </button>
        </form>
      )}

      {entries.length === 0 && <p className="card text-muted">Chưa có dữ liệu.</p>}
      {entries.length > 0 && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">{scope === "department" ? "Phòng ban" : "Tên"}</th>
              {scope !== "department" && <th className="py-2 pr-4">Phòng ban</th>}
              <th className="py-2 pr-4">Điểm</th>
              {scope === "game" && <th className="py-2 pr-4">Thời gian</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.rank} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 font-bold text-ink">{e.rank}</td>
                <td className="py-2 pr-4 font-medium text-ink">{e.displayName}</td>
                {scope !== "department" && <td className="py-2 pr-4 text-muted">{e.department || "-"}</td>}
                <td className="py-2 pr-4 font-bold text-lime-700">{e.score}</td>
                {scope === "game" && <td className="py-2 pr-4">{e.completionTimeSeconds}s</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
