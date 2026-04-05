import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * OG·Twitter·카카오 링크 미리보기는 og:image 가 **공유한 URL과 같은 호스트**인 쪽이 안전함.
 * Vercel 빌드만 쓰면 VERCEL_URL 이 배포별 프리뷰 도메인이라 og:image 가 testosg.vercel.app 과 달라질 수 있음 → 카카오 썸네일 실패 원인.
 * 우선순위: NEXT_PUBLIC_SITE_URL → 프로덕션 호스트(VERCEL_PROJECT_PRODUCTION_URL) → 배포 URL(VERCEL_URL).
 */
function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const metadataBase = new URL(siteOrigin());

export const metadata: Metadata = {
  metadataBase,
  alternates: {
    canonical: "/",
  },
  title: {
    default: "칼치기 레이싱",
    template: "%s · 칼치기 레이싱",
  },
  description:
    "고속도로를 질주하며 장애물을 피하는 아케이드 레이싱. 오승균이 만든 첫 게임! 친구들과 랭킹을 겨뤄보자고!",
  applicationName: "칼치기 레이싱",
  authors: [{ name: "오승균" }],
  openGraph: {
    type: "website",
    url: "/",
    locale: "ko_KR",
    siteName: "칼치기 레이싱",
    title: "칼치기 레이싱",
    description:
      "고속도로를 질주하며 장애물을 피하는 아케이드 레이싱. 오승균이 만든 첫 게임! 친구들과 랭킹을 겨뤄보자고!",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 537,
        alt: "칼치기 레이싱 — 탑뷰 레이싱 게임",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "칼치기 레이싱",
    description:
      "고속도로를 질주하며 장애물을 피하는 아케이드 레이싱. 오승균이 만든 첫 게임! 친구들과 랭킹을 겨뤄보자고!",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512" }],
  },
  appleWebApp: {
    capable: true,
    title: "칼치기 레이싱",
    statusBarStyle: "black-translucent",
  },
  /** app/manifest.ts 대신 정적 파일 — 하위 세그먼트에서 manifest 덮어쓰기 가능 */
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
