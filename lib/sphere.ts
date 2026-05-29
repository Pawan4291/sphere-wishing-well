'use client';

import type { WalletIdentity } from '../types/wish';
import {
  ConnectClient,
  HOST_READY_TYPE,
  HOST_READY_TIMEOUT,
} from '@unicitylabs/sphere-sdk/connect';
import {
  PostMessageTransport,
  ExtensionTransport,
} from '@unicitylabs/sphere-sdk/connect/browser';
import type {
  ConnectTransport,
  PermissionScope,
} from '@unicitylabs/sphere-sdk/connect';
import { SPHERE_WALLET_URL } from './constants';

// Exact same pattern as MastaP's chess app
const PERMISSIONS: PermissionScope[] = [
  'identity:read',
  'transfer:request',
  'events:subscribe',
];

const DAPP_META = {
  name: 'Sphere Wishing Well',
  description: 'Cast wishes, vote with your wallet, see community predictions come true.',
  url: typeof window !== 'undefined' ? window.location.origin : '',
} as const;

const SESSION_KEY = 'sphere-wishing-well-session';

let clientInstance: ConnectClient | null = null;
let transportInstance: ConnectTransport | null = null;
let identityCache: WalletIdentity | null = null;

function isInIframe(): boolean {
  try { return typeof window !== 'undefined' && window.self !== window.top; } catch { return true; }
}

function hasExtension(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__sphereExtension;
}

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

async function buildClient(transport: ConnectTransport, silent: boolean, resumeSessionId?: string): Promise<ConnectClient> {
  return new ConnectClient({
    transport,
    dapp: DAPP_META,
    permissions: PERMISSIONS,
    ...(silent ? { silent: true } : {}),
    ...(resumeSessionId ? { resumeSessionId } : {}),
  });
}

export async function connectWallet(
  silent = false
): Promise<{ client: ConnectClient; identity: WalletIdentity }> {
  // Clean up any previous transport
  transportInstance?.destroy?.();

  let transport: ConnectTransport;
  let client: ConnectClient;

  if (isInIframe()) {
    // Inside Sphere iframe — PostMessage to parent
    if (silent) {
      // Wait for HOST_READY signal before attempting silent connect
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', rh);
          reject(new Error('Host not ready'));
        }, 5000);
        function rh(e: MessageEvent) {
          if (e.data?.type === HOST_READY_TYPE) {
            clearTimeout(timer); window.removeEventListener('message', rh); resolve();
          }
        }
        window.addEventListener('message', rh);
      });
    }
    transport = PostMessageTransport.forClient();

  } else if (hasExtension()) {
    // Browser extension installed
    transport = ExtensionTransport.forClient();

  } else {
    // Popup fallback
    const popup = window.open(
      SPHERE_WALLET_URL + '/connect?origin=' + encodeURIComponent(location.origin),
      'sphere-wallet',
      'width=420,height=650'
    );
    if (!popup) throw new Error('Popup blocked. Please allow popups for this site.');
    transport = PostMessageTransport.forClient({ target: popup, targetOrigin: SPHERE_WALLET_URL });
    await waitForHostReady();
  }

  transportInstance = transport;
  const resumeSessionId = sessionStorage.getItem(SESSION_KEY) ?? undefined;
  client = await buildClient(transport, silent, resumeSessionId);

  const result = await client.connect();
  sessionStorage.setItem(SESSION_KEY, result.sessionId);

  clientInstance = client;

  const raw: any = result.identity ?? {};
  console.log('IDENTITY RAW:', raw);

  const identity: WalletIdentity = {
    nametag:       raw?.nametag       || '',
    directAddress: raw?.directAddress || '',
    l1Address:     raw?.l1Address     || '',
    chainPubkey:   raw?.chainPubkey   || '',
  };

  // Fallback query if nametag missing
  if (!identity.nametag) {
    try {
      const queried: any = await client.query('sphere_getIdentity');
      identity.nametag       = queried?.nametag       || identity.nametag;
      identity.directAddress = queried?.directAddress || identity.directAddress;
      identity.l1Address     = queried?.l1Address     || identity.l1Address;
      identity.chainPubkey   = queried?.chainPubkey   || identity.chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed:', e);
    }
  }

  identityCache = identity;
  console.log('FINAL IDENTITY:', identity);
  return { client, identity };
}

// Send UCT using client.intent('send') — official ConnectClient payment API
// recipient: nametag WITHOUT '@' prefix (e.g. 'pawan429')
// amount: number in UCT whole units (e.g. 1 for 1 UCT) — must be a NUMBER not string
export async function sendUCT(recipient: string, amountUCT: number): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');

  console.log('INTENT SEND DEBUG', { recipient, amount: amountUCT, coinId: 'UCT' });

  // recipient WITHOUT '@' — SDK adds it internally
  // amount is a NUMBER per the official extension docs example
  await clientInstance.intent('send', {
    recipient,
    amount: amountUCT,
    coinId: 'UCT',
  });
}

export function getClient() { return clientInstance; }
export function getCachedIdentity() { return identityCache; }

export function onIncomingTransfer(cb: (data: any) => void) {
  if (!clientInstance) return;
  clientInstance.on('transfer:incoming', cb);
}

export async function disconnectWallet() {
  try { await clientInstance?.disconnect(); } catch {}
  transportInstance?.destroy?.();
  sessionStorage.removeItem(SESSION_KEY);
  clientInstance = null;
  transportInstance = null;
  identityCache = null;
}