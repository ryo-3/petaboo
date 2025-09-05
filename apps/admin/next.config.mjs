/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@petaboo/ui"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:7594/:path*',
      },
    ]
  },
  // 開発環境での警告を抑制
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
  // Next.js devツール（Nマーク）を完全無効化
  devIndicators: false,
  experimental: {
    forceSwcTransforms: true,
  },
}

export default nextConfig