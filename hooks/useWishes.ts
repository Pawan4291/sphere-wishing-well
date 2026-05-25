'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Wish, WishCategory, WishDuration, VoteType } from '../types/wish';
import { loadWishes, saveWishes, addWish, updateWish, resolveExpiredWishes } from '../lib/storage';
import { sendUCT } from '../lib/sphere';

export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>([]);

  const refresh = useCallback(() => {
    resolveExpiredWishes();
    setWishes(loadWishes());
  }, []);

  // Load on mount + resolve expired
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Check expiry every 60 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const createWish = useCallback(async (params: {
    text: string;
    category: WishCategory;
    duration: WishDuration;
    stakeUCT: number;
    creatorNametag: string;
    creatorAddress: string;
  }) => {
    // Send stake UCT to creator's own address (skin in game)
     // await sendUCT(params.creatorAddress, params.stakeUCT);

    const now = Date.now();
    const wish: Wish = {
      id: crypto.randomUUID(),
      text: params.text,
      category: params.category,
      creatorNametag: params.creatorNametag,
      creatorAddress: params.creatorAddress,
      stakedUCT: params.stakeUCT,
      createdAt: now,
      expiresAt: now + params.duration,
      duration: params.duration,
      status: 'active',
      votes: [],
      fulfilCount: 0,
      noFulfilCount: 0,
    };

    addWish(wish);
    refresh();
    return wish;
  }, [refresh]);

  const vote = useCallback(async (params: {
    wish: Wish;
    voteType: VoteType;
    voterAddress: string;
    voterNametag: string;
  }) => {
    const { wish, voteType, voterAddress, voterNametag } = params;

    // Guard: one vote per wallet per wish
    const alreadyVoted = wish.votes.some(v => v.voterAddress === voterAddress);
    if (alreadyVoted) throw new Error('You already voted on this wish');

    // Guard: cannot vote on own wish
    if (wish.creatorAddress === voterAddress) throw new Error('You cannot vote on your own wish');

    // Guard: must be active
    if (wish.status !== 'active') throw new Error('This wish has already expired');

    // Send 1 UCT to wish creator as vote stake
    // await sendUCT(wish.creatorAddress, 1);

    const updated: Wish = {
      ...wish,
      votes: [...wish.votes, { voterAddress, voterNametag, voteType, votedAt: Date.now() }],
      fulfilCount: wish.fulfilCount + (voteType === 'fulfil' ? 1 : 0),
      noFulfilCount: wish.noFulfilCount + (voteType === 'nofulfil' ? 1 : 0),
    };

    updateWish(updated);
    refresh();
    return updated;
  }, [refresh]);

  const getWishById = useCallback((id: string) => {
    return wishes.find(w => w.id === id) ?? null;
  }, [wishes]);

  const hasVoted = useCallback((wishId: string, voterAddress: string) => {
    const wish = wishes.find(w => w.id === wishId);
    return wish?.votes.some(v => v.voterAddress === voterAddress) ?? false;
  }, [wishes]);

  return { wishes, createWish, vote, refresh, getWishById, hasVoted };
}
