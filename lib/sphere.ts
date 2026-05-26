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

  // GLOBAL DEBUG: log ALL incoming postMessages so we can see what Sphere sends back
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (e) => {
      console.log('SPHERE MESSAGE RECEIVED:', {
        origin: e.origin,
        data: e.data,
      });
    });
  }

  return { client: result.client, identity };
}

export function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!recipient) {
      return reject(new Error('Recipient missing'));
    }

    console.log('SENDING UCT:', { recipient, amount: amountUCT, memo });

    // ATTEMPT 1: Use SDK client.payments.send — this is what triggers the popup
    if (clientInstance) {
      try {
        await clientInstance.payments.send({
          recipient,
          coinId: 'UCT',
          amount: String(amountUCT * 1_000_000_000_000_000_000),
          memo,
        });
        console.log('SDK payments.send success');
        return resolve();
      } catch (e: any) {
        console.warn('SDK payments.send failed:', e?.message);
        // If it is a permission error specifically, fall through to postMessage
        if (!e?.message?.includes('Permission denied')) {
          return reject(new Error(e?.message || 'Payment failed'));
        }
      }
    }

    // ATTEMPT 2: postMessage fallback
    const target =
      window.parent !== window
        ? window.parent
        : window.opener ?? null;

    if (!target) {
      return reject(new Error('Sphere wallet window not found'));
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Transfer timed out — please try again'));
    }, 120_000);

    const handler = (event: MessageEvent) => {
      console.log('postMessage response:', event.origin, JSON.stringify(event.data));

      const type: string = event.data?.type ?? '';

      if ([
        'transfer:success',
        'sphere:transfer:success',
        'intent:success',
        'payment:success',
        'tx:success',
      ].includes(type)) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      } else if ([
        'transfer:rejected',
        'sphere:transfer:rejected',
        'intent:rejected',
        'payment:rejected',
      ].includes(type)) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        reject(new Error('Transfer cancelled by user'));
      } else if ([
        'transfer:error',
        'sphere:transfer:error',
        'intent:error',
        'payment:error',
      ].includes(type)) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        reject(new Error(event.data?.message || 'Transfer failed'));
      }
    };

    window.addEventListener('message', handler);

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