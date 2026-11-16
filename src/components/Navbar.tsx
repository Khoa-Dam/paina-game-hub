"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Pineapple from "./Pineapple";

const LINKS = [
  { href: "/home", label: "Trang chủ" },
  { href: "/games", label: "Danh sách game" },
  { href: "/leaderboard", label: "Bảng xếp hạng" },
  { href: "/history", label: "Lịch sử chơi" },
  { href: "/profile", label: "Hồ sơ" },
];

export default function Navbar({ fullName }: { fullName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b-2 border-ink bg-lime-300">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <Pineapple className="h-7 w-7 shrink-0 hover:animate-wobble" />
          <span className="whitespace-nowrap font-heading text-base font-bold text-ink">
            PAINA GAME HUB
          </span>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname.startsWith(l.href)
                  ? "bg-ink text-lime-300"
                  : "text-ink/70 hover:bg-ink/10 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {fullName && <span className="hidden text-sm font-medium text-ink/80 sm:inline">Xin chào, {fullName} 👋</span>}
          <button onClick={logout} className="text-sm font-semibold text-ink/70 hover:text-pink-600">
            Đăng xuất
          </button>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              pathname.startsWith(l.href) ? "bg-ink text-lime-300" : "text-ink/70"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
