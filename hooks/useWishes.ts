'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Wish,
  WishCategory,
  WishDuration,
  VoteType,
} from '../types/wish';

import { supabase } from '../lib/supabase';
import { sendUCT } from '../lib/sphere';

const BUILDER_WALLET = '@pawan429';

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

      if (!params.creatorNametag) {
        throw new Error(
          'Wallet nametag missing. Please disconnect and reconnect your wallet.'
        );
      }

      const now = Date.now();

      try {
        await sendUCT(
          BUILDER_WALLET,
          params.stakeUCT,
          `Wish stake · ${params.text} · by @${params.creatorNametag}`
        );
      } catch (e: any) {
        throw new Error(e?.message || 'Payment failed');
      }

      const id = crypto.randomUUID();

      await supabase.from('wishes').insert({
        id,
        text: params.text,
        category: params.category,
        creator_nametag: params.creatorNametag,
        creator_address: params.creatorAddress, // ✅ FIXED: was params.creatorNametag
        staked_uct: params.stakeUCT,
        created_at: now,
        expires_at: now + params.duration,
        duration: params.duration,
        status: 'active',
        fulfil_count: 0,
        no_fulfil_count: 0,
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

      if (!voterNametag) {
        throw new Error('Wallet not connected. Please connect your wallet.');
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

      try {
        await sendUCT(
          BUILDER_WALLET,
          1,
          `Vote: ${voteType} · Wish: ${wish.text.slice(0, 50)} · by @${voterNametag}`
        );
      } catch (e: any) {
        throw new Error(e?.message || 'Vote payment failed');
      }

      await supabase.from('votes').insert({
        wish_id: wish.id,
        voter_address: voterAddress,
        voter_nametag: voterNametag,
        vote_type: voteType,
        voted_at: Date.now(),
      });

      await supabase
        .from('wishes')
        .update({
          fulfil_count: wish.fulfilCount + (voteType === 'fulfil' ? 1 : 0),
          no_fulfil_count: wish.noFulfilCount + (voteType === 'nofulfil' ? 1 : 0),
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

  return {
    wishes,
    createWish,
    vote,
    refresh,
    hasVoted,
  };
}