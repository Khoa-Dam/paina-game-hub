"use client";

import { useRouter } from "next/navigation";
import TemporaryUnavailableNotice from "@/components/TemporaryUnavailableNotice";

export default function TemporaryUnavailablePage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <TemporaryUnavailableNotice onRetry={() => router.refresh()} />
    </main>
  );
}
