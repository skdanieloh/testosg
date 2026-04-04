"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetRoom } from "@/lib/api/roomClient";
import { roomToRecordRows } from "@/lib/records/mapRoom";
import { sortRecords } from "@/lib/ranking";
import type { RecordRow } from "@/types/record";

const POLL_MS = 4000;

export function useRoomRecords(roomId: string) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { ok, status, data } = await apiGetRoom(roomId);
    if (status === 503 || data?.error === "not_configured") {
      setError(
        (data as { message?: string })?.message ||
          "Redis(Upstash) 환경 변수가 설정되지 않았습니다."
      );
      setRows([]);
      return;
    }
    if (!ok || !data?.ok || !data.room) {
      setError(
        data?.error === "not_found" ? "방을 찾을 수 없습니다." : "불러오기 실패"
      );
      setRows([]);
      return;
    }
    setError(null);
    setRows(sortRecords(roomToRecordRows(roomId, data.room)));
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRows().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const t = window.setInterval(() => {
      fetchRows();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [roomId, fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}
