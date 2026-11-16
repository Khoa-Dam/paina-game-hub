"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type GameListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  coverImageUrl: string | null;
  status: string;
  maxPlaysPerUser: number;
  playsUsed: number;
  _count: { questions: number };
};

const TYPE_LABELS: Record<string, string> = {
  QUIZ: "Trắc nghiệm",
  PICTURE_GUESSING: "Đuổi hình bắt chữ",
  TRUE_FALSE: "Đúng / Sai",
  WORD_PUZZLE: "Sắp xếp từ",
};

export default function GamesPage() {
  const [games, setGames] = useState<GameListItem[] | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d) => setGames(d.games || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-ink">Danh sách game 🎮</h1>
      {!games && <p className="text-muted">Đang tải...</p>}
      {games && games.length === 0 && (
        <p className="card text-muted">Chưa có game nào được công bố.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {games?.map((g) => (
          <Link
            key={g.id}
            href={`/games/${g.slug}`}
            className="card flex flex-col gap-2 transition-all hover:-translate-y-1 hover:border-lime-500 hover:shadow-[0_10px_24px_-10px_rgba(23,23,23,0.35)]"
          >
            {g.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.coverImageUrl} alt="" className="h-32 w-full rounded-2xl object-cover" />
            )}
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink">{g.title}</h2>
              <StatusBadge status={g.status} />
            </div>
            <p className="text-sm text-muted">{TYPE_LABELS[g.type] || g.type}</p>
            {g.description && <p className="text-sm text-ink/80">{g.description}</p>}
            <p className="text-xs text-muted">
              {g._count.questions} câu hỏi · Lượt chơi: {g.playsUsed}/{g.maxPlaysPerUser}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
