import type { z } from "zod";
import type { questionInputSchema } from "./validators";

// Shared helpers for the 4 game-type engines. Quiz / True-False both use
// the existing multiple-choice shape (choicesJson = options, correctJson =
// index). Picture Guessing and Word Puzzle reuse the same two JSON columns
// with a different meaning documented at each call site below:
//   QUIZ              choicesJson = string[] options   correctJson = number (index)
//   TRUE_FALSE        choicesJson = ["Đúng","Sai"]      correctJson = number (0|1)
//   PICTURE_GUESSING  choicesJson = []                  correctJson = string (free-text answer)
//   WORD_PUZZLE       choicesJson = []                  correctJson = string[] (tokens, correct order)
type QuestionInput = z.infer<typeof questionInputSchema>;

type StoredQuestion = {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string | null;
  choicesJson: string;
  hint: string | null;
};

// Shapes the question payload sent to the player — never includes the
// correct answer. Word Puzzle additionally gets a deterministic shuffle.
export function buildClientQuestion(
  q: StoredQuestion,
  gameType: string,
  correctJson: string,
  sessionId: string,
  answered: boolean
) {
  const base = {
    id: q.id,
    order: q.order,
    prompt: q.prompt,
    imageUrl: q.imageUrl,
    hasHint: Boolean(q.hint),
    answered,
    type: gameType,
  };

  if (gameType === "QUIZ" || gameType === "TRUE_FALSE") {
    return { ...base, choices: JSON.parse(q.choicesJson) as string[] };
  }
  if (gameType === "WORD_PUZZLE") {
    const tokens = JSON.parse(correctJson) as string[];
    return { ...base, scrambledTokens: seededShuffle(tokens, `${sessionId}:${q.id}`) };
  }
  // PICTURE_GUESSING needs no extra fields beyond prompt/imageUrl.
  return base;
}

export function encodeQuestionStorage(input: QuestionInput): { choicesJson: string; correctJson: string } {
  switch (input.type) {
    case "QUIZ":
      return { choicesJson: JSON.stringify(input.choices), correctJson: JSON.stringify(input.correctIndex) };
    case "TRUE_FALSE":
      return {
        choicesJson: JSON.stringify(["Đúng", "Sai"]),
        correctJson: JSON.stringify(input.correctValue ? 0 : 1),
      };
    case "PICTURE_GUESSING":
      return { choicesJson: JSON.stringify([]), correctJson: JSON.stringify(input.correctAnswer.trim()) };
    case "WORD_PUZZLE":
      return {
        choicesJson: JSON.stringify([]),
        correctJson: JSON.stringify(input.correctPhrase.trim().split(/\s+/)),
      };
  }
}

// Strip Vietnamese diacritics + case/whitespace for forgiving free-text
// comparison (Đuổi hình bắt chữ) — "Con Mèo" and "con meo" both match.
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Deterministic shuffle seeded by sessionId+questionId so a page refresh
// (GET /api/sessions/[id]) shows the same scrambled order instead of a new
// one each time, without persisting the shuffle anywhere.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0 || 1;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };

  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // A scramble that happens to land back on the original order is a bad
  // puzzle (nothing to rearrange) — nudge it with one swap when possible.
  if (arr.length > 1 && arr.every((v, i) => v === items[i])) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}
