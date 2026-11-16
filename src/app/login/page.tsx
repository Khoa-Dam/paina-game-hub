"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Pineapple from "@/components/Pineapple";

export default function LoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, employeeCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4">
      <div className="blob -left-20 -top-20 h-72 w-72 bg-lime-200" />
      <div className="blob -right-16 top-10 h-60 w-60 bg-pink-200" />
      <div className="blob bottom-0 left-1/4 h-64 w-64 bg-sky-200" />

      {/* floating coins */}
      <span
        className="absolute left-[12%] top-[18%] flex h-8 w-8 animate-float items-center justify-center rounded-full border-2 border-ink bg-gold-300 text-sm font-bold text-ink shadow-[0_3px_0_0_#2A2140]"
        style={{ animationDelay: "0.3s" }}
      >
        ★
      </span>
      <span
        className="absolute right-[14%] top-[30%] flex h-6 w-6 animate-float items-center justify-center rounded-full border-2 border-ink bg-gold-300 text-xs font-bold text-ink shadow-[0_3px_0_0_#2A2140]"
        style={{ animationDelay: "1.1s" }}
      >
        ★
      </span>
      <span
        className="absolute bottom-[12%] right-[18%] flex h-7 w-7 animate-float items-center justify-center rounded-full border-2 border-ink bg-gold-300 text-xs font-bold text-ink shadow-[0_3px_0_0_#2A2140]"
        style={{ animationDelay: "0.7s" }}
      >
        ★
      </span>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Pineapple className="mx-auto mb-2 h-16 w-16" bounce />
          <h1
            className="font-heading text-4xl font-bold tracking-wide text-ink"
            style={{ textShadow: "3px 3px 0 #FFC93C" }}
          >
            PAINA GAME HUB
          </h1>
          <p className="mt-2 font-body text-sm text-muted">
            Nhập họ tên và mã nhân viên để vào chơi nhé! 🎮
          </p>
          <p className="mt-1 font-body text-xs text-muted">
            Lần đầu nhập sẽ tự tạo tài khoản — nhớ dùng đúng mã NV và họ tên của bạn cho các lần sau.
          </p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="fullName">
              Họ và tên
            </label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="employeeCode">
              Mã nhân viên
            </label>
            <input
              id="employeeCode"
              className="input"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="S-000"
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-pink-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Đang vào..." : "Vào chơi thôi! 🚀"}
          </button>
          <p className="text-center text-xs text-muted">
            Là Admin?{" "}
            <a href="/admin/login" className="font-semibold text-ink underline">
              Đăng nhập quản trị
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
