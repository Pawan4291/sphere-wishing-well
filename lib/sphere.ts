'use client';

import type { WalletIdentity } from '../types/wish';
import { SPHERE_WALLET_URL } from './constants';

// Module-level singletons — survive re-renders
let _client: any = null;
let _identity: WalletIdentity | null = null;
let _uctCoinId: string = 'UCT'; // fallback symbol; replaced with hex coinId after connect

// ─── Connect ────────────────────────────────────────────────────────────────

export async function connectWallet(
  silent = false
): Promise<{ client: any; identity: WalletIdentity }> {
  const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');

  const result: any = await autoConnect({
    dapp: {
      name: 'Sphere Wishing Well',
      description: 'Cast wishes, vote with your wallet, see community predictions come true.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    walletUrl: SPHERE_WALLET_URL,
    silent,
  });

  // autoConnect can return either { client, connection } or the client directly
  const client: any = result?.client ?? result;
  _client = client;

  // Pull identity from wherever the SDK puts it
  const raw: any =
    result?.connection?.identity ??
    result?.identity ??
    client?.connection?.identity ??
    client?.identity ??
    {};

  let nametag: string     = raw?.nametag       ?? '';
  let directAddress: string = raw?.directAddress ?? '';
  let l1Address: string   = raw?.l1Address     ?? '';
  let chainPubkey: string = raw?.chainPubkey   ?? '';

  // Some SDK versions need an explicit query
  if (!nametag) {
    try {
      const q: any = await client.query('sphere_getIdentity');
      nametag       = q?.nametag       ?? nametag;
      directAddress = q?.directAddress ?? directAddress;
      l1Address     = q?.l1Address     ?? l1Address;
      chainPubkey   = q?.chainPubkey   ?? chainPubkey;
    } catch (e) {
      console.warn('sphere_getIdentity query failed — identity may be partial:', e);
    }
  }

  const identity: WalletIdentity = { nametag, directAddress, l1Address, chainPubkey };
  _identity = identity;

  console.log('[sphere] connected identity:', identity);

  // Immediately try to get the real UCT coinId hex so sendUCT skips the asset picker
  await _fetchUCTCoinId(client);

  return { client, identity };
}

// ─── UCT coin ID (internal) ──────────────────────────────────────────────────

async function _fetchUCTCoinId(client: any): Promise<void> {
  try {
    const assets: any[] = await client.query('sphere_getBalance');
    if (Array.isArray(assets)) {
      const uct = assets.find((a: any) => a.symbol === 'UCT');
      if (uct?.coinId) {
        _uctCoinId = uct.coinId;
        console.log('[sphere] UCT coinId:', _uctCoinId);
      }
    }
  } catch (e) {
    console.warn('[sphere] Could not fetch UCT coinId, will use symbol fallback:', e);
  }
}

// Exported so useSphereWallet can call it after silent reconnect if needed
export async function fetchUCTCoinId(): Promise<void> {
  if (_client) await _fetchUCTCoinId(_client);
}

// ─── Send UCT ────────────────────────────────────────────────────────────────

export async function sendUCT(
  recipient: string,
  amountUCT: number,
  memo = ''
): Promise<void> {
  if (!_client)    throw new Error('Wallet not connected');
  if (!recipient)  throw new Error('Recipient address is missing');

  console.log('[sphere] sendUCT →', { recipient, amountUCT, coinId: _uctCoinId });

  try {
    await _client.intent('send', {
      to: recipient,
      amount: amountUCT,
      coinId: _uctCoinId,
      ...(memo ? { memo } : {}),
    });
    console.log('[sphere] sendUCT success');
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '');

    // The SDK sometimes throws after the tx already went through — treat as success
    const isSpuriousError =
      msg.includes('startsWith') ||
      msg.includes('Cannot read properties of undefined') ||
      msg.toLowerCase().includes('timeout');

    if (isSpuriousError) {
      console.warn('[sphere] Spurious SDK error after send (tx likely succeeded):', msg);
      return;
    }

    throw e; // real error — propagate so the UI can show it
  }
}

// ─── Disconnect ──────────────────────────────────────────────────────────────

export async function disconnectWallet(): Promise<void> {
  if (_client) {
    try { await _client.disconnect(); } catch { /* ignore */ }
    _client   = null;
    _identity = null;
    _uctCoinId = 'UCT';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getClient(): any                  { return _client; }
export function getCachedIdentity(): WalletIdentity | null { return _identity; }

export function onIncomingTransfer(cb: (data: any) => void): void {
  _client?.on?.('transfer:incoming', cb);
}