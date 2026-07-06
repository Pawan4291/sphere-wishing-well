'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WalletIdentity } from '../types/wish';
import {
  connectWallet,
  disconnectWallet,
  onIncomingTransfer,
} from '../lib/sphere';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function useSphereWallet() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function silentConnect() {
      try {
        setStatus('connecting');
        const result = await connectWallet(true);
        if (!cancelled) {
          setIdentity(result.identity);
          setStatus('connected');
        }
      } catch {
        if (!cancelled) setStatus('idle');
      }
    }
    silentConnect();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;
    onIncomingTransfer(() => {
      setIdentity(prev => prev ? { ...prev } : prev);
    });
  }, [status]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setStatus('connecting');
      const result = await connectWallet(false);
      setIdentity(result.identity);
      setStatus('connected');
    } catch (e: any) {
      setError(e?.message || 'Wallet connection failed');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(async () => {
    try { await disconnectWallet(); } catch {}
    setIdentity(null);
    setStatus('idle');
  }, []);

  return { status, identity, error, connect, disconnect, isConnected: status === 'connected' };
}