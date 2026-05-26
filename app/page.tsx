'use client';

import { useState, useMemo, useEffect } from 'react';
import type {
  Wish,
  VoteType,
  WishCategory,
  WishDuration
} from '../types/wish';

import { useSphereWallet } from '../hooks/useSphereWallet';
import { useWishes } from '../hooks/useWishes';
import { useLeaderboard } from '../hooks/useLeaderboard';

import Header from '../components/Header';
import WishCard from '../components/WishCard';
import CreateWishModal from '../components/CreateWishModal';
import Leaderboard from '../components/Leaderboard';

type Tab =
  | 'hot'
  | 'new'
  | 'expiring'
  | 'mywishes'
  | 'myvotes'
  | 'resolved';

export default function HomePage() {

  const wallet = useSphereWallet();

  const {
    wishes,
    createWish,
    vote
  } = useWishes();

  const {
    wishCreators,
    voters
  } = useLeaderboard(wishes);

  const [tab, setTab] =
    useState<Tab>('hot');

  const [showCreate, setShowCreate] =
    useState(false);

  const [
    showLeaderboard,
    setShowLeaderboard
  ] = useState(false);

  // ✅ FIX 1: ticker so `now` stays fresh and expired wishes auto-move to Resolved
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 30_000); // re-check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const totalVotes = useMemo(
    () =>
      wishes.reduce(
        (sum, w) =>
          sum + w.votes.length,
        0
      ),
    [wishes]
  );

  const filtered = useMemo<Wish[]>(() => {
    const addr = wallet.identity?.directAddress;
    const now = Date.now();

    // ✅ FIX 2: activeOnly strictly excludes time-expired wishes
    const activeOnly = wishes.filter(
      w => w.status === 'active' && w.expiresAt > now
    );

    switch (tab) {
      case 'hot':
        return [...activeOnly]
          .sort((a, b) =>
            (b.fulfilCount + b.noFulfilCount) -
            (a.fulfilCount + a.noFulfilCount)
          );

      case 'new':
        return [...activeOnly]
          .sort((a, b) => b.createdAt - a.createdAt);

      case 'expiring':
        return [...activeOnly]
          .filter(w => w.expiresAt - now <= 3_600_000)
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
          .filter(w =>
            w.status === 'fulfilled' ||
            w.status === 'unfulfilled' ||
            (w.status === 'active' && w.expiresAt <= now)
          )
          .sort((a, b) => b.expiresAt - a.expiresAt);

      default:
        return wishes;
    }
  }, [wishes, tab, wallet.identity, forceUpdate]); // ✅ forceUpdate in deps so memo re-runs

  const handleCreateWish = async (params: {
    text: string;
    category: WishCategory;
    duration: WishDuration;
    stakeUCT: number;
  }) => {
    if (!wallet.identity?.directAddress) {
      throw new Error('Connect wallet first');
    }
    await createWish({
      ...params,
      creatorNametag: wallet.identity.nametag || 'anonymous',
      creatorAddress: wallet.identity.directAddress,
    });
  };

  // ✅ FIX 3: removed duplicate handleVote, keeping only the correct one
  const handleVote = async (wish: Wish, voteType: VoteType) => {
    if (!wallet.identity?.directAddress) {
      throw new Error('Connect wallet first');
    }
    await vote({
      wish,
      voteType,
      voterAddress: wallet.identity.directAddress,
      voterNametag: wallet.identity.nametag || 'anonymous',
    });
  };

  const TABS: {
    key: Tab;
    label: string;
    requiresWallet?: boolean;
  }[] = [
    {
      key: 'hot',
      label: '🔥 Trending'
    },

    {
      key: 'new',
      label: '✨ Fresh'
    },

    {
      key: 'expiring',
      label: '⏳ Last Hour'
    },

    {
      key: 'mywishes',
      label: '🌠 My Wishes',
      requiresWallet: true
    },

    {
      key: 'myvotes',
      label: '🗳️ My Votes',
      requiresWallet: true
    },

    {
      key: 'resolved',
      label: '📜 Resolved'
    },
  ];

  return (

    <div className="
      min-h-screen
      text-white
      relative
      overflow-hidden
    ">

      {/* BACKGROUND */}

      <div className="
        fixed inset-0
        overflow-hidden
        pointer-events-none
      ">

        <div className="
          absolute
          top-[-10%]
          left-1/2
          -translate-x-1/2

          w-[1000px]
          h-[1000px]

          rounded-full

          bg-orange-500/10

          blur-[180px]
        " />

        <div className="
          absolute
          bottom-[-20%]
          right-[-10%]

          w-[700px]
          h-[700px]

          rounded-full

          bg-amber-400/10

          blur-[160px]
        " />

      </div>

      <Header
        nametag={
          wallet.identity?.nametag
        }
        isConnected={
          wallet.isConnected
        }
        isConnecting={
          wallet.status ===
          'connecting'
        }
        onConnect={wallet.connect}
        onDisconnect={
          wallet.disconnect
        }
        totalWishes={wishes.length}
        totalVotes={totalVotes}
      />

      <main className="
        relative
        max-w-7xl
        mx-auto
        px-6
        py-10
      ">

        {/* HERO */}

        <div className="
          mb-10
          relative
          overflow-hidden

          rounded-[32px]

          border
          border-white/5

          bg-white/[0.03]

          backdrop-blur-2xl

          p-8 md:p-12
        ">

          <div className="
            absolute
            inset-0

            bg-gradient-to-br
            from-orange-500/10
            via-transparent
            to-transparent
          " />

          <div className="relative z-10">

            <div className="
              inline-flex
              items-center
              gap-2

              rounded-full

              border
              border-orange-500/20

              bg-orange-500/10

              px-4 py-2

              text-sm
              text-orange-300
              font-semibold

              mb-5
            ">
              ✦ Powered by Unicity Sphere
            </div>

            <h1 className="
              text-5xl
              md:text-7xl

              font-black

              tracking-tight

              leading-[0.95]

              max-w-4xl
            ">
              Cast Wishes.
              <br />
              Let The Community Decide.
            </h1>

            <p className="
              mt-6

              text-lg
              md:text-xl

              text-slate-400

              max-w-2xl

              leading-relaxed
            ">
              Stake UCT on wishes,
              vote with the crowd,
              and discover what the
              Sphere community truly believes.
            </p>

          </div>

        </div>

        {/* TABS */}

        <div className="
          flex
          gap-3

          mb-10

          overflow-x-auto

          pb-2
        ">

          {TABS.map(t => (

            <button
              key={t.key}
              onClick={() =>
                setTab(t.key)
              }

              className={`
                px-5 py-3

                rounded-2xl

                text-sm md:text-base

                font-bold

                whitespace-nowrap

                border

                backdrop-blur-xl

                transition-all
                duration-200

                ${
                  tab === t.key

                    ? `
                      bg-gradient-to-r
                      from-amber-400
                      to-orange-500

                      text-black

                      border-orange-300

                      shadow-lg
                      shadow-orange-500/20
                    `

                    : `
                      bg-white/[0.04]

                      text-slate-300

                      border-white/5

                      hover:border-orange-400/30
                      hover:bg-orange-500/5
                    `
                }
              `}
            >
              {t.label}
            </button>
          ))}

          <button
            onClick={() =>
              setShowLeaderboard(true)
            }

            className="
              ml-auto

              px-5 py-3

              rounded-2xl

              text-sm md:text-base
              font-bold

              whitespace-nowrap

              border
              border-white/5

              bg-white/[0.04]

              text-slate-300

              hover:border-orange-400/30
              hover:bg-orange-500/5

              transition-all
            "
          >
            🏆 Leaderboard
          </button>

        </div>

        {/* EMPTY STATE */}

        {filtered.length === 0 && (

          <div className="
            text-center
            py-28
          ">

            <p className="
              text-6xl
              mb-6
            ">
              {tab === 'hot'
                ? '🔥'
                : tab === 'new'
                ? '✨'
                : tab === 'expiring'
                ? '⏳'
                : tab === 'mywishes'
                ? '🌠'
                : tab === 'myvotes'
                ? '🗳️'
                : '📜'}
            </p>

            <p className="
              text-slate-400
              text-lg
            ">

              {
                tab === 'mywishes' &&
                !wallet.isConnected

                  ? 'Connect wallet to see your wishes'

                  : tab ===
                      'myvotes' &&
                    !wallet.isConnected

                  ? 'Connect wallet to see your votes'

                  : tab ===
                    'mywishes'

                  ? "You haven't created any wishes yet"

                  : tab ===
                    'myvotes'

                  ? "You haven't voted on any wishes yet"

                  : tab ===
                    'expiring'

                  ? 'No wishes expiring soon'

                  : tab ===
                    'resolved'

                  ? 'No resolved wishes yet'

                  : 'No wishes yet · be the first'
              }

            </p>

          </div>

        )}

        {/* FEED */}

        <div className="
          grid
          gap-8
        ">

          {filtered.map(wish => (

            <WishCard
              key={wish.id}
              wish={wish}
              currentAddress={
                wallet.identity?.directAddress
              }
              onVote={handleVote}
            />

          ))}

        </div>

        {/* LEADERBOARD */}

        {showLeaderboard && (

          <div className="
            fixed inset-0
            z-50

            flex
            items-center
            justify-center

            px-4
          ">

            <div
              className="
                absolute
                inset-0

                bg-black/70

                backdrop-blur-md
              "

              onClick={() =>
                setShowLeaderboard(
                  false
                )
              }
            />

            <div className="
              relative

              w-full
              max-w-lg
            ">

              <div className="
                flex
                items-center
                justify-between

                mb-5
              ">

                <h2 className="
                  text-2xl
                  font-black
                ">
                  🏆 Leaderboard
                </h2>

                <button
                  onClick={() =>
                    setShowLeaderboard(
                      false
                    )
                  }

                  className="
                    text-slate-500
                    hover:text-white

                    text-2xl
                  "
                >
                  ✕
                </button>

              </div>

              <Leaderboard
                wishCreators={
                  wishCreators
                }
                voters={voters}
              />

            </div>

          </div>

        )}

      </main>

      {/* FOOTER */}

      <footer className="
        border-t
        border-white/5

        py-8
        mt-12

        text-center
      ">

        <p className="
          text-sm
          text-slate-500
        ">

          Built on

          <span className="
            text-orange-400
            font-bold
            mx-1
          ">
            Unicity Sphere
          </span>

          ·

          <span className="
            text-amber-300
            font-bold
            ml-1
          ">
            @pawan429
          </span>

        </p>

      </footer>

      {/* FLOATING BUTTON */}

      {wallet.isConnected && (

        <button
          onClick={() =>
            setShowCreate(true)
          }

          className="
            fixed
            bottom-8
            right-8

            z-40

            w-16
            h-16

            rounded-2xl

            bg-gradient-to-br
            from-amber-400
            to-orange-500

            text-black
            text-3xl
            font-black

            shadow-2xl
            shadow-orange-500/30

            hover:scale-110
            hover:rotate-6

            transition-all
            duration-300

            flex
            items-center
            justify-center
          "
        >
          +
        </button>

      )}

      <CreateWishModal
        open={showCreate}
        onClose={() =>
          setShowCreate(false)
        }
        onSubmit={
          handleCreateWish
        }
        creatorNametag={
          wallet.identity?.nametag ??
          ''
        }
      />

    </div>
  );
}