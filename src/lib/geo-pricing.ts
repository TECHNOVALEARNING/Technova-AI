// Geopricing: packs are always billed in FCFA (XOF); visitors elsewhere see an indicative price
// in their local currency. EUR and the CFA/CVE/KMF/STN currencies are fixed pegs (exact);
// other currencies use a daily market rate and are shown with "≈".

export const XOF_PER_EUR = 655.957;

/** Currencies fixed to the euro: units per 1 EUR. */
export const EUR_PEGS: Record<string, number> = { EUR: 1, XOF: XOF_PER_EUR, XAF: XOF_PER_EUR, CVE: 110.265, KMF: 491.96775, STN: 24.5 };

const groups: Record<string, string> = {
  XOF: "BJ BF CI GW ML NE SN TG",
  XAF: "CM CF TD CG GQ GA",
  EUR: "AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK GP MQ GF RE YT PM BL MF",
  USD: "US EC SV TL PR ZW",
  GBP: "GB", CHF: "CH LI", CAD: "CA", AUD: "AU", NGN: "NG", GHS: "GH", KES: "KE", MAD: "MA", DZD: "DZ", TND: "TN", EGP: "EG",
  ZAR: "ZA", RWF: "RW", UGX: "UG", TZS: "TZ", ETB: "ET", CDF: "CD", GNF: "GN", MGA: "MG", MUR: "MU", BRL: "BR", AOA: "AO",
  MZN: "MZ", CVE: "CV", STN: "ST", MXN: "MX", ARS: "AR", COP: "CO", CLP: "CL", PEN: "PE", INR: "IN", CNY: "CN", JPY: "JP",
  AED: "AE", SAR: "SA", TRY: "TR", GMD: "GM", SLE: "SL", LRD: "LR", MRU: "MR", KMF: "KM", BIF: "BI", DJF: "DJ", NAD: "NA",
  BWP: "BW", ZMW: "ZM", MWK: "MW", SEK: "SE", NOK: "NO", DKK: "DK", PLN: "PL", CZK: "CZ", HUF: "HU", RON: "RO",
};

const byCountry: Record<string, string> = Object.fromEntries(
  Object.entries(groups).flatMap(([currency, countries]) => countries.split(" ").map((c) => [c, currency])),
);

/** ISO 3166 alpha-2 country → ISO 4217 currency; unknown countries see USD. */
export const currencyForCountry = (country: string | null | undefined) => (country && byCountry[country.toUpperCase()]) || "USD";

export const isCfa = (currency: string) => currency === "XOF" || currency === "XAF";

/** How many units of a currency one FCFA is worth; approx = daily market rate (not a fixed peg). */
export type Rate = { perXof: number; approx: boolean };
/** What the API returns: the visitor's currency, plus USD and EUR so a visitor can switch. */
export type GeoPrice = { country: string | null; currency: string; perXof: number; approx: boolean; alternatives?: Record<string, Rate> };
export const CFA_PRICE: GeoPrice = { country: null, currency: "XOF", perXof: 1, approx: false };

export function formatLocalPrice(xof: number, geo: GeoPrice, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: geo.currency, maximumFractionDigits: geo.perXof * xof >= 100 ? 0 : 2 }).format(xof * geo.perXof);
}
