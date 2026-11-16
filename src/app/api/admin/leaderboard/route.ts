import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { getLeaderboard } from "@/lib/leaderboard";

export async function GET(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const scope = req.nextUrl.searchParams.get("scope") || "total";
  const gameId = req.nextUrl.searchParams.get("gameId") || undefined;
  const month = req.nextUrl.searchParams.get("month") || undefined;

  const result = await getLeaderboard({ scope, gameId, month });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
