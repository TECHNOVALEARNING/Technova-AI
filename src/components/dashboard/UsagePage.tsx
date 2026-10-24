import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Coins, Download, Gauge, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useDashboard } from "./dashboard-context";

// Usage: period filters (with comparison to the previous period), activity chart, per-model ranking,
// paginated request log and CSV export. Rows come from usage_logs (owner-only reads).

type Log = Tables<"usage_logs">;
type Period = "today" | "yesterday" | "7d" | "30d";
const PAGE = 25;
const DAY = 86_400_000;

const copy = {
  fr: { title: "Utilisation & consommation", sub: "Suivez vos requêtes, tokens et crédits, par période et par modèle.", periods: { today: "Aujourd'hui", yesterday: "Hier", "7d": "7 jours", "30d": "30 jours" }, refresh: "Actualiser", export: "Exporter en CSV", requests: "Requêtes", tokens: "Tokens", credits: "Crédits débités", latency: "Latence moyenne", vsPrev: "vs période précédente", activity: "Activité (crédits)", byModel: "Répartition par modèle", log: "Journal des requêtes", allModels: "Tous les modèles", model: "Modèle", date: "Date", input: "Entrée", output: "Sortie", share: "Part", none: "Aucune consommation sur cette période.", page: "Page", loading: "Chargement…", locale: "fr-FR" },
  en: { title: "Usage & consumption", sub: "Track your requests, tokens and credits by period and model.", periods: { today: "Today", yesterday: "Yesterday", "7d": "7 days", "30d": "30 days" }, refresh: "Refresh", export: "Export CSV", requests: "Requests", tokens: "Tokens", credits: "Credits charged", latency: "Average latency", vsPrev: "vs previous period", activity: "Activity (credits)", byModel: "Breakdown by model", log: "Request log", allModels: "All models", model: "Model", date: "Date", input: "Input", output: "Output", share: "Share", none: "No consumption in this period.", page: "Page", loading: "Loading…", locale: "en-US" },
};

function range(period: Period) {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  if (period === "today") return { from: t0, to: now, prevFrom: t0 - DAY, prevTo: now - DAY };
  if (period === "yesterday") return { from: t0 - DAY, to: t0, prevFrom: t0 - 2 * DAY, prevTo: t0 - DAY };
  const days = period === "7d" ? 7 : 30;
  return { from: now - days * DAY, to: now, prevFrom: now - 2 * days * DAY, prevTo: now - days * DAY };
}

const sum = (rows: Log[], f: (l: Log) => number) => rows.reduce((n, l) => n + f(l), 0);

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!before) return <span className="text-[11px] text-muted-foreground">{label}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return <span className={`text-[11px] ${pct > 0 ? "text-amber-600 dark:text-amber-400" : pct < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "="} {Math.abs(pct)} % {label}</span>;
}

export function UsagePage() {
  const { lang } = useDashboard(); const c = copy[lang === "en" ? "en" : "fr"];
  const [period, setPeriod] = useState<Period>("7d");
  const [rows, setRows] = useState<Log[] | null>(null);
  const [model, setModel] = useState("all");
  const [page, setPage] = useState(1);
  const n = (v: number) => v.toLocaleString(c.locale);

  const load = useCallback(async () => {
    setRows(null);
    const r = range(period);
    // The API returns at most 1 000 rows per call: read the period in pages (10 000 rows max).
    const all: Log[] = [];
    for (let offset = 0; offset < 10_000; offset += 1000) {
      const { data } = await supabase.from("usage_logs").select("*").gte("created_at", new Date(r.prevFrom).toISOString()).lt("created_at", new Date(r.to).toISOString()).order("created_at", { ascending: false }).range(offset, offset + 999);
      all.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
  }, [period]);
  useEffect(() => { void load(); setPage(1); setModel("all"); }, [load]);

  const view = useMemo(() => {
    const r = range(period);
    const all = rows ?? [];
    const cur = all.filter((l) => { const t = Date.parse(l.created_at); return t >= r.from && t < r.to; });
    const prev = all.filter((l) => { const t = Date.parse(l.created_at); return t >= r.prevFrom && t < r.prevTo; });
    const hourly = period === "today" || period === "yesterday";
    const buckets = hourly ? 24 : period === "7d" ? 7 : 30;
    const size = hourly ? 3_600_000 : DAY;
    const start = hourly ? r.from : r.to - buckets * DAY;
    const chart = Array.from({ length: buckets }, (_, i) => {
      const a = start + i * size, b = a + size;
      const d = new Date(a);
      return { label: hourly ? `${d.getHours()}h` : d.toLocaleDateString(c.locale, { day: "2-digit", month: "2-digit" }), value: sum(cur.filter((l) => { const t = Date.parse(l.created_at); return t >= a && t < b; }), (l) => l.credits) };
    });
    const models = Object.values(cur.reduce<Record<string, { model: string; requests: number; tokens: number; credits: number }>>((acc, l) => {
      const m = (acc[l.model] ??= { model: l.model, requests: 0, tokens: 0, credits: 0 });
      m.requests++; m.tokens += l.input_tokens + l.output_tokens; m.credits += l.credits;
      return acc;
    }, {})).sort((a, b) => b.credits - a.credits || b.requests - a.requests);
    const latencyRows = cur.filter((l) => l.latency_ms > 0);
    return {
      cur, prev, chart, models,
      totals: { requests: cur.length, tokens: sum(cur, (l) => l.input_tokens + l.output_tokens), credits: sum(cur, (l) => l.credits), latency: latencyRows.length ? sum(latencyRows, (l) => l.latency_ms) / latencyRows.length : 0 },
      before: { requests: prev.length, tokens: sum(prev, (l) => l.input_tokens + l.output_tokens), credits: sum(prev, (l) => l.credits) },
    };
  }, [rows, period, c.locale]);

  const filtered = model === "all" ? view.cur : view.cur.filter((l) => l.model === model);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const maxBar = Math.max(1, ...view.chart.map((d) => d.value));

  function exportCsv() {
    const head = ["date", "model", "input_tokens", "output_tokens", "credits", "latency_ms"];
    const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const body = filtered.map((l) => [l.created_at, l.model, l.input_tokens, l.output_tokens, l.credits, l.latency_ms].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `technova-usage-${period}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";
  const eyebrow = "text-[10.5px] font-semibold tracking-[0.16em] text-muted-foreground";
  const tiles = [
    { label: c.requests, value: n(view.totals.requests), icon: Activity, delta: <Delta now={view.totals.requests} before={view.before.requests} label={c.vsPrev} /> },
    { label: c.tokens, value: n(view.totals.tokens), icon: Zap, delta: <Delta now={view.totals.tokens} before={view.before.tokens} label={c.vsPrev} /> },
    { label: c.credits, value: n(view.totals.credits), icon: Coins, delta: <Delta now={view.totals.credits} before={view.before.credits} label={c.vsPrev} /> },
    { label: c.latency, value: view.totals.latency ? `${(view.totals.latency / 1000).toFixed(1)} s` : "—", icon: Gauge, delta: <span className="text-[11px] text-muted-foreground">&nbsp;</span> },
  ];

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-[26px] font-semibold leading-tight">{c.title}</h1><p className="mt-1 text-[13px] text-muted-foreground">{c.sub}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-secondary p-1" role="tablist">{(Object.keys(c.periods) as Period[]).map((p) => <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
          className={`h-8 rounded-full px-3 text-[12px] font-medium transition ${period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{c.periods[p]}</button>)}</div>
        <Button variant="outline" size="icon" className="size-9 rounded-full" aria-label={c.refresh} title={c.refresh} onClick={() => void load()}><RefreshCw className="size-4" /></Button>
        <Button variant="outline" className="h-9 rounded-full" disabled={!filtered.length} onClick={exportCsv}><Download className="size-4" />{c.export}</Button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tiles.map((t) => <div key={t.label} className={card}>
      <div className="flex items-center justify-between"><p className="text-[12.5px] font-medium">{t.label}</p><span className="grid size-8 place-items-center rounded-full bg-secondary"><t.icon className="size-4 text-primary" /></span></div>
      <p className="mt-3 font-display text-[24px] font-semibold tabular-nums">{rows ? t.value : "…"}</p>{t.delta}
    </div>)}</div>

    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className={card}><p className={eyebrow}>{c.activity.toUpperCase()}</p>
        {!rows ? <p className="py-14 text-center text-[12.5px] text-muted-foreground">{c.loading}</p> : view.cur.length ? <div className="mt-5 flex h-44 items-end gap-1">{view.chart.map((d, i) => <div key={i} className="group relative flex flex-1 flex-col items-center gap-1.5">
          <span className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">{n(d.value)}</span>
          <div className="w-full rounded-t-md bg-primary/80 transition-[height] duration-500 group-hover:bg-primary" style={{ height: `${Math.max(2, (d.value / maxBar) * 140)}px` }} />
          <span className={`text-[9px] text-muted-foreground ${view.chart.length > 14 && i % 3 ? "invisible" : ""}`}>{d.label}</span>
        </div>)}</div> : <p className="py-14 text-center text-[12.5px] text-muted-foreground">{c.none}</p>}
      </div>
      <div className={card}><p className={eyebrow}>{c.byModel.toUpperCase()}</p>
        {view.models.length ? <table className="mt-3 w-full text-[12px]"><thead className="text-muted-foreground"><tr><th className="py-1.5 text-left font-medium">{c.model}</th><th className="text-right font-medium">{c.requests}</th><th className="text-right font-medium">{c.credits}</th><th className="text-right font-medium">{c.share}</th></tr></thead>
          <tbody>{view.models.slice(0, 8).map((m) => <tr key={m.model} className="border-t border-border"><td className="max-w-[140px] truncate py-2"><button type="button" className="truncate hover:underline" onClick={() => { setModel(m.model); setPage(1); }}>{m.model}</button></td><td className="text-right tabular-nums">{n(m.requests)}</td><td className="text-right tabular-nums">{n(m.credits)}</td><td className="text-right tabular-nums text-muted-foreground">{view.totals.credits ? Math.round((m.credits / view.totals.credits) * 100) : 0} %</td></tr>)}</tbody>
        </table> : <p className="py-14 text-center text-[12.5px] text-muted-foreground">{rows ? c.none : c.loading}</p>}
      </div>
    </div>

    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className={eyebrow}>{c.log.toUpperCase()}</p>
        <select aria-label={c.model} value={model} onChange={(e) => { setModel(e.target.value); setPage(1); }} className="h-8 rounded-full border border-border bg-background px-3 text-[12px]"><option value="all">{c.allModels}</option>{view.models.map((m) => <option key={m.model}>{m.model}</option>)}</select>
      </div>
      {shown.length ? <><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[12px]"><thead className="text-muted-foreground"><tr><th className="py-2 font-medium">{c.date}</th><th className="font-medium">{c.model}</th><th className="text-right font-medium">{c.input}</th><th className="text-right font-medium">{c.output}</th><th className="text-right font-medium">{c.credits}</th></tr></thead>
        <tbody>{shown.map((l) => <tr key={l.id} className="border-t border-border"><td className="py-2 tabular-nums text-muted-foreground">{new Date(l.created_at).toLocaleString(c.locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td>{l.model}</td><td className="text-right tabular-nums">{n(l.input_tokens)}</td><td className="text-right tabular-nums">{n(l.output_tokens)}</td><td className="text-right font-medium tabular-nums">{n(l.credits)}</td></tr>)}</tbody></table></div>
        {pages > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-[12px]"><Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="←" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button><span className="tabular-nums">{c.page} {Math.min(page, pages)} / {pages}</span><Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="→" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button></div>}
      </> : <p className="py-10 text-center text-[12.5px] text-muted-foreground">{rows ? c.none : c.loading}</p>}
    </div>
  </div>;
}
