import Redis from "ioredis";

/**
 * Redis Cloud / 일반 Redis TCP 연결.
 * Vercel Serverless에서는 동일 인스턴스에서 연결 재사용.
 */
const globalForRedis = globalThis as unknown as { __ioredis?: Redis };

function stripQuotes(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function buildUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim();
  if (raw) return stripQuotes(raw);

  const host = process.env.REDIS_HOST?.trim();
  const password = process.env.REDIS_PASSWORD;
  const port = process.env.REDIS_PORT?.trim() || "6379";
  const tls = process.env.REDIS_TLS === "1" || process.env.REDIS_TLS === "true";

  if (!host || password === undefined || password === "") return null;

  const user = process.env.REDIS_USERNAME?.trim() || "default";
  const scheme = tls ? "rediss" : "redis";
  const enc = encodeURIComponent(password);
  return `${scheme}://${user}:${enc}@${host}:${port}`;
}

export function getRedisClient(): Redis | null {
  const url = buildUrl();
  if (!url) return null;

  if (globalForRedis.__ioredis) return globalForRedis.__ioredis;

  const rejectUnauthorized =
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "0" &&
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false";

  const isTls = url.startsWith("rediss://");

  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    connectTimeout: 15_000,
    commandTimeout: 12_000,
    retryStrategy(times) {
      if (times > 2) return null;
      return Math.min(times * 200, 1000);
    },
    ...(isTls
      ? {
          tls: {
            rejectUnauthorized,
          },
        }
      : {}),
  });

  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  globalForRedis.__ioredis = client;
  return client;
}
