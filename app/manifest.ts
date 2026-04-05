import type { MetadataRoute } from "next";

/**
 * 홈 화면 추가(iOS·Android) / PWA 설치 시 이름·아이콘.
 * public/icon.png · apple-touch-icon.png — 동일 512×512 앱 아이콘 에셋.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "칼치기 레이싱",
    short_name: "칼치기 레이싱",
    description:
      "고속도로를 질주하며 장애물을 피하는 아케이드 레이싱. 방 입장·랭킹 지원.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
