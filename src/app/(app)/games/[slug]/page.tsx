"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";

type GameDetail = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  coverImageUrl: string | null;
  status: string;
  durationSeconds: number;
  maxPlaysPerUser: number;
  pointsPerQuestion: number;
  _count: { questions: number };
};

export default function GameDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [playsUsed, setPlaysUsed] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/games/${params.slug}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setGame(d.game);
        setPlaysUsed(d.playsUsed);
        setCanPlay(d.canPlay);
      })
      .catch((e) => setError(e.message));
  }, [params.slug]);

  async function start() {
    if (!game) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể bắt đầu.");
        return;
      }
      router.push(`/play/${data.sessionId}`);
    } finally {
      setStarting(false);
    }
  }

  if (error && !game) return <p className="card text-red-600">{error}</p>;
  if (!game) return <p className="text-muted">Đang tải...</p>;

  return (
    <div className="space-y-4">
      {game.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.coverImageUrl} alt="" className="h-48 w-full rounded-lg object-cover" />
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">{game.title}</h1>
        <StatusBadge status={game.status} />
      </div>
      {game.description && <p className="text-ink/80">{game.description}</p>}

      <div className="card space-y-2">
        <h2 className="font-heading text-lg font-bold text-ink">Hướng dẫn chơi</h2>
        <p className="whitespace-pre-line text-sm text-ink/80">
          {game.instructions || "Trả lời các câu hỏi trong thời gian quy định để đạt điểm cao nhất."}
        </p>
        <ul className="text-sm text-muted">
          <li>Số câu hỏi: {game._count.questions}</li>
          <li>Thời gian: {game.durationSeconds} giây</li>
          <li>Điểm mỗi câu đúng: {game.pointsPerQuestion}</li>
          <li>
            Lượt chơi đã dùng: {playsUsed}/{game.maxPlaysPerUser}
          </li>
        </ul>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary" disabled={!canPlay || starting} onClick={start}>
        {starting ? "Đang bắt đầu..." : canPlay ? "Bắt đầu chơi" : "Không thể chơi lúc này"}
      </button>
    </div>
  );
}
