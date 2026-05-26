'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

// Store the full ConnectClient — NOT result.client
let connectClient: any = null;
let identityCache: WalletIdentity | null = null;

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import(
    '@unicitylabs/sphere-sdk/connect/browser'
  );

  // autoConnect returns a ConnectClient directly (it IS the client)
  const client = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description:
        'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  // Store the ConnectClient itself — this is what has .intent() and .query()
  connectClient = client;

  // Get identity from the connection result
  const raw: any = client.connection?.identity ?? client.identity ?? {};
  let nametag = raw?.nametag ?? '';
  let directAddress = raw?.directAddress ?? '';
  let l1Address = raw?.l1Address ?? '';
  let chainPubkey = raw?.chainPubkey ?? '';

  // Fallback: query identity
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
 * This triggers the Sphere confirmation popup.
 * Amount is in whole UCT units (1 = 1 UCT).
 */
export async function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  if (!connectClient) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');

  console.log('SENDING UCT via intent:', { recipient, amountUCT, memo });

  // connectClient.intent('send') is the correct SDK call
  // amount is passed as a number (whole UCT), SDK handles decimals internally
  await connectClient.intent('send', {
    recipient,   // '@pawan429' format
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