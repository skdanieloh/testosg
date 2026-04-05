"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-shell flex-col items-center justify-center gap-6 sm:gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          아케이드 · 단일 방
        </h1>
        <p className="mt-2 text-sm text-slate-400/95">
          닉네임으로 입장 후 관리자 승인을 받으면 게임에 참여할 수 있습니다.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 px-1 sm:px-0">
        <Link href="/room" className="glass-button-primary w-full py-4 text-center text-lg">
          입장하기
        </Link>
        <Link
          href="/ranking"
          className="glass-button w-full py-3 text-center text-base text-slate-100"
        >
          랭킹 보기
        </Link>
      </div>

      <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500">
        초대 QR은 입장 페이지(`/room`) 링크입니다. 관리자는{" "}
        <Link href="/admin" className="glass-link font-medium underline-offset-2">
          /admin
        </Link>
        에서 승인·게임 시작을 진행합니다.
      </p>
    </main>
  );
}
