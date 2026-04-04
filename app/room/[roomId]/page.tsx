"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPostRoom } from "@/lib/api/roomClient";
import { setStoredNickname } from "@/lib/session";
import { QRCodeBlock } from "@/components/QRCodeBlock";
import { Loading } from "@/components/Loading";

type PageProps = { params: Promise<{ roomId: string }> };

export default function RoomPage({ params }: PageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const roomUrl = origin ? `${origin}/room/${roomId}` : "";

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const nick = nickname.trim();
    if (nick.length < 1 || nick.length > 24) {
      setErr("닉네임은 1~24자로 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data, status } = await apiPostRoom({
        action: "join",
        roomId,
        name: nick,
      });
      if (status === 503) {
        setErr("Redis가 설정되지 않았습니다.");
        return;
      }
      if (!ok || !data?.ok) {
        if (data?.error === "room_full") {
          setErr("방이 가득 찼습니다 (최대 10명).");
        } else if (data?.error === "not_found") {
          setErr("방이 없습니다. 홈에서 방을 다시 만드세요.");
        } else {
          setErr("입장에 실패했습니다.");
        }
        return;
      }
      setStoredNickname(roomId, nick);
      router.push(`/game/${roomId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="safe-area-page mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-6">
      <div>
        <Link
          href="/"
          className="text-sm text-sky-400 hover:underline"
        >
          ← 처음으로
        </Link>
        <h1 className="mt-4 text-xl font-bold text-white">방 입장</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">ID: {roomId}</p>
      </div>

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-center text-sm text-slate-400">
          이 QR을 친구에게 보여 주세요
        </p>
        {roomUrl ? (
          <QRCodeBlock url={roomUrl} />
        ) : (
          <Loading label="QR 준비 중…" />
        )}
        {roomUrl && (
          <code className="break-all rounded-lg bg-slate-950 px-3 py-2 text-center text-[11px] text-slate-400">
            {roomUrl}
          </code>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          닉네임 입력 후 입장
        </h2>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            name="nickname"
            autoComplete="nickname"
            placeholder="닉네임 (방당 1행)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-white placeholder:text-slate-600"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-[52px] rounded-2xl bg-sky-600 text-lg font-semibold text-white disabled:opacity-50"
          >
            {busy ? "처리 중…" : "입장하고 게임하기"}
          </button>
        </form>
      </section>

      <Link
        href={`/ranking/${roomId}`}
        className="text-center text-sm text-slate-500 underline"
      >
        랭킹만 보기
      </Link>
    </main>
  );
}
