import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fdn.gsmarena.com",
      },
      {
        protocol: "https",
        hostname: "fdn2.gsmarena.com",
      },
    ],
  },
};

export default nextConfig;
