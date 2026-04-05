"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetRoom } from "@/lib/api/roomClient";
import { roomToRecordRows } from "@/lib/records/mapRoom";
import { sortRecords } from "@/lib/ranking";
import type { RecordRow } from "@/types/record";

const POLL_MS = 1000;

/** 승인된 멤버만 랭킹 행으로 (공개 랭킹용) */
export function useRoomRecords() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { ok, status, data } = await apiGetRoom();
    if (status === 503 || data?.error === "not_configured") {
      setError(
        (data as { message?: string })?.message ||
          "REDIS_URL 등 Redis 연결 환경 변수가 없습니다."
      );
      setRows([]);
      return;
    }
    if (!ok || !data?.ok || !data.room) {
      setError("불러오기 실패");
      setRows([]);
      return;
    }
    setError(null);
    setRows(sortRecords(roomToRecordRows(data.room, { approvedOnly: true })));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRows().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const t = window.setInterval(fetchRows, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}
