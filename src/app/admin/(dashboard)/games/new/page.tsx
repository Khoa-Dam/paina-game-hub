"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { getAdminErrorMessage, readAdminResponse } from "@/lib/adminApi";

const GAME_TYPES = [
  { value: "QUIZ", label: "Trắc nghiệm (Quiz)", desc: "Chọn 1 đáp án đúng trong nhiều lựa chọn." },
  { value: "TRUE_FALSE", label: "Đúng / Sai", desc: "Mỗi câu chỉ có 2 lựa chọn: Đúng hoặc Sai." },
  {
    value: "PICTURE_GUESSING",
    label: "Đuổi hình bắt chữ",
    desc: "Xem ảnh gợi ý, gõ đáp án bằng chữ.",
  },
  {
    value: "WORD_PUZZLE",
    label: "Sắp xếp từ",
    desc: "Chạm các từ đang xáo trộn theo đúng thứ tự.",
  },
];

export default function NewGamePage() {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [type, setType] = useState("QUIZ");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [maxPlaysPerUser, setMaxPlaysPerUser] = useState(1);
  const [pointsPerQuestion, setPointsPerQuestion] = useState(10);
  const [speedBonusMax, setSpeedBonusMax] = useState(0);
  const [hintPenalty, setHintPenalty] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          instructions,
          type,
          durationSeconds: Number(durationSeconds),
          maxPlaysPerUser: Number(maxPlaysPerUser),
          pointsPerQuestion: Number(pointsPerQuestion),
          speedBonusMax: Number(speedBonusMax),
          hintPenalty: Number(hintPenalty),
        }),
      });
      const data = await readAdminResponse<{ game: { id: string } }>(
        res,
        "Không thể tạo game.",
      );
      showToast("Đã tạo game mới.");
      router.push(`/admin/games/${data.game.id}`);
    } catch (error) {
      const message = getAdminErrorMessage(error, "Không thể tạo game.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Tạo game mới</h1>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Loại game</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GAME_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-2xl border-2 p-3 text-left transition ${
                  type === t.value ? "border-ink bg-lime-100" : "border-border bg-white hover:border-ink"
                }`}
              >
                <p className="font-body font-semibold text-ink">{t.label}</p>
                <p className="text-xs text-muted">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Tên game</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Mô tả ngắn</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="label">Hướng dẫn chơi</label>
          <textarea className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Thời gian chơi (giây)</label>
            <input
              type="number"
              className="input"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              min={10}
            />
          </div>
          <div>
            <label className="label">Số lượt chơi tối đa / người</label>
            <input
              type="number"
              className="input"
              value={maxPlaysPerUser}
              onChange={(e) => setMaxPlaysPerUser(Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="label">Điểm mỗi câu đúng</label>
            <input
              type="number"
              className="input"
              value={pointsPerQuestion}
              onChange={(e) => setPointsPerQuestion(Number(e.target.value))}
              min={0}
            />
          </div>
          <div>
            <label className="label">Điểm thưởng tốc độ (tối đa)</label>
            <input
              type="number"
              className="input"
              value={speedBonusMax}
              onChange={(e) => setSpeedBonusMax(Number(e.target.value))}
              min={0}
            />
          </div>
          <div>
            <label className="label">Điểm trừ khi dùng gợi ý</label>
            <input
              type="number"
              className="input"
              value={hintPenalty}
              onChange={(e) => setHintPenalty(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Đang tạo..." : "Tạo game & thêm câu hỏi"}
        </button>
      </form>
    </div>
  );
}
