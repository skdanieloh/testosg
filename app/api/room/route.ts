import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_PREFIX = "room:";
const ROOM_TTL_SEC = 60 * 60 * 24 * 7;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function redisErrorPayload(err: unknown) {
  const e = err as { message?: string; code?: string };
  const msg = e.message || String(err);
  const code = e.code;
  return {
    ok: false as const,
    error: "redis_error" as const,
    message: msg,
    code: code || undefined,
  };
}

function sanitizeName(name: unknown): string {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 24);
}

function sanitizeRoomId(id: unknown): string {
  if (typeof id !== "string") return "";
  return /^[a-z0-9]{8,12}$/.test(id) ? id : "";
}

function randomRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[arr[i]! % chars.length];
  return s;
}

type Member = { bestScore: number; bestLevel: number; updatedAt: number };

function normalizeMember(m: unknown): Member {
  if (!m || typeof m !== "object") {
    return { bestScore: 0, bestLevel: 0, updatedAt: Date.now() };
  }
  const o = m as Record<string, unknown>;
  return {
    bestScore: Number.isFinite(o.bestScore) ? Number(o.bestScore) : 0,
    bestLevel: Number.isFinite(o.bestLevel) ? Number(o.bestLevel) : 0,
    updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
  };
}

type RoomDoc = {
  id: string;
  createdAt: number;
  members: Record<string, Member>;
};

export async function GET(req: NextRequest) {
  const redis = getRedisClient();
  if (!redis) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message:
          "REDIS_URL(또는 REDIS_HOST+REDIS_PASSWORD+REDIS_TLS)이 설정되지 않았습니다.",
      },
      503
    );
  }

  const id =
    req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("roomId");
  if (!id || !/^[a-z0-9]{8,12}$/.test(id)) {
    return json({ ok: false, error: "invalid_id" }, 400);
  }

  try {
    const raw = await redis.get(`${ROOM_PREFIX}${id}`);
    if (!raw) {
      return json({ ok: false, error: "not_found" }, 404);
    }
    const data = JSON.parse(raw) as RoomDoc;
    return json({ ok: true, room: data });
  } catch (err) {
    console.error("[api/room GET]", err);
    return json(redisErrorPayload(err), 503);
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedisClient();
  if (!redis) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message:
          "Redis 연결 정보 없음: Vercel에 REDIS_URL을 설정하세요 (Redis Cloud Connect의 rediss:// URL).",
      },
      503
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const action = body.action;

  try {
    if (action === "create") {
      let id = randomRoomId();
      for (let attempt = 0; attempt < 8; attempt++) {
        const n = await redis.exists(`${ROOM_PREFIX}${id}`);
        if (n === 0) break;
        id = randomRoomId();
      }
      const room: RoomDoc = {
        id,
        createdAt: Date.now(),
        members: {},
      };
      await redis.set(
        `${ROOM_PREFIX}${id}`,
        JSON.stringify(room),
        "EX",
        ROOM_TTL_SEC
      );
      return json({ ok: true, roomId: id, room });
    }

    if (action === "join") {
      const roomId = sanitizeRoomId(body.roomId);
      const name = sanitizeName(body.name);
      if (!roomId || !name) {
        return json({ ok: false, error: "invalid_params" }, 400);
      }
      const key = `${ROOM_PREFIX}${roomId}`;
      const raw = await redis.get(key);
      if (!raw) {
        return json({ ok: false, error: "not_found" }, 404);
      }
      const data = JSON.parse(raw) as RoomDoc;
      const memberKeys = Object.keys(data.members);
      if (!data.members[name] && memberKeys.length >= 10) {
        return json({ ok: false, error: "room_full" }, 400);
      }
      if (!data.members[name]) {
        data.members[name] = {
          bestScore: 0,
          bestLevel: 0,
          updatedAt: Date.now(),
        };
      } else {
        data.members[name] = normalizeMember(data.members[name]);
      }
      await redis.set(key, JSON.stringify(data), "EX", ROOM_TTL_SEC);
      return json({ ok: true, room: data });
    }

    if (action === "score") {
      const roomId = sanitizeRoomId(body.roomId);
      const name = sanitizeName(body.name);
      const score = Number(body.score);
      const level = Number(body.level);
      if (!roomId || !name || !Number.isFinite(score) || score < 0) {
        return json({ ok: false, error: "invalid_params" }, 400);
      }
      const levelVal =
        Number.isFinite(level) && level >= 0 ? Math.floor(level) : 0;
      const key = `${ROOM_PREFIX}${roomId}`;
      const raw = await redis.get(key);
      if (!raw) {
        return json({ ok: false, error: "not_found" }, 404);
      }
      const data = JSON.parse(raw) as RoomDoc;
      const prev = normalizeMember(data.members[name]);
      const nextScore = Math.max(prev.bestScore, Math.floor(score));
      const nextLevel = Math.max(prev.bestLevel, levelVal);
      data.members[name] = {
        bestScore: nextScore,
        bestLevel: nextLevel,
        updatedAt: Date.now(),
      };
      await redis.set(key, JSON.stringify(data), "EX", ROOM_TTL_SEC);
      return json({
        ok: true,
        room: data,
        submitted: { score: nextScore, level: nextLevel },
      });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (err) {
    console.error("[api/room POST]", action, err);
    return json(redisErrorPayload(err), 503);
  }
}
