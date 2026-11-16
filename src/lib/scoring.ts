import type { Game } from "@prisma/client";

export function scoreAnswer(params: {
  game: Pick<Game, "pointsPerQuestion" | "hintPenalty">;
  isCorrect: boolean;
  usedHint: boolean;
}): number {
  if (!params.isCorrect) return 0;
  const base = params.game.pointsPerQuestion;
  const penalty = params.usedHint ? params.game.hintPenalty : 0;
  return Math.max(0, base - penalty);
}

// Speed bonus is applied once at session completion, scaled by how much of
// the allotted time was left, and only when the player got at least one
// question right (no reward for rushing through all-wrong answers).
export function speedBonus(params: {
  game: Pick<Game, "speedBonusMax" | "durationSeconds">;
  correctCount: number;
  completionTimeSeconds: number;
}): number {
  if (params.game.speedBonusMax <= 0 || params.correctCount === 0) return 0;
  const remaining = Math.max(0, params.game.durationSeconds - params.completionTimeSeconds);
  const fraction = params.game.durationSeconds > 0 ? remaining / params.game.durationSeconds : 0;
  return Math.round(params.game.speedBonusMax * fraction);
}
