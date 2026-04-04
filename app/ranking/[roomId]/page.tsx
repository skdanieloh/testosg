"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRoomRecords } from "@/hooks/useRoomRecords";
import { RankingTable } from "@/components/RankingTable";
import { Loading } from "@/components/Loading";
import { getStoredNickname } from "@/lib/session";

type PageProps = { params: Promise<{ roomId: string }> };

export default function RankingPage({ params }: PageProps) {
  const { roomId } = use(params);
  const { rows, loading, error } = useRoomRecords(roomId);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(getStoredNickname(roomId));
  }, [roomId]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-4 px-4 pb-16 pt-8">
      <div>
        <Link href="/" className="text-sm text-sky-400">
          ← 처음으로
        </Link>
        <h1 className="mt-4 text-xl font-bold text-white">방 랭킹</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">{roomId}</p>
      </div>

      <p className="text-xs text-slate-500">
        정렬: 레벨 ↓ · 점수 ↓ · 이름 ↑ (실시간 반영)
      </p>

      {loading && <Loading />}
      {error && (
        <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && (
        <RankingTable rows={rows} highlightNickname={me} />
      )}

      <div className="flex flex-col gap-2 pt-4">
        <Link
          href={`/room/${roomId}`}
          className="rounded-2xl border border-slate-600 py-3 text-center text-base font-semibold text-slate-200"
        >
          방으로 돌아가기
        </Link>
        <Link
          href={`/game/${roomId}`}
          className="rounded-2xl bg-sky-600 py-3 text-center text-base font-semibold text-white"
        >
          게임 하기
        </Link>
      </div>
    </main>
  );
}
