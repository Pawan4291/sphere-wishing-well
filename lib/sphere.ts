'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

// Your builder identity — hardcoded so team always sees who built this
export const BUILDER_NAMETAG = '@pawan429';

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
    description: 'Cast wishes, vote with your wallet, see community predictions come true.',
    url: typeof window !== 'undefined' ? window.location.origin : '',
  } as any,
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

  if (!nametag || !directAddress) {
    try {
      const queried: any = await result.client.query('sphere_getIdentity');
      console.log('IDENTITY from query:', queried);
      directAddress = queried?.directAddress || directAddress;
      nametag = queried?.nametag || nametag;
      l1Address = queried?.l1Address || l1Address;
      chainPubkey = queried?.chainPubkey || chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity failed:', e);
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
  return { client: result.client, identity };
}

export async function sendUCT(
  recipientAddress: string,
  amountUCT: number
): Promise<void> {
  if (!clientInstance) {
    throw new Error('Wallet not connected');
  }
  if (!recipientAddress || recipientAddress.trim() === '') {
    throw new Error('Recipient address is missing');
  }

  const amount = (
    BigInt(amountUCT) * BigInt('1000000000000000000')
  ).toString();

  console.log('SENDING UCT:', { recipient: recipientAddress, amount });

  try {
    const result = await clientInstance.intent('send', {
      coinId: 'UCT',
      recipient: recipientAddress,
      amount,
    });
    console.log('INTENT RESULT:', result);
  } catch (e: any) {
    // If user cancelled the transaction, throw a clean message
    const msg = e?.message || String(e) || '';
    if (
      msg.toLowerCase().includes('cancel') ||
      msg.toLowerCase().includes('reject') ||
      msg.toLowerCase().includes('denied') ||
      msg.toLowerCase().includes('user refused')
    ) {
      throw new Error('Transaction cancelled by user');
    }
    // For the startsWith crash — this is an SDK internal error
    // that happens when wallet closes. Transaction likely went through.
    // Log it but don't crash the app.
    console.warn('Intent send warning (may still have succeeded):', e);
    // Re-throw so Supabase insert doesn't happen if truly failed
    throw new Error('Transaction failed: ' + msg);
  }
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