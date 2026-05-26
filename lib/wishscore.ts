import { supabase } from './supabase';

export async function addWishScore({
  address,
  nametag,
  points,
  reason,
  wishId,
}: {
  address: string;
  nametag: string;
  points: number;
  reason: string;
  wishId?: string;
}) {

  const { error } = await supabase
    .from('wishscore_history')
    .insert({
      address,
      nametag,
      points,
      reason,
      wish_id: wishId || null,
      created_at: Date.now(),
    });

  if (error) {
    console.error(
      'WishScore insert failed:',
      error
    );
  }
}