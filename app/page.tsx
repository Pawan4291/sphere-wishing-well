'use client';

import { useState, useMemo } from 'react';
import type { Wish, VoteType, WishCategory, WishDuration } from '../types/wish';
import { useSphereWallet } from '../hooks/useSphereWallet';
import { useWishes } from '../hooks/useWishes';
import { useLeaderboard } from '../hooks/useLeaderboard';
import Header from '../components/Header';
import WishCard from '../components/WishCard';
import CreateWishModal from '../components/CreateWishModal';
import Leaderboard from '../components/Leaderboard';

type Tab = 'hot' | 'new' | 'expiring' | 'mine' | 'resolved';

export default function HomePage() {
  const wallet = useSphereWallet();
  const { wishes, createWish, vote } = useWishes();
  const { wishCreators, voters } = useLeaderboard(wishes);

  const [tab, setTab] = useState<Tab>('hot');
  const [showCreate, setShowCreate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const totalVotes = useMemo(
    () => wishes.reduce((sum, w) => sum + w.votes.length, 0),
    [wishes]
  );

  const filtered = useMemo<Wish[]>(() => {
    const addr = wallet.identity?.nametag;

    switch (tab) {
      case 'hot':
        return [...wishes]
          .filter(w => w.status === 'active')
          .sort(
            (a, b) =>
              (b.fulfilCount + b.noFulfilCount) -
              (a.fulfilCount + a.noFulfilCount)
          );

      case 'new':
        return [...wishes]
          .filter(w => w.status === 'active')
          .sort((a, b) => b.createdAt - a.createdAt);

      case 'expiring':
        return [...wishes]
          .filter(w => w.status === 'active')
          .sort((a, b) => a.expiresAt - b.expiresAt);

      case 'mine':
        return addr
          ? wishes.filter(
              w =>
                w.creatorAddress === addr ||
                w.votes.some(v => v.voterAddress === addr)
            )
          : [];

      case 'resolved':
        return [...wishes]
          .filter(
            w =>
              w.status === 'fulfilled' ||
              w.status === 'unfulfilled'
          )
          .sort((a, b) => b.expiresAt - a.expiresAt);

      default:
        return wishes;
    }
  }, [wishes, tab, wallet.identity]);

  const handleCreateWish = async (params: {
    text: string;
    category: WishCategory;
    duration: WishDuration;
    stakeUCT: number;
  }) => {

    if (!wallet.identity?.nametag) {
      throw new Error('Connect wallet first');
    }

    await createWish({
      ...params,

      creatorNametag: wallet.identity.nametag,

      // IMPORTANT:
      // USE NAMETAG
      creatorAddress: wallet.identity.nametag,
    });
  };

  const handleVote = async (
    wish: Wish,
    voteType: VoteType
  ) => {

    if (!wallet.identity?.nametag) {
      throw new Error('Connect wallet first');
    }

    await vote({
      wish,
      voteType,

      // IMPORTANT:
      // USE NAMETAG
      voterAddress: wallet.identity.nametag,

      voterNametag: wallet.identity.nametag,
    });
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'hot', label: '🔥 Hot' },
    { key: 'new', label: '🆕 New' },
    { key: 'expiring', label: '⏰ Expiring' },
    { key: 'mine', label: '👤 Mine' },
    { key: 'resolved', label: '✅ Resolved' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2
          w-[600px] h-[600px] rounded-full
          bg-amber-500/3 blur-[120px]"
        />
      </div>

      <Header
        nametag={wallet.identity?.nametag}
        isConnected={wallet.isConnected}
        isConnecting={wallet.status === 'connecting'}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        totalWishes={wishes.length}
        totalVotes={totalVotes}
      />

      <main className="relative max-w-4xl mx-auto px-4 py-6">

        {/* Feed */}
        <div className="grid gap-4">
          {filtered.map(wish => (
            <WishCard
              key={wish.id}
              wish={wish}

              // IMPORTANT:
              currentAddress={wallet.identity?.nametag}

              onVote={handleVote}
            />
          ))}
        </div>

      </main>

      {/* Floating Button */}
      {wallet.isConnected && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40
            w-14 h-14 rounded-full bg-amber-500
            text-black text-2xl"
        >
          +
        </button>
      )}

      {/* Modal */}
      <CreateWishModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateWish}
        creatorNametag={wallet.identity?.nametag ?? ''}
      />
    </div>
  );
}