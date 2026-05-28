'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

import {
  ConnectClient,
  HOST_READY_TYPE,
  HOST_READY_TIMEOUT,
} from '@unicitylabs/sphere-sdk/connect';

import {
  PostMessageTransport,
} from '@unicitylabs/sphere-sdk/connect/browser';

import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';

// ✅ ONLY permissions actually needed
const PERMISSIONS: PermissionScope[] = [
  'identity:read',
  'balance:read',
  'transfer:request',
];

const DAPP_META = {
  name: 'Sphere Wishing Well',
  description:
    'Cast wishes, vote with your wallet, see community predictions come true.',
  url: typeof window !== 'undefined' ? window.location.origin : '',
} as const;

const SESSION_KEY = 'sphere-wishing-well-session';

let clientInstance: ConnectClient | null = null;
let identityCache: WalletIdentity | null = null;

function waitForHostReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Wallet did not respond in time'));
    }, HOST_READY_TIMEOUT);

    function handler(event: MessageEvent) {
      if (event.data?.type === HOST_READY_TYPE) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      }
    }

    window.addEventListener('message', handler);
  });
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function connectWallet(
  silent = false,
): Promise<{ client: ConnectClient; identity: WalletIdentity }> {

  if (isInIframe()) {

    if (silent) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', readyHandler);
          reject(new Error('Host not ready'));
        }, 5000);

        function readyHandler(e: MessageEvent) {
          if (e.data?.type === HOST_READY_TYPE) {
            clearTimeout(timer);
            window.removeEventListener('message', readyHandler);
            resolve();
          }
        }

        window.addEventListener('message', readyHandler);
      });
    }

    const transport = PostMessageTransport.forClient();

    const client = new ConnectClient({
      transport,
      dapp: DAPP_META,
      permissions: PERMISSIONS,
      ...(silent ? { silent: true } : {}),
    });

    const result = await client.connect();

    sessionStorage.setItem(SESSION_KEY, result.sessionId);

    clientInstance = client;

    const identity: WalletIdentity = {
      nametag: (result.identity as any)?.nametag ?? '',
      directAddress: (result.identity as any)?.directAddress ?? '',
      l1Address: (result.identity as any)?.l1Address ?? '',
      chainPubkey: (result.identity as any)?.chainPubkey ?? '',
    };

    identityCache = identity;

    return {
      client,
      identity,
    };

  } else {

    const popup = window.open(
      SPHERE_WALLET_URL +
        '/connect?origin=' +
        encodeURIComponent(location.origin),
      'sphere-wallet',
      'width=420,height=650'
    );

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    const transport = PostMessageTransport.forClient({
      target: popup,
      targetOrigin: SPHERE_WALLET_URL,
    });

    await waitForHostReady();

    const resumeSessionId =
      sessionStorage.getItem(SESSION_KEY) ?? undefined;

    const client = new ConnectClient({
      transport,
      dapp: DAPP_META,
      permissions: PERMISSIONS,
      ...(resumeSessionId ? { resumeSessionId } : {}),
      ...(silent ? { silent: true } : {}),
    });

    const result = await client.connect();

    sessionStorage.setItem(SESSION_KEY, result.sessionId);

    clientInstance = client;

    const identity: WalletIdentity = {
      nametag: (result.identity as any)?.nametag ?? '',
      directAddress: (result.identity as any)?.directAddress ?? '',
      l1Address: (result.identity as any)?.l1Address ?? '',
      chainPubkey: (result.identity as any)?.chainPubkey ?? '',
    };

    identityCache = identity;

    return {
      client,
      identity,
    };
  }
}

export async function sendUCT(
  recipientAddress: string,
  amountUCT: number
): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');
  if (!recipientAddress) throw new Error('Recipient missing');

  const amount = (amountUCT * 1_000_000).toString();

  await (clientInstance as any).request({
    method: 'transfer:request',
    params: {
      recipient: recipientAddress,
      coinId: 'UCT',
      amount,
    },
  });
}

export function getClient() {
  return clientInstance;
}

export function getCachedIdentity() {
  return identityCache;
}

export function onIncomingTransfer(cb: (data: any) => void) {
  if (!clientInstance) return;

  (clientInstance as any).on('transfer:incoming', cb);
}

export async function disconnectWallet() {
  if (clientInstance) {
    await (clientInstance as any).disconnect?.();
    clientInstance = null;
    identityCache = null;
  }

  sessionStorage.removeItem(SESSION_KEY);
}