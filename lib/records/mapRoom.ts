import type { RecordRow } from "@/types/record";
import type { RoomDoc } from "@/lib/api/roomClient";

/** Redis room 문서 → UI용 행 배열 */
export function roomToRecordRows(roomId: string, room: RoomDoc): RecordRow[] {
  return Object.entries(room.members).map(([nickname, v]) => ({
    id: `${roomId}:${nickname}`,
    room_id: roomId,
    nickname,
    best_score: v.bestScore,
    best_level: v.bestLevel,
    updated_at: new Date(v.updatedAt).toISOString(),
  }));
}
