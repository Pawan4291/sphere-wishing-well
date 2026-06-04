'use client';

import OnboardingModal from '../components/OnboardingModal';
import CooldownTimer from '../components/CooldownTimer';
import { useState, useMemo } from 'react';
import type { Wish, VoteType, WishCategory, WishDuration } from '../types/wish';
import { useSphereWallet } from '../hooks/useSphereWallet';
import { useWishes } from '../hooks/useWishes';
import { useLeaderboard } from '../hooks/useLeaderboard';
import Header from '../components/Header';
import WishCard from '../components/WishCard';
import CreateWishModal from '../components/CreateWishModal';
import Leaderboard from '../components/Leaderboard';

type Tab = 'hot' | 'new' | 'expiring' | 'mine' | 'myvotes' | 'resolved' | 'leaderboard' | 'wishscore';

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] =
  useState(true);
  const wallet = useSphereWallet();
  const { wishes, createWish, vote } = useWishes();
  const { wishCreators, voters, wishScoreUsers } = useLeaderboard(wishes);

  const [tab, setTab] = useState<Tab>('hot');
  const [showCreate, setShowCreate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showWishScore, setShowWishScore] = useState(false);
const [showVoteLimit, setShowVoteLimit] = useState(false);
  const totalVotes = useMemo(
    () => wishes.reduce((sum, w) => sum + w.votes.length, 0),
    [wishes]
  );

  const myAddress = wallet.identity?.nametag ?? '';

  const myWishesToday = useMemo(() => {
  const oneDayAgo = Date.now() - 86400000;
  return wishes.filter(w => w.creatorAddress === myAddress && w.createdAt > oneDayAgo);
}, [wishes, myAddress]);

const myVotesToday = useMemo(() => {
  const oneDayAgo = Date.now() - 86400000;
  return wishes.reduce((count, w) =>
    count + w.votes.filter(v => v.voterAddress === myAddress && v.votedAt > oneDayAgo).length
  , 0);
}, [wishes, myAddress]);

const wishCooldownMs = useMemo(() => {
  if (myWishesToday.length === 0) return 0;
  const earliest = Math.min(...myWishesToday.map(w => w.createdAt));
  return Math.max(0, (earliest + 86400000) - Date.now());
}, [myWishesToday]);

  const myWishScoreHistory = useMemo(() => {
    const myWishes = wishes.filter(w => w.creatorAddress === myAddress);
    const myVotes: { description: string; points: number; time: number }[] = [];

    myWishes.forEach(w => {
      myVotes.push({ description: `Created wish: "${w.text.slice(0, 30)}..."`, points: 10, time: w.createdAt });
    });

myWishes.forEach(w => {
  for (let i = 0; i < w.fulfilCount; i++) {
    myVotes.push({
      description: `Received a Fulfil vote`,
      points: 3,
      time: w.createdAt,
    });
  }

  for (let i = 0; i < w.noFulfilCount; i++) {
    myVotes.push({
      description: `Received a Not Fulfil vote`,
      points: 2,
      time: w.createdAt,
    });
  }
});

    wishes.forEach(w => {
      w.votes.forEach(v => {
        if (v.voterAddress === myAddress) {
          myVotes.push({ description: `Voted on: "${w.text.slice(0, 30)}..."`, points: 5, time: v.votedAt });
        }
      });
    });

    return myVotes.sort((a, b) => b.time - a.time);
  }, [wishes, myAddress]);

  const myTotalWishScore = myWishScoreHistory.reduce((s, e) => s + e.points, 0);

  const filtered = useMemo<Wish[]>(() => {
    const now = Date.now(); // ✅ FIX: added now for expiry checks

    switch (tab) {
      case 'hot':
        return [...wishes]
          .filter(w => w.status === 'active' && w.expiresAt > now) // ✅ FIX
          .sort((a, b) => (b.fulfilCount + b.noFulfilCount) - (a.fulfilCount + a.noFulfilCount));

      case 'new':
        return [...wishes]
          .filter(w => w.status === 'active' && w.expiresAt > now) // ✅ FIX
          .sort((a, b) => b.createdAt - a.createdAt);

      case 'expiring':
        return [...wishes]
          .filter(w =>
            w.status === 'active' &&
            w.expiresAt > now &&               // ✅ FIX: must not already be expired
            w.expiresAt - now <= 3_600_000     // ✅ FIX: only ≤1 hour remaining
          )
          .sort((a, b) => a.expiresAt - b.expiresAt);

      case 'mine':
        return myAddress
          ? wishes.filter(w => w.creatorAddress === myAddress)
          : [];

      case 'myvotes':
        return myAddress
          ? wishes.filter(w => w.votes.some(v => v.voterAddress === myAddress))
          : [];

      case 'resolved': {
        const now = Date.now();
        return [...wishes]
          .filter(w =>
            w.status === 'fulfilled' ||
            w.status === 'unfulfilled' ||
            (w.status === 'active' && w.expiresAt <= now)
          )
          .sort((a, b) => b.expiresAt - a.expiresAt);
      }

      default:
        return wishes;
    }
  }, [wishes, tab, myAddress]);

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
  if (!wallet.identity?.nametag) throw new Error('Connect wallet first');
  if (myVotesToday >= 3) {
    setShowVoteLimit(true);
    return;
  }
  await vote({ wish, voteType, voterAddress: wallet.identity.nametag, voterNametag: wallet.identity.nametag });
};

  const TABS: { key: Tab; label: string }[] = [
    { key: 'hot',        label: '🔥 Trending'   },
    { key: 'new',        label: '✨ Fresh'       },
    { key: 'expiring',   label: '⏰ Last Hour'   },
    { key: 'mine',       label: '🙏 My Wishes'  },
    { key: 'myvotes',    label: '🗳️ My Votes'   },
    { key: 'resolved',   label: '✅ Resolved'   },
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

      <main className="relative max-w-5xl mx-auto px-4 py-6">

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`
px-5 py-2.5
rounded-2xl
text-sm font-semibold
backdrop-blur-md
border border-slate-800
transition-all duration-200
${tab === t.key
  ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
  : 'bg-slate-900/70 text-slate-400 hover:text-white hover:border-slate-600'}
`}
            >
              {t.label}
            </button>
          ))}

          <button
            onClick={() => setShowLeaderboard(true)}
            className="
px-5 py-2.5
rounded-2xl
text-sm font-semibold
bg-slate-900/70
text-slate-400
border border-slate-800
backdrop-blur-md
hover:text-white
hover:border-slate-600
transition-all duration-200
"
          >
            🏆 Leaderboard
          </button>

          <button
            onClick={() => setShowWishScore(true)}
            className="
px-5 py-2.5
rounded-2xl
text-sm font-semibold
bg-slate-900/70
text-slate-400
border border-slate-800
backdrop-blur-md
hover:text-white
hover:border-slate-600
transition-all duration-200
"
          >
            ⭐ WishScore
          </button>
        </div>

        {/* Feed */}
        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-600 py-12">No wishes here yet.</p>
          ) : (
            filtered.map(wish => (
              <WishCard
                key={wish.id}
                wish={wish}
                currentAddress={wallet.identity?.nametag}
                onVote={handleVote}
              />
            ))
          )}
        </div>

{showOnboarding && (
  <OnboardingModal
    onClose={() =>
      setShowOnboarding(false)
    }
  />
)}

<div className="text-center py-6 text-xs text-slate-600">
  Built by @pawan429 • Powered by WishScore • Unicity Sphere
</div>

      </main>

      {/* Floating Button */}
{wallet.isConnected && (
  wishCooldownMs > 0 ? (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-center shadow-2xl">
      <div className="text-xs text-slate-400 mb-1">Next wish available in</div>
      <CooldownTimer ms={wishCooldownMs} />
    </div>
  ) : (
    <button
      onClick={() => setShowCreate(true)}
      className="fixed bottom-6 right-6 px-5 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-2xl shadow-amber-500/20 transition-all z-50"
    >
      ✨ Cast Wish
    </button>
  )
)}

      {/* Create Wish Modal */}
      <CreateWishModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateWish}
        creatorNametag={wallet.identity?.nametag ?? ''}
      />

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 rounded-2xl p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">🏆 Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <Leaderboard
              wishCreators={wishCreators}
              voters={voters}
              wishScoreUsers={wishScoreUsers}
            />
          </div>
        </div>
      )}

      {/* WishScore History Modal */}
      {showWishScore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowWishScore(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 rounded-2xl p-6 relative max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">⭐ WishScore History</h2>
              <button onClick={() => setShowWishScore(false)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>

            {!wallet.isConnected ? (
              <p className="text-slate-500 text-sm text-center py-6">Connect wallet to see your WishScore.</p>
            ) : (
              <>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-amber-400">{myTotalWishScore}</span>
                  <p className="text-slate-400 text-xs mt-1">Total WishScore Points</p>
                </div>

                {myWishScoreHistory.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No WishScore activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {myWishScoreHistory.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40">
                        <span className="text-xs text-slate-300 flex-1 truncate">{item.description}</span>
                        <span className="text-xs font-bold text-amber-400 ml-2">+{item.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Vote Limit Modal */}
{showVoteLimit && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onClick={() => setShowVoteLimit(false)}>
    <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-6 text-center border border-slate-700"
      onClick={e => e.stopPropagation()}>
      <div className="text-4xl mb-3">🗳️</div>
      <h2 className="text-lg font-bold text-white mb-1">Daily Vote Limit Reached</h2>
      <p className="text-slate-400 text-sm mb-4">You've used all 3 votes for today. Resets in:</p>
      <CooldownTimer ms={(() => {
        const oneDayAgo = Date.now() - 86400000;
        const times = wishes.flatMap(w =>
          w.votes.filter(v => v.voterAddress === myAddress && v.votedAt > oneDayAgo).map(v => v.votedAt)
        ).sort((a, b) => a - b);
        return Math.max(0, ((times[0] ?? Date.now()) + 86400000) - Date.now());
      })()} />
      <button onClick={() => setShowVoteLimit(false)}
        className="mt-4 px-6 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm">
        Got it
      </button>
    </div>
  </div>
)}
    </div>
  );
}
