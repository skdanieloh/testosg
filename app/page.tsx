"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPostRoom } from "@/lib/api/roomClient";

export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createRoom() {
    setErr(null);
    setBusy(true);
    try {
      const { ok, data, status } = await apiPostRoom({ action: "create" });
      const d = data as {
        ok?: boolean;
        error?: string;
        message?: string;
        roomId?: string;
      };
      if (!ok || !d?.ok) {
        if (status === 503) {
          setErr(
            d?.message ||
              "Redis에 연결할 수 없습니다. Vercel에 REDIS_URL을 설정하고, Redis Cloud에서 네트워크(방화벽)가 Vercel IP를 허용하는지 확인하세요."
          );
          return;
        }
        if (d?.error === "redis_error" && d?.message) {
          setErr(`Redis 오류: ${d.message}`);
          return;
        }
        setErr(d?.message || "방을 만들 수 없습니다.");
        return;
      }
      const roomId = d.roomId as string;
      router.push(`/room/${roomId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-8 px-4 pb-16 pt-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          아케이드 방 경쟁
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          QR로 친구를 불러와 같은 방 랭킹을 겨루세요. (Redis Cloud)
        </p>
      </div>

      {err && (
        <p className="max-w-sm text-center text-sm text-red-400">{err}</p>
      )}

      <button
        type="button"
        onClick={createRoom}
        disabled={busy}
        className="w-full max-w-sm rounded-2xl bg-sky-600 py-4 text-lg font-semibold text-white shadow-lg disabled:opacity-50 active:scale-[0.99] touch-manipulation"
      >
        {busy ? "만드는 중…" : "방 만들기"}
      </button>

      <p className="max-w-sm text-center text-xs text-slate-500">
        방을 만들면 서버(Redis)에 방이 등록되고, QR로 친구가 입장합니다 (최대
        10명).
      </p>
    </main>
  );
}
