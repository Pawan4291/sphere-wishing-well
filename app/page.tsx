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

const WishingWellLogo = () => (
  <svg width="160" height="44" viewBox="0 0 160 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Well bucket icon */}
    <g>
      {/* Well arch */}
      <path d="M8 22 Q8 8 20 8 Q32 8 32 22" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Bucket rope */}
      <line x1="20" y1="8" x2="20" y2="16" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2"/>
      {/* Bucket */}
      <rect x="14" y="16" width="12" height="9" rx="2" fill="#F59E0B" opacity="0.9"/>
      {/* Water shimmer in bucket */}
      <rect x="15" y="20" width="10" height="3" rx="1" fill="#FDE68A" opacity="0.7"/>
      {/* Well base */}
      <rect x="6" y="22" width="28" height="4" rx="1.5" fill="#F59E0B" opacity="0.3"/>
    </g>
    {/* Text: Wishing */}
    <text x="42" y="20" fontFamily="'Georgia', 'Times New Roman', serif" fontSize="16" fontWeight="700" fill="#F59E0B" letterSpacing="0.5">Wishing</text>
    {/* Decorative dots between words */}
    <circle cx="42" cy="27" r="1.2" fill="#F59E0B" opacity="0.4"/>
    <circle cx="47" cy="27" r="1.2" fill="#F59E0B" opacity="0.6"/>
    <circle cx="52" cy="27" r="1.2" fill="#F59E0B" opacity="0.4"/>
    {/* Text: Well */}
    <text x="58" y="36" fontFamily="'Georgia', 'Times New Roman', serif" fontSize="22" fontWeight="700" fill="#FFFFFF" letterSpacing="1">Well</text>
    {/* Subtle glow underline */}
    <rect x="58" y="38" width="48" height="2" rx="1" fill="#F59E0B" opacity="0.5"/>
    {/* Tagline */}
    <text x="42" y="44" fontFamily="'Georgia', serif" fontSize="8" fill="#94A3B8" letterSpacing="1.5">ON UNICITY SPHERE</text>
  </svg>
);

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'hot',      label: 'Trending',   icon: '🔥' },
  { key: 'new',      label: 'Fresh',      icon: '✨' },
  { key: 'expiring', label: 'Last Hour',  icon: '⏳' },
  { key: 'mywishes', label: 'My Wishes',  icon: '🌠' },
  { key: 'myvotes',  label: 'My Votes',   icon: '🗳️' },
  { key: 'resolved', label: 'Resolved',   icon: '📜' },
];

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
          .sort((a, b) =>
            (b.fulfilCount + b.noFulfilCount) - (a.fulfilCount + a.noFulfilCount)
          );
      case 'new':
        return [...wishes]
          .filter(w => w.status === 'active')
          .sort((a, b) => b.createdAt - a.createdAt);
      case 'expiring':
        return [...wishes]
          .filter(w => w.status === 'active' && w.expiresAt - Date.now() <= 3_600_000)
          .sort((a, b) => a.expiresAt - b.expiresAt);
      case 'mywishes':
        return addr
          ? [...wishes]
              .filter(w => w.creatorAddress === addr)
              .sort((a, b) => b.createdAt - a.createdAt)
          : [];
      case 'myvotes':
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
    if (!wallet.identity?.nametag) throw new Error('Connect wallet first');
    await createWish({
      ...params,
      creatorNametag: wallet.identity.nametag,
      creatorAddress: wallet.identity.nametag,
    });
  };

  const handleVote = async (wish: Wish, voteType: VoteType) => {
    if (!wallet.identity?.nametag) throw new Error('Connect wallet first');
    await vote({
      wish,
      voteType,
      voterAddress: wallet.identity.nametag,
      voterNametag: wallet.identity.nametag,
    });
  };

  const emptyMessage = {
    hot:      { icon: '🔥', text: 'No trending wishes yet · cast the first one!' },
    new:      { icon: '✨', text: 'No new wishes yet · be the pioneer!' },
    expiring: { icon: '⏳', text: 'No wishes expiring in the next hour' },
    mywishes: { icon: '🌠', text: wallet.isConnected ? "You haven't cast any wishes yet" : 'Connect your wallet to see your wishes' },
    myvotes:  { icon: '🗳️', text: wallet.isConnected ? "You haven't voted on any wishes yet" : 'Connect your wallet to see your votes' },
    resolved: { icon: '📜', text: 'No resolved wishes yet' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-amber-600/4 blur-[80px]" />
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

      <main className="relative max-w-3xl mx-auto px-4 py-8">

        {/* Hero section with logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <WishingWellLogo />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-semibold tracking-widest uppercase">Live · Unicity Testnet</span>
          </div>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Cast a wish. The community votes with UCT.<br/>
            When time's up — the chain decides.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{wishes.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Wishes</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{totalVotes}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Votes Cast</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">1 UCT</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Per Vote</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6">
          {/* Scrollable tab row */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                  whitespace-nowrap border transition-all duration-200 flex-shrink-0
                  ${tab === t.key
                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                  }
                `}
              >
                <span className="text-sm leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                whitespace-nowrap border flex-shrink-0 ml-auto
                bg-slate-900/60 text-amber-400/80 border-amber-500/20
                hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5
                transition-all duration-200"
            >
              <span className="text-sm leading-none">🏆</span>
              <span>Board</span>
            </button>
          </div>
        </div>

        {/* Connect prompt */}
        {!wallet.isConnected && (
          <div className="mb-5 p-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 text-center">
            <p className="text-xs text-amber-400/80">
              Connect your Sphere wallet to cast wishes and vote
            </p>
          </div>
        )}

        {/* Wish feed */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">{emptyMessage[tab].icon}</p>
            <p className="text-slate-500 text-sm">{emptyMessage[tab].text}</p>
            {tab === 'hot' && wallet.isConnected && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20
                  text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all"
              >
                Cast the first wish →
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(wish => (
              <WishCard
                key={wish.id}
                wish={wish}
                currentAddress={wallet.identity?.nametag}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-slate-800/40 mt-4">
        <p className="text-xs text-slate-600">
          Built on{' '}
          <span className="text-amber-500/60 font-medium">Unicity Sphere</span>
          {' · '}
          Builder:{' '}
          <span className="text-amber-400 font-bold">@pawan429</span>
        </p>
      </footer>

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLeaderboard(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/60 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏆</span> Leaderboard
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white
                  flex items-center justify-center text-sm transition-colors"
              >✕</button>
            </div>
            <Leaderboard wishCreators={wishCreators} voters={voters} />
          </div>
        </div>
      )}

      {/* Floating create button */}
      {wallet.isConnected && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
            bg-gradient-to-br from-amber-400 to-amber-600
            text-black text-2xl font-bold
            shadow-xl shadow-amber-500/30
            hover:scale-110 hover:shadow-amber-500/50
            active:scale-95
            transition-all duration-200
            flex items-center justify-center"
          title="Cast a Wish"
        >
          <span className="leading-none">+</span>
        </button>
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
