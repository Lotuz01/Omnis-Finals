import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
  },
  typescript: {
    // Durante o build, ignorar erros de tipo para acelerar o processo
    ignoreBuildErrors: false,
  },
  eslint: {
    // Durante o build, ignorar erros de ESLint
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost'],
  },
  // Configurações de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;