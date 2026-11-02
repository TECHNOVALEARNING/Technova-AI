// Server-only helpers for FeexPay (API v2): Mobile Money request-to-pay, card checkout and status checks.
// Keys stay in server environment variables: FEEXPAY_API_KEY (test_key_… in sandbox, fp_… in live),
// FEEXPAY_SHOP_ID and FEEXPAY_WEBHOOK_SECRET (the value set as the webhook "Bearer" in the FeexPay dashboard).

function config() {
  const apiKey = process.env["FEEXPAY_API_KEY"]?.trim();
  const shop = process.env["FEEXPAY_SHOP_ID"]?.trim();
  if (!apiKey || !shop) throw new Error("FeexPay is not configured");
  return { apiKey, shop, base: apiKey.startsWith("fp_") ? "https://api-v2.feexpay.me" : "https://sandbox-api.feexpay.me" };
}

export function feexpayConfigured() {
  return Boolean(process.env["FEEXPAY_API_KEY"]?.trim() && process.env["FEEXPAY_SHOP_ID"]?.trim());
}
export const feexpayLive = () => Boolean(process.env["FEEXPAY_API_KEY"]?.trim().startsWith("fp_"));

/** Only FeexPay's own pages (or an operator page it returns over https) may receive the customer. */
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null; } catch { return null; }
}

async function call(path: string, body?: Record<string, unknown>) {
  const { apiKey, base } = config();
  const res = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : null,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`FeexPay ${res.status}: ${String(json["message"] ?? json["error"] ?? "request failed")}`);
  return json;
}

type Customer = { firstName: string; lastName: string; email?: string | undefined };

/** Mobile Money: the customer confirms on the phone (push) or on the operator page (paymentUrl). */
export async function requestMobileMoney(input: { network: string; phone: string; amount: number; paymentId: string; description: string; customer: Customer; returnUrl: string; cancelUrl: string }) {
  const { shop } = config();
  const r = await call(`/api/transactions/public/requesttopay/${encodeURIComponent(input.network)}`, {
    shop, amount: input.amount, phoneNumber: input.phone, description: input.description, callback_info: input.paymentId,
    first_name: input.customer.firstName, last_name: input.customer.lastName, email: input.customer.email,
    return_url: input.returnUrl, cancel_url: input.cancelUrl,
  });
  const reference = typeof r["reference"] === "string" ? r["reference"] : "";
  if (!reference) throw new Error("FeexPay: no transaction reference");
  return { reference, paymentUrl: safeUrl(r["payment_url"]) };
}

/** Card: FeexPay's hosted checkout (3-D Secure). Needs card payments enabled on the shop. */
export async function createCardCheckout(input: { amount: number; paymentId: string; description: string; customer: Customer; phone: string; city: string; country: string; returnUrl: string; cancelUrl: string }) {
  const { shop } = config();
  const r = await call("/api/transactions/public/requesttopay/init", {
    shop, amount: String(input.amount), currency: "XOF",
    first_name: input.customer.firstName, last_name: input.customer.lastName, email: input.customer.email,
    phoneNumber: input.phone, city: input.city, zip: "00000", country: input.country,
    description: input.description, callback_info: input.paymentId, return_url: input.returnUrl, cancel_url: input.cancelUrl,
  });
  const reference = typeof r["reference"] === "string" ? r["reference"] : "";
  const url = safeUrl(r["payment_url"]);
  if (!reference || !url || !/(^|\.)feexpay\.me$/.test(new URL(url).hostname)) throw new Error("FeexPay: invalid card checkout");
  return { reference, url };
}

/** Authoritative status read: SUCCESSFUL, FAILED or PENDING, with the amount and our payment id. */
export async function getTransaction(reference: string) {
  const r = await call(`/api/transactions/public/single/status/${encodeURIComponent(reference)}`);
  const raw = typeof r["status"] === "string" ? r["status"] : "";
  const status = raw === "SUCCESSFUL" ? "success" : raw === "FAILED" ? "failed" : "pending";
  return { status, amount: Number(r["amount"]) || 0, callbackInfo: typeof r["callback_info"] === "string" ? r["callback_info"] : null };
}

/** The FeexPay webhook is not signed: it carries the dashboard secret as "Authorization: Bearer <secret>". */
export function webhookAuthorized(header: string | null) {
  const secret = process.env["FEEXPAY_WEBHOOK_SECRET"]?.trim();
  if (!secret) return false;
  const a = new TextEncoder().encode((header ?? "").trim()), b = new TextEncoder().encode(`Bearer ${secret}`);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
