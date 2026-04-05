"use client";

import type { RecordRow } from "@/types/record";

type Props = {
  rows: RecordRow[];
  highlightNickname?: string | null;
};

export function RankingTable({ rows, highlightNickname }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-600/95 bg-slate-950 shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-[11px] font-bold uppercase tracking-wider text-slate-200/95">
            <th className="w-12 px-3 py-3.5 sm:px-4">#</th>
            <th className="px-2 py-3.5 sm:px-3">이름</th>
            <th className="w-[4.5rem] px-2 py-3.5 text-right sm:w-24">레벨</th>
            <th className="w-[5rem] px-3 py-3.5 text-right sm:w-28">점수</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/90">
          {rows.map((r, i) => {
            const me = highlightNickname && r.nickname === highlightNickname;
            const zebra = i % 2 === 0;
            return (
              <tr
                key={r.id}
                className={
                  me
                    ? "bg-sky-600/35 text-white shadow-[inset_3px_0_0_0_rgba(56,189,248,0.95)]"
                    : zebra
                      ? "bg-slate-900 text-slate-50"
                      : "bg-slate-800/90 text-slate-100"
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
        <p className="bg-slate-900 px-4 py-10 text-center text-base text-slate-400">
          기록이 없습니다.
        </p>
      )}
    </div>
  );
}
