"use client";

import type { RecordRow } from "@/types/record";

type Props = {
  rows: RecordRow[];
  highlightNickname?: string | null;
};

export function RankingTable({ rows, highlightNickname }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-500">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2 text-right">레벨</th>
            <th className="px-3 py-2 text-right">점수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const me = highlightNickname && r.nickname === highlightNickname;
            return (
              <tr
                key={r.id}
                className={
                  me
                    ? "bg-sky-950/50 text-sky-300"
                    : "border-t border-slate-800/80 text-slate-300"
                }
              >
                <td className="px-3 py-2.5">{i + 1}</td>
                <td className="px-3 py-2.5 font-medium">{r.nickname}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.best_level}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.best_score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-3 py-6 text-center text-slate-500">기록이 없습니다.</p>
      )}
    </div>
  );
}
