import { z } from "zod";

export const employeeLoginSchema = z.object({
  employeeCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(200),
  departmentId: z.string().trim().min(1).optional(),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const employeeUpsertSchema = z.object({
  employeeCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional().or(z.literal("")),
  departmentId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const employeeCreateSchema = employeeUpsertSchema.extend({
  departmentId: z.string().trim().min(1),
});

// One schema per game type — each type stores its answer differently in
// Question.choicesJson / Question.correctJson (see lib/gameEngine.ts and
// the admin questions API for the exact mapping).
const quizQuestionSchema = z.object({
  type: z.literal("QUIZ"),
  order: z.number().int().min(1),
  prompt: z.string().trim().min(1),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  hint: z.string().trim().optional().or(z.literal("")),
  choices: z.array(z.string().trim().min(1)).min(2).max(8),
  correctIndex: z.number().int().min(0),
});

const trueFalseQuestionSchema = z.object({
  type: z.literal("TRUE_FALSE"),
  order: z.number().int().min(1),
  prompt: z.string().trim().min(1),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  hint: z.string().trim().optional().or(z.literal("")),
  correctValue: z.boolean(),
});

const pictureGuessingQuestionSchema = z.object({
  type: z.literal("PICTURE_GUESSING"),
  order: z.number().int().min(1),
  prompt: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().trim().min(1, "Cần ảnh gợi ý."),
  hint: z.string().trim().optional().or(z.literal("")),
  correctAnswer: z.string().trim().min(1),
});

const wordPuzzleQuestionSchema = z.object({
  type: z.literal("WORD_PUZZLE"),
  order: z.number().int().min(1),
  prompt: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  hint: z.string().trim().optional().or(z.literal("")),
  correctPhrase: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.trim().split(/\s+/).length >= 2, "Cần ít nhất 2 từ để sắp xếp."),
});

export const questionInputSchema = z.discriminatedUnion("type", [
  quizQuestionSchema,
  trueFalseQuestionSchema,
  pictureGuessingQuestionSchema,
  wordPuzzleQuestionSchema,
]);

// Looser shape for PATCH (edit), where any subset of type-specific fields
// may be present — the route only applies the ones matching the question's
// own stored type.
export const questionUpdateSchema = z.object({
  order: z.number().int().min(1).optional(),
  prompt: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  hint: z.string().trim().optional(),
  choices: z.array(z.string().trim().min(1)).min(2).max(8).optional(),
  correctIndex: z.number().int().min(0).optional(),
  correctValue: z.boolean().optional(),
  correctAnswer: z.string().trim().min(1).optional(),
  correctPhrase: z.string().trim().min(1).optional(),
});

export const gameUpsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(["QUIZ", "PICTURE_GUESSING", "TRUE_FALSE", "WORD_PUZZLE"]).default("QUIZ"),
  coverImageUrl: z.string().trim().optional().or(z.literal("")),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
  durationSeconds: z.number().int().min(10).max(3600),
  maxPlaysPerUser: z.number().int().min(1).max(100),
  pointsPerQuestion: z.number().int().min(0).max(1000),
  speedBonusMax: z.number().int().min(0).max(1000),
  hintPenalty: z.number().int().min(0).max(1000),
});

export const gameStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "CLOSED", "ARCHIVED"]),
});

// Multiple-choice (Quiz / True-False) answer submission.
export const choiceAnswerSubmitSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0),
  usedHint: z.boolean().optional().default(false),
});

// Free-text (Picture Guessing) answer submission.
export const textAnswerSubmitSchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().trim().min(1).max(200),
  usedHint: z.boolean().optional().default(false),
});

// Word-order (Word Puzzle) answer submission.
export const orderAnswerSubmitSchema = z.object({
  questionId: z.string().min(1),
  orderedTokens: z.array(z.string()).min(1).max(20),
  usedHint: z.boolean().optional().default(false),
});

// Kept for the GET .../hint route which only needs a questionId, and for
// anywhere a loose "did they submit something" shape is enough.
export const answerSubmitSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).optional(),
  answerText: z.string().trim().max(200).optional(),
  orderedTokens: z.array(z.string()).max(20).optional(),
  usedHint: z.boolean().optional().default(false),
});
