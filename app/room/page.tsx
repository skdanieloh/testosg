"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPostRoom } from "@/lib/api/roomClient";
import { setStoredNickname, getStoredNickname } from "@/lib/session";
import { QRCodeBlock } from "@/components/QRCodeBlock";
import { Loading } from "@/components/Loading";
import { useRoomState } from "@/hooks/useRoomState";

export default function RoomPage() {
  const router = useRouter();
  const { room, loading, error } = useRoomState();
  const [nickname, setNickname] = useState("");
  const [myNick, setMyNick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  useEffect(() => {
    const n = getStoredNickname();
    if (n) {
      setMyNick(n);
      setNickname(n);
    }
  }, []);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = origin ? `${origin}/room` : "";

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinErr(null);
    const nick = nickname.trim();
    if (nick.length < 1 || nick.length > 24) {
      setJoinErr("닉네임은 1~24자로 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data, status } = await apiPostRoom({
        action: "join",
        name: nick,
      });
      if (status === 503) {
        setJoinErr("Redis가 설정되지 않았습니다.");
        return;
      }
      if (!ok || !data?.ok) {
        if (data?.error === "room_full") {
          setJoinErr("방이 가득 찼습니다 (최대 10명).");
        } else {
          setJoinErr("입장에 실패했습니다.");
        }
        return;
      }
      setStoredNickname(nick);
      setMyNick(nick);
    } finally {
      setBusy(false);
    }
  }

  const member = myNick && room ? room.members[myNick] : undefined;
  const canEnterGame =
    member?.status === "approved" && room?.phase === "playing";

  return (
    <main className="safe-area-page mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-sky-400 hover:underline">
          ← 처음으로
        </Link>
        <h1 className="mt-4 text-xl font-bold text-white">입장</h1>
        <p className="mt-1 text-xs text-slate-500">
          단일 방 · 상태는 1초마다 갱신됩니다.
        </p>
      </div>

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-center text-sm text-slate-400">
          친구 초대 링크 (QR)
        </p>
        {inviteUrl ? (
          <QRCodeBlock url={inviteUrl} />
        ) : (
          <Loading label="QR 준비 중…" />
        )}
        {inviteUrl && (
          <code className="break-all rounded-lg bg-slate-950 px-3 py-2 text-center text-[11px] text-slate-400">
            {inviteUrl}
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
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-white placeholder:text-slate-600"
          />
          {joinErr && <p className="text-sm text-red-400">{joinErr}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-[52px] rounded-2xl bg-sky-600 text-lg font-semibold text-white disabled:opacity-50"
          >
            {busy ? "처리 중…" : "입장 요청"}
          </button>
        </form>
      </section>

      {loading && !room && <Loading label="방 정보 불러오는 중…" />}
      {error && (
        <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {room && myNick && member && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-300">내 상태</h3>
          <p className="mt-2 text-sm text-slate-400">
            닉네임: <span className="font-medium text-white">{myNick}</span>
          </p>
          {member.status === "pending" && (
            <p className="mt-2 text-amber-300">
              관리자 승인 대기 중입니다. 잠시만 기다려 주세요.
            </p>
          )}
          {member.status === "approved" && room.phase === "lobby" && (
            <p className="mt-2 text-sky-300">
              승인되었습니다. 관리자가 게임을 시작하면 입장할 수 있습니다.
            </p>
          )}
          {canEnterGame && (
            <div className="mt-4">
              <button
                type="button"
                className="w-full rounded-2xl bg-emerald-600 py-3 text-base font-semibold text-white active:bg-emerald-700"
                onClick={() => router.push("/game")}
              >
                게임 입장
              </button>
            </div>
          )}
        </section>
      )}

      <Link
        href="/ranking"
        className="text-center text-sm text-slate-500 underline"
      >
        랭킹만 보기
      </Link>
    </main>
  );
}
