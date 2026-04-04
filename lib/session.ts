const key = (roomId: string) => `arcade:nickname:${roomId}`;

export function getStoredNickname(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key(roomId));
}

export function setStoredNickname(roomId: string, nickname: string) {
  sessionStorage.setItem(key(roomId), nickname);
}

export function clearStoredNickname(roomId: string) {
  sessionStorage.removeItem(key(roomId));
}
