import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
  },
  // Vercel serves the standard Next.js build — no custom server needed
  experimental: {
    optimizePackageImports: ['@tabler/icons-react', 'date-fns'],
  },
};

export default nextConfig;
