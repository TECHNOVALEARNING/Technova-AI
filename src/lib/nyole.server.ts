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
  const expected = await hmacHex(key(), `${ts}.${raw}`);
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
    await supabaseAdmin.rpc("settle_payment", { _payment: p.id });
    return "success";
  }
  if (status !== p.status) await supabaseAdmin.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", p.id);
  return status;
}
