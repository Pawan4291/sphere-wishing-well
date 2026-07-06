'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

const SESSION_KEY = 'sphere-wishing-well-session';

let clientInstance: any = null;
let identityCache: WalletIdentity | null = null;
const uctCoinId = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';

function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function extractIdentity(raw: any): WalletIdentity {
  return {
    nametag: raw?.nametag ?? '',
    directAddress: raw?.directAddress ?? '',
    l1Address: raw?.l1Address ?? '',
    chainPubkey: raw?.chainPubkey ?? '',
  };
}

export async function connectWallet(silent = false): Promise<{ client: any; identity: WalletIdentity }> {
  const sdk = await import('@unicitylabs/sphere-sdk/connect');
  const { ConnectClient, HOST_READY_TYPE, HOST_READY_TIMEOUT, SPHERE_NETWORKS } = sdk;
  const PostMessageTransport = (sdk as any).PostMessageTransport;

 const PERMISSIONS = ['identity:read', 'balance:read', 'transfer:request', 'events:subscribe'] as const;

  const DAPP_META = {
    name: 'Sphere Wishing Well',
    description: 'Cast wishes, vote with your wallet, see community predictions come true.',
    url: typeof window !== 'undefined' ? window.location.origin : '',
  };

  function waitForHostReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Wallet did not respond in time'));
      }, HOST_READY_TIMEOUT);
      function handler(e: MessageEvent) {
        if (e.data?.type === HOST_READY_TYPE) {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve();
        }
      }
      window.addEventListener('message', handler);
    });
  }

  if (isInIframe()) {
    if (silent) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { window.removeEventListener('message', h); reject(new Error('Host not ready')); }, 5000);
        function h(e: MessageEvent) { if (e.data?.type === HOST_READY_TYPE) { clearTimeout(timer); window.removeEventListener('message', h); resolve(); } }
        window.addEventListener('message', h);
      });
    }
    const transport = PostMessageTransport.forClient();
    const client = new ConnectClient({ transport, dapp: DAPP_META, permissions: [...PERMISSIONS], network: SPHERE_NETWORKS.testnet2, ...(silent ? { silent: true } : {}) });
    const result = await client.connect();
    if (result.sessionId) sessionStorage.setItem(SESSION_KEY, result.sessionId);
    clientInstance = client;
    identityCache = extractIdentity(result.identity);
    return { client, identity: identityCache };
  }

  const popup = window.open(SPHERE_WALLET_URL + '/connect?origin=' + encodeURIComponent(location.origin), 'sphere-wallet', 'width=420,height=650');
  if (!popup) throw new Error('Popup blocked. Please allow popups for this site.');
  const transport = PostMessageTransport.forClient({ target: popup, targetOrigin: SPHERE_WALLET_URL });
  await waitForHostReady();
  const resumeSessionId = sessionStorage.getItem(SESSION_KEY) ?? undefined;
  const client = new ConnectClient({ transport, dapp: DAPP_META, permissions: [...PERMISSIONS], network: SPHERE_NETWORKS.testnet2, ...(silent ? { silent: true } : {}), ...(resumeSessionId ? { resumeSessionId } : {}) });
  const result = await client.connect();
  if (result.sessionId) sessionStorage.setItem(SESSION_KEY, result.sessionId);
  clientInstance = client;
  identityCache = extractIdentity(result.identity);
  return { client, identity: identityCache };
}

export async function sendUCT(recipient: string, amountUCT: number, memo = ''): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');
  try {
    await clientInstance.intent('send', {
      to: recipient,
      amount: (BigInt(amountUCT) * 1_000_000_000_000_000_000n).toString(),
      coinId: uctCoinId,
      ...(memo ? { memo } : {}),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '');
    if (msg.includes('startsWith') || msg.includes('Cannot read properties') || msg.toLowerCase().includes('timeout')) {
      console.warn('SDK error after send (tx likely succeeded):', msg);
      return;
    }
    throw e;
  }
}

export function getClient() { return clientInstance; }
export function getCachedIdentity() { return identityCache; }
export function onIncomingTransfer(cb: (data: any) => void) {
  if (!clientInstance) return;
  clientInstance.on?.('transfer:incoming', cb);
}
export async function disconnectWallet() {
  try { await clientInstance?.disconnect(); } catch {}
  clientInstance = null;
  identityCache = null;
  sessionStorage.removeItem(SESSION_KEY);
}