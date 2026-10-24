import { createServerFn } from "@tanstack/react-start";

// Public Arena ranking: aggregated blind votes only (model, battles, wins, ties) — no user data.
export type RankingRow = { model: string; provider: string; battles: number; wins: number; ties: number; score: number };

export const getPublicRanking = createServerFn({ method: "GET" }).handler(async (): Promise<{ rows: RankingRow[]; votes: number }> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { modelCatalog } = await import("@/lib/model-pricing");
  const { data, error } = await supabaseAdmin.rpc("arena_leaderboard");
  if (error) { console.error("arena_leaderboard", error.message); return { rows: [], votes: 0 }; }
  const rows = (data ?? []).map((r) => ({
    model: r.model,
    provider: modelCatalog.find((m) => m.name === r.model)?.provider ?? "",
    battles: r.battles, wins: r.wins, ties: r.ties,
    // Win rate where a tie counts as half a win, as in the SQL ordering.
    score: r.battles ? Math.round(((r.wins + 0.5 * r.ties) / r.battles) * 1000) / 10 : 0,
  }));
  // Each battle involves two models: total votes = half the summed participations.
  return { rows, votes: Math.round(rows.reduce((n, r) => n + r.battles, 0) / 2) };
});
