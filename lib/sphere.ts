'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

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

  if (!nametag) {
    try {
      const queried: any = await result.client.query('sphere_getIdentity');
      console.log('IDENTITY RAW from query:', queried);
      directAddress = queried?.directAddress || directAddress;
      nametag = queried?.nametag || nametag;
      l1Address = queried?.l1Address || l1Address;
      chainPubkey = queried?.chainPubkey || chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  identityCache = identity;
  console.log('FINAL IDENTITY:', identity);

  return { client: result.client, identity };
}

export async function sendUCT(
  recipientNametag: string,
  amountUCT: number
): Promise<void> {

  if (!clientInstance) {
    throw new Error('Wallet not connected');
  }

  if (!recipientNametag || recipientNametag.trim() === '') {
    throw new Error('Recipient nametag is missing');
  }

  if (recipientNametag.includes('://')) {
    throw new Error('Got a DIRECT address instead of a nametag.');
  }

  const recipient = recipientNametag.startsWith('@')
    ? recipientNametag
    : `@${recipientNametag}`;

  // ✅ Look up the REAL coinId hash from the wallet's asset list
  let realCoinId = 'UCT'; // fallback
  try {
    const assets = await clientInstance.query('sphere_getAssets');
    const uct = Array.isArray(assets)
      ? assets.find((a: any) => a.symbol === 'UCT')
      : null;
    if (uct?.coinId) {
      realCoinId = uct.coinId; // the real hash e.g. '455ad872...'
      console.log('Using real UCT coinId:', realCoinId);
    }
  } catch (e) {
    console.warn('Could not fetch assets, using fallback coinId');
  }

  console.log('SENDING UCT:', { recipient, amount: amountUCT, coinId: realCoinId });

  await clientInstance.intent('send', {
    coinId: realCoinId,  // ✅ use the real hash, not 'UCT'
    recipient,
    amount: amountUCT,
  });
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