'use client';

// Sphere Connect wrapper
// Uses @unicitylabs/sphere-sdk/connect/browser autoConnect
// Works inside Sphere desktop iframe (PostMessage) or extension

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

  const raw: any = await result.client.query('sphere_getIdentity');

  const identity: WalletIdentity = {
    nametag: raw?.nametag || '',
    directAddress: raw?.directAddress || '',
    l1Address: raw?.l1Address || '',
    chainPubkey: raw?.chainPubkey || '',
  };

  identityCache = identity;

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

  const amount = (
    BigInt(amountUCT) * BigInt('1000000000000000000')
  ).toString();

  console.log('TRANSFER DEBUG');

  console.log({
    recipientAddress,
    amount,
    clientInstance,
  });

  // TRY METHOD 1
  try {
    console.log('Trying send intent...');

    const res = await clientInstance.intent('send', {
      recipient: recipientAddress,
      amount,
      coinId: 'UCT',
    });

    console.log('SEND RESULT:', res);

    return;
  } catch (err) {
    console.error('SEND FAILED:', err);
  }

  // TRY METHOD 2
  try {
    console.log('Trying transfer intent...');

    const res = await clientInstance.intent('transfer', {
      to: recipientAddress,
      amount,
      token: 'UCT',
    });

    console.log('TRANSFER RESULT:', res);

    return;
  } catch (err) {
    console.error('TRANSFER FAILED:', err);
  }

  alert('All wallet transfer methods failed. Check console.');
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