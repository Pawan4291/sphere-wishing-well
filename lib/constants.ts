import type { WishDuration, WishCategory } from '../types/wish';

export const UCT_DECIMALS = 1_000_000_000_000_000_000n;

export const DURATIONS: { label: string; value: WishDuration; short: string }[] = [
  { label: '1 Hour',  value: 3600000,   short: '1h' },
  { label: '6 Hours', value: 21600000,  short: '6h' },
  { label: '24 Hours',value: 86400000,  short: '24h' },
  { label: '7 Days',  value: 604800000, short: '7d' },
];

export const CATEGORIES: { label: string; value: WishCategory; emoji: string }[] = [
  { label: 'Sports',    value: 'sports',    emoji: '🏆' },
  { label: 'Crypto',    value: 'crypto',    emoji: '💰' },
  { label: 'Community', value: 'community', emoji: '🌐' },
  { label: 'Tech',      value: 'tech',      emoji: '⚡' },
  { label: 'Fun',       value: 'fun',       emoji: '🎉' },
  { label: 'Other',     value: 'other',     emoji: '✨' },
];

export const STAKE_OPTIONS = [1, 5, 10];
export const VOTE_COST_UCT = 1; // each vote costs 1 UCT into treasury

export const SPHERE_WALLET_URL = 'https://sphere.unicity.network';
export const STORAGE_KEY = 'sphere_wishes_v1';
export const LEADERBOARD_KEY = 'sphere_leaderboard_v1';

// Backend resolution API (your Next.js API route, called by GitHub Actions)
export const RESOLVE_API_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/resolve`
  : '/api/resolve';