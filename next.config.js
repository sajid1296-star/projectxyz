/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['62.72.16.124']
  },
  experimental: {
    serverActions: true
  },
  env: {
    APP_URL: process.env.APP_URL,
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'bcrypt'];
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  output: 'standalone'
};

module.exports = nextConfig; 