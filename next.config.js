/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  trailingSlash: true,

  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://sphere.unicity.network https://unicity-sphere.github.io;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;