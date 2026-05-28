'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WalletIdentity } from '../types/wish';
import {
  connectWallet,
  disconnectWallet,
  onIncomingTransfer,
} from '../lib/sphere';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function useSphereWallet() {
  const [status,   setStatus]   = useState<ConnectionStatus>('idle');
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const silentTried = useRef(false); // prevent double-fire in React strict mode

  // ── Silent reconnect on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (silentTried.current) return;
    silentTried.current = true;

    let cancelled = false;

    (async () => {
      setStatus('connecting');
      try {
        const { identity: id } = await connectWallet(true /* silent */);
        if (!cancelled) {
          setIdentity(id);
          setStatus('connected');
        }
      } catch {
        // Silent connect failing is normal (user never connected before)
        if (!cancelled) setStatus('idle');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Listen for incoming transfers while connected ─────────────────────────
  useEffect(() => {
    if (status !== 'connected') return;
    onIncomingTransfer((data: any) => {
      console.log('[wallet] incoming transfer:', data);
      // Force a re-render so balance-dependent UI refreshes
      setIdentity(prev => prev ? { ...prev } : prev);
    });
  }, [status]);

  // ── Manual connect (button click) ─────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    setStatus('connecting');
    try {
      const { identity: id } = await connectWallet(false /* not silent — shows popup */);
      setIdentity(id);
      setStatus('connected');
    } catch (e: any) {
      console.error('[wallet] connect error:', e);
      setError(e?.message ?? 'Wallet connection failed');
      setStatus('error');
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try { await disconnectWallet(); } catch (e) { console.error('[wallet] disconnect error:', e); }
    setIdentity(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    identity,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
}