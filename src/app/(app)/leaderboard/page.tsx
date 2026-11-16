"use client";

import { useEffect, useState } from "react";

type Entry = {
  rank: number;
  displayName: string;
  department: string | null;
  score: number;
  completionTimeSeconds?: number;
};

type GameOption = { id: string; title: string };

const SCOPES = [
  { value: "total", label: "Tổng điểm" },
  { value: "month", label: "Theo tháng" },
  { value: "game", label: "Theo game" },
  { value: "department", label: "Theo phòng ban" },
];

const MEDAL = ["🥇", "🥈", "🥉"];
const STICKER_STYLE = ["sticker sticker-1", "sticker sticker-2", "sticker sticker-3"];

export default function LeaderboardPage() {
  const [scope, setScope] = useState("total");
  const [games, setGames] = useState<GameOption[]>([]);
  const [gameId, setGameId] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d) => {
        setGames(d.games || []);
        if (d.games?.length) setGameId((prev) => prev || d.games[0].id);
      });
  }, []);

  useEffect(() => {
    if (scope === "game" && !gameId) return;
    const params = new URLSearchParams({ scope });
    if (scope === "game") params.set("gameId", gameId);
    setError(null);
    fetch(`/api/leaderboard?${params.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setEntries(d.entries);
      })
      .catch((e) => setError(e.message));
  }, [scope, gameId]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-ink">Bảng xếp hạng 🏆</h1>

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setScope(s.value)}
            className={`rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold transition ${
              scope === s.value ? "bg-gold-400 text-ink" : "bg-white text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {scope === "game" && (
        <select className="input max-w-sm" value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      )}

      {error && <p className="card text-red-600">{error}</p>}
      {!entries && !error && <p className="text-muted">Đang tải...</p>}
      {entries && entries.length === 0 && <p className="card text-muted">Chưa có dữ liệu.</p>}

      {entries && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.rank}
              className={`card flex items-center gap-4 ${
                e.rank <= 3 ? "bg-gradient-to-r from-surface to-gold-50" : ""
              }`}
            >
              {e.rank <= 3 ? (
                <span className={STICKER_STYLE[e.rank - 1]}>{MEDAL[e.rank - 1]}</span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-border bg-paper font-heading text-sm font-semibold text-muted">
                  {e.rank}
                </span>
              )}
              <div className="flex-1">
                <p className="font-body font-semibold text-ink">{e.displayName}</p>
                {scope !== "department" && (
                  <p className="text-xs text-muted">{e.department || "Chưa phân loại"}</p>
                )}
              </div>
              {scope === "game" && e.completionTimeSeconds !== undefined && (
                <span className="text-xs text-muted">⏱ {e.completionTimeSeconds}s</span>
              )}
              <span className="font-heading text-xl font-bold text-gold-700">🍍 {e.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
