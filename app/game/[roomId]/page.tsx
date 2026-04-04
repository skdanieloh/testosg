"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredNickname } from "@/lib/session";
import { GameClient } from "@/components/GameClient";
import { Loading } from "@/components/Loading";

type PageProps = { params: Promise<{ roomId: string }> };

export default function GamePage({ params }: PageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nick = getStoredNickname(roomId);
    if (!nick) {
      router.replace(`/room/${roomId}`);
      return;
    }
    setNickname(nick);
    setReady(true);
  }, [roomId, router]);

  if (!ready || !nickname) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-16">
        <Loading label="입장 확인 중…" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-4 px-4 pb-20 pt-6">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/room/${roomId}`} className="text-sm text-sky-400">
          ← 방
        </Link>
        <span className="truncate text-xs text-slate-500">{nickname}</span>
      </div>
      <GameClient roomId={roomId} nickname={nickname} />
    </main>
  );
}
