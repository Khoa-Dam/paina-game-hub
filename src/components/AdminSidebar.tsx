"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Pineapple from "./Pineapple";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/games", label: "Quản lý game" },
  { href: "/admin/employees", label: "Quản lý nhân sự" },
  { href: "/admin/departments", label: "Quản lý phòng ban" },
  { href: "/admin/results", label: "Kết quả" },
  { href: "/admin/leaderboard", label: "Bảng xếp hạng" },
  { href: "/admin/reports", label: "Báo cáo" },
  { href: "/admin/audit-logs", label: "Audit log" },
];

export default function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-col justify-between border-r border-border bg-ink px-4 py-6 text-white">
      <div>
        <div className="mb-8 flex items-center gap-2">
          <Pineapple className="h-6 w-6" />
          <span className="font-heading text-sm font-semibold">PAINA ADMIN</span>
        </div>
        <nav className="space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-full px-3 py-2 text-sm font-medium transition ${
                pathname === l.href ? "bg-lime-400 text-ink" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-white/50">{username}</p>
        <button onClick={logout} className="text-white/70 hover:text-lime-400">
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
