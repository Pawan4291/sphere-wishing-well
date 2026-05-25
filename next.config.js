/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required so Sphere can embed as iframe
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Sphere to iframe your app
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://sphere.unicity.network https://unicity-sphere.github.io",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
