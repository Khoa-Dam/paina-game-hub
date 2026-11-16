"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type GameRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  _count: { questions: number; results: number };
};

const NEXT_STATUS: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ACTIVE", "DRAFT", "CLOSED", "ARCHIVED"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["ARCHIVED", "ACTIVE"],
  ARCHIVED: [],
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ACTIVE: "Đang mở",
  CLOSED: "Đã đóng",
  ARCHIVED: "Lưu trữ",
};

const TYPE_LABELS: Record<string, string> = {
  QUIZ: "Trắc nghiệm",
  TRUE_FALSE: "Đúng / Sai",
  PICTURE_GUESSING: "Đuổi hình bắt chữ",
  WORD_PUZZLE: "Sắp xếp từ",
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/games")
      .then((r) => r.json())
      .then((d) => setGames(d.games || []));
  }

  useEffect(load, []);

  async function changeStatus(id: string, status: string) {
    setError(null);
    const res = await fetch(`/api/admin/games/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Không thể đổi trạng thái.");
      return;
    }
    load();
  }

  async function duplicate(id: string) {
    await fetch(`/api/admin/games/${id}/duplicate`, { method: "POST" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xóa game này? Hành động không thể hoàn tác.")) return;
    await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">Quản lý game</h1>
        <Link href="/admin/games/new" className="btn-primary">
          + Tạo game mới
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!games && <p className="text-muted">Đang tải...</p>}

      {games && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4">Tên game</th>
              <th className="py-2 pr-4">Loại</th>
              <th className="py-2 pr-4">Câu hỏi</th>
              <th className="py-2 pr-4">Lượt chơi</th>
              <th className="py-2 pr-4">Trạng thái</th>
              <th className="py-2 pr-4">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 font-medium text-ink">
                  <Link href={`/admin/games/${g.id}`} className="hover:underline">
                    {g.title}
                  </Link>
                </td>
                <td className="py-2 pr-4">{TYPE_LABELS[g.type] || g.type}</td>
                <td className="py-2 pr-4">{g._count.questions}</td>
                <td className="py-2 pr-4">{g._count.results}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={g.status} />
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    {NEXT_STATUS[g.status]?.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeStatus(g.id, s)}
                        className="rounded border border-border px-2 py-1 text-xs hover:border-ink"
                      >
                        → {STATUS_LABELS[s]}
                      </button>
                    ))}
                    <button onClick={() => duplicate(g.id)} className="text-xs text-muted hover:text-ink">
                      Sao chép
                    </button>
                    <button onClick={() => remove(g.id)} className="text-xs text-red-500 hover:text-red-700">
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
