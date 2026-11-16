"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import Pineapple from "@/components/Pineapple";

type Result = {
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  completionTimeSeconds: number;
  game: { title: string };
};

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/results/${sessionId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setResult(d.result);
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) return <p className="card text-red-600">{error}</p>;
  if (!result) return <p className="text-muted">Đang tải...</p>;

  const cheer =
    result.wrongCount === 0
      ? "Perfect! Đỉnh của chóp! 🏆"
      : result.correctCount >= result.wrongCount
      ? "Làm tốt lắm! 🎉"
      : "Chơi lại để lên điểm nhé! 💪";

  return (
    <div className="relative mx-auto max-w-md space-y-4 text-center">
      <Confetti />
      <Pineapple className="mx-auto h-12 w-12" bounce />
      <h1 className="font-heading text-2xl font-semibold text-ink">{result.game.title}</h1>
      <p className="font-body font-medium text-pink-600">{cheer}</p>
      <div className="card">
        <p className="text-sm text-muted">Tổng điểm</p>
        <p className="animate-pop font-heading text-6xl font-bold text-gold-600">
          🍍 {result.totalScore}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl bg-lime-50 py-2">
            <p className="font-heading text-lg font-semibold text-lime-700">{result.correctCount}</p>
            <p className="text-muted">Đúng</p>
          </div>
          <div className="rounded-2xl bg-pink-50 py-2">
            <p className="font-heading text-lg font-semibold text-pink-700">{result.wrongCount}</p>
            <p className="text-muted">Sai</p>
          </div>
          <div className="rounded-2xl bg-sky-50 py-2">
            <p className="font-heading text-lg font-semibold text-sky-700">{result.completionTimeSeconds}s</p>
            <p className="text-muted">Thời gian</p>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <Link href="/games" className="btn-secondary">
          Chơi game khác
        </Link>
        <Link href="/leaderboard" className="btn-primary">
          Xem bảng xếp hạng
        </Link>
      </div>
    </div>
  );
}
