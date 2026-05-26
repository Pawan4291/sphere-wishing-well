'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';
import { TREASURY_NAMETAG } from './payouts';

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
      url:
        typeof window !== 'undefined'
          ? window.location.origin
          : '',
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
  return { client: result.client, identity };
}

/**
 * Pay into the treasury wallet.
 * ALL payments (wish stakes + votes) go to @pawan429.
 * The server resolves and distributes winnings automatically.
 */
export async function payToTreasury(amountUCT: number): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');

  // 1 UCT = 1,000,000 base units (from SDK docs)
  const amount = (amountUCT * 1_000_000).toString();

  console.log('TREASURY PAYMENT', { recipient: TREASURY_NAMETAG, amount });

  await clientInstance.payments.send({
    recipient: TREASURY_NAMETAG,
    coinId: 'UCT',
    amount,
  });
}

/**
 * @deprecated Use payToTreasury instead.
 * Kept for backward compat — now routes to treasury.
 */
export async function sendUCT(
  _recipientAddress: string,
  amountUCT: number
): Promise<void> {
  return payToTreasury(amountUCT);
}

export function getClient() { return clientInstance; }
export function getCachedIdentity() { return identityCache; }

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