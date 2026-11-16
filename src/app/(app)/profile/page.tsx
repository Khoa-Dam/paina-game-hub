import { getCurrentEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const employee = await getCurrentEmployee();
  const totalScore = await prisma.gameResult.aggregate({
    where: { employeeId: employee!.id },
    _sum: { totalScore: true },
  });
  const playsCount = await prisma.gameResult.count({ where: { employeeId: employee!.id } });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Hồ sơ cá nhân</h1>
      <div className="card space-y-3">
        <div>
          <p className="label">Họ và tên</p>
          <p className="font-medium text-ink">{employee!.fullName}</p>
        </div>
        <div>
          <p className="label">Phòng ban</p>
          <p className="font-medium text-ink">{employee!.department || "-"}</p>
        </div>
        <div>
          <p className="label">Tổng điểm</p>
          <p className="font-heading text-2xl font-bold text-lime-600">
            {totalScore._sum.totalScore ?? 0}
          </p>
        </div>
        <div>
          <p className="label">Số lượt đã chơi</p>
          <p className="font-medium text-ink">{playsCount}</p>
        </div>
      </div>
    </div>
  );
}
