'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

export const BUILDER_NAMETAG = '@pawan429';

let clientInstance: any = null;
let identityCache: WalletIdentity | null = null;

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {

  const sdk: any = await import('@unicitylabs/sphere-sdk/connect/browser');

  const transport = new sdk.IframeTransport(SPHERE_WALLET_URL);

  const client = new sdk.ConnectClient({
    transport,
    dapp: {
      name: 'Sphere Wishing Well',
      description: 'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    permissions: [
      'identity:read',
      'balance:read',
      'tokens:read',
      'events:subscribe',
      'transfer:request',
    ],
    silent,
  });

  await client.connect();
  clientInstance = client;

  const raw: any = await client.query('sphere_getIdentity');
  console.log('IDENTITY RAW:', raw);

  const identity: WalletIdentity = {
    nametag: raw?.nametag || '',
    directAddress: raw?.directAddress || '',
    l1Address: raw?.l1Address || '',
    chainPubkey: raw?.chainPubkey || '',
  };

  identityCache = identity;
  console.log('FINAL IDENTITY:', identity);

  return { client, identity };
}

export async function sendUCT(
  recipientAddress: string,
  amountUCT: number
): Promise<void> {

  if (!clientInstance) {
    throw new Error('Wallet not connected');
  }

  if (!recipientAddress) {
    throw new Error('Recipient missing');
  }

  const amount = (amountUCT * 1000000).toString();

  console.log('PAYMENTS SEND DEBUG', { recipient: recipientAddress, amount });

  await clientInstance.payments.send({
    recipient: recipientAddress,
    coinId: 'UCT',
    amount,
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
  clientInstance.on('transfer:incoming', cb);
}

export async function disconnectWallet() {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
    identityCache = null;
  }
}