// Server-only payment settlement for every provider (Nyole, FeexPay): the provider is asked, never the browser,
// and settle_payment credits a payment exactly once.
import { getCheckoutStatus, testPaymentsAllowed } from "./nyole.server";

type Verdict = { paid: boolean; status: string };

async function providerVerdict(p: { provider: string; session_id: string; amount_xof: number; id: string }): Promise<Verdict> {
  if (p.provider === "feexpay") {
    const { getTransaction } = await import("./feexpay.server");
    const t = await getTransaction(p.session_id);
    // The reference must belong to this payment and cover its full amount.
    const paid = t.status === "success" && t.amount >= p.amount_xof && (t.callbackInfo === null || t.callbackInfo === p.id);
    return { paid, status: t.status };
  }
  const s = await getCheckoutStatus(p.session_id);
  const status = s.status.toLowerCase();
  return { paid: s.paid && status === "success" && s.amount === p.amount_xof && s.currency === "XOF", status };
}

/** Confirms with the provider (never trusts the browser) and credits once. */
export async function reconcilePayment(paymentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!p || !p.session_id) return null;
  if (p.credited) return "success";
  const v = await providerVerdict({ provider: p.provider, session_id: p.session_id, amount_xof: p.amount_xof, id: p.id });
  if (v.paid) {
    if (!p.livemode && !testPaymentsAllowed()) {
      await supabaseAdmin.from("payments").update({ status: "test_blocked", updated_at: new Date().toISOString() }).eq("id", p.id);
      const { logSecurityEvent } = await import("@/lib/security.server");
      await logSecurityEvent(p.owner_id, "test_payment_blocked", "warning", { payment_id: p.id, amount: p.amount_xof, provider: p.provider });
      return "test_blocked";
    }
    await supabaseAdmin.rpc("settle_payment", { _payment: p.id });
    return "success";
  }
  if (v.status !== p.status) await supabaseAdmin.from("payments").update({ status: v.status, updated_at: new Date().toISOString() }).eq("id", p.id);
  return v.status;
}

/** Safety net for lost webhooks: re-checks recent unpaid checkouts with the provider. */
export async function reconcilePendingPayments(maxAgeHours = 72, limit = 50) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
  const { data } = await supabaseAdmin.from("payments").select("id").eq("credited", false).not("session_id", "is", null)
    .not("status", "in", "(failed,test_blocked,expired,cancelled,canceled)").gte("created_at", since).order("created_at").limit(limit);
  let credited = 0;
  for (const row of data ?? []) {
    try { if ((await reconcilePayment(row.id)) === "success") credited++; } catch (e) { console.error("reconcile", row.id, e); }
  }
  return { checked: data?.length ?? 0, credited };
}
