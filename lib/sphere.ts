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

  console.log('IDENTITY RAW from connection:', raw);

  let directAddress = raw?.directAddress || '';
  let nametag = raw?.nametag || '';
  let l1Address = raw?.l1Address || '';
  let chainPubkey = raw?.chainPubkey || '';

  // fallback query
  if (!nametag) {
    try {
      const queried: any =
        await result.client.query('sphere_getIdentity');

      console.log('IDENTITY RAW from query:', queried);

      directAddress =
        queried?.directAddress || directAddress;

      nametag =
        queried?.nametag || nametag;

      l1Address =
        queried?.l1Address || l1Address;

      chainPubkey =
        queried?.chainPubkey || chainPubkey;

    } catch (e) {
      console.warn(
        'sphere_getIdentity query failed:',
        e
      );
    }
  }

  const identity: WalletIdentity = {
    nametag,
    directAddress,
    l1Address,
    chainPubkey,
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

  // 1 UCT = 1000000 base units
  const amount = (amountUCT * 1000000).toString();

  console.log('PAYMENTS SEND DEBUG', {
    recipient: recipientAddress,
    amount,
  });

  // REAL SDK CALL
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

export function onIncomingTransfer(
  cb: (data: any) => void
) {
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