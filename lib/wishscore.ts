import { supabase } from './supabase';

export async function addWishScore(params: {
  address: string;
  nametag: string;
  points: number;
  reason: string;
  wishId?: string;
}) {

  const {
    address,
    nametag,
    points,
    reason,
    wishId,
  } = params;

  // get existing user
  const { data: existing } =
    await supabase
      .from('users')
      .select('*')
      .eq('address', address)
      .single();

  // create user if missing
  if (!existing) {

    await supabase
      .from('users')
      .insert({
        address,
        nametag,
        wishscore: points,
        created_at: Date.now(),
      });

  } else {

    await supabase
      .from('users')
      .update({
        wishscore:
          (existing.wishscore || 0) +
          points,
      })
      .eq('address', address);
  }

  // history entry
  await supabase
    .from('wishscore_history')
    .insert({
      user_address: address,
      user_nametag: nametag,
      points,
      reason,
      wish_id: wishId || null,
      created_at: Date.now(),
    });
}