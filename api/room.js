const crypto = require("node:crypto");
const { Redis } = require("@upstash/redis");

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

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  let redis;
  try {
    redis = Redis.fromEnv();
  } catch {
    return sendJson(res, 503, {
      ok: false,
      error: "not_configured",
      message: "Redis 환경 변수가 없습니다.",
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
    const raw = await redis.get(`${ROOM_PREFIX}${id}`);
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
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await redis.exists(`${ROOM_PREFIX}${id}`);
      if (!exists) break;
      id = randomRoomId();
    }
    const room = {
      id,
      createdAt: Date.now(),
      members: {},
    };
    await redis.set(`${ROOM_PREFIX}${id}`, JSON.stringify(room), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, { ok: true, roomId: id, room });
  }

  if (action === "join") {
    const roomId = sanitizeRoomId(body.roomId);
    const name = sanitizeName(body.name);
    if (!roomId || !name) {
      return sendJson(res, 400, { ok: false, error: "invalid_params" });
    }
    const key = `${ROOM_PREFIX}${roomId}`;
    const raw = await redis.get(key);
    if (!raw) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data.members[name]) {
      data.members[name] = { bestScore: 0, updatedAt: Date.now() };
    }
    await redis.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, { ok: true, room: data });
  }

  if (action === "score") {
    const roomId = sanitizeRoomId(body.roomId);
    const name = sanitizeName(body.name);
    const score = Number(body.score);
    if (!roomId || !name || !Number.isFinite(score) || score < 0) {
      return sendJson(res, 400, { ok: false, error: "invalid_params" });
    }
    const key = `${ROOM_PREFIX}${roomId}`;
    const raw = await redis.get(key);
    if (!raw) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const prev = data.members[name]?.bestScore ?? 0;
    const next = Math.max(prev, Math.floor(score));
    data.members[name] = { bestScore: next, updatedAt: Date.now() };
    await redis.set(key, JSON.stringify(data), { ex: ROOM_TTL_SEC });
    return sendJson(res, 200, { ok: true, room: data, submitted: next });
  }

  return sendJson(res, 400, { ok: false, error: "unknown_action" });
};
