"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Pineapple from "@/components/Pineapple";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Pineapple className="mx-auto mb-3 h-10 w-10" />
          <h1 className="font-heading text-2xl font-semibold text-white">PAINA GAME HUB</h1>
          <p className="mt-1 font-body text-sm text-white/60">Khu vực quản trị</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Tài khoản
            </label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}
