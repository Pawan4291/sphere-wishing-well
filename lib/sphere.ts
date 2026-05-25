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
      description: 'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  clientInstance = result.client;

  // ✅ Use identity from the connection result directly — do NOT call query() separately
  // The autoConnect result has: result.connection.identity
  const raw: any = result.connection?.identity ?? {};

  console.log('IDENTITY RAW from connection:', raw);

  // ✅ Fallback: if connection.identity is empty, try querying — but wrap in try/catch
  let directAddress = raw?.directAddress || '';
  let nametag = raw?.nametag || '';
  let l1Address = raw?.l1Address || '';
  let chainPubkey = raw?.chainPubkey || '';

  if (!directAddress) {
    try {
      const queried: any = await result.client.query('sphere_getIdentity');
      console.log('IDENTITY RAW from query:', queried);
      directAddress = queried?.directAddress || '';
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

  console.log('FINAL IDENTITY:', identity);

  return { client: result.client, identity };
}

export async function sendUCT(
  recipientAddress: string,
  amountUCT: number
): Promise<void> {

  if (!clientInstance) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  if (!recipientAddress || typeof recipientAddress !== 'string' || recipientAddress.trim() === '') {
    throw new Error(
      `Cannot send UCT: recipient address is empty or undefined ("${recipientAddress}"). ` +
      'The wish creator may not have a valid wallet address stored.'
    );
  }

  // ✅ Send amount as a plain number, NOT a BigInt string
  // The SDK docs show: amount: 100 (not "1000000000000000000")
  // 1 UCT = 1 (the SDK handles decimals internally for intent('send'))
  console.log('TRANSFER DEBUG', { recipientAddress, amountUCT });

  await clientInstance.intent('send', {
    coinId: 'UCT',
    recipient: recipientAddress,
    amount: amountUCT,   // ← plain number, e.g. 1 for 1 UCT
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