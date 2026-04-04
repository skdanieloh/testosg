"use client";

export function Loading({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
