'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

let clientInstance: any = null;
let identityCache: WalletIdentity | null = null;

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import(
    '@unicitylabs/sphere-sdk/connect/browser'
  );

  const result = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description:
        'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  clientInstance = result.client;
  const raw: any = result.connection?.identity ?? {};

  let directAddress = raw?.directAddress || '';
  let nametag = raw?.nametag || '';
  let l1Address = raw?.l1Address || '';
  let chainPubkey = raw?.chainPubkey || '';

  if (!nametag) {
    try {
      const queried: any = await result.client.query('sphere_getIdentity');
      directAddress = queried?.directAddress || directAddress;
      nametag = queried?.nametag || nametag;
      l1Address = queried?.l1Address || l1Address;
      chainPubkey = queried?.chainPubkey || chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed:', e);
    }
  }

  const identity: WalletIdentity = {
    nametag,
    directAddress,
    l1Address,
    chainPubkey,
  };

  identityCache = identity;
  console.log('CONNECTED IDENTITY:', identity);

  return { client: result.client, identity };
}

/**
 * Send UCT using the official Sphere SDK intent API.
 * This triggers the native Sphere confirmation popup.
 *
 * Official API (from sphere-extension CONNECT.md):
 *   await client.intent('send', { recipient, amount, coinId, memo })
 *
 * UCT has 18 decimals — 1 UCT = 1_000_000_000_000_000_000 base units
 */
export async function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  if (!clientInstance) {
    throw new Error('Wallet not connected');
  }
  if (!recipient) {
    throw new Error('Recipient missing');
  }

  // UCT has 18 decimals
  const amountRaw = BigInt(Math.round(amountUCT)) * BigInt('1000000000000000000');

  console.log('SENDING UCT via intent:', {
    recipient,
    amount: amountRaw.toString(),
    coinId: 'UCT',
    memo,
  });

  // Official SDK method — triggers the Sphere confirmation popup
  await clientInstance.intent('send', {
    recipient,
    amount: amountRaw.toString(),
    coinId: 'UCT',
    memo,
  });

  console.log('UCT intent send success');
}

export function getClient() {
  return clientInstance;
}

export function getCachedIdentity() {
  return identityCache;
}

export function onIncomingTransfer(cb: (data: any) => void) {
  if (!clientInstance) return;
  clientInstance.on('transfer:incoming', cb);
}

export async function disconnectWallet() {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
    identityCache = null;
  }
}