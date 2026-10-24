import { createFileRoute } from "@tanstack/react-router";
import { CFA_PRICE, EUR_PEGS, XOF_PER_EUR, currencyForCountry, type GeoPrice } from "@/lib/geo-pricing";

// Public: the visitor's country (Vercel edge header) and an indicative FCFA → local rate.
// Market rates come from open.er-api.com (no key), cached in memory for 12 hours.
const RATES_URL = "https://open.er-api.com/v6/latest/EUR";
const TTL_MS = 12 * 60 * 60 * 1000;
let cache: { at: number; rates: Record<string, number> } | null = null;

async function eurRates(): Promise<Record<string, number> | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rates;
  try {
    const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(4000) });
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result !== "success" || !json.rates) return cache?.rates ?? null;
    cache = { at: Date.now(), rates: json.rates };
    return json.rates;
  } catch {
    return cache?.rates ?? null;
  }
}

export const Route = createFileRoute("/api/public/geo-price")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("country") || request.headers.get("x-vercel-ip-country");
        const country = raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
        const currency = currencyForCountry(country);
        const headers = { "cache-control": "private, max-age=3600", vary: "x-vercel-ip-country" };
        const pegged = EUR_PEGS[currency];
        if (pegged) return Response.json({ country, currency, perXof: pegged / XOF_PER_EUR, approx: false } satisfies GeoPrice, { headers });
        const rate = (await eurRates())?.[currency];
        // No market rate available: show FCFA rather than a guessed price.
        if (!rate) return Response.json({ ...CFA_PRICE, country } satisfies GeoPrice, { headers });
        return Response.json({ country, currency, perXof: rate / XOF_PER_EUR, approx: true } satisfies GeoPrice, { headers });
      },
    },
  },
});
