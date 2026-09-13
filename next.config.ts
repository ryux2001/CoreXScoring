import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: buildSecurityHeaders({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        production: process.env.NODE_ENV === "production",
        enableHsts: process.env.SECURE_HEADERS_HSTS === "true",
      }),
    }];
  },
};

export default nextConfig;
