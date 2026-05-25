'use client';

import { useState } from 'react';
import type { Wish, VoteType } from '../types/wish';
import CountdownTimer from './CountdownTimer';
import { CATEGORIES } from '../lib/constants';

interface WishCardProps {
  wish: Wish;
  currentAddress?: string;
  onVote: (wish: Wish, voteType: VoteType) => Promise<void>;
}

export default function WishCard({ wish, currentAddress, onVote }: WishCardProps) {
  const [voting, setVoting] = useState<VoteType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<VoteType | null>(null);

  const cat = CATEGORIES.find(c => c.value === wish.category);
  const totalVotes = wish.fulfilCount + wish.noFulfilCount;
  const fulfilPct = totalVotes > 0 ? Math.round((wish.fulfilCount / totalVotes) * 100) : 50;
  const noFulfilPct = 100 - fulfilPct;
  const alreadyVoted = currentAddress ? wish.votes.some(v => v.voterAddress === currentAddress) : false;
  const isOwnWish = currentAddress === wish.creatorAddress;
  const isActive = wish.status === 'active';

  const handleVote = async (voteType: VoteType) => {
    if (!currentAddress) { setError('Connect your wallet first'); return; }
    if (alreadyVoted) { setError('Already voted'); return; }
    if (isOwnWish) { setError('Cannot vote on your own wish'); return; }
    setError(null);
    setVoting(voteType);
    try {
      await onVote(wish, voteType);
      setFlash(voteType);
      setTimeout(() => setFlash(null), 2000);
    } catch (e: any) {
      setError(e?.message ?? 'Vote failed');
    } finally {
      setVoting(null);
    }
  };

  const statusBg = wish.status === 'fulfilled'
    ? 'border-emerald-500/60 bg-emerald-950/30'
    : wish.status === 'unfulfilled'
    ? 'border-red-500/60 bg-red-950/30'
    : 'border-slate-700/60 bg-slate-900/50';

  const statusBadge = wish.status === 'fulfilled'
    ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">✓ WISH FULFILLED</span>
    : wish.status === 'unfulfilled'
    ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">✗ WISH NOT FULFILLED</span>
    : null;

  return (
    <div className={`relative rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.01] ${statusBg} ${flash ? 'ring-2 ring-amber-400/60' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{cat?.emoji ?? '✨'}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{cat?.label}</span>
          {statusBadge}
        </div>
        {isActive && <CountdownTimer expiresAt={wish.expiresAt} />}
      </div>

      {/* Wish text */}
      <p className="text-white font-medium text-base mb-1 leading-relaxed">"{wish.text}"</p>

      {/* Creator */}
      <p className="text-xs text-slate-500 mb-4">
        by <span className="text-amber-400 font-semibold">@{wish.creatorNametag || 'anonymous'}</span>
        <span className="ml-2 text-slate-600">· staked {wish.stakedUCT} UCT</span>
      </p>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div className="mb-4">
          <div className="flex text-xs mb-1 justify-between text-slate-400">
            <span>✅ Fulfil {wish.fulfilCount} ({fulfilPct}%)</span>
            <span>❌ Not Fulfil {wish.noFulfilCount} ({noFulfilPct}%)</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-800 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${fulfilPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700"
              style={{ width: `${noFulfilPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast · 1 UCT per vote</p>
        </div>
      )}

      {/* Vote buttons */}
      {isActive && !alreadyVoted && !isOwnWish && (
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => handleVote('fulfil')}
            disabled={!!voting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-emerald-500/50 bg-emerald-950/40 text-emerald-400
              hover:bg-emerald-500 hover:text-white hover:border-emerald-400
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {voting === 'fulfil' ? '⏳ Sending...' : '✅ Fulfil this wish'}
          </button>
          <button
            onClick={() => handleVote('nofulfil')}
            disabled={!!voting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-red-500/50 bg-red-950/40 text-red-400
              hover:bg-red-500 hover:text-white hover:border-red-400
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {voting === 'nofulfil' ? '⏳ Sending...' : '❌ Not fulfil'}
          </button>
        </div>
      )}

      {/* States */}
      {isActive && alreadyVoted && (
        <div className="mt-2 text-center text-xs text-slate-500 py-2 rounded-xl border border-slate-700/40 bg-slate-800/30">
          ✓ You voted on this wish
        </div>
      )}
      {isActive && isOwnWish && (
        <div className="mt-2 text-center text-xs text-slate-500 py-2 rounded-xl border border-slate-700/40 bg-slate-800/30">
          Your wish · waiting for community votes
        </div>
      )}
      {!currentAddress && isActive && (
        <div className="mt-2 text-center text-xs text-amber-500/70 py-2">
          Connect wallet to vote · 1 UCT per vote
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
