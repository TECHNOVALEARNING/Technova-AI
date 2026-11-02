// Payment orchestration rules, shared by the checkout dialog and the server (which decides; the browser only proposes).
// Cards always go to FeexPay. Mobile Money goes to FeexPay when it serves the country and operator with a direct
// phone confirmation or an operator page; every other Mobile Money payment (other countries, other operators,
// operators needing an SMS/USSD code) goes to Nyole's hosted checkout. A FeexPay failure falls back to Nyole.

export type PayMethod = "card" | "momo";
export type FeexFlow = "push" | "redirect";
export type FeexNetwork = { id: string; label: string; flow: FeexFlow; sandbox: boolean };
export type PayCountry = { code: string; dial: string; fr: string; en: string; networks: FeexNetwork[] };

/** Countries and operators FeexPay collects from (API v2 request-to-pay networks). */
export const FEEXPAY_COUNTRIES: PayCountry[] = [
  { code: "BJ", dial: "229", fr: "Bénin", en: "Benin", networks: [
    { id: "mtn", label: "MTN MoMo", flow: "push", sandbox: true },
    { id: "moov", label: "Moov Money", flow: "push", sandbox: true },
    { id: "celtiis_bj", label: "Celtiis Cash", flow: "push", sandbox: true },
  ] },
  { code: "TG", dial: "228", fr: "Togo", en: "Togo", networks: [
    { id: "togocom_tg", label: "T-Money (Togocom)", flow: "push", sandbox: true },
    { id: "moov_tg", label: "Flooz (Moov)", flow: "push", sandbox: true },
  ] },
  { code: "CI", dial: "225", fr: "Côte d'Ivoire", en: "Côte d'Ivoire", networks: [
    { id: "mtn_ci", label: "MTN MoMo", flow: "push", sandbox: true },
    { id: "orange_ci", label: "Orange Money", flow: "redirect", sandbox: true },
    { id: "moov_ci", label: "Moov Money", flow: "redirect", sandbox: true },
    { id: "wave_ci", label: "Wave", flow: "redirect", sandbox: true },
  ] },
  { code: "SN", dial: "221", fr: "Sénégal", en: "Senegal", networks: [
    { id: "orange_sn", label: "Orange Money", flow: "redirect", sandbox: true },
    { id: "wave_sn", label: "Wave", flow: "redirect", sandbox: true },
    { id: "free_sn", label: "Free Money", flow: "push", sandbox: true },
  ] },
  { code: "BF", dial: "226", fr: "Burkina Faso", en: "Burkina Faso", networks: [
    { id: "moov_bf", label: "Moov Money", flow: "push", sandbox: false },
    { id: "wave_bf", label: "Wave", flow: "redirect", sandbox: false },
  ] },
  { code: "CG", dial: "242", fr: "Congo", en: "Congo", networks: [
    { id: "mtn_cg", label: "MTN MoMo", flow: "push", sandbox: true },
  ] },
];

/** The checkout dialog offers these extra choices, always handled by Nyole. */
export const OTHER = "other";

export function feexpayNetwork(country: string | undefined, network: string | undefined): FeexNetwork | null {
  const c = FEEXPAY_COUNTRIES.find((x) => x.code === country);
  return c?.networks.find((n) => n.id === network) ?? null;
}

/** Local number → international digits for the chosen country (keeps the Benin "01" prefix). */
export function internationalPhone(country: string, phone: string): string | null {
  const c = FEEXPAY_COUNTRIES.find((x) => x.code === country);
  if (!c) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith(c.dial)) digits = c.dial + digits;
  const local = digits.slice(c.dial.length);
  return local.length >= 8 && local.length <= 10 ? digits : null;
}

/** Which provider takes the payment (before any fallback). */
export function routePayment(method: PayMethod, country?: string, network?: string): "feexpay" | "nyole" {
  if (method === "card") return "feexpay";
  return feexpayNetwork(country, network) ? "feexpay" : "nyole";
}
