"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoomRecords } from "@/hooks/useRoomRecords";
import { RankingTable } from "@/components/RankingTable";
import { Loading } from "@/components/Loading";
import { getStoredNickname } from "@/lib/session";
import { MAIN_ROOM_ID } from "@/lib/room/constants";

export default function RankingPage() {
  const { rows, loading, error } = useRoomRecords();
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(getStoredNickname());
  }, []);

  return (
    <main className="safe-area-page mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-4">
      <div>
        <Link href="/" className="text-sm text-sky-400">
          ← 처음으로
        </Link>
        <h1 className="mt-4 text-xl font-bold text-white">방 랭킹</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">{MAIN_ROOM_ID}</p>
      </div>

      <p className="text-xs text-slate-500">
        승인된 참가자만 표시 · 1초마다 갱신
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

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Link
          href="/"
          className="rounded-2xl border border-slate-600 py-3 text-center text-base font-semibold text-slate-200 active:bg-slate-800"
        >
          게임 종료
        </Link>
        <Link
          href="/game"
          className="rounded-2xl bg-sky-600 py-3 text-center text-base font-semibold text-white active:bg-sky-700"
        >
          이 방에서 게임 계속하기
        </Link>
      </div>
    </main>
  );
}
