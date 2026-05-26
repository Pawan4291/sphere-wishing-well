'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';
export const BUILDER_NAMETAG = '@pawan429';
let clientInstance: any = null;

let identityCache: WalletIdentity | null = null;

export async function connectWallet(
  silent = false
): Promise<{
  client: any;
  identity: WalletIdentity;
}> {

  const { autoConnect } =
    await import(
      '@unicitylabs/sphere-sdk/connect/browser'
    );

  const result = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',

      description:
        'Community prediction market built on Sphere',

      url:
        typeof window !== 'undefined'
          ? window.location.origin
          : '',
    },

    walletUrl: SPHERE_WALLET_URL,

    silent,
  });

  clientInstance = result.client;

  const raw =
    result?.connection?.identity ?? {};

  const identity: WalletIdentity = {
    nametag:
      raw?.nametag || '',

    directAddress:
      raw?.directAddress || '',

    l1Address:
      raw?.l1Address || '',

    chainPubkey:
      raw?.chainPubkey || '',
  };

  identityCache = identity;

  console.log(
    'CONNECTED IDENTITY:',
    identity
  );

  return {
    client: clientInstance,
    identity,
  };
}

export async function sendUCT(
  recipient: string,
  amount: number,
  memo?: string
) {

  if (!clientInstance) {
    await connectWallet(false);
  }

  try {

    console.log('SENDING UCT:', {
      recipient,
      amount,
      memo,
    });

    // CURRENT WORKING METHOD
    const response =
      await clientInstance.request({
        method: 'transfer',

        params: {
          recipient,

          amount:
            (
              amount * 1000000
            ).toString(),

          coinId: 'UCT',

          memo:
            memo || '',
        },
      });

    console.log(
      'TRANSFER SUCCESS:',
      response
    );

    return response;

  } catch (e) {

    console.error(
      'TRANSFER FAILED:',
      e
    );

    throw e;
  }
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

  if (!clientInstance) {
    return;
  }

  clientInstance.on(
    'transfer:incoming',
    cb
  );
}

export async function disconnectWallet() {

  if (!clientInstance) {
    return;
  }

  try {

    await clientInstance.disconnect();

  } catch (e) {

    console.error(
      'Disconnect failed:',
      e
    );
  }

  clientInstance = null;

  identityCache = null;
}