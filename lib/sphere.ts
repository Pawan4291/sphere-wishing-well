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
      `Cannot send UCT: recipient address is empty ("${recipientAddress}").`
    );
  }

  // ✅ amount must be a STRING of the value in smallest units (18 decimals)
  // 1 UCT = '1000000000000000000' — matches SDK docs: amount: '1000000'
  const amount = (BigInt(Math.floor(amountUCT)) * BigInt('1000000000000000000')).toString();

  console.log('TRANSFER DEBUG', { recipientAddress, amount });

  await clientInstance.intent('send', {
    coinId: 'UCT',
    recipient: recipientAddress,
    amount,  // ← string like '1000000000000000000', NOT a number, NOT a BigInt object
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