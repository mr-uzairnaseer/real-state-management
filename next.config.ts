import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['@tabler/icons-react', 'date-fns'],
  },
  // Allow larger media uploads through API routes
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
