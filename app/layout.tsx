import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

/** OG/Twitter 절대 URL 생성. 배포 도메인은 NEXT_PUBLIC_SITE_URL 권장. */
const metadataBase = new URL(siteUrl ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
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
