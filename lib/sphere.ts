'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

let identityCache: WalletIdentity | null = null;

// ─── sendUCT ──────────────────────────────────────────────────────────────
// Uses postMessage to the Sphere parent window.
// The Sphere web wallet intercepts this and shows its confirmation popup.
// This is exactly how PlayMario does it (no SDK, no window.sphere needed).
export function sendUCT(
  recipient: string,
  amountUCT: number,
  memo: string = ''
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!recipient) return reject(new Error('Recipient missing'));

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Transfer timed out'));
    }, 120_000);

    const handler = (event: MessageEvent) => {
      // Log ALL messages for debugging — remove after confirmed working
      console.log('MSG:', event.origin, JSON.stringify(event.data).slice(0, 200));

      const d = event.data;
      if (!d || typeof d !== 'object') return;

      const type: string = d.type ?? d.action ?? '';

      // ANY of these mean success
      if (
        type === 'transfer:success' ||
        type === 'sphere:transfer:success' ||
        type === 'UCT_TRANSFER_SUCCESS' ||
        type === 'TRANSFER_SUCCESS' ||
        d.success === true && d.coinId === 'UCT'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        return resolve();
      }

      // Rejected by user
      if (
        type === 'transfer:rejected' ||
        type === 'sphere:transfer:rejected' ||
        type === 'TRANSFER_REJECTED' ||
        d.rejected === true
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        return reject(new Error('Transfer cancelled'));
      }

      // Error
      if (
        type === 'transfer:error' ||
        type === 'sphere:transfer:error' ||
        type === 'TRANSFER_ERROR' ||
        d.error
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        return reject(new Error(d.message ?? d.error ?? 'Transfer failed'));
      }
    };

    window.addEventListener('message', handler);

    // Send to Sphere parent window using the format confirmed in Sphere docs
    const target = window.parent !== window ? window.parent : window.opener;
    if (!target) {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      return reject(new Error('No parent Sphere window found'));
    }

    const payload = {
      type: 'UCT_TRANSFER',         // format 1 — web wallet
      recipient,
      amount: amountUCT,
      coinId: 'UCT',
      memo,
    };

    console.log('POSTING to Sphere:', payload);
    target.postMessage(payload, '*'); // use * because origin can vary per env
  });
}

// ─── Connect ──────────────────────────────────────────────────────────────
export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  // Use the existing sphere-sdk autoConnect — only for identity, not payments
  const { autoConnect } = await import(
    '@unicitylabs/sphere-sdk/connect/browser'
  );

  const result = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description: 'Cast wishes, vote with your wallet.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  const raw: any = result.connection?.identity ?? {};
  let nametag = raw?.nametag ?? '';
  let directAddress = raw?.directAddress ?? '';
  let l1Address = raw?.l1Address ?? '';
  let chainPubkey = raw?.chainPubkey ?? '';

  if (!nametag) {
    try {
      const q: any = await result.client.query('sphere_getIdentity');
      nametag = q?.nametag ?? nametag;
      directAddress = q?.directAddress ?? directAddress;
      l1Address = q?.l1Address ?? l1Address;
      chainPubkey = q?.chainPubkey ?? chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity fallback failed:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  identityCache = identity;
  console.log('CONNECTED IDENTITY:', identity);

  return { client: result.client, identity };
}

export function getClient(): any { return null; }
export function getCachedIdentity(): WalletIdentity | null { return identityCache; }
export function onIncomingTransfer(_cb: (data: any) => void): void {}
export async function disconnectWallet(): Promise<void> { identityCache = null; }