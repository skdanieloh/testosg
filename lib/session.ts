import { MAIN_ROOM_ID } from "@/lib/room/constants";

const storageKey = `arcade:nickname:${MAIN_ROOM_ID}`;

export function getStoredNickname(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(storageKey);
}

export function setStoredNickname(nickname: string) {
  sessionStorage.setItem(storageKey, nickname);
}

export function clearStoredNickname() {
  sessionStorage.removeItem(storageKey);
}
