'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  expiresAt: number;
}

export default function CountdownTimer({ expiresAt }: CountdownProps) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(expiresAt - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-xs text-red-400 font-mono">EXPIRED</span>;

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);

  const urgency = remaining < 3_600_000; // under 1h

  return (
    <span className={`text-xs font-mono tabular-nums ${urgency ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
      ⏱ {parts.join(' ')}
    </span>
  );
}
