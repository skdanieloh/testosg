/** API /api/room 클라이언트 (Redis 백엔드) */

export type RoomMember = {
  bestScore: number;
  bestLevel: number;
  updatedAt: number;
};

export type RoomDoc = {
  id: string;
  createdAt: number;
  members: Record<string, RoomMember>;
};

export async function apiGetRoom(roomId: string) {
  const r = await fetch(`/api/room?id=${encodeURIComponent(roomId)}`, {
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    room?: RoomDoc;
    error?: string;
    message?: string;
  };
  return { ok: r.ok, status: r.status, data };
}

export async function apiPostRoom(body: Record<string, unknown>) {
  const r = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: r.ok, status: r.status, data };
}
