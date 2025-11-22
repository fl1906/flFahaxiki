import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 生产环境优化
  poweredByHeader: false,
  compress: true,
  // 外部包配置
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
