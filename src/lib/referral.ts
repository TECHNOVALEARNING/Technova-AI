import { supabase } from "@/integrations/supabase/client";

// Referral programme (migration 0049): a link https://www.technovaihub.com/?ref=CODE keeps the code on the device
// (tn-ref, necessary storage listed on /cookies, 30 days) until the new account claims it once its e-mail is
// confirmed; then both accounts receive REFERRAL_CREDITS. The server decides everything (claim_referral).

export const REFERRAL_CREDITS = 5;
export const REFERRAL_MONTHLY_CAP = 30;
export const REF_KEY = "tn-ref";
const MAX_AGE = 30 * 86_400_000;

export const referralLink = (code: string) => `https://www.technovaihub.com/?ref=${code}`;

/** Keeps ?ref=CODE from the address bar (any page), without overwriting a code already kept. */
export function captureReferral() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
    if (!code || !/^[a-z0-9]{6,12}$/.test(code)) return;
    if (localStorage.getItem(REF_KEY)) return;
    localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch { /* storage blocked */ }
}

/** Promo codes (migration 0060): chosen by each account in Parrainage, 4 to 20 letters, digits, - or _, kept in
    capitals (e.g. AWA2026). A typed code may also be a link code: the server checks promo codes first. */
export const promoCodeLabel = (code: string) => code.toUpperCase();
export const normalizePromoCode = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();
export const isPromoCode = (value: string) => /^[A-Z0-9][A-Z0-9_-]{3,19}$/.test(normalizePromoCode(value));

export type SetPromoResult = "ok" | "invalid" | "taken" | "reserved" | "too_soon";
/** The caller's own promo code, or null when none was chosen yet. */
export async function myPromoCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc("my_promo_code" as never);
  return error ? null : ((data as string | null) ?? null);
}
/** Chooses the caller's promo code (server checks format, uniqueness and reserved words). */
export async function setMyPromoCode(value: string): Promise<SetPromoResult> {
  const code = normalizePromoCode(value);
  if (code && !isPromoCode(code)) return "invalid";
  const { data, error } = await supabase.rpc("set_my_promo_code" as never, { _code: code } as never);
  if (error) return "invalid";
  return (data as SetPromoResult) ?? "invalid";
}

/** A promo code typed at sign-up replaces any kept link code (claimed like a link once the e-mail is confirmed). */
export function savePromoCode(value: string) {
  const code = normalizePromoCode(value);
  if (!isPromoCode(code)) return false;
  try { localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() })); } catch { /* storage blocked */ }
  return true;
}

/** The code kept on this device (to prefill the sign-up field), in capitals, or "". */
export function keptPromoCode() {
  try { const saved = JSON.parse(localStorage.getItem(REF_KEY) ?? "null") as { code?: string } | null; return saved?.code ? promoCodeLabel(saved.code) : ""; } catch { return ""; }
}

export type PromoResult = "ok" | "pending" | "invalid" | "self" | "already" | "too_old" | "limit";
/** Claims a promo code typed in the dashboard (same server rules as a referral link). */
export async function redeemPromoCode(value: string): Promise<PromoResult> {
  const code = normalizePromoCode(value);
  if (!isPromoCode(code)) return "invalid";
  const { data, error } = await supabase.rpc("claim_referral", { _code: code });
  if (error) return "invalid";
  if (data === "pending") savePromoCode(code);
  return (data as PromoResult) ?? "invalid";
}

/** Claims the kept code for the signed-in account. Returns "ok" once credited, else null. */
export async function claimPendingReferral(): Promise<"ok" | null> {
  let saved: { code: string; at: number } | null;
  try { saved = JSON.parse(localStorage.getItem(REF_KEY) ?? "null") as { code: string; at: number } | null; } catch { saved = null; }
  if (!saved?.code) return null;
  if (Date.now() - saved.at > MAX_AGE) { localStorage.removeItem(REF_KEY); return null; }
  const { data, error } = await supabase.rpc("claim_referral", { _code: saved.code });
  if (error) return null;
  // "pending": the e-mail is not confirmed yet, try again on the next visit; anything else is final.
  if (data !== "pending") localStorage.removeItem(REF_KEY);
  return data === "ok" ? "ok" : null;
}
