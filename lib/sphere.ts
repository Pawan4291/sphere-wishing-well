'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

let clientInstance: any = null;
let identityCache: WalletIdentity | null = null;

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');
  type PermissionScope = import('@unicitylabs/sphere-sdk/connect').PermissionScope;

  const PERMISSIONS: PermissionScope[] = [
    'identity:read'    as PermissionScope,
    'transfer:request' as PermissionScope,
    'events:subscribe' as PermissionScope,
  ];

  const result = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description: 'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
    permissions: PERMISSIONS,
  });

  clientInstance = result.client;

  const raw: any = result.connection?.identity ?? {};
  console.log('IDENTITY RAW from connection:', raw);

  let directAddress = raw?.directAddress || '';
  let nametag       = raw?.nametag       || '';
  let l1Address     = raw?.l1Address     || '';
  let chainPubkey   = raw?.chainPubkey   || '';

  if (!nametag) {
    try {
      const queried: any = await result.client.query('sphere_getIdentity');
      console.log('IDENTITY RAW from query:', queried);
      directAddress = queried?.directAddress || directAddress;
      nametag       = queried?.nametag       || nametag;
      l1Address     = queried?.l1Address     || l1Address;
      chainPubkey   = queried?.chainPubkey   || chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  identityCache = identity;
  console.log('FINAL IDENTITY:', identity);
  return { client: result.client, identity };
}

// Send UCT to a recipient nametag (e.g. 'pawan429') or address
// recipient should be a nametag string WITHOUT '@'
// amount is in UCT whole units (e.g. 1 for 1 UCT)
export async function sendUCT(
  recipient: string,
  amountUCT: number
): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');
  if (!recipient) throw new Error('Recipient missing');

  // SDK intent('send') requires amount as a string
  const amountStr = String(amountUCT);

  console.log('INTENT SEND DEBUG', { recipient, amount: amountStr, coinId: 'UCT' });

  await clientInstance.intent('send', {
    recipient,       // nametag like 'pawan429' or DIRECT:// address
    amount: amountStr,
    coinId: 'UCT',
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
    try { await clientInstance.disconnect(); } catch {}
    clientInstance = null;
    identityCache = null;
  }
}