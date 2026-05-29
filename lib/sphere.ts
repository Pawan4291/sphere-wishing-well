'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

let clientInstance: any = null;
let identityCache: WalletIdentity | null = null;

const DAPP_META = {
  name: 'Sphere Wishing Well',
  description: 'Cast wishes, vote with your wallet, see community predictions come true.',
  url: typeof window !== 'undefined' ? window.location.origin : '',
};

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  // Import PermissionScope type + ConnectClient together so typing is correct
  const { ConnectClient } = await import('@unicitylabs/sphere-sdk/connect');
  const { PostMessageTransport, ExtensionTransport } = await import(
    '@unicitylabs/sphere-sdk/connect/browser'
  );

  // Import the type so TS knows these strings are valid PermissionScope values
  type PermissionScope = import('@unicitylabs/sphere-sdk/connect').PermissionScope;

  const PERMISSIONS: PermissionScope[] = [
    'identity:read',
    'transfer:request',
    'events:subscribe',
  ];

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const hasExt   = typeof window !== 'undefined' && !!(window as any).__sphereExtension;

  let transport: any;
  if (inIframe || !hasExt) {
    transport = PostMessageTransport.forClient();
  } else {
    transport = ExtensionTransport.forClient();
  }

  const client = new ConnectClient({
    transport,
    dapp: DAPP_META,
    permissions: PERMISSIONS,
    ...(silent ? { silent: true } : {}),
  });

  const result = await client.connect();
  clientInstance = client;

  const raw: any = result?.identity ?? {};
  console.log('IDENTITY RAW:', raw);

  let directAddress = raw?.directAddress || '';
  let nametag       = raw?.nametag       || '';
  let l1Address     = raw?.l1Address     || '';
  let chainPubkey   = raw?.chainPubkey   || '';

  if (!nametag) {
    try {
      const queried: any = await client.query('sphere_getIdentity');
      console.log('IDENTITY from query:', queried);
      directAddress = queried?.directAddress || directAddress;
      nametag       = queried?.nametag       || nametag;
      l1Address     = queried?.l1Address     || l1Address;
      chainPubkey   = queried?.chainPubkey   || chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity failed:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  identityCache = identity;
  console.log('FINAL IDENTITY:', identity);
  return { client, identity };
}

export async function sendUCT(
  recipientAddress: string,
  amountUCT: number
): Promise<void> {
  if (!clientInstance) throw new Error('Wallet not connected');
  if (!recipientAddress) throw new Error('Recipient missing');

  const amount = (amountUCT * 1000000).toString();
  console.log('PAYMENTS SEND DEBUG', { recipient: recipientAddress, amount });

  await clientInstance.payments.send({
    recipient: recipientAddress,
    coinId: 'UCT',
    amount,
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