'use client';


import { useMemo } from 'react';
import type { Wish, LeaderboardEntry } from '../types/wish';

export function useLeaderboard(wishes: Wish[]) {
  const wishCreators = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      const key = w.creatorAddress;
      if (!map.has(key)) {
        map.set(key, { nametag: w.creatorNametag || w.creatorAddress.slice(0, 10), address: key, count: 0 });
      }
      map.get(key)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [wishes]);

  const voters = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      w.votes.forEach(v => {
        const key = v.voterAddress;
        if (!map.has(key)) {
          map.set(key, { nametag: v.voterNametag || v.voterAddress.slice(0, 10), address: key, count: 0 });
        }
        map.get(key)!.count++;
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [wishes]);


  const topWishScore: LeaderboardEntry[] = [];
  return {

  wishCreators,

  voters,

  // NEW
  wishScoreUsers: topWishScore,

};
}
