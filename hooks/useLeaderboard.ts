'use client';

import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

import type {
  Wish,
  LeaderboardEntry
} from '../types/wish';

export function useLeaderboard(wishes: Wish[]) {

  // REAL WishScore leaderboard from DB
  const [wishScoreUsers, setWishScoreUsers] =
    useState<LeaderboardEntry[]>([]);

  // TOP WISHERS
  const wishCreators = useMemo<LeaderboardEntry[]>(() => {

    const map =
      new Map<string, LeaderboardEntry>();

    wishes.forEach(w => {

      const key =
        w.creatorAddress;

      if (!map.has(key)) {

        map.set(key, {
          nametag:
            w.creatorNametag ||
            w.creatorAddress.slice(0, 10),

          address: key,

          count: 0,
        });
      }

      map.get(key)!.count++;
    });

    return Array
      .from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  }, [wishes]);

  // TOP VOTERS
  const voters = useMemo<LeaderboardEntry[]>(() => {

    const map =
      new Map<string, LeaderboardEntry>();

    wishes.forEach(w => {

      w.votes.forEach(v => {

        const key =
          v.voterAddress;

        if (!map.has(key)) {

          map.set(key, {
            nametag:
              v.voterNametag ||
              v.voterAddress.slice(0, 10),

            address: key,

            count: 0,
          });
        }

        map.get(key)!.count++;
      });
    });

    return Array
      .from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  }, [wishes]);

  // REAL WISHSCORE LEADERBOARD
  useEffect(() => {

    async function fetchWishScores() {

      const { data } =
        await supabase
          .from('users')
          .select('*')
          .order('wishscore', {
            ascending: false,
          })
          .limit(10);

      if (!data) return;

      setWishScoreUsers(

        data.map((u: any) => ({

          nametag:
            u.nametag ||
            u.address.slice(0, 10),

          address:
            u.address,

          count:
            u.wishscore || 0,

        }))
      );
    }

    fetchWishScores();

  }, []);

  return {

    wishCreators,

    voters,

    wishScoreUsers,

  };
}