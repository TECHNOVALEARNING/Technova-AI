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
  if (!res.ok) {
    // Keep FeexPay's validation details (which field failed) for the security log; it never echoes the API key.
    const detail = json["errors"] ?? json["error"] ?? json["details"] ?? json["data"];
    throw new Error(`FeexPay ${res.status}: ${String(json["message"] ?? "request failed")}${detail ? ` ${JSON.stringify(detail).slice(0, 400)}` : ""}`);
  }
  return json;
}

/** FeexPay rejects special characters in text fields: keep plain letters, digits and spaces. */
export function plainText(value: string, max = 60) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

type Customer = { firstName: string; lastName: string; email?: string | undefined };

/** Networks whose payin documents a return page (and those that also take a cancel page). */
const RETURN_URL = new Set(["wave_ci", "orange_ci", "moov_ci", "orange_sn", "wave_sn", "free_sn", "wave_bf"]);
const CANCEL_URL = new Set(["wave_ci", "orange_sn", "wave_sn", "wave_bf"]);

/** Mobile Money: the customer confirms on the phone (push) or on the operator page (paymentUrl). Body as documented. */
export async function requestMobileMoney(input: { network: string; phone: string; amount: number; paymentId: string; description: string; customer: Customer; returnUrl: string; cancelUrl: string }) {
  const { shop } = config();
  const r = await call(`/api/transactions/public/requesttopay/${encodeURIComponent(input.network)}`, {
    shop, amount: input.amount, phoneNumber: input.phone,
    first_name: plainText(input.customer.firstName, 40) || "Client", last_name: plainText(input.customer.lastName, 40) || "TechNova",
    description: plainText(input.description), callback_info: input.paymentId,
    ...(RETURN_URL.has(input.network) ? { return_url: input.returnUrl } : {}),
    ...(CANCEL_URL.has(input.network) ? { cancel_url: input.cancelUrl } : {}),
  });
  const reference = typeof r["reference"] === "string" ? r["reference"] : "";
  if (!reference) throw new Error("FeexPay: no transaction reference");
  return { reference, paymentUrl: safeUrl(r["payment_url"]) };
}

/** Card: FeexPay's hosted checkout (3-D Secure). Needs card payments enabled on the shop. */
export async function createCardCheckout(input: { amount: number; paymentId: string; description: string; customer: Customer; phone: string; city: string; country: string }) {
  const { shop } = config();
  if (!input.customer.email) throw new Error("FeexPay card: e-mail required");
  const r = await call("/api/transactions/public/requesttopay/init", {
    shop, amount: String(input.amount), currency: "XOF",
    first_name: plainText(input.customer.firstName, 40) || "Client", last_name: plainText(input.customer.lastName, 40) || "TechNova",
    email: input.customer.email, phoneNumber: input.phone.replace(/\D/g, ""), city: plainText(input.city, 60), zip: "00000", country: input.country,
    description: plainText(input.description), callback_info: input.paymentId,
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
