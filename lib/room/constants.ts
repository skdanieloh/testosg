/** 단일 방 — Redis 키 `room:main` */
export const MAIN_ROOM_ID = "main" as const;

export function mainRoomRedisKey(prefix = "room:") {
  return `${prefix}${MAIN_ROOM_ID}`;
}
