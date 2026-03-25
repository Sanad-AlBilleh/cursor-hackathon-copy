import type { NextConfig } from 'next';

const appDir = import.meta.dirname!;

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      tailwindcss: `${appDir}/node_modules/tailwindcss/index.css`,
      'tw-animate-css': `${appDir}/node_modules/tw-animate-css/dist/tw-animate.css`,
      'shadcn/tailwind.css': `${appDir}/node_modules/shadcn/dist/tailwind.css`,
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
};

export default nextConfig;
