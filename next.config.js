/** @type {import('next').NextConfig} */

// Only apply GitHub Pages basePath when explicitly deploying to GitHub Pages
// Vercel sets VERCEL=1, GitHub Pages does NOT — so we use that to differentiate
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // 'export' is needed for GitHub Pages (static export)
  // But on Vercel we DON'T want static export — remove it so SSR/API routes work
  ...(isGithubPages ? { output: 'export' } : {}),

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