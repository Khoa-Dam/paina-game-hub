import { getCurrentEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HomePage() {
  const employee = await getCurrentEmployee();
  const activeGamesCount = await prisma.game.count({ where: { status: "ACTIVE" } });
  const myPlays = await prisma.gameResult.count({ where: { employeeId: employee!.id } });
  const myTotalScore = await prisma.gameResult.aggregate({
    where: { employeeId: employee!.id },
    _sum: { totalScore: true },
  });

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden bg-ink text-white">
        <div className="blob -right-10 -top-16 h-40 w-40 bg-lime-400/30" />
        <div className="blob -bottom-16 left-10 h-32 w-32 bg-pink-400/20" />
        <p className="relative font-body text-sm text-lime-300">Chào mừng trở lại 👋</p>
        <h1 className="relative font-heading text-3xl font-semibold">{employee!.fullName}</h1>
        <p className="relative mt-1 text-sm text-white/70">{employee!.department || "Chưa có phòng ban"}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card bg-sky-100">
          <p className="text-sm font-medium text-sky-800/70">🎲 Game đang mở</p>
          <p className="font-heading text-3xl font-semibold text-sky-800">{activeGamesCount}</p>
        </div>
        <div className="card bg-pink-100">
          <p className="text-sm font-medium text-pink-800/70">🕹️ Lượt đã chơi</p>
          <p className="font-heading text-3xl font-semibold text-pink-800">{myPlays}</p>
        </div>
        <div className="card bg-gold-100">
          <p className="text-sm font-medium text-gold-800/70">🍍 Tổng điểm của bạn</p>
          <p className="font-heading text-3xl font-semibold text-gold-800">
            {myTotalScore._sum.totalScore ?? 0}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/games" className="btn-primary">
          Xem danh sách game
        </Link>
        <Link href="/leaderboard" className="btn-secondary">
          Bảng xếp hạng
        </Link>
      </div>
    </div>
  );
}
