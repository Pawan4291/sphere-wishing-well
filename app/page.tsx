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
          .filter(w => w.status === 'fulfilled' || w.status === 'unfulfilled')
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
      creatorAddress: wallet.identity.nametag,
    });
  };

  const handleVote = async (wish: Wish, voteType: VoteType) => {
    if (!wallet.identity?.nametag) {
      throw new Error('Connect wallet first');
    }
    await vote({
      wish,
      voteType,
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/3 blur-[120px]" />
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
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all
                ${tab === t.key
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/40'}`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap
              border bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/40 transition-all"
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Feed */}
        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="text-center text-slate-500 py-16 text-sm">
              {tab === 'mine' && !wallet.isConnected
                ? 'Connect your wallet to see your wishes'
                : 'No wishes here yet'}
            </div>
          )}
          {filtered.map(wish => (
            <WishCard
              key={wish.id}
              wish={wish}
              currentAddress={wallet.identity?.nametag}
              onVote={handleVote}
            />
          ))}
        </div>

        {/* Leaderboard inline — shown when button clicked */}
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowLeaderboard(false)}
            />
            <div className="relative w-full max-w-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">🏆 Leaderboard</h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-slate-500 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <Leaderboard wishCreators={wishCreators} voters={voters} />
            </div>
          </div>
        )}
      </main>

      {/* Floating Create Button */}
      {wallet.isConnected && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500
            text-black text-2xl font-bold shadow-lg hover:bg-amber-400 transition-colors"
        >
          +
        </button>
      )}

      {/* Create Wish Modal */}
      <CreateWishModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateWish}
        creatorNametag={wallet.identity?.nametag ?? ''}
      />
    </div>
  );
}
