'use client';

import { useMemo } from 'react';
import type { Wish, LeaderboardEntry } from '../types/wish';

export function useLeaderboard(wishes: Wish[]) {

  // TOP WISHERS — by number of wishes created
  const wishCreators = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      const key = w.creatorAddress;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          nametag: w.creatorNametag || key.slice(0, 10),
          address: key,
          count: 0,
        });
      }
      map.get(key)!.count++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

  // TOP VOTERS — by number of votes cast
  const voters = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      w.votes.forEach(v => {
        const key = v.voterAddress;
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, {
            nametag: v.voterNametag || key.slice(0, 10),
            address: key,
            count: 0,
          });
        }
        map.get(key)!.count++;
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

  // WISHSCORE — computed from wishes and votes using NAMETAGS
  // 10pts per wish created, 5pts per fulfil vote received,
  // 2pts per nofulfil vote received, 3pts per vote cast
  const wishScoreUsers = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();

    const add = (nametag: string, address: string, pts: number) => {
      if (!nametag) return;
      const key = nametag.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { nametag, address: address || key, count: 0 });
      }
      map.get(key)!.count += pts;
    };

    wishes.forEach(w => {
      // Points for creating a wish
      add(w.creatorNametag, w.creatorAddress, 10);
      // Points for fulfil votes received on your wish
      add(w.creatorNametag, w.creatorAddress, w.fulfilCount * 5);
      // Points for nofulfil votes received
      add(w.creatorNametag, w.creatorAddress, w.noFulfilCount * 2);
      // Points for voting
      w.votes.forEach(v => {
        add(v.voterNametag, v.voterAddress, 3);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

  return { wishCreators, voters, wishScoreUsers };
}