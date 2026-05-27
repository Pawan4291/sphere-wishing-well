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

export default function WishCard({
  wish,
  currentAddress,
  onVote,
}: WishCardProps) {

  const [voting, setVoting] =
    useState<VoteType | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [flash, setFlash] =
    useState<VoteType | null>(null);

  const cat =
    CATEGORIES.find(
      c => c.value === wish.category
    );

  const totalVotes =
    wish.fulfilCount +
    wish.noFulfilCount;

  const fulfilPct =
    totalVotes > 0
      ? Math.round(
          (
            wish.fulfilCount /
            totalVotes
          ) * 100
        )
      : 50;

  const noFulfilPct =
    100 - fulfilPct;

  const alreadyVoted =
    currentAddress
      ? wish.votes.some(
          v =>
            v.voterAddress ===
            currentAddress
        )
      : false;

  const isOwnWish =
    currentAddress ===
    wish.creatorAddress;

  // ✅ FIX 1: check both status AND expiry time
  const isActive =
    wish.status === 'active' &&
    wish.expiresAt > Date.now();

  // ✅ FIX 2: show EXPIRED badge for wishes that expired but DB hasn't updated yet
  const isExpiredButNotResolved =
    wish.status === 'active' &&
    wish.expiresAt <= Date.now();

  const handleVote = async (
    voteType: VoteType
  ) => {

    if (!currentAddress) {
      setError(
        'Connect your wallet first'
      );
      return;
    }

    if (alreadyVoted) {
      setError('Already voted');
      return;
    }

    if (isOwnWish) {
      setError(
        'Cannot vote on your own wish'
      );
      return;
    }

    setError(null);
    setVoting(voteType);

    try {

      await onVote(
        wish,
        voteType
      );

      setFlash(voteType);

      setTimeout(
        () => setFlash(null),
        2000
      );

    } catch (e: any) {

      setError(
        e?.message ??
        'Vote failed'
      );

    } finally {

      setVoting(null);
    }
  };

  const statusGlow =
    wish.status === 'fulfilled'
      ? 'shadow-[0_0_40px_rgba(16,185,129,0.12)]'
      : wish.status === 'unfulfilled'
      ? 'shadow-[0_0_40px_rgba(239,68,68,0.12)]'
      : 'shadow-[0_0_40px_rgba(245,158,11,0.08)]';

  const statusBorder =
    wish.status === 'fulfilled'
      ? 'border-emerald-500/40'
      : wish.status === 'unfulfilled'
      ? 'border-red-500/40'
      : 'border-[#1f2d4d]';

  const statusBadge =
    wish.status === 'fulfilled'
      ? (
        <span
          className="
            px-3 py-1 rounded-full
            text-[10px] md:text-xs
            font-bold tracking-wide
            bg-emerald-500/15
            text-emerald-400
            border border-emerald-500/30
          "
        >
          ✓ FULFILLED
        </span>
      )
      : wish.status === 'unfulfilled'
      ? (
        <span
          className="
            px-3 py-1 rounded-full
            text-[10px] md:text-xs
            font-bold tracking-wide
            bg-red-500/15
            text-red-400
            border border-red-500/30
          "
        >
          ✕ NOT FULFILLED
        </span>
      )
      // ✅ FIX 2 continued: show EXPIRED badge while DB catches up
      : isExpiredButNotResolved
      ? (
        <span
          className="
            px-3 py-1 rounded-full
            text-[10px] md:text-xs
            font-bold tracking-wide
            bg-slate-500/15
            text-slate-400
            border border-slate-500/30
          "
        >
          EXPIRED
        </span>
      )
      : null;

  return (
    <div
      className={`
        relative overflow-hidden
        rounded-[28px]
        border
        bg-gradient-to-b
        from-[#071226]
        to-[#040b18]
        p-6 md:p-8
        transition-all duration-300
        hover:-translate-y-1
        hover:border-amber-400/30
        ${statusGlow}
        ${statusBorder}
        ${flash
          ? 'ring-2 ring-amber-400/40'
          : ''
        }
      `}
    >

      {/* glow */}
      <div
        className="
          absolute inset-0
          bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_45%)]
          pointer-events-none
        "
      />

      {/* HEADER */}
      <div
        className="
          relative z-10
          flex items-start justify-between
          gap-3 mb-5
        "
      >

        <div
          className="
            flex items-center
            gap-3 flex-wrap
          "
        >

          <div
            className="
              w-10 h-10 rounded-2xl
              flex items-center justify-center
              bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.12)]
              border border-amber-500/20
              text-lg
            "
          >
            {cat?.emoji ?? '✨'}
          </div>

          <div>

            <div
              className="
                text-[10px]
                uppercase tracking-[0.25em]
                text-slate-500
                font-semibold
                mb-1
              "
            >
              {cat?.label}
            </div>

            {statusBadge}

          </div>
        </div>

        {isActive && (
          <div
            className="
              shrink-0
              rounded-xl
              border border-amber-500/20
              bg-amber-500/5
              px-3 py-2
            "
          >
            <CountdownTimer
              expiresAt={wish.expiresAt}
            />
          </div>
        )}
      </div>

      {/* WISH TEXT */}
      <div className="relative z-10">

        <h2
          className="
            text-white
            text-2xl md:text-4xl
            font-bold
            leading-relaxed
            tracking-tight
            mb-4
          "
        >
          "{wish.text}"
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
  Community predicts whether this wish will become reality before the timer ends.
</p>
        </h2>

        {/* creator */}
        <div
          className="
            flex flex-wrap items-center
            gap-2 mb-6
            text-sm
          "
        >

          <span className="text-slate-500">
            by
          </span>

          <span
            className="
              text-amber-400
              font-bold
            "
          >
            @{wish.creatorNametag || 'anonymous'}
          </span>

          <span
            className="
              text-slate-600
            "
          >
            •
          </span>

          <span
            className="
              text-slate-400
            "
          >
            staked
          </span>

          <span
            className="
              text-white font-semibold
            "
          >
            {wish.stakedUCT} UCT
          </span>

        </div>

        {/* VOTES */}
        {totalVotes > 0 && (

          <div className="mb-6">

            <div
              className="
                flex justify-between
                text-xs md:text-sm
                mb-2
                font-medium
              "
            >

              <span
                className="
                  text-emerald-400
                "
              >
                ✓ Fulfil {wish.fulfilCount}
                ({fulfilPct}%)
              </span>

              <span
                className="
                  text-red-400
                "
              >
                ✕ Not Fulfil {wish.noFulfilCount}
                ({noFulfilPct}%)
              </span>

            </div>

            <div
              className="
                h-4
                rounded-full
                overflow-hidden
                bg-[#09111f]
                border border-[#18243d]
                flex
              "
            >

              <div
                className="
                  h-full
                  bg-gradient-to-r
                  from-emerald-500
                  to-emerald-400
                  transition-all duration-700
                "
                style={{
                  width: `${fulfilPct}%`,
                }}
              />

              <div
                className="
                  h-full
                  bg-gradient-to-r
                  from-red-500
                  to-red-400
                  transition-all duration-700
                "
                style={{
                  width: `${noFulfilPct}%`,
                }}
              />

            </div>

            <div
              className="
                flex justify-between
                mt-2
                text-xs
                text-slate-500
              "
            >

              <span>
                {totalVotes} vote
                {totalVotes !== 1
                  ? 's'
                  : ''
                } cast
              </span>

              <span>
                1 UCT per vote
              </span>

            </div>

          </div>
        )}

        {/* BUTTONS */}
        {isActive &&
          !alreadyVoted &&
          !isOwnWish && (

          <div
            className="
              grid grid-cols-1
              md:grid-cols-2
              gap-3
            "
          >

            <button
              onClick={() =>
                handleVote('fulfil')
              }
              disabled={!!voting}
              className="
                h-14
                rounded-2xl
                font-bold
                text-sm md:text-base
                border border-emerald-500/30
                bg-emerald-500/10
                text-emerald-400
                hover:bg-emerald-500
                hover:text-white
                hover:scale-[1.02]
                transition-all duration-200
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              {voting === 'fulfil'
                ? '⏳ Sending...'
                : '✅ Fulfil Wish'
              }
            </button>

            <button
              onClick={() =>
                handleVote('nofulfil')
              }
              disabled={!!voting}
              className="
                h-14
                rounded-2xl
                font-bold
                text-sm md:text-base
                border border-red-500/30
                bg-red-500/10
                text-red-400
                hover:bg-red-500
                hover:text-white
                hover:scale-[1.02]
                transition-all duration-200
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              {voting === 'nofulfil'
                ? '⏳ Sending...'
                : '❌ Not Fulfil'
              }
            </button>

          </div>
        )}

        {/* STATES */}
        {isActive &&
          alreadyVoted && (

          <div
            className="
              mt-4
              rounded-2xl
              border border-emerald-500/20
              bg-emerald-500/5
              py-3 px-4
              text-center
              text-sm
              text-emerald-400
              font-medium
            "
          >
            ✓ You already voted
          </div>
        )}

        {isActive &&
          isOwnWish && (

          <div
            className="
              mt-4
              rounded-2xl
              border border-[#1d2a45]
              bg-[#0a1324]
              py-3 px-4
              text-center
              text-sm
              text-slate-400
            "
          >
            Community is deciding the fate of this wish
          </div>
        )}

        {!currentAddress &&
          isActive && (

          <div
            className="
              mt-4
              rounded-2xl
              border border-amber-500/20
              bg-amber-500/5
              py-3 px-4
              text-center
              text-sm
              text-amber-300
            "
          >
            Connect wallet to vote · 1 UCT per vote
            · fulfil sends to creator · not fulfil sends to builder
          </div>
        )}

        {error && (

          <div
            className="
              mt-4
              rounded-2xl
              border border-red-500/20
              bg-red-500/5
              py-3 px-4
              text-center
              text-sm
              text-red-400
            "
          >
            {error}
          </div>
        )}

      </div>
    </div>
  );
}