'use client';

import { useState } from 'react';
import type { WishCategory, WishDuration } from '../types/wish';
import { CATEGORIES, DURATIONS, STAKE_OPTIONS } from '../lib/constants';

// Modal only handles text/category/duration/stake
// page.tsx supplies the wallet addresses — modal doesn't touch them
interface CreateWishModalProps {
  open: boolean;
  onClose: () => void;
  creatorNametag: string;
  onSubmit: (params: {
    text: string;
    category: WishCategory;
    duration: WishDuration;
    stakeUCT: number;
  }) => Promise<void>;
}

export default function CreateWishModal({
  open,
  onClose,
  onSubmit,
  creatorNametag,
}: CreateWishModalProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<WishCategory>('community');
  const [duration, setDuration] = useState<WishDuration>(86400000);
  const [stakeUCT, setStakeUCT] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Write your wish first'); return; }
    if (text.length > 200) { setError('Max 200 characters'); return; }

    setError(null);
    setSubmitting(true);
    try {
      // Only pass what modal knows — page.tsx adds the addresses
      await onSubmit({ text: text.trim(), category, duration, stakeUCT });
      setText('');
      setCategory('community');
      setDuration(86400000);
      setStakeUCT(1);
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to cast wish');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-gradient-to-b
from-[#071226]
to-[#040b18]
border border-[#1f2d4d]
rounded-[32px]
p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">🪙 Cast a Wish</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Wishing as{' '}
              <span className="text-amber-400 font-semibold">
                @{creatorNametag || 'anonymous'}
              </span>
              {' '}· stake goes to your own wallet
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

<p
  className="
    text-xs text-slate-500
    mb-4 leading-relaxed
  "
>
  ✨ Create a prediction • 🗳 Community votes • 🏆 Earn WishScore reputation
</p>


        {/* Wish text */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
            Your Wish
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Bitcoin will cross $150k this month..."
            maxLength={200}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm
              placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
          />
          
        <p className="text-xs text-slate-600 text-right mt-1">{text.length}/200</p>
        {text.trim() && (
  <div
    className="
      mt-4 rounded-2xl
      border border-[#1f2d4d]
      bg-[#08111f]
      p-4
    "
  >
    <div
      className="
        text-[10px]
        uppercase tracking-[0.25em]
        text-slate-500
        mb-2
      "
    >
      Preview
    </div>

    <div
      className="
        text-white
        text-lg font-bold
        leading-relaxed
      "
    >
      "{text}"
    </div>
  </div>
)}
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                  ${category === c.value
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/40'}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
            Expires In
          </label>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${duration === d.value
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/40'}`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        {/* Stake */}
        <div className="mb-5">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
            Your stake goes to builder wallet
          </label>
          <div className="flex gap-2">
            {STAKE_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setStakeUCT(s)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                  ${stakeUCT === s
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/40'}`}
              >
                {s} UCT
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="w-full py-3.5 rounded-2xl font-bold text-base bg-amber-500 text-black
            hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200 shadow-lg shadow-amber-500/20"
        >
          {submitting ? '⏳ Sending to wallet...' : `✨ Cast Wish · Stake ${stakeUCT} UCT`}
        </button>
      </div>
    </div>
  );
}