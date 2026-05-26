'use client';

import {
  useEffect,
  useState
} from 'react';

import type {
  LeaderboardEntry
} from '../types/wish';

import { supabase }
from '../lib/supabase';

export function useWishScoreLeaderboard() {

  const [
    wishScoreUsers,
    setWishScoreUsers
  ] = useState<
    LeaderboardEntry[]
  >([]);

  useEffect(() => {

    async function load() {

      const { data } =
        await supabase
          .from('users')
          .select('*')
          .order(
            'wishscore',
            { ascending: false }
          )
          .limit(10);

      if (!data) return;

      const mapped =
        data.map((u: any) => ({
          nametag:
            u.nametag,

          address:
            u.address,

          count:
            u.wishscore || 0,
        }));

      setWishScoreUsers(
        mapped
      );
    }

    load();

  }, []);

  return {
    wishScoreUsers,
  };
}