const crypto = require("node:crypto");

const ROOM_PREFIX = "room:";
const ROOM_TTL_SEC = 60 * 60 * 24 * 7;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function randomRoomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const buf = crypto.randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[buf[i] % chars.length];
  return s;
}

function sanitizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 24);
}

function sanitizeRoomId(id) {
  if (typeof id !== "string") return "";
  return /^[a-z0-9]{8,12}$/.test(id) ? id : "";
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Vercel Marketplace의 Redis(Upstash) 연동 시 설정되는 UPSTASH_REDIS_REST_URL / TOKEN 사용.
 * fromEnv() 대신 명시 연결로 배포 환경에서 누락을 줄입니다.
 */
function createStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = require("@upstash/redis");
  const redis = new Redis({ url, token });
  return {
    async get(k) {
      return redis.get(k);
    },
    async set(k, v, opts) {
      return redis.set(k, v, opts);
    },
    async exists(k) {
      const n = await redis.exists(k);
      return Number(n) > 0;
    },
  };
}

function normalizeMember(m) {
  if (!m || typeof m !== "object") {
    return { bestScore: 0, bestLevel: 0, updatedAt: Date.now() };
  }
  return {
    bestScore: Number.isFinite(m.bestScore) ? m.bestScore : 0,
    bestLevel: Number.isFinite(m.bestLevel) ? m.bestLevel : 0,
    updatedAt: Number.isFinite(m.updatedAt) ? m.updatedAt : Date.now(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  const store = createStore();
  if (!store) {
    return sendJson(res, 503, {
      ok: false,
      error: "not_configured",
      message:
        "저장소가 없습니다. Vercel에 Upstash Redis(UPSTASH_REDIS_REST_URL/TOKEN) 또는 Storage → KV를 연결하세요.",
    });
  }

  if (req.method === "GET") {
    const fromQuery = req.query && req.query.id;
    let id = typeof fromQuery === "string" ? fromQuery : "";
    if (!id && req.url) {
      try {
        const u = new URL(req.url, "http://local");
        id = u.searchParams.get("id") || "";
      } catch {
        id = "";
      }
    }
    if (!id || !/^[a-z0-9]{8,12}$/.test(id)) {
      return sendJson(res, 400, { ok: false, error: "invalid_id" });
    }
    const raw = await store.get(`${ROOM_PREFIX}${id}`);
    if (!raw) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return sendJson(res, 200, { ok: true, room: data });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return sendJson(res, 400, { ok: false, error: "bad_json" });
  }

  const action = body.action;

  if (action === "create") {
    let id = randomRoomId();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await store.exists(`${ROOM_PREFIX}${id}`);
      if (!exists) break;
      id = randomRoomId();
    }
    const room = {
      id,
      createdAt: Date.now(),
      members: {},
    };
    await store.set(`${ROOM_PREFIX}${id}`, JSON.stringify(room), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, { ok: true, roomId: id, room });
  }

  if (action === "join") {
    const roomId = sanitizeRoomId(body.roomId);
    const name = sanitizeName(body.name);
    if (!roomId || !name) {
      return sendJson(res, 400, { ok: false, error: "invalid_params" });
    }
    const key = `${ROOM_PREFIX}${roomId}`;
    const raw = await store.get(key);
    if (!raw) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data.members[name]) {
      data.members[name] = { bestScore: 0, bestLevel: 0, updatedAt: Date.now() };
    } else {
      data.members[name] = normalizeMember(data.members[name]);
    }
    await store.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, { ok: true, room: data });
  }

  if (action === "score") {
    const roomId = sanitizeRoomId(body.roomId);
    const name = sanitizeName(body.name);
    const score = Number(body.score);
    const level = Number(body.level);
    if (!roomId || !name || !Number.isFinite(score) || score < 0) {
      return sendJson(res, 400, { ok: false, error: "invalid_params" });
    }
    const levelVal = Number.isFinite(level) && level >= 0 ? Math.floor(level) : 0;
    const key = `${ROOM_PREFIX}${roomId}`;
    const raw = await store.get(key);
    if (!raw) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const prev = normalizeMember(data.members[name]);
    const nextScore = Math.max(prev.bestScore, Math.floor(score));
    const nextLevel = Math.max(prev.bestLevel, levelVal);
    data.members[name] = {
      bestScore: nextScore,
      bestLevel: nextLevel,
      updatedAt: Date.now(),
    };
    await store.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, {
      ok: true,
      room: data,
      submitted: { score: nextScore, level: nextLevel },
    });
  }

  return sendJson(res, 400, { ok: false, error: "unknown_action" });
};
