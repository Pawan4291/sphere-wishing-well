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

type Tab = 'hot' | 'new' | 'expiring' | 'mywishes' | 'myvotes' | 'resolved';

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
        // Most votes total (fulfil + nofulfil combined)
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
        // Only wishes with ≤1 hour left
        return [...wishes]
          .filter(w => w.status === 'active' && w.expiresAt - Date.now() <= 3_600_000)
          .sort((a, b) => a.expiresAt - b.expiresAt);
      case 'mywishes':
        // All wishes created by this user (active + expired)
        return addr
          ? [...wishes]
              .filter(w => w.creatorAddress === addr)
              .sort((a, b) => b.createdAt - a.createdAt)
          : [];
      case 'myvotes':
        // All wishes this user voted on
        return addr
          ? [...wishes]
              .filter(w => w.votes.some(v => v.voterAddress === addr))
              .sort((a, b) => {
                const aVote = a.votes.find(v => v.voterAddress === addr);
                const bVote = b.votes.find(v => v.voterAddress === addr);
                return (bVote?.votedAt ?? 0) - (aVote?.votedAt ?? 0);
              })
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

  const TABS: { key: Tab; label: string; requiresWallet?: boolean }[] = [
    { key: 'hot',      label: '🔥 Trending' },
    { key: 'new',      label: '✨ Fresh' },
    { key: 'expiring', label: '⏳ Last Hour' },
    { key: 'mywishes', label: '🌠 My Wishes', requiresWallet: true },
    { key: 'myvotes',  label: '🗳️ My Votes',  requiresWallet: true },
    { key: 'resolved', label: '📜 Resolved' },
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all
                ${tab === t.key
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-amber-500/40 hover:text-slate-200'
                }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap
              border bg-slate-800/80 text-slate-400 border-slate-700 hover:border-amber-500/40 hover:text-slate-200 transition-all"
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Empty states */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">
              {tab === 'hot' ? '🔥' :
               tab === 'new' ? '✨' :
               tab === 'expiring' ? '⏳' :
               tab === 'mywishes' ? '🌠' :
               tab === 'myvotes' ? '🗳️' : '📜'}
            </p>
            <p className="text-slate-500 text-sm">
              {tab === 'mywishes' && !wallet.isConnected
                ? 'Connect your wallet to see your wishes'
                : tab === 'myvotes' && !wallet.isConnected
                ? 'Connect your wallet to see your votes'
                : tab === 'mywishes'
                ? "You haven't cast any wishes yet"
                : tab === 'myvotes'
                ? "You haven't voted on any wishes yet"
                : tab === 'expiring'
                ? 'No wishes expiring in the next hour'
                : tab === 'resolved'
                ? 'No resolved wishes yet'
                : 'No wishes here yet · be the first!'}
            </p>
          </div>
        )}

        {/* Wish feed */}
        <div className="grid gap-4">
          {filtered.map(wish => (
            <WishCard
              key={wish.id}
              wish={wish}
              currentAddress={wallet.identity?.nametag}
              onVote={handleVote}
            />
          ))}
        </div>

        {/* Leaderboard modal */}
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
                  className="text-slate-500 hover:text-white text-xl leading-none"
                >✕</button>
              </div>
              <Leaderboard wishCreators={wishCreators} voters={voters} />
            </div>
          </div>
        )}
      </main>

      {/* Builder credit */}
      <footer className="text-center py-6 border-t border-slate-800/40 mt-4">
        <p className="text-xs text-slate-600">
          Built on <span className="text-amber-500/70 font-semibold">Unicity Sphere</span>
          {' · '}
          <span className="text-amber-400 font-bold">@pawan429</span>
        </p>
      </footer>

      {/* Floating Create Button */}
      {wallet.isConnected && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500
            text-black text-2xl font-bold shadow-lg shadow-amber-500/30
            hover:bg-amber-400 hover:scale-110 transition-all flex items-center justify-center"
        >+</button>
      )}

      <CreateWishModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateWish}
        creatorNametag={wallet.identity?.nametag ?? ''}
      />
    </div>
  );
}