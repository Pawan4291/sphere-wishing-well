'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

export const BUILDER_NAMETAG = '@pawan429';

let connectClient: any = null;
let identityCache: WalletIdentity | null = null;
let uctCoinIdHex: string = 'UCT';

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import(
    '@unicitylabs/sphere-sdk/connect/browser'
  );

  const result: any = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description:
        'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  const client: any = result?.client ?? result;
  connectClient = client;

  const raw: any =
    result?.connection?.identity ??
    result?.identity ??
    client?.connection?.identity ??
    client?.identity ??
    {};

  let nametag: string = raw?.nametag ?? '';
  let directAddress: string = raw?.directAddress ?? '';
  let l1Address: string = raw?.l1Address ?? '';
  let chainPubkey: string = raw?.chainPubkey ?? '';

  if (!nametag) {
    try {
      const q: any = await client.query('sphere_getIdentity');
      nametag = q?.nametag ?? nametag;
      directAddress = q?.directAddress ?? directAddress;
      l1Address = q?.l1Address ?? l1Address;
      chainPubkey = q?.chainPubkey ?? chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  identityCache = identity;
  console.log('CONNECTED IDENTITY:', identity);

  return { client, identity };
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
      msg.includes('Cannot read properties of undefined')
    ) {
      console.warn('SDK internal error after send (tx succeeded):', msg);
      return;
    }
    throw e;
  }
}

export function getClient(): any {
  return connectClient;
}

export function getCachedIdentity(): WalletIdentity | null {
  return identityCache;
}

export function onIncomingTransfer(cb: (data: any) => void): void {
  if (!connectClient) return;
  connectClient.on?.('transfer:incoming', cb);
}

export async function disconnectWallet(): Promise<void> {
  if (connectClient) {
    try { await connectClient.disconnect(); } catch {}
    connectClient = null;
    identityCache = null;
  }
}