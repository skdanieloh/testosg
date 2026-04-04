import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_PREFIX = "room:";
const ROOM_TTL_SEC = 60 * 60 * 24 * 7;

function pickUpstashRestEnv(): { url: string; token: string } | null {
  const pairs: [string | undefined, string | undefined][] = [
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.STORAGE_URL, process.env.STORAGE_TOKEN],
    [process.env.REDIS_URL, process.env.REDIS_TOKEN],
  ];
  for (const [url, token] of pairs) {
    if (url && token) return { url, token };
  }
  return null;
}

function getRedis(): Redis | null {
  const creds = pickUpstashRestEnv();
  if (!creds) return null;
  return new Redis({ url: creds.url, token: creds.token });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
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
  const redis = getRedis();
  if (!redis) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message: "Redis 환경 변수(UPSTASH_REDIS_REST_URL/TOKEN 등)가 없습니다.",
      },
      503
    );
  }

  const id =
    req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("roomId");
  if (!id || !/^[a-z0-9]{8,12}$/.test(id)) {
    return json({ ok: false, error: "invalid_id" }, 400);
  }

  const raw = await redis.get(`${ROOM_PREFIX}${id}`);
  if (!raw) {
    return json({ ok: false, error: "not_found" }, 404);
  }
  const data =
    typeof raw === "string" ? (JSON.parse(raw) as RoomDoc) : (raw as RoomDoc);
  return json({ ok: true, room: data });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message: "Redis 환경 변수가 없습니다.",
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

  if (action === "create") {
    let id = randomRoomId();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await redis.exists(`${ROOM_PREFIX}${id}`);
      if (!exists) break;
      id = randomRoomId();
    }
    const room: RoomDoc = {
      id,
      createdAt: Date.now(),
      members: {},
    };
    await redis.set(`${ROOM_PREFIX}${id}`, JSON.stringify(room), {
      ex: ROOM_TTL_SEC,
    });
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
    const data =
      typeof raw === "string"
        ? (JSON.parse(raw) as RoomDoc)
        : (raw as RoomDoc);
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
    await redis.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
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
    const data =
      typeof raw === "string"
        ? (JSON.parse(raw) as RoomDoc)
        : (raw as RoomDoc);
    const prev = normalizeMember(data.members[name]);
    const nextScore = Math.max(prev.bestScore, Math.floor(score));
    const nextLevel = Math.max(prev.bestLevel, levelVal);
    data.members[name] = {
      bestScore: nextScore,
      bestLevel: nextLevel,
      updatedAt: Date.now(),
    };
    await redis.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
    return json({
      ok: true,
      room: data,
      submitted: { score: nextScore, level: nextLevel },
    });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
