"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiPostAdmin } from "@/lib/api/adminClient";
import type { RoomDoc, RoomMember } from "@/lib/api/roomClient";
import { QRCodeBlock } from "@/components/QRCodeBlock";
import { Loading } from "@/components/Loading";
import { MAIN_ROOM_ID } from "@/lib/room/constants";

const STORAGE_KEY = "arcade:adminKey";

export default function AdminPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = origin ? `${origin}/room` : "";

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!adminKey) return;
    const { ok, status, data } = await apiPostAdmin(adminKey, {
      action: "get",
    });
    if (status === 401) {
      setErr("관리자 키가 올바르지 않습니다.");
      setRoom(null);
      return;
    }
    if (status === 503 && data?.error === "admin_disabled") {
      setErr(
        data.message ||
          "서버에 ADMIN_KEY가 설정되어 있지 않습니다."
      );
      setRoom(null);
      return;
    }
    if (!ok || !data?.ok || !data.room) {
      setErr(
        (data as { message?: string })?.message || "방 정보를 불러올 수 없습니다."
      );
      setRoom(null);
      return;
    }
    setErr(null);
    setRoom(data.room);
  }, [adminKey]);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    setLoading(true);
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const t = window.setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [adminKey, refresh]);

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    const k = adminKeyInput.trim();
    if (!k) return;
    sessionStorage.setItem(STORAGE_KEY, k);
    setAdminKey(k);
    setErr(null);
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminKey(null);
    setRoom(null);
    setAdminKeyInput("");
  }

  async function runAction(
    action: string,
    extra: Record<string, unknown> = {}
  ) {
    if (!adminKey) return;
    setBusyAction(action);
    setErr(null);
    try {
      const { ok, status, data } = await apiPostAdmin(adminKey, {
        action,
        ...extra,
      });
      if (status === 401) {
        setErr("관리자 키가 올바르지 않습니다.");
        return;
      }
      if (!ok || !data?.ok) {
        setErr(
          (data as { message?: string })?.message ||
            `작업 실패 (${(data as { error?: string })?.error || action})`
        );
        return;
      }
      if (data.room) setRoom(data.room);
    } finally {
      setBusyAction(null);
    }
  }

  const entries = room
    ? Object.entries(room.members).sort(([a], [b]) => a.localeCompare(b, "ko"))
    : [];

  return (
    <main className="safe-area-page mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href="/" className="text-sm text-sky-400">
            ← 홈
          </Link>
          <h1 className="mt-3 text-xl font-bold text-white">관리자</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">{MAIN_ROOM_ID}</p>
        </div>
        {adminKey && (
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 text-xs text-slate-500 underline"
          >
            키 지우기
          </button>
        )}
      </div>

      <form
        onSubmit={handleSaveKey}
        className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
      >
        <label className="text-xs font-medium text-slate-400">
          관리자 키 (서버 환경 변수 ADMIN_KEY 와 동일)
        </label>
        <input
          type="password"
          autoComplete="off"
          value={adminKeyInput}
          onChange={(e) => setAdminKeyInput(e.target.value)}
          placeholder="ADMIN_KEY 입력"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-700 py-2 text-sm font-semibold text-white"
        >
          키 저장 후 연결
        </button>
      </form>

      {!adminKey && (
        <p className="text-xs text-slate-500">
          API는 <code className="text-slate-400">x-admin-key</code> 헤더로만
          인증됩니다. 키는 브라우저 sessionStorage에만 보관됩니다.
        </p>
      )}

      {adminKey && loading && !room && <Loading label="불러오는 중…" />}
      {err && (
        <p className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {err}
        </p>
      )}

      {adminKey && room && (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-300">
              초대 QR (입장 링크)
            </h2>
            {inviteUrl ? <QRCodeBlock url={inviteUrl} /> : null}
            {inviteUrl && (
              <code className="break-all text-[11px] text-slate-500">
                {inviteUrl}
              </code>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300">
              방 상태:{" "}
              <strong className="text-white">
                {room.phase === "playing" ? "진행 중" : "로비"}
              </strong>
            </span>
            <button
              type="button"
              disabled={busyAction !== null || room.phase === "playing"}
              onClick={() => runAction("start")}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              게임 시작
            </button>
            <button
              type="button"
              disabled={busyAction !== null || room.phase === "lobby"}
              onClick={() => runAction("stop")}
              className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              게임 종료 (로비)
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => {
                if (
                  confirm(
                    "전체 초기화: 참가자·점수·상태가 모두 삭제됩니다. 계속할까요?"
                  )
                ) {
                  runAction("reset");
                }
              }}
              className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200"
            >
              전체 초기화
            </button>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-300">
              대기 · 승인
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-500">
                    <th className="px-3 py-2">닉네임</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2 text-right">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([name, m]) => (
                    <MemberRow
                      key={name}
                      name={name}
                      m={m}
                      busy={busyAction !== null}
                      onApprove={() => runAction("approve", { name })}
                    />
                  ))}
                </tbody>
              </table>
              {entries.length === 0 && (
                <p className="px-3 py-6 text-center text-slate-500">
                  아직 입장한 유저가 없습니다.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function MemberRow({
  name,
  m,
  busy,
  onApprove,
}: {
  name: string;
  m: RoomMember;
  busy: boolean;
  onApprove: () => void;
}) {
  return (
    <tr className="border-t border-slate-800/80 text-slate-300">
      <td className="px-3 py-2.5 font-medium">{name}</td>
      <td className="px-3 py-2.5">
        <span
          className={
            m.status === "approved" ? "text-emerald-400" : "text-amber-300"
          }
        >
          {m.status === "approved" ? "승인됨" : "대기"}
        </span>
        <span className="ml-2 text-xs text-slate-500">
          L{m.bestLevel} / {m.bestScore}점
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        {m.status === "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            승인
          </button>
        )}
      </td>
    </tr>
  );
}
