import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * 루트 `manifest.webmanifest`(start_url 없음) 대신 정적 `/admin/manifest.webmanifest`를 링크.
 * iOS·Android 홈 화면 추가 시 `/admin`에서 열리도록 start_url·scope 고정.
 */
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  title: "관리자",
  appleWebApp: {
    capable: true,
    title: "칼치기 레이싱 · 관리자",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
