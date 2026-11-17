"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import TemporaryUnavailableNotice from "@/components/TemporaryUnavailableNotice";

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
  const [loadErrorRetryable, setLoadErrorRetryable] = useState(false);
  const [startErrorRetryable, setStartErrorRetryable] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void loadGame();
  }, [params.slug]);

  async function loadGame() {
    setError(null);
    setLoadErrorRetryable(false);
    try {
      const response = await fetch(`/api/games/${params.slug}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoadErrorRetryable(response.status === 503);
        throw new Error(data.error || "Hệ thống đang bận. Vui lòng thử lại.");
      }
      setGame(data.game);
      setPlaysUsed(data.playsUsed);
      setCanPlay(data.canPlay);
    } catch (loadError) {
      if (loadError instanceof TypeError) setLoadErrorRetryable(true);
      setError(
        loadError instanceof Error ? loadError.message : "Không thể tải game.",
      );
    }
  }

  async function start() {
    if (!game) return;
    setStarting(true);
    setError(null);
    setStartErrorRetryable(false);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Không thể bắt đầu.");
        setStartErrorRetryable(res.status === 503);
        return;
      }
      router.push(`/play/${data.sessionId}`);
    } catch (startError) {
      setStartErrorRetryable(startError instanceof TypeError);
      setError(
        startError instanceof Error
          ? startError.message
          : "Hệ thống đang bận. Vui lòng thử lại.",
      );
    } finally {
      setStarting(false);
    }
  }

  if (error && !game && loadErrorRetryable)
    return <TemporaryUnavailableNotice onRetry={() => void loadGame()} />;
  if (error && !game) return <p className="text-sm text-red-600">{error}</p>;
  if (!game) return <p className="text-muted">Đang tải...</p>;

  return (
    <div className="space-y-4">
      {game.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.coverImageUrl}
          alt=""
          className="h-48 w-full rounded-lg object-cover"
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">
          {game.title}
        </h1>
        <StatusBadge status={game.status} />
      </div>
      {game.description && <p className="text-ink/80">{game.description}</p>}

      <div className="card space-y-2">
        <h2 className="font-heading text-lg font-bold text-ink">
          Hướng dẫn chơi
        </h2>
        <p className="whitespace-pre-line text-sm text-ink/80">
          {game.instructions ||
            "Trả lời các câu hỏi trong thời gian quy định để đạt điểm cao nhất."}
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

      {error && loadErrorRetryable ? (
        <TemporaryUnavailableNotice onRetry={() => void loadGame()} />
      ) : error && startErrorRetryable ? (
        <TemporaryUnavailableNotice onRetry={() => void start()} />
      ) : (
        error && <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        className="btn-primary"
        disabled={!canPlay || starting}
        onClick={start}
      >
        {starting
          ? "Đang bắt đầu..."
          : canPlay
            ? "Bắt đầu chơi"
            : "Không thể chơi lúc này"}
      </button>
    </div>
  );
}
