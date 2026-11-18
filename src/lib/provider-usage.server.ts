// What OpenRouter really billed, read from OpenRouter itself (migration 0048). The admin consumption chart
// compares it with the replies TechNova logs per model; the difference shows as « Autres appels ».

type Db = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type Snapshot = { total_usd: number | string | null; key_daily_usd: number | string | null; taken_at: string };

/** Takes a reading (account cumulative spend + today's spend of the app key), at most every 10 minutes. */
export async function recordOpenRouterUsage(db: Db, force = false) {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) return;
  if (!force) {
    const { data: last, error } = await db.from("provider_usage_snapshots" as never).select("taken_at").eq("provider", "openrouter")
      .order("taken_at", { ascending: false }).limit(1);
    if (error) return; // migration 0048 not run yet
    const at = (last as unknown as { taken_at: string }[] | null)?.[0]?.taken_at;
    if (at && Date.now() - Date.parse(at) < 10 * 60_000) return;
  }
  const get = async (url: string, k: string) => {
    try { const r = await fetch(url, { headers: { Authorization: `Bearer ${k}` }, signal: AbortSignal.timeout(6000) }); return r.ok ? await r.json() : null; } catch { return null; }
  };
  const [credits, info] = await Promise.all([
    get("https://openrouter.ai/api/v1/credits", process.env["OPENROUTER_MANAGEMENT_KEY"] ?? key) as Promise<{ data?: { total_usage?: number } } | null>,
    get("https://openrouter.ai/api/v1/key", key) as Promise<{ data?: { usage_daily?: number } } | null>,
  ]);
  const total = credits?.data?.total_usage, daily = info?.data?.usage_daily;
  if (typeof total !== "number" && typeof daily !== "number") return;
  await db.from("provider_usage_snapshots" as never).insert({ provider: "openrouter", total_usd: typeof total === "number" ? total : null, key_daily_usd: typeof daily === "number" ? daily : null } as never);
}

/** Real OpenRouter spend per UTC day: the growth of the account total since the previous day's last reading, or,
 *  without an earlier reading, the most the app key reported for that day. */
export async function openRouterDailySpend(db: Db, sinceIso: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const { data, error } = await db.from("provider_usage_snapshots" as never).select("total_usd,key_daily_usd,taken_at").eq("provider", "openrouter")
    .gte("taken_at", new Date(Date.parse(sinceIso) - 3 * 86_400_000).toISOString()).order("taken_at", { ascending: true }).limit(20000);
  if (error || !data) return out;
  return dailySpendFrom(data as unknown as Snapshot[], sinceIso);
}

/** Pure part of openRouterDailySpend (readings in time order → spend per UTC day). */
export function dailySpendFrom(rows: Snapshot[], sinceIso: string): Map<string, number> {
  const out = new Map<string, number>();
  const lastOfDay = new Map<string, Snapshot>();
  const maxDaily = new Map<string, number>();
  for (const r of rows) {
    const day = r.taken_at.slice(0, 10);
    lastOfDay.set(day, r);
    const d = Number(r.key_daily_usd);
    if (Number.isFinite(d)) maxDaily.set(day, Math.max(maxDaily.get(day) ?? 0, d));
  }
  const days = [...lastOfDay.keys()].sort();
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!;
    if (day < sinceIso.slice(0, 10)) continue;
    const now = Number(lastOfDay.get(day)!.total_usd);
    const before = i > 0 ? Number(lastOfDay.get(days[i - 1]!)!.total_usd) : NaN;
    const growth = Number.isFinite(now) && Number.isFinite(before) ? Math.max(0, now - before) : NaN;
    const spend = Math.max(Number.isFinite(growth) ? growth : 0, maxDaily.get(day) ?? 0);
    if (spend > 0) out.set(day, spend);
  }
  return out;
}
