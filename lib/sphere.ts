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
 * Send UCT via Sphere postMessage intent.
 * This triggers the native Sphere confirmation popup.
 * recipient: nametag with @ (e.g. '@pawan429')
 */
export function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!recipient) {
      return reject(new Error('Recipient missing'));
    }

    // Timeout after 2 minutes in case user ignores the popup
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Transfer timed out — please try again'));
    }, 120_000);

    const handler = (event: MessageEvent) => {
      // Only trust messages from Sphere wallet
      if (event.origin !== SPHERE_WALLET_URL) return;

      const type: string = event.data?.type ?? '';

      if (
        type === 'transfer:success' ||
        type === 'sphere:transfer:success'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      } else if (
        type === 'transfer:error' ||
        type === 'sphere:transfer:error'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        reject(new Error(event.data?.message || 'Transfer failed'));
      } else if (
        type === 'transfer:rejected' ||
        type === 'sphere:transfer:rejected'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        reject(new Error('Transfer cancelled by user'));
      }
    };

    window.addEventListener('message', handler);

    // Send to Sphere wallet — works whether app is in iframe (parent) or popup (opener)
    const target =
      window.parent !== window
        ? window.parent
        : window.opener ?? null;

    if (!target) {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      return reject(new Error('Sphere wallet window not found'));
    }

    console.log('SENDING UCT:', { recipient, amount: amountUCT, memo });

    target.postMessage(
      {
        type: 'transfer',
        recipient,
        amount: String(amountUCT),
        coinId: 'UCT',
        memo,
      },
      SPHERE_WALLET_URL
    );
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