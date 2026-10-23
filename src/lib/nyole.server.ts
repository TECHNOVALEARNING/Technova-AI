// Server-only helpers for the Technova PAY provider (nyole).
const API = "https://app.nyole.com/api/v1";

function key() {
  const k = process.env["NYOLE_SECRET_KEY"];
  if (!k) throw new Error("Payment provider is not configured");
  return k;
}

export async function createCheckout(input: {
  idempotencyKey: string; amount: number; description: string; email?: string | undefined;
  successUrl: string; cancelUrl: string; metadata: Record<string, string>;
}) {
  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      amount: input.amount, currency: "XOF", description: input.description,
      customer_email: input.email, success_url: input.successUrl, cancel_url: input.cancelUrl,
      metadata: input.metadata, merchant_name: "TechNova AI Hub",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
  if (!res.ok || !body.id || !body.url) throw new Error(body.error || `Checkout failed (${res.status})`);
  return { id: body.id, url: body.url };
}

export async function getCheckoutStatus(sessionId: string) {
  const res = await fetch(`${API}/checkout/sessions/${encodeURIComponent(sessionId)}/status`, { headers: { Authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new Error(`Status failed (${res.status})`);
  return (await res.json()) as { status: string; paid: boolean; amount: number; currency: string };
}

export function isLiveKey() { return key().startsWith("af_live_"); }

/**
 * Test-mode payments must never mint real credits in production. They are accepted only
 * outside production, or when NYOLE_ALLOW_TEST_PAYMENTS=true is set on purpose for a test run.
 */
export function testPaymentsAllowed() {
  return process.env["VERCEL_ENV"] !== "production" || process.env["NYOLE_ALLOW_TEST_PAYMENTS"] === "true";
}

async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyWebhook(raw: string, tsHeader: string | null, sigHeader: string | null) {
  const sig = (sigHeader ?? "").split(",").find(p => p.startsWith("v1="))?.slice(3);
  const ts = tsHeader ?? (sigHeader ?? "").split(",").find(p => p.startsWith("t="))?.slice(2);
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  // A dedicated webhook signing secret is used when configured, else the API secret key.
  const expected = await hmacHex(process.env["NYOLE_WEBHOOK_SECRET"]?.trim() || key(), `${ts}.${raw}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** Confirms with the provider (never trusts the browser) and credits once. */
export async function reconcilePayment(paymentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!p || !p.session_id) return null;
  if (p.credited) return "success";
  const s = await getCheckoutStatus(p.session_id);
  const status = s.status.toLowerCase();
  if (s.paid && status === "success" && s.amount === p.amount_xof && s.currency === "XOF") {
    if (!p.livemode && !testPaymentsAllowed()) {
      await supabaseAdmin.from("payments").update({ status: "test_blocked", updated_at: new Date().toISOString() }).eq("id", p.id);
      const { logSecurityEvent } = await import("@/lib/security.server");
      await logSecurityEvent(p.owner_id, "test_payment_blocked", "warning", { payment_id: p.id, amount: p.amount_xof });
      return "test_blocked";
    }
    await supabaseAdmin.rpc("settle_payment", { _payment: p.id });
    return "success";
  }
  if (status !== p.status) await supabaseAdmin.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", p.id);
  return status;
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
