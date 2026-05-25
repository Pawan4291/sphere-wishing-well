import type { Wish } from '../types/wish';
import { STORAGE_KEY } from './constants';

export function loadWishes(): Wish[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWishes(wishes: Wish[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
}

export function addWish(wish: Wish): void {
  const wishes = loadWishes();
  wishes.unshift(wish);
  saveWishes(wishes);
}

export function updateWish(updated: Wish): void {
  const wishes = loadWishes();
  const idx = wishes.findIndex(w => w.id === updated.id);
  if (idx !== -1) {
    wishes[idx] = updated;
    saveWishes(wishes);
  }
}

export function resolveExpiredWishes(): void {
  const wishes = loadWishes();
  let changed = false;
  const now = Date.now();
  const resolved = wishes.map(w => {
    if (w.status === 'active' && now > w.expiresAt) {
      changed = true;
      const status: 'fulfilled' | 'unfulfilled' =
  w.fulfilCount >= w.noFulfilCount ? 'fulfilled' : 'unfulfilled';

return { ...w, status };
    }
    return w;
  });
  if (changed) saveWishes(resolved);
}
