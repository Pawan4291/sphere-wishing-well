'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WalletIdentity } from '../types/wish';
import { connectWallet, disconnectWallet, onIncomingTransfer } from '../lib/sphere';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function useSphereWallet() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Silent auto-connect on load (works when already approved inside Sphere iframe)
  useEffect(() => {
    let cancelled = false;

    async function silentConnect() {
      try {
        setStatus('connecting');
        const { identity: id } = await connectWallet(true);
        if (!cancelled) {
          setIdentity(id);
          setStatus('connected');
        }
      } catch {
        if (!cancelled) setStatus('idle');
      }
    }

    silentConnect();
    return () => { cancelled = true; };
  }, []);

  // Listen for incoming transfers in real time
  useEffect(() => {
    if (status !== 'connected') return;
    onIncomingTransfer(() => {
      // Trigger re-render for real-time updates
      setIdentity(prev => prev ? { ...prev } : prev);
    });
  }, [status]);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      const { identity: id } = await connectWallet(false);
      setIdentity(id);
      setStatus('connected');
    } catch (e: any) {
      setError(e?.message ?? 'Connection failed');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setIdentity(null);
    setStatus('idle');
  }, []);

  return { status, identity, error, connect, disconnect, isConnected: status === 'connected' };
}