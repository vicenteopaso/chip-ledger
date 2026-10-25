import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  headers: () => Promise.resolve([{ source: "/:path*", headers: [...SECURITY_HEADERS] }]),
};

export default nextConfig;
