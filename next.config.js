/** @type {import('next').NextConfig} */
const isGithubPages = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  trailingSlash: true,

  basePath: isGithubPages ? '/sphere-wishing-well' : '',
  assetPrefix: isGithubPages ? '/sphere-wishing-well/' : '',

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
              "frame-ancestors 'self' https://sphere.unicity.network https://unicity-sphere.github.io",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;