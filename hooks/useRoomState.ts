"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetRoom, type RoomDoc } from "@/lib/api/roomClient";

const POLL_MS = 1000;

export function useRoomState() {
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    const { ok, status, data } = await apiGetRoom();
    if (status === 503 || data?.error === "not_configured") {
      setError(
        (data as { message?: string })?.message ||
          "Redis 연결 환경 변수가 없습니다."
      );
      setRoom(null);
      return;
    }
    if (!ok || !data?.ok || !data.room) {
      setError("방 정보를 불러올 수 없습니다.");
      setRoom(null);
      return;
    }
    setError(null);
    setRoom(data.room);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRoom().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const t = window.setInterval(fetchRoom, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [fetchRoom]);

  return { room, loading, error, refetch: fetchRoom };
}
