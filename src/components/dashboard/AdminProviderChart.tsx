import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { adminProviderCosts, type ProviderDay } from "@/lib/admin-console.functions";

// Admin console → Vue d'ensemble: what the providers really charged, day by day over 30 days. Two smooth curves
// (OpenRouter, kie.ai); hovering a day lists every model with its real cost (and kie.ai credits), the number of
// calls and the FCFA equivalent. Data from adminProviderCosts.

const COLORS = { openrouter: "#2563eb", kie: "#8b5cf6" } as const;
const XOF_PER_USD = 600;
const usd = (n: number) => `${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)} $`;
const shortDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const longDay = (d: string, fr: boolean) => new Date(`${d}T12:00:00Z`).toLocaleDateString(fr ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

function DayTooltip({ active, payload, fr }: { active?: boolean; payload?: { payload: ProviderDay }[]; fr: boolean }) {
  const day = active ? payload?.[0]?.payload : undefined;
  if (!day) return null;
  const block = (provider: "openrouter" | "kie", label: string) => {
    const total = day[provider];
    const models = day.models.filter((m) => m.provider === provider);
    return <div className="mt-2">
      <p className="flex items-center justify-between gap-6 text-[12.5px] font-semibold" style={{ color: COLORS[provider] }}>
        <span>{label}</span><span className="tabular-nums">{usd(total)} <span className="font-normal text-muted-foreground">≈ {Math.round(total * XOF_PER_USD).toLocaleString("fr-FR")} FCFA</span></span>
      </p>
      {models.length === 0 ? <p className="text-[11.5px] text-muted-foreground">{fr ? "Aucune consommation" : "No usage"}</p>
        : <ul className="mt-1 space-y-0.5">{models.slice(0, 10).map((m) => <li key={m.model} className="flex items-center justify-between gap-6 text-[11.5px]">
          <span className="min-w-0 truncate font-mono text-muted-foreground">{m.model}</span>
          <span className="shrink-0 tabular-nums">{usd(m.usd)}{m.providerCredits != null ? ` · ${Math.round(m.providerCredits).toLocaleString("fr-FR")} cr. kie` : ""} · {m.calls} {fr ? "appel(s)" : "call(s)"}</span>
        </li>)}{models.length > 10 && <li className="text-[11px] text-muted-foreground">+ {models.length - 10} {fr ? "autres modèles" : "more models"}</li>}</ul>}
    </div>;
  };
  return <div className="max-w-[440px] rounded-xl border border-border bg-popover px-3.5 py-2.5 text-popover-foreground shadow-lg">
    <p className="text-[13px] font-semibold capitalize">{longDay(day.date, fr)}</p>
    {block("openrouter", "OpenRouter")}
    {block("kie", "kie.ai")}
  </div>;
}

type Data = Awaited<ReturnType<typeof adminProviderCosts>>;

export function AdminProviderChart({ fr }: { fr: boolean }) {
  const [data, setData] = useState<Data | null | "error">(null);
  useEffect(() => { adminProviderCosts().then(setData).catch(() => setData("error")); }, []);
  return <ProviderChartView fr={fr} data={data} />;
}

/** The chart itself, fed with the server data (or null while loading, "error" when unavailable). */
export function ProviderChartView({ fr, data }: { fr: boolean; data: Data | null | "error" }) {
  const totals = useMemo(() => {
    if (!data || data === "error") return null;
    const sum = (p: "openrouter" | "kie") => data.days.reduce((a, d) => a + d[p], 0);
    return { openrouter: sum("openrouter"), kie: sum("kie") };
  }, [data]);
  return <div className="rounded-2xl border border-border bg-card/90 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{fr ? "Consommation chez les fournisseurs (30 jours)" : "Provider spend (30 days)"}</h3>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{fr
          ? "Ce que les fournisseurs ont réellement facturé, jour par jour. Survolez la courbe pour voir chaque modèle, son coût réel et le nombre d'appels. 1 $ ≈ 600 FCFA ; 1 crédit kie.ai = 0,005 $."
          : "What the providers really charged, day by day. Hover the curve to see each model, its real cost and the number of calls. 1 crédit kie.ai = USD 0.005."}</p>
      </div>
      {totals && <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: COLORS.openrouter }} />OpenRouter <b className="tabular-nums">{usd(totals.openrouter)}</b></span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: COLORS.kie }} />kie.ai <b className="tabular-nums">{usd(totals.kie)}</b></span>
      </div>}
    </div>
    {data === null ? <p className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></p>
      : data === "error" || !data.ready ? <p className="mt-3 text-xs text-destructive">{fr ? "Lancez la migration 0046_provider_costs.sql dans Supabase pour activer ce graphique." : "Run migration 0046_provider_costs.sql in Supabase to enable this chart."}</p>
      : <>
        <div className="mt-3 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.days} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                {(["openrouter", "kie"] as const).map((k) => <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[k]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={COLORS[k]} stopOpacity={0} />
                </linearGradient>)}
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="date" tickFormatter={shortDay} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} minTickGap={18} />
              <YAxis tickFormatter={(v: number) => `${v} $`} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} />
              <Tooltip content={<DayTooltip fr={fr} />} cursor={{ stroke: "currentColor", strokeOpacity: 0.25 }} wrapperStyle={{ outline: "none", zIndex: 20 }} />
              <Area type="monotone" dataKey="openrouter" name="OpenRouter" stroke={COLORS.openrouter} strokeWidth={2} fill="url(#fill-openrouter)" activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="kie" name="kie.ai" stroke={COLORS.kie} strokeWidth={2} fill="url(#fill-kie)" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{data.openrouterSource === "activity"
          ? (fr ? "OpenRouter : rapport d'activité officiel (tous les appels : chat, API, Studio, fichiers, aide)." : "OpenRouter: official activity report (every call).")
          : (fr ? "OpenRouter : réponses enregistrées par TechNova (chat, Studio, résumé audio). Ajoutez OPENROUTER_MANAGEMENT_KEY dans Vercel pour inclure aussi l'API publique, les fichiers et l'aide." : "OpenRouter: replies logged by TechNova. Add OPENROUTER_MANAGEMENT_KEY in Vercel to include every call.")}
          {" "}{fr ? "kie.ai : coût réel de chaque création terminée depuis la migration 0046." : "kie.ai: real cost of every finished creation since migration 0046."}</p>
      </>}
  </div>;
}
