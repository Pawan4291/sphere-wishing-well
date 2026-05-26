'use client';

export const BUILDER_NAMETAG = '@pawan429';

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
      url:
        typeof window !== 'undefined'
          ? window.location.origin
          : '',
    },

    walletUrl: SPHERE_WALLET_URL,

    silent,
  });

  clientInstance = result.client;

  const raw: any =
    result.connection?.identity ?? {};

  console.log(
    'IDENTITY RAW from connection:',
    raw
  );

  const identity: WalletIdentity = {
    nametag: raw?.nametag || '',
    directAddress: raw?.directAddress || '',
    l1Address: raw?.l1Address || '',
    chainPubkey: raw?.chainPubkey || '',
  };

  identityCache = identity;

  console.log('FINAL IDENTITY:', identity);

  return {
    client: result.client,
    identity,
  };
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

  // SDK expects string base units
  const amount = (
    amountUCT * 1_000_000
  ).toString();

  const recipient =
    recipientAddress.startsWith('@')
      ? recipientAddress
      : `@${recipientAddress}`;

  console.log('SENDING UCT:', {
    recipient,
    amount,
  });

  // REAL SDK 0.7.2 METHOD
  await clientInstance.payments.send({
    recipient,
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

export function onIncomingTransfer(
  cb: (data: any) => void
) {
  if (!clientInstance) return;

  clientInstance.on(
    'transfer:incoming',
    cb
  );
}

export async function disconnectWallet() {
  if (clientInstance) {
    await clientInstance.disconnect();

    clientInstance = null;
    identityCache = null;
  }
}