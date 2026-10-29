// Browser side of geopricing: one /api/public/geo-price call per page load, shared by every price display.
import { useEffect, useState } from "react";
import { CFA_PRICE, isCfa, type GeoPrice, type Rate } from "@/lib/geo-pricing";

let pending: Promise<GeoPrice> | null = null;

export function fetchGeoPrice(): Promise<GeoPrice> {
  if (!pending) {
    // "?country=XX" previews another country's display (indicative only, billing stays FCFA).
    const preview = new URLSearchParams(window.location.search).get("country");
    pending = fetch(`/api/public/geo-price${preview ? `?country=${encodeURIComponent(preview)}` : ""}`)
      .then((r) => (r.ok ? r.json() : CFA_PRICE))
      .then((g: GeoPrice) => (typeof g?.perXof === "number" && g.perXof > 0 ? g : CFA_PRICE))
      .catch(() => CFA_PRICE);
  }
  return pending;
}

export function useGeoPrice(): GeoPrice {
  const [geo, setGeo] = useState<GeoPrice>(CFA_PRICE);
  useEffect(() => { let alive = true; void fetchGeoPrice().then((g) => { if (alive) setGeo(g); }); return () => { alive = false; }; }, []);
  return geo;
}

/** The rate to display `currency` (FCFA is "XOF"), or null when no reliable rate is known. */
export function rateFor(geo: GeoPrice, currency: string): Rate | null {
  if (isCfa(currency)) return { perXof: 1, approx: false };
  if (currency === geo.currency) return { perXof: geo.perXof, approx: geo.approx };
  return geo.alternatives?.[currency] ?? null;
}

/** "999 FCFA", "1,52 €" or "≈ 1,71 $US" for an amount billed in FCFA. */
export function formatFromXof(xof: number, currency: string, rate: Rate | null, locale: string) {
  if (!rate || isCfa(currency)) return `${xof.toLocaleString(locale)} FCFA`;
  const value = xof * rate.perXof;
  const text = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
  return rate.approx ? `≈ ${text}` : text;
}
