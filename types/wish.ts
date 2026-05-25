export type WishStatus = 'active' | 'fulfilled' | 'unfulfilled' | 'expired';
export type WishCategory = 'sports' | 'crypto' | 'community' | 'fun' | 'tech' | 'other';
export type VoteType = 'fulfil' | 'nofulfil';
export type WishDuration = 3600000 | 21600000 | 86400000 | 604800000;

export interface Vote {
  voterAddress: string;
  voterNametag: string;
  voteType: VoteType;
  votedAt: number;
}

export interface Wish {
  id: string;
  text: string;
  category: WishCategory;
  creatorNametag: string;
  creatorAddress: string;
  stakedUCT: number;
  createdAt: number;
  expiresAt: number;
  duration: WishDuration;
  status: WishStatus;
  votes: Vote[];
  fulfilCount: number;
  noFulfilCount: number;
}

export interface WalletIdentity {
  nametag?: string;
  directAddress?: string;
  l1Address?: string;
  chainPubkey?: string;
}

export interface LeaderboardEntry {
  nametag: string;
  address: string;
  count: number;
}
