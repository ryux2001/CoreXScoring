import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: buildSecurityHeaders({
        production: process.env.NODE_ENV === "production",
        enableHsts: process.env.SECURE_HEADERS_HSTS === "true",
      }),
    }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
