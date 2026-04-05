import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis/client";
import { MAIN_ROOM_ID, mainRoomRedisKey } from "@/lib/room/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_TTL_SEC = 60 * 60 * 24 * 7;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function redisErrorPayload(err: unknown) {
  const e = err as { message?: string; code?: string };
  return {
    ok: false as const,
    error: "redis_error" as const,
    message: e.message || String(err),
    code: e.code || undefined,
  };
}

function sanitizeName(name: unknown): string {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 24);
}

type MemberStatus = "pending" | "approved";

type Member = {
  status: MemberStatus;
  bestScore: number;
  bestLevel: number;
  updatedAt: number;
};

type RoomDoc = {
  id: typeof MAIN_ROOM_ID;
  createdAt: number;
  phase: "lobby" | "playing";
  members: Record<string, Member>;
};

function normalizeMemberFromRedis(m: unknown): Member {
  if (!m || typeof m !== "object") {
    return {
      status: "pending",
      bestScore: 0,
      bestLevel: 0,
      updatedAt: Date.now(),
    };
  }
  const o = m as Record<string, unknown>;
  const hasStatus = "status" in o;
  const status: MemberStatus =
    o.status === "approved" ? "approved" : "pending";
  const base = {
    status,
    bestScore: Number.isFinite(o.bestScore) ? Number(o.bestScore) : 0,
    bestLevel: Number.isFinite(o.bestLevel) ? Number(o.bestLevel) : 0,
    updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
  };
  if (!hasStatus) {
    return { ...base, status: "approved" };
  }
  return base;
}

function migrateRoom(parsed: unknown): RoomDoc {
  const o = parsed as Partial<RoomDoc>;
  const members: Record<string, Member> = {};
  for (const [k, v] of Object.entries(o.members || {})) {
    members[k] = normalizeMemberFromRedis(v);
  }
  return {
    id: MAIN_ROOM_ID,
    createdAt: Number.isFinite(o.createdAt) ? Number(o.createdAt) : Date.now(),
    phase: o.phase === "playing" ? "playing" : "lobby",
    members,
  };
}

function emptyRoom(): RoomDoc {
  return {
    id: MAIN_ROOM_ID,
    createdAt: Date.now(),
    phase: "lobby",
    members: {},
  };
}

async function getOrCreateMainRoom(
  redis: NonNullable<ReturnType<typeof getRedisClient>>
): Promise<RoomDoc> {
  const key = mainRoomRedisKey();
  const raw = await redis.get(key);
  if (!raw) {
    const room = emptyRoom();
    await redis.set(key, JSON.stringify(room), "EX", ROOM_TTL_SEC);
    return room;
  }
  return migrateRoom(JSON.parse(raw));
}

async function saveRoom(
  redis: NonNullable<ReturnType<typeof getRedisClient>>,
  room: RoomDoc
) {
  await redis.set(mainRoomRedisKey(), JSON.stringify(room), "EX", ROOM_TTL_SEC);
}

function checkAdmin(req: NextRequest): "ok" | "unauthorized" | "disabled" {
  const envKey = process.env.ADMIN_KEY?.trim();
  if (!envKey) return "disabled";
  const h = req.headers.get("x-admin-key")?.trim();
  if (h === envKey) return "ok";
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    if (auth.slice(7).trim() === envKey) return "ok";
  }
  return "unauthorized";
}

export async function POST(req: NextRequest) {
  const gate = checkAdmin(req);
  if (gate === "disabled") {
    return json(
      {
        ok: false,
        error: "admin_disabled",
        message: "서버에 ADMIN_KEY 환경 변수가 설정되어 있지 않습니다.",
      },
      503
    );
  }
  if (gate === "unauthorized") {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const redis = getRedisClient();
  if (!redis) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message: "Redis 연결 정보가 없습니다.",
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
    if (action === "get") {
      const room = await getOrCreateMainRoom(redis);
      return json({ ok: true, room });
    }

    if (action === "approve") {
      const name = sanitizeName(body.name);
      if (!name) {
        return json({ ok: false, error: "invalid_params" }, 400);
      }
      const room = await getOrCreateMainRoom(redis);
      if (!room.members[name]) {
        return json({ ok: false, error: "not_found" }, 404);
      }
      const m = normalizeMemberFromRedis(room.members[name]);
      room.members[name] = { ...m, status: "approved" };
      await saveRoom(redis, room);
      return json({ ok: true, room });
    }

    if (action === "start") {
      const room = await getOrCreateMainRoom(redis);
      room.phase = "playing";
      await saveRoom(redis, room);
      return json({ ok: true, room });
    }

    if (action === "stop") {
      const room = await getOrCreateMainRoom(redis);
      room.phase = "lobby";
      await saveRoom(redis, room);
      return json({ ok: true, room });
    }

    if (action === "reset") {
      const room = emptyRoom();
      await saveRoom(redis, room);
      return json({ ok: true, room });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (err) {
    console.error("[api/admin POST]", action, err);
    return json(redisErrorPayload(err), 503);
  }
}
