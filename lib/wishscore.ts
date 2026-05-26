import { supabase } from './supabase';

console.log('wishscore.ts loaded');

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

  console.log('ADD WISHSCORE CALLED');

  const { error } = await supabase
    .from('wishscore_history')
    .insert({
      user_address: address,
      user_nametag: nametag,
      points,
      reason,
      wish_id: wishId || null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error(
      'WishScore insert failed:',
      error
    );
  } else {
    console.log('WishScore added successfully');
  }
}