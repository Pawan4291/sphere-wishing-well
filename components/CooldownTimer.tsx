'use client';
import { useState, useEffect } from 'react';

export default function CooldownTimer({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);

  useEffect(() => {
    setRemaining(ms);
    const interval = setInterval(() => {
      setRemaining(r => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [ms]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="text-2xl font-bold text-amber-400 font-mono">
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  );
}