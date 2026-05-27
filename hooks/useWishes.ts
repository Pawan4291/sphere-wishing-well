'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Wish, WishCategory, WishDuration, VoteType } from '../types/wish';
import { supabase } from '../lib/supabase';
import { sendUCT } from '../lib/sphere';

// ─── WishScore helper ────────────────────────────────────────────────────────
async function upsertWishScore(address: string, nametag: string, delta: number) {
  const { data } = await supabase
    .from('users')
    .select('wishscore')
    .eq('address', address)
    .maybeSingle();

  if (data) {
    await supabase
      .from('users')
      .update({ wishscore: (data.wishscore || 0) + delta, nametag })
      .eq('address', address);
  } else {
    await supabase
      .from('users')
      .insert({ address, nametag, wishscore: delta });
  }
}

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

    const now = Date.now(); // ✅ FIX 1: needed for expiry check

    const mapped: Wish[] = (wishesData ?? []).map((w: any) => {
      const votes = (votesData ?? [])
        .filter((v: any) => v.wish_id === w.id)
        .map((v: any) => ({
          voterAddress: v.voter_address,
          voterNametag: v.voter_nametag,
          voteType: v.vote_type as VoteType,
          votedAt: v.voted_at,
        }));

      // ✅ FIX 1: Auto-resolve expired wishes client-side
      let status = w.status;
      if (status === 'active' && w.expires_at < now) {
        status = w.fulfil_count > w.no_fulfil_count ? 'fulfilled' : 'unfulfilled';
        // Update DB in background
        supabase.from('wishes').update({ status }).eq('id', w.id).then(() => {});
      }

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
        status,
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
      if (!params.creatorAddress || params.creatorAddress.trim() === '') {
        throw new Error(
          'Your wallet address is missing. Please disconnect and reconnect your wallet.'
        );
      }

      const now = Date.now();
      await sendUCT(params.creatorAddress, params.stakeUCT);

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

      // ✅ FIX: Award WishScore for creating a wish (+10 points)
      await upsertWishScore(params.creatorAddress, params.creatorNametag, 10);

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
        throw new Error(
          'This wish has no valid creator address and cannot receive UCT. ' +
          'It may have been created before wallet addresses were stored correctly.'
        );
      }

      if (wish.votes.some(v => v.voterAddress === voterAddress)) {
        throw new Error('You already voted on this wish');
      }

      if (wish.creatorAddress === voterAddress) {
        throw new Error('Cannot vote on your own wish');
      }

      // ✅ FIX 2: Block voting on expired wishes — check both status AND time
      if (wish.status !== 'active' || wish.expiresAt < Date.now()) {
        throw new Error('This wish has expired — voting is closed');
      }

      await sendUCT(wish.creatorAddress, 1);

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

      // ✅ FIX: Award WishScore for voting (+5 points)
      await upsertWishScore(voterAddress, voterNametag, 5);

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