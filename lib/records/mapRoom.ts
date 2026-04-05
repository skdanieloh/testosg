import type { RecordRow } from "@/types/record";
import type { RoomDoc } from "@/lib/api/roomClient";
import { MAIN_ROOM_ID } from "@/lib/room/constants";

/** Redis room 문서 → UI용 행 배열 */
export function roomToRecordRows(
  room: RoomDoc,
  opts?: { approvedOnly?: boolean }
): RecordRow[] {
  const roomId = MAIN_ROOM_ID;
  return Object.entries(room.members)
    .filter(([, v]) => !opts?.approvedOnly || v.status === "approved")
    .map(([nickname, v]) => ({
      id: `${roomId}:${nickname}`,
      room_id: roomId,
      nickname,
      best_score: v.bestScore,
      best_level: v.bestLevel,
      updated_at: new Date(v.updatedAt).toISOString(),
    }));
}
