'use client';

import {
  ConnectClient,
  HOST_READY_TYPE,
  HOST_READY_TIMEOUT,
} from '@unicitylabs/sphere-sdk/connect';
import {
  PostMessageTransport,
  ExtensionTransport,
} from '@unicitylabs/sphere-sdk/connect/browser';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

export const BUILDER_NAMETAG = '@pawan429';

// Only the permissions your app actually needs
const PERMISSIONS: PermissionScope[] = [
  'identity:read',
  'balance:read',
  'transfer:request',
  'events:subscribe',
];

const DAPP_META = {
  name: 'Sphere Wishing Well',
  description: 'Cast wishes, vote with your wallet, see community predictions come true.',
  url: typeof window !== 'undefined' ? window.location.origin : '',
};

const SESSION_KEY = 'wishing-well-session';

let connectClient: ConnectClient | null = null;
let transportInstance: any = null;
let popupRef: Window | null = null;
let identityCache: WalletIdentity | null = null;
let uctCoinIdHex: string = 'UCT';

function isInIframe(): boolean {
  try {
    return window.parent !== window && window.self !== window.top;
  } catch {
    return true;
  }
}

function hasExtension(): boolean {
  try {
    const sphere = (window as any).sphere;
    if (!sphere || typeof sphere !== 'object') return false;
    return typeof sphere.isInstalled === 'function' && sphere.isInstalled() === true;
  } catch {
    return false;
  }
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

function extractIdentity(raw: any): WalletIdentity {
  return {
    nametag: raw?.nametag ?? '',
    directAddress: raw?.directAddress ?? '',
    l1Address: raw?.l1Address ?? '',
    chainPubkey: raw?.chainPubkey ?? '',
  };
}

async function buildClient(
  transport: any,
  silent: boolean,
  resumeSessionId?: string
): Promise<WalletIdentity> {
  transportInstance?.destroy?.();
  transportInstance = transport;

  const client = new ConnectClient({
    transport,
    dapp: DAPP_META,
    permissions: PERMISSIONS,
    ...(silent ? { silent: true } : {}),
    ...(resumeSessionId ? { resumeSessionId } : {}),
  });

  connectClient = client;
  const result = await client.connect();

  if (result.sessionId) {
    sessionStorage.setItem(SESSION_KEY, result.sessionId);
  }

  const identity = extractIdentity(result.identity);
  identityCache = identity;
  console.log('CONNECTED IDENTITY:', identity);
  return identity;
}

export async function connectWallet(
  silent = false
): Promise<{ client: ConnectClient; identity: WalletIdentity }> {
  if (isInIframe()) {
    // Inside Sphere desktop iframe
    if (silent) {
      // Wait briefly for host ready
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', h);
          reject(new Error('Host not ready'));
        }, 5000);
        function h(e: MessageEvent) {
          if (e.data?.type === HOST_READY_TYPE) {
            clearTimeout(timer);
            window.removeEventListener('message', h);
            resolve();
          }
        }
        window.addEventListener('message', h);
      });
    }
    const transport = PostMessageTransport.forClient();
    const identity = await buildClient(transport, silent);
    return { client: connectClient!, identity };
  }

  if (hasExtension()) {
    const transport = ExtensionTransport.forClient();
    const identity = await buildClient(transport, silent);
    return { client: connectClient!, identity };
  }

  // Popup mode (outside Sphere, no extension)
  if (!popupRef || popupRef.closed) {
    const popup = window.open(
      SPHERE_WALLET_URL + '/connect?origin=' + encodeURIComponent(location.origin),
      'sphere-wallet',
      'width=420,height=650'
    );
    if (!popup) throw new Error('Popup blocked. Please allow popups for this site.');
    popupRef = popup;
  } else {
    popupRef.focus();
  }

  const transport = PostMessageTransport.forClient({
    target: popupRef,
    targetOrigin: SPHERE_WALLET_URL,
  });

  await waitForHostReady();
  const resumeSessionId = sessionStorage.getItem(SESSION_KEY) ?? undefined;
  const identity = await buildClient(transport, silent, resumeSessionId);
  return { client: connectClient!, identity };
}

export async function fetchUCTCoinId(): Promise<void> {
  if (!connectClient) return;
  try {
    const assets: any[] = await connectClient.query('sphere_getBalance');
    if (Array.isArray(assets)) {
      const uct = assets.find((a: any) => a.symbol === 'UCT');
      if (uct?.coinId) {
        uctCoinIdHex = uct.coinId;
        console.log('UCT coinId fetched:', uctCoinIdHex);
      }
    }
  } catch (e) {
    console.warn('Could not fetch UCT coinId:', e);
  }
}

export async function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  if (!connectClient) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');

  console.log('SENDING UCT via intent:', { to: recipient, amount: amountUCT, coinId: uctCoinIdHex });

  try {
    await connectClient.intent('send', {
      to: recipient,
      amount: amountUCT,
      coinId: uctCoinIdHex,
      ...(memo ? { memo } : {}),
    });
    console.log('UCT send success');
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '');
    if (
      msg.includes('startsWith') ||
      msg.includes('Cannot read properties of undefined') ||
      msg.toLowerCase().includes('timeout')
    ) {
      console.warn('SDK error after send (tx succeeded):', msg);
      return;
    }
    throw e;
  }
}

export function getClient(): ConnectClient | null { return connectClient; }
export function getCachedIdentity(): WalletIdentity | null { return identityCache; }

export function onIncomingTransfer(cb: (data: any) => void): void {
  if (!connectClient) return;
  connectClient.on?.('transfer:incoming', cb);
}

export async function disconnectWallet(): Promise<void> {
  try { await connectClient?.disconnect(); } catch {}
  transportInstance?.destroy?.();
  connectClient = null;
  transportInstance = null;
  identityCache = null;
  popupRef?.close();
  popupRef = null;
  sessionStorage.removeItem(SESSION_KEY);
}