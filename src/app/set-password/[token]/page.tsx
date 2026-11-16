"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/password-setup/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đặt mật khẩu.");
      router.replace("/home");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Thiết lập mật khẩu
        </h1>
        <p className="text-sm text-muted">
          Mật khẩu cần ít nhất 10 ký tự. Link chỉ dùng được một lần và hết hạn
          sau 24 giờ.
        </p>
        <div>
          <label className="label" htmlFor="password">
            Mật khẩu mới
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="passwordConfirmation">
            Nhập lại mật khẩu
          </label>
          <input
            id="passwordConfirmation"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu mật khẩu"}
        </button>
      </form>
    </main>
  );
}
