import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/room/:roomId", destination: "/room", permanent: false },
      { source: "/game/:roomId", destination: "/game", permanent: false },
      { source: "/ranking/:roomId", destination: "/ranking", permanent: false },
    ];
  },
};

export default nextConfig;
