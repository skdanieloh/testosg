"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredNickname } from "@/lib/session";
import { GameClient } from "@/components/GameClient";
import { Loading } from "@/components/Loading";
import { useRoomState } from "@/hooks/useRoomState";

export default function GamePage() {
  const router = useRouter();
  const { room, loading, error } = useRoomState();
  const [nick, setNick] = useState<string | null>(null);
  const [allowPlay, setAllowPlay] = useState(false);

  useEffect(() => {
    const n = getStoredNickname();
    setNick(n);
    if (!n) router.replace("/room");
  }, [router]);

  useEffect(() => {
    if (!nick || loading || !room) {
      setAllowPlay(false);
      return;
    }
    const m = room.members[nick];
    if (m?.status === "approved" && room.phase === "playing") {
      setAllowPlay(true);
    } else {
      setAllowPlay(false);
      router.replace("/room");
    }
  }, [nick, room, loading, router]);

  if (!nick) {
    return (
      <main className="safe-area-page mx-auto max-w-lg">
        <Loading label="확인 중…" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="safe-area-page mx-auto max-w-lg">
        <p className="text-sm text-red-400">{error}</p>
        <Link href="/room" className="mt-4 inline-block text-sky-400">
          ← 입장 화면
        </Link>
      </main>
    );
  }

  if (loading && !room) {
    return (
      <main className="safe-area-page mx-auto max-w-lg">
        <Loading label="방 상태 확인 중…" />
      </main>
    );
  }

  if (!allowPlay) {
    return (
      <main className="safe-area-page mx-auto max-w-lg">
        <Loading label="입장 확인 중…" />
      </main>
    );
  }

  return (
    <main className="safe-area-page mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/room" className="text-sm text-sky-400">
          ← 로비
        </Link>
        <span className="truncate text-xs text-slate-500">{nick}</span>
      </div>
      <GameClient nickname={nick} />
    </main>
  );
}
