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
import { BUILDER_NAMETAG } from '../lib/sphere';

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
    // ✅ Use nametag for identity matching, NOT directAddress
    const addr = wallet.identity?.nametag;
    switch (tab) {
      case 'hot':
        return [...wishes]
          .filter(w => w.status === 'active')
          .sort((a, b) => (b.fulfilCount + b.noFulfilCount) - (a.fulfilCount + a.noFulfilCount));
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

  // ✅ Use nametag as creatorAddress — NOT directAddress
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
      creatorAddress: wallet.identity.nametag, // ✅ nametag e.g. "beastboy"
    });
  };

  // ✅ Use nametag as voterAddress — NOT directAddress
  const handleVote = async (wish: Wish, voteType: VoteType) => {
    if (!wallet.identity?.nametag) {
      throw new Error('Connect wallet first');
    }
    await vote({
      wish,
      voteType,
      voterAddress: wallet.identity.nametag, // ✅ nametag e.g. "beastboy"
      voterNametag: wallet.identity.nametag,
    });
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'hot',      label: '🔥 Hot' },
    { key: 'new',      label: '🆕 New' },
    { key: 'expiring', label: '⏰ Expiring' },
    { key: 'mine',     label: '👤 Mine' },
    { key: 'resolved', label: '✅ Resolved' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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

        <div className="mb-4 flex items-center justify-center">
          <div className="px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/40 text-xs text-slate-500">
            Built by{' '}
            <span className="text-amber-400 font-bold">{BUILDER_NAMETAG}</span>
            {' '}on Unicity Sphere
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-semibold">LIVE · Unicity Testnet</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">What do you wish for?</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Cast a wish, let the community vote. Each vote costs 1 UCT.
          </p>
        </div>

        <div className="flex gap-1 mb-5 bg-slate-900/60 rounded-2xl p-1 border border-slate-800/60 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                ${tab === t.key ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!wallet.isConnected && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <p className="text-xs text-amber-400/80">
              👆 Connect your Sphere wallet to cast wishes and vote
            </p>
          </div>
        )}

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <p className="text-4xl mb-3">🪙</p>
                <p className="text-sm">
                  {tab === 'mine' && !wallet.isConnected
                    ? 'Connect wallet to see your wishes'
                    : 'No wishes here yet · cast the first one'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map(wish => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    currentAddress={wallet.identity?.nametag} // ✅ nametag
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <Leaderboard wishCreators={wishCreators} voters={voters} />
            </div>
          </div>
        </div>

        <div className="lg:hidden mt-6">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="w-full py-3 rounded-2xl border border-slate-700/60 text-sm text-slate-400 hover:border-amber-500/40 transition-all"
          >
            {showLeaderboard ? '▲ Hide' : '▼ Show'} Leaderboard
          </button>
          {showLeaderboard && (
            <div className="mt-4">
              <Leaderboard wishCreators={wishCreators} voters={voters} />
            </div>
          )}
        </div>
      </main>

      {wallet.isConnected && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500 text-black text-2xl shadow-xl shadow-amber-500/30 hover:bg-amber-400 hover:scale-110 transition-all flex items-center justify-center"
        >
          +
        </button>
      )}

      <CreateWishModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateWish}
        creatorNametag={wallet.identity?.nametag ?? ''}
      />

      <footer className="text-center py-6 mt-8 border-t border-slate-800/60">
        <p className="text-xs text-slate-600">
          Built on{' '}
          <span className="text-amber-500/70 font-semibold">Unicity Sphere</span>
          {' '}·{' '}
          <span className="text-slate-500">
            Builder:{' '}
            <span className="text-amber-400 font-bold">@pawan429</span>
          </span>
        </p>
      </footer>
    </div>
  );
}