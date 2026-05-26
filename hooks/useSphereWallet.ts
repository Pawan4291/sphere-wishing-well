'use client';

import { useState, useEffect, useCallback } from 'react';

import type { WalletIdentity } from '../types/wish';

import {
  connectWallet,
  disconnectWallet,
  onIncomingTransfer,
} from '../lib/sphere';

type ConnectionStatus =
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

  // Silent reconnect
  useEffect(() => {

    let cancelled = false;

    async function silentConnect() {

      try {

        setStatus('connecting');

        const result =
          await connectWallet(true);

        if (!cancelled) {

          setIdentity(result.identity);

          setStatus('connected');
        }

      } catch (e) {

        console.log(
          'Silent connect skipped'
        );

        if (!cancelled) {
          setStatus('idle');
        }
      }
    }

    silentConnect();

    return () => {
      cancelled = true;
    };

  }, []);

  // Incoming transfer listener
  useEffect(() => {

    if (status !== 'connected') {
      return;
    }

    onIncomingTransfer((data: any) => {

      console.log(
        'Incoming transfer:',
        data
      );

      // trigger rerender
      setIdentity(prev =>
        prev
          ? { ...prev }
          : prev
      );
    });

  }, [status]);

  const connect = useCallback(async () => {

    try {

      setError(null);

      setStatus('connecting');

      const result =
        await connectWallet(false);

      setIdentity(result.identity);

      setStatus('connected');

    } catch (e: any) {

      console.error(
        'Wallet connect error:',
        e
      );

      setError(
        e?.message ||
        'Wallet connection failed'
      );

      setStatus('error');
    }

  }, []);

  const disconnect = useCallback(async () => {

    try {

      await disconnectWallet();

    } catch (e) {

      console.error(
        'Disconnect failed:',
        e
      );
    }

    setIdentity(null);

    setStatus('idle');

  }, []);

  return {
    status,

    identity,

    error,

    connect,

    disconnect,

    isConnected:
      status === 'connected',
  };
}