'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import type { WalletIdentity } from '../types/wish';

import {
  connectWallet,
  disconnectWallet,
  onIncomingTransfer,
} from '../lib/sphere';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error';

export function useSphereWallet() {

  const [status, setStatus] =
    useState<ConnectionStatus>('idle');

  const [identity, setIdentity] =
    useState<WalletIdentity | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const silentTried = useRef(false);

  // Silent reconnect
  useEffect(() => {

    if (silentTried.current) return;

    silentTried.current = true;

    let cancelled = false;

    (async () => {

      setStatus('connecting');

      try {

        const { identity: id } =
          await connectWallet(true);

        if (!cancelled) {
          setIdentity(id);
          setStatus('connected');
        }

      } catch {

        if (!cancelled) {
          setStatus('idle');
        }
      }

    })();

    return () => {
      cancelled = true;
    };

  }, []);

  // Incoming transfers listener
  useEffect(() => {

    if (status !== 'connected') return;

    onIncomingTransfer((data: any) => {

      console.log(
        '[wallet] incoming transfer:',
        data
      );

      setIdentity(prev =>
        prev ? { ...prev } : prev
      );
    });

  }, [status]);

  // Manual connect
  const connect = useCallback(async () => {

    setError(null);
    setStatus('connecting');

    try {

      const { identity: id } =
        await connectWallet(false);

      setIdentity(id);
      setStatus('connected');

    } catch (e: any) {

      console.error(
        '[wallet] connect error:',
        e
      );

      setError(
        e?.message ?? 'Wallet connection failed'
      );

      setStatus('error');
    }

  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {

    try {
      await disconnectWallet();
    } catch (e) {
      console.error(
        '[wallet] disconnect error:',
        e
      );
    }

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