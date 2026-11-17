import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

type CandidateType = "QUIZ" | "TRUE_FALSE" | "PICTURE_GUESSING" | "WORD_PUZZLE";

function inferQuestionType(question: {
  choicesJson: string;
  correctJson: string;
}): CandidateType | null {
  try {
    const choices: unknown = JSON.parse(question.choicesJson);
    const correct: unknown = JSON.parse(question.correctJson);

    if (!Array.isArray(choices)) return null;
    if (
      choices.length === 2 &&
      choices[0] === "Đúng" &&
      choices[1] === "Sai" &&
      (correct === 0 || correct === 1)
    ) {
      return "TRUE_FALSE";
    }
    if (
      choices.length >= 2 &&
      choices.every((choice) => typeof choice === "string") &&
      Number.isInteger(correct) &&
      (correct as number) >= 0 &&
      (correct as number) < choices.length
    ) {
      return "QUIZ";
    }
    if (choices.length === 0 && typeof correct === "string") {
      return "PICTURE_GUESSING";
    }
    if (
      choices.length === 0 &&
      Array.isArray(correct) &&
      correct.length >= 2 &&
      correct.every((token) => typeof token === "string")
    ) {
      return "WORD_PUZZLE";
    }
  } catch {
    return null;
  }

  return null;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const games = await prisma.game.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        questions: {
          select: { choicesJson: true, correctJson: true },
        },
      },
    });

    const report = games.map((game) => {
      const perQuestion = game.questions.map(inferQuestionType);
      const inferred = [...new Set(perQuestion.filter(Boolean))] as CandidateType[];
      const allQuestionsRecognized =
        perQuestion.length > 0 && perQuestion.every((type) => type !== null);
      const consistent = allQuestionsRecognized && inferred.length === 1;
      const suggestedType = consistent ? inferred[0] : null;

      return {
        gameId: game.id,
        slug: game.slug,
        title: game.title,
        currentType: game.type,
        questionCount: game.questions.length,
        inferredTypes: inferred,
        suggestedType,
        confidence: consistent ? "high" : "ambiguous",
        possibleAccidentalQuizOverwrite:
          game.type === "QUIZ" && suggestedType !== null && suggestedType !== "QUIZ",
      };
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          mode: "dry-run",
          databaseWrites: false,
          generatedAt: new Date().toISOString(),
          gameCount: report.length,
          games: report,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Game type audit failed: ${message}\n`);
  process.exitCode = 1;
});
