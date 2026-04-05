"use client";

import type { RecordRow } from "@/types/record";

type Props = {
  rows: RecordRow[];
  highlightNickname?: string | null;
};

export function RankingTable({ rows, highlightNickname }: Props) {
  return (
    <div className="glass glass-elevated w-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-200/95 backdrop-blur-md">
            <th className="w-12 px-3 py-3.5 sm:px-4">#</th>
            <th className="px-2 py-3.5 sm:px-3">이름</th>
            <th className="w-[4.5rem] px-2 py-3.5 text-right sm:w-24">레벨</th>
            <th className="w-[5rem] px-3 py-3.5 text-right sm:w-28">점수</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.07]">
          {rows.map((r, i) => {
            const me = highlightNickname && r.nickname === highlightNickname;
            const zebra = i % 2 === 0;
            return (
              <tr
                key={r.id}
                className={
                  me
                    ? "bg-sky-500/25 text-white shadow-[inset_3px_0_0_0_rgba(56,189,248,0.85)] backdrop-blur-sm"
                    : zebra
                      ? "bg-white/[0.04] text-slate-50"
                      : "bg-black/20 text-slate-100"
                }
              >
                <td className="px-3 py-3.5 text-sm font-semibold tabular-nums text-slate-200 sm:px-4 sm:text-base">
                  {i + 1}
                </td>
                <td className="px-2 py-3.5 text-sm font-medium sm:px-3 sm:text-base">
                  {r.nickname}
                </td>
                <td className="px-2 py-3.5 text-right text-base font-semibold tabular-nums text-white sm:text-lg">
                  {r.best_level}
                </td>
                <td className="px-3 py-3.5 text-right text-base font-semibold tabular-nums text-white sm:text-lg">
                  {r.best_score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="border-t border-white/[0.06] bg-black/15 px-4 py-10 text-center text-base text-slate-400 backdrop-blur-sm">
          기록이 없습니다.
        </p>
      )}
    </div>
  );
}
