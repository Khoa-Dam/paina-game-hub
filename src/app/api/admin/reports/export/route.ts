import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const gameId = req.nextUrl.searchParams.get("gameId") || undefined;

  const results = await prisma.gameResult.findMany({
    where: gameId ? { gameId } : undefined,
    orderBy: { playedAt: "desc" },
    include: {
      employee: {
        select: {
          fullName: true,
          employeeCode: true,
          legacyDepartment: true,
          departmentInfo: { select: { name: true } },
        },
      },
      game: { select: { title: true } },
    },
  });

  const rows: (string | number)[][] = [
    [
      "Mã NV",
      "Họ tên",
      "Phòng ban",
      "Game",
      "Điểm",
      "Số câu đúng",
      "Số câu sai",
      "Thời gian hoàn thành (giây)",
      "Thời điểm chơi",
    ],
    ...results.map((r) => [
      r.employee.employeeCode,
      r.employee.fullName,
      r.employee.departmentInfo?.name ?? r.employee.legacyDepartment ?? "",
      r.game.title,
      r.totalScore,
      r.correctCount,
      r.wrongCount,
      r.completionTimeSeconds,
      r.playedAt.toISOString(),
    ]),
  ];

  const csv = "﻿" + toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paina-game-hub-report.csv"`,
    },
  });
}
