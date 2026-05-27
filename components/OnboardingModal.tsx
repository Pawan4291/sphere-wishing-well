'use client';

import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Create Wishes',
    desc:
      'Post a wish with UCT stake. The community predicts whether it will happen.',
    emoji: '✨',
  },

  {
    title: 'Vote & Earn',
    desc:
      'Vote correctly on wishes and earn WishScore points to climb the leaderboard.',
    emoji: '🗳️',
  },

  {
    title: 'Build Reputation',
    desc:
      'When timers end, the community decides outcomes. Top predictors become trusted oracles.',
    emoji: '🏆',
  },
];

export default function OnboardingModal({
  onClose,
}: Props) {

  const [step, setStep] =
    useState(0);

  useEffect(() => {

    const seen =
      localStorage.getItem(
        'wishingwell_onboarding'
      );

    if (seen) {
      onClose();
    }

  }, [onClose]);

  const next = () => {

    if (step === STEPS.length - 1) {

      localStorage.setItem(
        'wishingwell_onboarding',
        'true'
      );

      onClose();

      return;
    }

    setStep(prev => prev + 1);
  };

  const current =
    STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-[#071120] shadow-2xl overflow-hidden">

        {/* Top Glow */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

        <div className="p-8">

          {/* Step */}
          <div className="mb-6 flex items-center justify-between">

            <span className="text-xs tracking-[0.3em] uppercase text-amber-400/70">
              Welcome
            </span>

            <span className="text-xs text-slate-500">
              {step + 1}/{STEPS.length}
            </span>

          </div>

          {/* Icon */}
          <div className="mb-6 text-5xl">
            {current.emoji}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-4">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-slate-400 leading-relaxed mb-8">
            {current.desc}
          </p>

          {/* Bottom */}
          <div className="flex items-center justify-between">

            {/* Dots */}
            <div className="flex gap-2">

              {STEPS.map((_, i) => (

                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step
                      ? 'w-8 bg-amber-400'
                      : 'w-2 bg-slate-700'
                  }`}
                />

              ))}

            </div>

            {/* Button */}
            <button
              onClick={next}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold px-5 py-2 transition-colors"
            >

              {step === STEPS.length - 1
                ? 'Enter App'
                : 'Next'}

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}