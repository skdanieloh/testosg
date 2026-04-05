/** API /api/room 클라이언트 (단일 방 room:main) */

import { MAIN_ROOM_ID } from "@/lib/room/constants";

export type MemberStatus = "pending" | "approved";

export type RoomMember = {
  status: MemberStatus;
  bestScore: number;
  bestLevel: number;
  updatedAt: number;
};

export type RoomPhase = "lobby" | "playing";

export type RoomDoc = {
  id: typeof MAIN_ROOM_ID;
  createdAt: number;
  phase: RoomPhase;
  members: Record<string, RoomMember>;
};

export async function apiGetRoom() {
  const r = await fetch("/api/room", { cache: "no-store" });
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
