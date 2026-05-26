'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Wish, WishCategory, WishDuration, VoteType, PayoutEntry } from '../types/wish';
import { supabase } from '../lib/supabase';
import { payToTreasury } from '../lib/sphere';
import { VOTE_COST_UCT } from '../lib/constants';

export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>([]);

  const refresh = useCallback(async () => {
    const { data: wishesData } = await supabase
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: votesData } = await supabase
      .from('votes')
      .select('*');

    const mapped: Wish[] = (wishesData ?? []).map((w: any) => {
      const votes = (votesData ?? [])
        .filter((v: any) => v.wish_id === w.id)
        .map((v: any) => ({
          voterAddress: v.voter_address,
          voterNametag: v.voter_nametag,
          voteType: v.vote_type as VoteType,
          votedAt: v.voted_at,
        }));

      return {
        id: w.id,
        text: w.text,
        category: w.category,
        creatorNametag: w.creator_nametag,
        creatorAddress: w.creator_address,
        stakedUCT: w.staked_uct,
        createdAt: w.created_at,
        expiresAt: w.expires_at,
        duration: w.duration,
        status: w.status,
        fulfilCount: w.fulfil_count,
        noFulfilCount: w.no_fulfil_count,
        poolUCT: w.pool_uct ?? 0,
        payoutMap: w.payout_map ?? null,
        resolvedAt: w.resolved_at ?? null,
        votes,
      } as Wish;
    });

    setWishes(mapped);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const createWish = useCallback(
    async (params: {
      text: string;
      category: WishCategory;
      duration: WishDuration;
      stakeUCT: number;
      creatorNametag: string;
      creatorAddress: string;
    }) => {
      if (!params.creatorAddress?.trim()) {
        throw new Error('Your wallet address is missing. Please disconnect and reconnect.');
      }

      // Pay stake into treasury (not to creator directly anymore)
      await payToTreasury(params.stakeUCT);

      const now = Date.now();
      const id = crypto.randomUUID();

      await supabase.from('wishes').insert({
        id,
        text: params.text,
        category: params.category,
        creator_nametag: params.creatorNametag,
        creator_address: params.creatorAddress,
        staked_uct: params.stakeUCT,
        created_at: now,
        expires_at: now + params.duration,
        duration: params.duration,
        status: 'active',
        fulfil_count: 0,
        no_fulfil_count: 0,
        pool_uct: params.stakeUCT, // creator stake starts the pool
        payout_map: null,
        resolved_at: null,
      });

      await refresh();
    },
    [refresh]
  );

  const vote = useCallback(
    async (params: {
      wish: Wish;
      voteType: VoteType;
      voterAddress: string;
      voterNametag: string;
    }) => {
      const { wish, voteType, voterAddress, voterNametag } = params;

      if (!voterAddress?.trim()) {
        throw new Error('Your wallet address is missing. Please reconnect.');
      }
      if (wish.votes.some(v => v.voterAddress === voterAddress)) {
        throw new Error('You already voted on this wish');
      }
      if (wish.creatorAddress === voterAddress) {
        throw new Error('Cannot vote on your own wish');
      }
      if (wish.status !== 'active') {
        throw new Error('This wish has expired');
      }

      // Pay 1 UCT into treasury (server will handle distribution on resolution)
      await payToTreasury(VOTE_COST_UCT);

      await supabase.from('votes').insert({
        wish_id: wish.id,
        voter_address: voterAddress,
        voter_nametag: voterNametag,
        vote_type: voteType,
        voted_at: Date.now(),
        treasury_confirmed: false,
      });

      // Update counts and pool
      await supabase
        .from('wishes')
        .update({
          fulfil_count: wish.fulfilCount + (voteType === 'fulfil' ? 1 : 0),
          no_fulfil_count: wish.noFulfilCount + (voteType === 'nofulfil' ? 1 : 0),
          pool_uct: wish.poolUCT + VOTE_COST_UCT,
        })
        .eq('id', wish.id);

      await refresh();
    },
    [refresh]
  );

  const hasVoted = useCallback(
    (wishId: string, voterAddress: string) => {
      const wish = wishes.find(w => w.id === wishId);
      return wish?.votes.some(v => v.voterAddress === voterAddress) ?? false;
    },
    [wishes]
  );

  /**
   * Get a user's payout for a specific wish (from stored payout_map).
   */
  const getUserPayout = useCallback(
    (wishId: string, userAddress: string): PayoutEntry | null => {
      const wish = wishes.find(w => w.id === wishId);
      if (!wish?.payoutMap) return null;
      return wish.payoutMap[userAddress] ?? null;
    },
    [wishes]
  );

  return { wishes, createWish, vote, refresh, hasVoted, getUserPayout };
}