"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";

type Question = {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string | null;
  choicesJson: string;
  correctJson: string;
  hint: string | null;
};

type Game = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  instructions: string | null;
  coverImageUrl: string | null;
  status: string;
  durationSeconds: number;
  maxPlaysPerUser: number;
  pointsPerQuestion: number;
  speedBonusMax: number;
  hintPenalty: number;
  questions: Question[];
};

const TYPE_LABELS: Record<string, string> = {
  QUIZ: "Trắc nghiệm",
  TRUE_FALSE: "Đúng / Sai",
  PICTURE_GUESSING: "Đuổi hình bắt chữ",
  WORD_PUZZLE: "Sắp xếp từ",
};

async function readUploadedImageUrl(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as
    | { url?: unknown; error?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Tải ảnh lên thất bại (HTTP ${response.status}).`,
    );
  }
  if (typeof data?.url !== "string" || !data.url) {
    throw new Error("Máy chủ không trả về đường dẫn ảnh hợp lệ.");
  }

  return data.url;
}

export default function AdminGameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/games/${id}`);
    const data = await res.json();
    if (res.ok) setGame(data.game);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!game) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: game.title,
          type: game.type,
          description: game.description || "",
          instructions: game.instructions || "",
          coverImageUrl: game.coverImageUrl || "",
          durationSeconds: game.durationSeconds,
          maxPlaysPerUser: game.maxPlaysPerUser,
          pointsPerQuestion: game.pointsPerQuestion,
          speedBonusMax: game.speedBonusMax,
          hintPenalty: game.hintPenalty,
        }),
      });
      if (res.ok) {
        await load();
        setMessage("Đã lưu cấu hình game.");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Không thể lưu cấu hình game.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File) {
    const form = new FormData();
    form.append("file", file);
    setUploadingCover(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const url = await readUploadedImageUrl(res);
      setGame((current) =>
        current ? { ...current, coverImageUrl: url } : current,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Tải ảnh lên thất bại.",
      );
    } finally {
      setUploadingCover(false);
    }
  }

  if (!game) return <p className="text-muted">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-ink">{game.title}</h1>
        <span className="badge bg-sky-100 text-sky-700">{TYPE_LABELS[game.type] || game.type}</span>
        <StatusBadge status={game.status} />
      </div>

      <form onSubmit={saveSettings} className="card space-y-4">
        <h2 className="font-heading text-lg font-bold text-ink">Cấu hình</h2>
        <div>
          <label className="label">Tên game</label>
          <input className="input" value={game.title} onChange={(e) => setGame({ ...game, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Mô tả</label>
          <textarea
            className="input"
            rows={2}
            value={game.description || ""}
            onChange={(e) => setGame({ ...game, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Hướng dẫn chơi</label>
          <textarea
            className="input"
            rows={3}
            value={game.instructions || ""}
            onChange={(e) => setGame({ ...game, instructions: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Ảnh đại diện</label>
          {game.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverImageUrl} alt="" className="mb-2 h-32 rounded object-cover" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploadingCover}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadCover(file);
            }}
          />
          {uploadingCover && <p className="mt-1 text-sm text-muted">Đang tải ảnh lên...</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Thời gian chơi (giây)"
            value={game.durationSeconds}
            onChange={(v) => setGame({ ...game, durationSeconds: v })}
          />
          <NumberField
            label="Lượt chơi tối đa / người"
            value={game.maxPlaysPerUser}
            onChange={(v) => setGame({ ...game, maxPlaysPerUser: v })}
          />
          <NumberField
            label="Điểm mỗi câu đúng"
            value={game.pointsPerQuestion}
            onChange={(v) => setGame({ ...game, pointsPerQuestion: v })}
          />
          <NumberField
            label="Điểm thưởng tốc độ"
            value={game.speedBonusMax}
            onChange={(v) => setGame({ ...game, speedBonusMax: v })}
          />
          <NumberField
            label="Điểm trừ khi dùng gợi ý"
            value={game.hintPenalty}
            onChange={(v) => setGame({ ...game, hintPenalty: v })}
          />
        </div>
        {message && <p className="text-sm text-lime-700">{message}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>

      <QuestionsEditor gameId={id} gameType={game.type} questions={game.questions} onChanged={load} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function QuestionSummary({ q, gameType }: { q: Question; gameType: string }) {
  if (gameType === "TRUE_FALSE") {
    const correct = (JSON.parse(q.correctJson) as number) === 0 ? "Đúng" : "Sai";
    return (
      <p className="mt-1 text-sm text-muted">
        Đáp án: <span className="font-semibold text-lime-700">{correct}</span>
      </p>
    );
  }
  if (gameType === "PICTURE_GUESSING") {
    const answer = JSON.parse(q.correctJson) as string;
    return (
      <div className="mt-1 flex items-center gap-3">
        {q.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
        )}
        <p className="text-sm text-muted">
          Đáp án: <span className="font-semibold text-lime-700">{answer}</span>
        </p>
      </div>
    );
  }
  if (gameType === "WORD_PUZZLE") {
    const tokens = JSON.parse(q.correctJson) as string[];
    return (
      <p className="mt-1 text-sm text-muted">
        Câu đúng: <span className="font-semibold text-lime-700">{tokens.join(" ")}</span>
      </p>
    );
  }
  const qChoices = JSON.parse(q.choicesJson) as string[];
  const correct = JSON.parse(q.correctJson) as number;
  return (
    <ul className="mt-1 text-sm text-muted">
      {qChoices.map((c, i) => (
        <li key={i} className={i === correct ? "font-semibold text-lime-700" : ""}>
          {i === correct ? "✓ " : "· "}
          {c}
        </li>
      ))}
    </ul>
  );
}

function QuestionsEditor({
  gameId,
  gameType,
  questions,
  onChanged,
}: {
  gameId: string;
  gameType: string;
  questions: Question[];
  onChanged: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctValue, setCorrectValue] = useState(true);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [correctPhrase, setCorrectPhrase] = useState("");
  const [hint, setHint] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function uploadQuestionImage(file: File) {
    const form = new FormData();
    form.append("file", file);
    setError(null);
    setImageUrl("");
    setUploadingImage(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      setImageUrl(await readUploadedImageUrl(res));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Tải ảnh gợi ý lên thất bại.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function resetForm() {
    setPrompt("");
    setChoices(["", "", "", ""]);
    setCorrectIndex(0);
    setCorrectValue(true);
    setCorrectAnswer("");
    setCorrectPhrase("");
    setHint("");
    setImageUrl("");
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let body: Record<string, unknown>;
    if (gameType === "QUIZ") {
      const validChoices = choices.filter((c) => c.trim().length > 0);
      if (validChoices.length < 2) {
        setError("Cần ít nhất 2 lựa chọn.");
        return;
      }
      body = { type: "QUIZ", order: questions.length + 1, prompt, imageUrl, choices: validChoices, correctIndex, hint };
    } else if (gameType === "TRUE_FALSE") {
      if (!prompt.trim()) {
        setError("Cần nhập câu khẳng định.");
        return;
      }
      body = { type: "TRUE_FALSE", order: questions.length + 1, prompt, imageUrl, correctValue, hint };
    } else if (gameType === "PICTURE_GUESSING") {
      if (!imageUrl) {
        setError("Cần tải lên ảnh gợi ý.");
        return;
      }
      if (!correctAnswer.trim()) {
        setError("Cần nhập đáp án đúng.");
        return;
      }
      body = { type: "PICTURE_GUESSING", order: questions.length + 1, prompt, imageUrl, correctAnswer, hint };
    } else {
      if (correctPhrase.trim().split(/\s+/).length < 2) {
        setError("Câu đúng cần ít nhất 2 từ để xáo trộn.");
        return;
      }
      body = { type: "WORD_PUZZLE", order: questions.length + 1, prompt, correctPhrase, hint };
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: unknown }
        | null;
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : `Thêm câu hỏi thất bại (HTTP ${res.status}).`,
        );
        return;
      }
      resetForm();
      onChanged();
    } catch {
      setError("Không thể kết nối máy chủ để thêm câu hỏi. Vui lòng thử lại.");
    } finally {
      setAdding(false);
    }
  }

  async function removeQuestion(qid: string) {
    if (!confirm("Xóa câu hỏi này?")) return;
    await fetch(`/api/admin/games/${gameId}/questions/${qid}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold text-ink">Câu hỏi ({questions.length})</h2>

      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.id} className="card flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-ink">
                {q.order}. {q.prompt || <span className="italic text-muted">(không có nội dung)</span>}
              </p>
              <QuestionSummary q={q} gameType={gameType} />
              {q.hint && <p className="mt-1 text-xs text-muted">Gợi ý: {q.hint}</p>}
            </div>
            <button onClick={() => removeQuestion(q.id)} className="text-xs text-red-500 hover:text-red-700">
              Xóa
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addQuestion} className="card space-y-3">
        <h3 className="font-heading text-base font-bold text-ink">Thêm câu hỏi</h3>

        {gameType !== "WORD_PUZZLE" && (
          <div>
            <label className="label">{gameType === "PICTURE_GUESSING" ? "Câu dẫn (tùy chọn)" : "Câu hỏi"}</label>
            <input
              className="input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={gameType === "PICTURE_GUESSING" ? "Đây là từ/cụm từ gì?" : undefined}
              required={gameType !== "PICTURE_GUESSING"}
            />
          </div>
        )}

        {gameType === "WORD_PUZZLE" && (
          <div>
            <label className="label">Hướng dẫn (tùy chọn)</label>
            <input
              className="input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sắp xếp thành câu đúng"
            />
          </div>
        )}

        {gameType !== "WORD_PUZZLE" && (
          <div>
            <label className="label">
              Ảnh minh họa {gameType === "PICTURE_GUESSING" ? "(bắt buộc)" : "(tùy chọn)"}
            </label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mb-2 h-24 rounded object-cover" />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadQuestionImage(file);
              }}
            />
            {uploadingImage && <p className="mt-1 text-sm text-muted">Đang tải ảnh gợi ý lên...</p>}
          </div>
        )}

        {gameType === "QUIZ" && (
          <div className="space-y-2">
            <label className="label">Lựa chọn (chọn nút radio cho đáp án đúng)</label>
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                <input
                  className="input"
                  placeholder={`Lựa chọn ${i + 1}`}
                  value={c}
                  onChange={(e) => {
                    const next = [...choices];
                    next[i] = e.target.value;
                    setChoices(next);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {gameType === "TRUE_FALSE" && (
          <div>
            <label className="label">Câu trên là</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={correctValue === true} onChange={() => setCorrectValue(true)} />
                Đúng
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={correctValue === false} onChange={() => setCorrectValue(false)} />
                Sai
              </label>
            </div>
          </div>
        )}

        {gameType === "PICTURE_GUESSING" && (
          <div>
            <label className="label">Đáp án đúng</label>
            <input
              className="input"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Ví dụ: con mèo"
            />
            <p className="mt-1 text-xs text-muted">
              Hệ thống bỏ qua hoa/thường và dấu khi chấm — nhân sự gõ gần đúng vẫn được tính đúng.
            </p>
          </div>
        )}

        {gameType === "WORD_PUZZLE" && (
          <div>
            <label className="label">Câu đúng (các từ cách nhau bằng dấu cách)</label>
            <input
              className="input"
              value={correctPhrase}
              onChange={(e) => setCorrectPhrase(e.target.value)}
              placeholder="Ví dụ: chất lượng tạo nên thương hiệu"
            />
          </div>
        )}

        <div>
          <label className="label">Gợi ý (tùy chọn)</label>
          <input className="input" value={hint} onChange={(e) => setHint(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={adding || uploadingImage} className="btn-secondary">
          {uploadingImage ? "Đang tải ảnh..." : adding ? "Đang thêm..." : "+ Thêm câu hỏi"}
        </button>
      </form>
    </div>
  );
}
