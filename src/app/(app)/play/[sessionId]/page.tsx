"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AnswerFeedbackCelebration,
  MusicToggle,
  useGameAudio,
} from "@/features/gameplay";

type Question = {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string | null;
  hasHint: boolean;
  answered: boolean;
  type: string;
  choices?: string[];
  scrambledTokens?: string[];
};

type Feedback = {
  isCorrect: boolean;
  pointsEarned?: number;
  correctIndex?: number;
  correctAnswer?: string;
  correctOrder?: string[];
};

export default function PlaySessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const {
    audioSupported,
    musicEnabled,
    playAnswerFeedback,
    toggleMusic,
    unlockAudio,
  } = useGameAudio();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // QUIZ / TRUE_FALSE
  const [selected, setSelected] = useState<number | null>(null);
  // PICTURE_GUESSING
  const [textAnswer, setTextAnswer] = useState("");
  // WORD_PUZZLE — indices into scrambledTokens, in the order the player tapped them
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const completingRef = useRef(false);

  useEffect(() => {
    if (feedback) playAnswerFeedback(feedback.isCorrect);
  }, [feedback, playAnswerFeedback]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setQuestions(d.questions);
        setDurationSeconds(d.durationSeconds);
        setStartedAt(d.startedAt);
        setStatus(d.status);
        const firstUnanswered = d.questions.findIndex(
          (q: Question) => !q.answered,
        );
        setCurrentIndex(
          firstUnanswered === -1 ? d.questions.length : firstUnanswered,
        );
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);

  const finish = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    const res = await fetch(`/api/sessions/${sessionId}/complete`, {
      method: "POST",
    });
    if (res.ok) {
      router.push(`/result/${sessionId}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Không thể hoàn tất phiên chơi.");
    }
  }, [sessionId, router]);

  useEffect(() => {
    if (!startedAt || !durationSeconds || status !== "IN_PROGRESS") return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const left = Math.max(0, Math.round(durationSeconds - elapsed));
      setSecondsLeft(left);
      if (left <= 0) finish();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationSeconds, status, finish]);

  const currentQuestion = useMemo(
    () => (questions ? questions[currentIndex] : undefined),
    [questions, currentIndex],
  );

  async function requestHint() {
    if (!currentQuestion) return;
    const res = await fetch(
      `/api/sessions/${sessionId}/hint?questionId=${currentQuestion.id}`,
    );
    const data = await res.json();
    if (res.ok) {
      setHint(data.hint);
      setUsedHint(true);
    }
  }

  async function submitAnswer() {
    if (!currentQuestion) return;
    let body: Record<string, unknown>;
    if (
      currentQuestion.type === "QUIZ" ||
      currentQuestion.type === "TRUE_FALSE"
    ) {
      if (selected === null) return;
      body = {
        questionId: currentQuestion.id,
        selectedIndex: selected,
        usedHint,
      };
    } else if (currentQuestion.type === "PICTURE_GUESSING") {
      if (!textAnswer.trim()) return;
      body = {
        questionId: currentQuestion.id,
        answerText: textAnswer,
        usedHint,
      };
    } else {
      if (
        placedIndices.length !== (currentQuestion.scrambledTokens?.length ?? 0)
      )
        return;
      const orderedTokens = placedIndices.map(
        (i) => currentQuestion.scrambledTokens![i],
      );
      body = { questionId: currentQuestion.id, orderedTokens, usedHint };
    }

    setError(null);
    unlockAudio();
    const res = await fetch(`/api/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không thể gửi câu trả lời.");
      return;
    }
    setFeedback({
      isCorrect: data.isCorrect,
      pointsEarned: data.pointsEarned,
      correctIndex: data.correctIndex,
      correctAnswer: data.correctAnswer,
      correctOrder: data.correctOrder,
    });
  }

  function next() {
    if (!questions) return;
    setSelected(null);
    setTextAnswer("");
    setPlacedIndices([]);
    setFeedback(null);
    setHint(null);
    setUsedHint(false);
    if (currentIndex + 1 >= questions.length) {
      finish();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (error && !questions) return <p className="card text-red-600">{error}</p>;
  if (!questions) return <p className="text-muted">Đang tải...</p>;
  if (!currentQuestion) return <p className="text-muted">Đang hoàn tất...</p>;

  const canSubmit =
    currentQuestion.type === "QUIZ" || currentQuestion.type === "TRUE_FALSE"
      ? selected !== null
      : currentQuestion.type === "PICTURE_GUESSING"
        ? textAnswer.trim().length > 0
        : placedIndices.length ===
            (currentQuestion.scrambledTokens?.length ?? 0) &&
          placedIndices.length > 0;

  const feedbackMessage = feedback
    ? feedback.isCorrect
      ? `Chính xác! Bạn được cộng ${feedback.pointsEarned ?? 0} điểm.`
      : currentQuestion.type === "QUIZ" || currentQuestion.type === "TRUE_FALSE"
        ? `Chưa đúng. Đáp án đúng: ${currentQuestion.choices?.[feedback.correctIndex ?? -1] ?? ""}`
        : currentQuestion.type === "PICTURE_GUESSING"
          ? `Chưa đúng. Đáp án đúng: ${feedback.correctAnswer ?? ""}`
          : `Chưa đúng. Thứ tự đúng: ${feedback.correctOrder?.join(" ") ?? ""}`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="badge bg-sky-100 text-sky-700">
          Câu {currentIndex + 1}/{questions.length}
        </span>
        <div className="flex items-center gap-2">
          <MusicToggle
            enabled={musicEnabled}
            supported={audioSupported}
            onToggle={toggleMusic}
          />
          {secondsLeft !== null && (
            <p
              className={`font-heading text-xl font-semibold ${
                secondsLeft <= 10 ? "animate-pop text-pink-600" : "text-ink"
              }`}
            >
              ⏱ {secondsLeft}s
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        {currentQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentQuestion.imageUrl}
            alt=""
            className="max-h-64 w-full rounded-2xl object-contain"
          />
        )}
        {currentQuestion.prompt && (
          <h2 className="font-heading text-xl font-semibold text-ink">
            {currentQuestion.prompt}
          </h2>
        )}

        {(currentQuestion.type === "QUIZ" ||
          currentQuestion.type === "TRUE_FALSE") && (
          <ChoiceAnswer
            choices={currentQuestion.choices ?? []}
            selected={selected}
            feedback={feedback}
            onSelect={setSelected}
          />
        )}

        {currentQuestion.type === "PICTURE_GUESSING" && (
          <PictureAnswer
            value={textAnswer}
            onChange={setTextAnswer}
            feedback={feedback}
            pointsEarned={feedback?.pointsEarned ?? 0}
            disabled={!!feedback}
          />
        )}

        {currentQuestion.type === "WORD_PUZZLE" && (
          <WordPuzzleAnswer
            tokens={currentQuestion.scrambledTokens ?? []}
            placedIndices={placedIndices}
            onChange={setPlacedIndices}
            feedback={feedback}
            pointsEarned={feedback?.pointsEarned ?? 0}
          />
        )}

        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {feedbackMessage}
        </p>

        {hint && (
          <p className="rounded-2xl bg-lime-50 p-3 text-sm text-lime-700">
            💡 {hint}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          {!feedback && currentQuestion.hasHint && (
            <button
              onClick={requestHint}
              className="btn-secondary"
              disabled={!!hint}
            >
              Xem gợi ý
            </button>
          )}
          {!feedback ? (
            <button
              className="btn-primary ml-auto"
              disabled={!canSubmit}
              onClick={submitAnswer}
            >
              Trả lời
            </button>
          ) : (
            <button className="btn-primary ml-auto" onClick={next}>
              {currentIndex + 1 >= questions.length
                ? "Hoàn tất"
                : "Câu tiếp theo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceAnswer({
  choices,
  selected,
  feedback,
  onSelect,
  pointsEarned,
}: {
  choices: string[];
  selected: number | null;
  feedback: Feedback | null;
  onSelect: (i: number) => void;
  pointsEarned?: number;
}) {
  return (
    <div className="answer-feedback-area">
      {feedback && (
        <AnswerFeedbackCelebration
          isCorrect={feedback.isCorrect}
          pointsEarned={pointsEarned ?? feedback.pointsEarned ?? 0}
        />
      )}
      <div className="grid gap-2">
        {choices.map((choice, i) => {
          const isSelected = selected === i;
          const isCorrectChoice = feedback && feedback.correctIndex === i;
          const isWrongSelected = feedback && isSelected && !feedback.isCorrect;
          return (
            <button
              key={i}
              disabled={!!feedback}
              onClick={() => onSelect(i)}
              className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-body transition-all ${
                isCorrectChoice
                  ? "answer-correct-glow border-lime-400 bg-lime-100 text-ink"
                  : isWrongSelected
                    ? "answer-wrong-shake border-pink-400 bg-pink-50 text-ink"
                    : isSelected
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-white hover:-translate-y-0.5 hover:border-lime-400"
              }`}
            >
              {choice}
              {isCorrectChoice && <span>✅</span>}
              {isWrongSelected && <span>❌</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PictureAnswer({
  value,
  onChange,
  feedback,
  pointsEarned,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  feedback: Feedback | null;
  pointsEarned?: number;
  disabled: boolean;
}) {
  return (
    <div className="answer-feedback-area space-y-2">
      {feedback && (
        <AnswerFeedbackCelebration
          isCorrect={feedback.isCorrect}
          pointsEarned={pointsEarned ?? feedback.pointsEarned ?? 0}
        />
      )}
      <input
        className={`input ${
          feedback
            ? feedback.isCorrect
              ? "answer-correct-glow"
              : "answer-wrong-shake"
            : ""
        }`}
        placeholder="Gõ đáp án của bạn..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {feedback && (
        <p
          className={`font-semibold ${feedback.isCorrect ? "text-lime-700" : "text-pink-600"}`}
        >
          {feedback.isCorrect
            ? "✅ Chính xác!"
            : `❌ Đáp án đúng: ${feedback.correctAnswer}`}
        </p>
      )}
    </div>
  );
}

function WordPuzzleAnswer({
  tokens,
  placedIndices,
  onChange,
  feedback,
  pointsEarned,
}: {
  tokens: string[];
  placedIndices: number[];
  onChange: (indices: number[]) => void;
  feedback: Feedback | null;
  pointsEarned?: number;
}) {
  const remainingIndices = tokens
    .map((_, i) => i)
    .filter((i) => !placedIndices.includes(i));

  return (
    <div className="answer-feedback-area space-y-3">
      {feedback && (
        <AnswerFeedbackCelebration
          isCorrect={feedback.isCorrect}
          pointsEarned={pointsEarned ?? feedback.pointsEarned ?? 0}
        />
      )}
      <div
        className={`flex min-h-[3rem] flex-wrap gap-2 rounded-2xl border-2 border-dashed border-border bg-paper p-3 ${
          feedback
            ? feedback.isCorrect
              ? "answer-correct-glow"
              : "answer-wrong-shake"
            : ""
        }`}
      >
        {placedIndices.length === 0 && (
          <span className="text-sm text-muted">
            Chạm từ bên dưới theo thứ tự đúng
          </span>
        )}
        {placedIndices.map((tokenIdx, pos) => (
          <button
            key={pos}
            disabled={!!feedback}
            onClick={() => onChange(placedIndices.filter((_, i) => i !== pos))}
            className="rounded-xl border-2 border-ink bg-lime-200 px-3 py-1.5 font-body font-semibold text-ink"
          >
            {tokens[tokenIdx]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {remainingIndices.map((tokenIdx) => (
          <button
            key={tokenIdx}
            disabled={!!feedback}
            onClick={() => onChange([...placedIndices, tokenIdx])}
            className="rounded-xl border-2 border-ink bg-white px-3 py-1.5 font-body font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-lime-50"
          >
            {tokens[tokenIdx]}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          className={`font-semibold ${feedback.isCorrect ? "text-lime-700" : "text-pink-600"}`}
        >
          {feedback.isCorrect
            ? "✅ Chính xác!"
            : `❌ Thứ tự đúng: ${feedback.correctOrder?.join(" ")}`}
        </p>
      )}
    </div>
  );
}
