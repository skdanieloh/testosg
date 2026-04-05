"use client";

export function Loading({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-slate-400">
      <div
        className="glass flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
        aria-hidden
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/80 border-t-transparent" />
      </div>
      <p className="text-sm text-slate-400/90">{label}</p>
    </div>
  );
}
