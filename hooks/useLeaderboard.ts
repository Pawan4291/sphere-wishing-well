'use client';

import { useMemo } from 'react';
import type { Wish, LeaderboardEntry } from '../types/wish';

export function useLeaderboard(wishes: Wish[]) {

  const wishCreators = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      if (!w.creatorAddress) return;
      if (!map.has(w.creatorAddress)) {
        map.set(w.creatorAddress, {
          nametag: w.creatorNametag || w.creatorAddress.slice(0, 10),
          address: w.creatorAddress,
          count: 0,
        });
      }
      map.get(w.creatorAddress)!.count++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

  const voters = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    wishes.forEach(w => {
      w.votes.forEach(v => {
        if (!v.voterAddress) return;
        if (!map.has(v.voterAddress)) {
          map.set(v.voterAddress, {
            nametag: v.voterNametag || v.voterAddress.slice(0, 10),
            address: v.voterAddress,
            count: 0,
          });
        }
        map.get(v.voterAddress)!.count++;
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

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
      // +10 pts for creating a wish
      add(w.creatorNametag, w.creatorAddress, 10);

      w.votes.forEach(v => {
        // +5 pts to voter for casting any vote
        add(v.voterNametag, v.voterAddress, 5);

        if (v.voteType === 'fulfil') {
          // +3 pts to wish creator for receiving a fulfil vote
          add(w.creatorNametag, w.creatorAddress, 3);
        } else {
          // +2 pts to wish creator for receiving a not-fulfil vote
          add(w.creatorNametag, w.creatorAddress, 2);
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wishes]);

  return { wishCreators, voters, wishScoreUsers };
}