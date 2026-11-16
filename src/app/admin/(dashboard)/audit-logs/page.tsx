import { prisma } from "@/lib/prisma";

export default async function AdminAuditLogsPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Audit log</h1>
      {logs.length === 0 && <p className="card text-muted">Chưa có hoạt động nào.</p>}
      {logs.length > 0 && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4">Thời điểm</th>
              <th className="py-2 pr-4">Admin</th>
              <th className="py-2 pr-4">Hành động</th>
              <th className="py-2 pr-4">Đối tượng</th>
              <th className="py-2 pr-4">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 text-muted">{new Date(l.createdAt).toLocaleString("vi-VN")}</td>
                <td className="py-2 pr-4">{l.actor}</td>
                <td className="py-2 pr-4 font-medium text-ink">{l.action}</td>
                <td className="py-2 pr-4">
                  {l.targetType}
                  {l.targetId ? ` #${l.targetId.slice(0, 8)}` : ""}
                </td>
                <td className="py-2 pr-4 text-xs text-muted">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
