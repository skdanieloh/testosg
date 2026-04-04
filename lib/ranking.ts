import type { RecordRow } from "@/types/record";

/** 정렬: best_level ↓, best_score ↓, nickname ↑ */
export function sortRecords(rows: RecordRow[]): RecordRow[] {
  return [...rows].sort((a, b) => {
    if (b.best_level !== a.best_level) return b.best_level - a.best_level;
    if (b.best_score !== a.best_score) return b.best_score - a.best_score;
    return a.nickname.localeCompare(b.nickname, "ko");
  });
}
