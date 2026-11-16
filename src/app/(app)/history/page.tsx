"use client";

import { useEffect, useState } from "react";

type ResultItem = {
  id: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  completionTimeSeconds: number;
  playedAt: string;
  game: { title: string; type: string };
};

export default function HistoryPage() {
  const [results, setResults] = useState<ResultItem[] | null>(null);

  useEffect(() => {
    fetch("/api/results/me")
      .then((r) => r.json())
      .then((d) => setResults(d.results || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Lịch sử chơi</h1>
      {!results && <p className="text-muted">Đang tải...</p>}
      {results && results.length === 0 && <p className="card text-muted">Bạn chưa chơi game nào.</p>}
      <div className="overflow-x-auto">
        {results && results.length > 0 && (
          <table className="w-full card text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">Game</th>
                <th className="py-2 pr-4">Điểm</th>
                <th className="py-2 pr-4">Đúng/Sai</th>
                <th className="py-2 pr-4">Thời gian</th>
                <th className="py-2 pr-4">Ngày chơi</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 font-medium text-ink">{r.game.title}</td>
                  <td className="py-2 pr-4 font-bold text-lime-700">{r.totalScore}</td>
                  <td className="py-2 pr-4">
                    {r.correctCount}/{r.correctCount + r.wrongCount}
                  </td>
                  <td className="py-2 pr-4">{r.completionTimeSeconds}s</td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(r.playedAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
