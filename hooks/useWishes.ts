'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Wish, WishCategory, WishDuration, VoteType } from '../types/wish';
import { supabase } from '../lib/supabase';
import { sendUCT } from '../lib/sphere';

const TREASURY = '@pawan429';

export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>([]);

  const refresh = useCallback(async () => {
  const { data: wishesData } = await supabase
    .from('wishes')
    .select('*')
    .order('created_at', { ascending: false });

  // ✅ FIX: fetch votes in batches to bypass 1000 row limit
  const wishIds = (wishesData ?? []).map((w: any) => w.id);
  
  let allVotes: any[] = [];
  
  // Fetch in chunks of 50 wish IDs at a time
  for (let i = 0; i < wishIds.length; i += 50) {
    const chunk = wishIds.slice(i, i + 50);
    const { data: chunkVotes } = await supabase
      .from('votes')
      .select('*')
      .in('wish_id', chunk);
    if (chunkVotes) allVotes = allVotes.concat(chunkVotes);
  }

  const mapped: Wish[] = (wishesData ?? []).map((w: any) => {
    const votes = allVotes
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
    const interval = setInterval(refresh, 30000);
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
      if (!params.creatorAddress || params.creatorAddress.trim() === '') {
        throw new Error('Your wallet address is missing. Please disconnect and reconnect your wallet.');
      }

      const now = Date.now();

      // Stake goes to treasury
      await sendUCT(TREASURY, params.stakeUCT);

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

      if (!voterAddress || voterAddress.trim() === '') {
        throw new Error('Your wallet address is missing. Please reconnect your wallet.');
      }

      if (!wish.creatorAddress || wish.creatorAddress.trim() === '') {
        throw new Error('This wish has no valid creator address.');
      }

      // ✅ FIX: DB-level check to prevent duplicate votes
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('wish_id', wish.id)
        .eq('voter_address', voterAddress)
        .maybeSingle();

      if (existingVote || wish.votes.some(v => v.voterAddress === voterAddress)) {
        throw new Error('You already voted on this wish');
      }

      if (wish.creatorAddress === voterAddress) {
        throw new Error('Cannot vote on your own wish');
      }

      // ✅ FIX: check expiry time too, not just status
      if (wish.status !== 'active' || wish.expiresAt < Date.now()) {
        throw new Error('This wish has expired — voting is closed');
      }

      // ✅ Fulfil → UCT to wish creator | Not Fulfil → UCT to treasury
      const recipient = voteType === 'fulfil' ? wish.creatorAddress : TREASURY;
      await sendUCT(recipient, 1);

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

  return { wishes, createWish, vote, refresh, hasVoted };
}