import type { Wish, Vote, PayoutEntry } from '../types/wish';

export const BUILDER_NAMETAG = 'pawan429';
export const TREASURY_NAMETAG = 'pawan429'; // same wallet
export const BUILDER_FEE_PCT = 0.05;    // 5%
export const WINNER_POOL_PCT = 0.70;    // 70% of remaining to winning voters
export const CREATOR_WIN_PCT = 0.20;    // 20% of remaining to creator (if fulfil wins)

/**
 * Calculate payouts for a resolved wish.
 * Returns a map of address → PayoutEntry.
 * Does NOT send anything — pure calculation.
 */
export function calculatePayouts(wish: Wish): {
  payoutMap: Record<string, PayoutEntry>;
  winnerSide: 'fulfil' | 'nofulfil';
  builderFee: number;
} {
  const totalPool = wish.poolUCT; // already tracked in DB
  const builderFee = +(totalPool * BUILDER_FEE_PCT).toFixed(6);
  const remaining = +(totalPool - builderFee).toFixed(6);

  const fulfilVoters = wish.votes.filter(v => v.voteType === 'fulfil');
  const nofulfilVoters = wish.votes.filter(v => v.voteType === 'nofulfil');

  // Tie goes to nofulfil (wish not proven fulfilled)
  const winnerSide: 'fulfil' | 'nofulfil' =
    fulfilVoters.length > nofulfilVoters.length ? 'fulfil' : 'nofulfil';

  const payoutMap: Record<string, PayoutEntry> = {};

  if (winnerSide === 'fulfil') {
    // Fulfil voters split 70%
    const voterPool = +(remaining * WINNER_POOL_PCT).toFixed(6);
    const perVoter = fulfilVoters.length > 0
      ? +(voterPool / fulfilVoters.length).toFixed(6)
      : 0;

    for (const v of fulfilVoters) {
      payoutMap[v.voterAddress] = {
        address: v.voterAddress,
        nametag: v.voterNametag,
        amount: perVoter,
        role: 'voter',
        side: 'fulfil',
      };
    }

    // Creator gets 20% + their original stake back
    const creatorPayout = +(remaining * CREATOR_WIN_PCT + wish.stakedUCT).toFixed(6);
    payoutMap[wish.creatorAddress] = {
      address: wish.creatorAddress,
      nametag: wish.creatorNametag,
      amount: creatorPayout,
      role: 'creator',
    };

  } else {
    // Nofulfil voters split 70%
    const voterPool = +(remaining * WINNER_POOL_PCT).toFixed(6);
    const perVoter = nofulfilVoters.length > 0
      ? +(voterPool / nofulfilVoters.length).toFixed(6)
      : 0;

    for (const v of nofulfilVoters) {
      payoutMap[v.voterAddress] = {
        address: v.voterAddress,
        nametag: v.voterNametag,
        amount: perVoter,
        role: 'voter',
        side: 'nofulfil',
      };
    }

    // Creator loses their stake — no payout entry
  }

  // Builder fee entry (always)
  payoutMap[TREASURY_NAMETAG + '_builder'] = {
    address: TREASURY_NAMETAG,
    nametag: TREASURY_NAMETAG,
    amount: builderFee,
    role: 'creator', // marks it as builder fee in DB
  };

  return { payoutMap, winnerSide, builderFee };
}

/**
 * Get a user's payout from a resolved wish.
 * Returns null if user lost or wish not resolved.
 */
export function getUserPayout(
  wish: Wish,
  userAddress: string
): PayoutEntry | null {
  if (!wish.payoutMap) return null;
  return wish.payoutMap[userAddress] ?? null;
}

/**
 * Get the winning side label for display.
 */
export function getWinnerSideLabel(wish: Wish): string | null {
  if (!wish.payoutMap) return null;
  const fulfilWinners = Object.values(wish.payoutMap).filter(
    p => p.role === 'voter' && p.side === 'fulfil'
  );
  const nofulfilWinners = Object.values(wish.payoutMap).filter(
    p => p.role === 'voter' && p.side === 'nofulfil'
  );
  if (fulfilWinners.length > 0) return 'fulfil';
  if (nofulfilWinners.length > 0) return 'nofulfil';
  return null;
}