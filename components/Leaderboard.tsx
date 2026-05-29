'use client';

import { useState } from 'react';
import type { LeaderboardEntry, Wish } from '../types/wish';

interface WishScoreEntry {
  nametag: string;
  address: string;
  score: number;
}

interface LeaderboardProps {
  wishCreators: LeaderboardEntry[];
  voters: LeaderboardEntry[];
  wishes: Wish[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

function computeWishScore(wishes: Wish[]): WishScoreEntry[] {
  const map = new Map<string, WishScoreEntry>();

  wishes.forEach(w => {
    // Points for creating a wish
    const key = w.creatorAddress || w.creatorNametag;
    if (!map.has(key)) {
      map.set(key, { nametag: w.creatorNametag || key.slice(0, 10), address: key, score: 0 });
    }
    map.get(key)!.score += 10; // 10 points per wish created

    // Points for votes received on your wish
    map.get(key)!.score += w.fulfilCount * 5; // 5 points per fulfil vote
    map.get(key)!.score += w.noFulfilCount * 2; // 2 points per nofulfil vote

    // Points for voting
    w.votes.forEach(v => {
      const vkey = v.voterAddress || v.voterNametag;
      if (!map.has(vkey)) {
        map.set(vkey, { nametag: v.voterNametag || vkey.slice(0, 10), address: vkey, score: 0 });
      }
      map.get(vkey)!.score += 3; // 3 points per vote cast
    });
  });

  return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 10);
}

export default function Leaderboard({
  wishCreators,
  voters,
  wishes,
}: LeaderboardProps) {
  const [tab, setTab] = useState<'creators' | 'voters' | 'wishscore'>('wishscore');
  const wishScores = computeWishScore(wishes);

  const tabs = [
    { key: 'wishscore' as const, label: '⭐ WishScore' },
    { key: 'creators' as const, label: '🌟 Top Wishers' },
    { key: 'voters' as const, label: '🗳️ Top Voters' },
  ];

  const data =
    tab === 'creators' ? wishCreators
    : tab === 'voters' ? voters
    : wishScores;

  const suffix =
    tab === 'creators' ? 'wishes'
    : tab === 'voters' ? 'votes'
    : 'pts';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex border-b border-white/10">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors
              ${tab === t.key
                ? 'text-amber-400 bg-amber-500/5 border-b-2 border-amber-400'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {data.length === 0 ? (
          <p className="text-center text-xs text-slate-600 py-6">
            No data yet · be the first!
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((entry, i) => (
              <div
                key={entry.address}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]"
              >
                <span className="text-base w-6 text-center">
                  {MEDALS[i] ?? `${i + 1}`}
                </span>
                <span className="flex-1 text-sm font-medium text-white truncate">
                  @{entry.nametag}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {(entry as any).score ?? (entry as any).count} {suffix}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}