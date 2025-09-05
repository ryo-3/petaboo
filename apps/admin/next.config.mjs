/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@petaboo/ui"],
  // 開発環境での警告を抑制
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
      // Node.js Deprecation警告を抑制
      process.removeAllListeners('warning');
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