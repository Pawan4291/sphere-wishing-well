'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

let connectClient: any = null;
let identityCache: WalletIdentity | null = null;

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

  // autoConnect may return the client directly OR as result.client
  // Cast everything to any to avoid type errors
  const client: any = result?.client ?? result;
  connectClient = client;

  // Identity can live in multiple places depending on SDK version
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

  // Fallback: query identity directly
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

/**
 * Send UCT via ConnectClient.intent('send').
 * Triggers the Sphere confirmation popup.
 */
export async function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  if (!connectClient) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');

  console.log('SENDING UCT via intent:', { recipient, amountUCT, memo });

  await connectClient.intent('send', {
    recipient,
    amount: amountUCT,
    coinId: 'UCT',
    memo,
  });

  console.log('UCT send success');
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