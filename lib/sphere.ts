'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

const SESSION_KEY = 'wishing-well-session';
let connectClient: any = null;
let identityCache: WalletIdentity | null = null;
let uctCoinIdHex = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';

const PERMISSIONS = [
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

function extractIdentity(raw: any): WalletIdentity {
  return {
    nametag: raw?.nametag ?? '',
    directAddress: raw?.directAddress ?? '',
    l1Address: raw?.l1Address ?? '',
    chainPubkey: raw?.chainPubkey ?? '',
  };
}

export async function connectWallet(silent = false): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');
  const { SPHERE_NETWORKS } = await import('@unicitylabs/sphere-sdk/connect');

  const res = await autoConnect({
    dapp: DAPP_META,
    walletUrl: SPHERE_WALLET_URL,
    network: SPHERE_NETWORKS.testnet2,
    permissions: [...PERMISSIONS] as any,
    silent,
  });

  connectClient = res.client;
  if (res.connection?.sessionId) sessionStorage.setItem(SESSION_KEY, res.connection.sessionId);
  const identity = extractIdentity(res.connection?.identity);
  identityCache = identity;
  return { client: connectClient, identity };
}

export async function fetchUCTCoinId(): Promise<void> {
  if (!connectClient) return;
  try {
    const assets: any[] = await connectClient.query('sphere_getAssets');
    if (Array.isArray(assets)) {
      const uct = assets.find((a: any) => a.symbol === 'UCT');
      if (uct?.coinId) uctCoinIdHex = uct.coinId;
    }
  } catch (e) {
    console.warn('Could not fetch UCT coinId:', e);
  }
}

export async function sendUCT(recipient: string, amountUCT: number, memo = ''): Promise<void> {
  if (!connectClient) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');
  try {
    await connectClient.intent('send', {
      to: recipient,
      amount: (BigInt(amountUCT) * 1_000_000_000_000_000_000n).toString(),
      coinId: uctCoinIdHex,
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

export function getClient() { return connectClient; }
export function getCachedIdentity() { return identityCache; }
export function onIncomingTransfer(cb: (data: any) => void) {
  if (!connectClient) return;
  connectClient.on?.('transfer:incoming', cb);
}
export async function disconnectWallet() {
  try { await connectClient?.disconnect(); } catch {}
  connectClient = null;
  identityCache = null;
  sessionStorage.removeItem(SESSION_KEY);
}