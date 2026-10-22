// Server-only credit reservations: hold the worst-case cost before calling a provider,
// then charge the real cost (the rest returns to the balance) or release on failure.

export async function reserveCredits(ownerId: string, amount: number, label: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("reserve_credits_v2", { _owner: ownerId, _amount: amount, _label: label });
  if (error) throw new Error(`reserve_credits_v2: ${error.message}`);
  return data ?? null;
}

export async function settleCredits(reservationId: string, realAmount: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("confirm_credits", { _reservation: reservationId, _real_amount: Math.max(0, Math.ceil(realAmount)) });
  if (error) console.error("confirm_credits", reservationId, error.message);
}

export async function releaseCredits(reservationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("release_credits", { _reservation: reservationId });
  if (error) console.error("release_credits", reservationId, error.message);
}
