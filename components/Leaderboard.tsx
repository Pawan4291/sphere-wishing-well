'use client';

import { useState } from 'react';
import type { LeaderboardEntry } from '../types/wish';

interface LeaderboardProps {
  wishCreators: LeaderboardEntry[];
  voters: LeaderboardEntry[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ wishCreators, voters }: LeaderboardProps) {
  const [tab, setTab] = useState<'creators' | 'voters'>('creators');
  const data = tab === 'creators' ? wishCreators : voters;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
      <div className="flex border-b border-slate-700/60">
        <button
          onClick={() => setTab('creators')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors
            ${tab === 'creators' ? 'text-amber-400 bg-amber-500/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          🌟 Top Wishers
        </button>
        <button
          onClick={() => setTab('voters')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors
            ${tab === 'voters' ? 'text-amber-400 bg-amber-500/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          🗳️ Top Voters
        </button>
      </div>

      <div className="p-3">
        {data.length === 0 ? (
          <p className="text-center text-xs text-slate-600 py-6">No data yet · be the first!</p>
        ) : (
          <div className="space-y-2">
            {data.map((entry, i) => (
              <div key={entry.address} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40">
                <span className="text-base w-6 text-center">{MEDALS[i] ?? `${i + 1}`}</span>
                <span className="flex-1 text-sm font-medium text-white truncate">
                  @{entry.nametag}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {entry.count} {tab === 'creators' ? 'wishes' : 'votes'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
