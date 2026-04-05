import type { RoomDoc } from "@/lib/api/roomClient";

export async function apiPostAdmin(
  adminKey: string,
  body: Record<string, unknown>
) {
  const r = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(body),
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
