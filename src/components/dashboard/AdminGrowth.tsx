import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, Gift, Repeat, TrendingUp, Users } from "lucide-react";
import { adminGrowth, type GrowthData } from "@/lib/admin-console.functions";

// Admin → « Croissance »: activation funnel, weekly retention by sign-up cohort, revenue split (packs versus
// monthly formulas, referral credits given) and the margin of every billed feature, flagged when it gets thin.
// Real margin: credits sold at about 0.85 FCFA each on average, provider cost converted at 600 FCFA per USD.

const FCFA_PER_CREDIT = 0.85;
const FCFA_PER_USD = 600;
const MODE_LABELS: Record<string, string> = {
  eclair: "Chat · Éclair", equilibre: "Chat · Équilibré", expert: "Chat · Expert", smart: "Chat · Smart", studio_build: "Studio · construction", studio_plan: "Studio · plan",
  studio_questions: "Studio · questions", studio_intent: "Studio · tri", design: "Créativité · rédaction IA", sheet: "Tableur · assistant IA", api: "API publique", files: "Fichiers et connaissances", research: "Recherche approfondie",
};

export function AdminGrowth({ fr }: { fr: boolean }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<GrowthData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null); setError("");
    adminGrowth({ data: { days } }).then(setData).catch((e) => setError(e instanceof Error && e.message.includes("0053") ? (fr ? "Exécutez la migration 0053_admin_growth.sql dans Supabase pour afficher ces chiffres." : "Run migration 0053_admin_growth.sql in Supabase to show these figures.") : (fr ? "Chiffres indisponibles pour le moment." : "Figures unavailable right now.")));
  }, [days, fr]);
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");
  const card = "rounded-2xl border border-border bg-card/90 p-4";
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-display text-lg font-semibold">{fr ? "Croissance" : "Growth"}</h2>
      <div className="ml-auto flex gap-1">{[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`h-8 rounded-full px-3 text-[12px] ${days === d ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{d} {fr ? "jours" : "days"}</button>)}</div>
    </div>
    {error && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[13px]">{error}</p>}
    {!data && !error && <p className="text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>}
    {data && <>
      <div className={card}>
        <p className="flex items-center gap-2 text-[13px] font-semibold"><Users className="size-4" />{fr ? `Entonnoir d'activation (inscrits des ${days} derniers jours)` : `Activation funnel (sign-ups of the last ${days} days)`}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">{([
          [fr ? "Inscrits" : "Sign-ups", data.funnel.signups, data.funnel.signups],
          [fr ? "E-mail confirmé" : "E-mail confirmed", data.funnel.confirmed, data.funnel.signups],
          [fr ? "Questionnaire fini" : "Onboarded", data.funnel.onboarded, data.funnel.signups],
          [fr ? "Ont utilisé l'IA" : "Used the AI", data.funnel.active, data.funnel.signups],
          [fr ? "Ont acheté" : "Bought", data.funnel.paying, data.funnel.signups],
        ] as [string, number, number][]).map(([l, v, base], i) => <div key={l} className="rounded-xl bg-secondary/60 p-3">
          <p className="text-[11.5px] text-muted-foreground">{l}</p><p className="mt-1 font-display text-[22px] font-semibold tabular-nums">{fmt(v)}</p>
          {i > 0 && <p className="flex items-center gap-1 text-[11.5px] text-muted-foreground"><ArrowDown className="size-3" />{pct(v, base)}</p>}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-[#7c5cff]" style={{ width: base ? `${Math.min(100, (v / base) * 100)}%` : "0%" }} /></div>
        </div>)}</div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">{fr ? `Dont ${fmt(data.funnel.referred)} venus par parrainage.` : `Of which ${fmt(data.funnel.referred)} came through referrals.`}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="flex items-center gap-2 text-[13px] font-semibold"><Repeat className="size-4" />{fr ? "Rétention par semaine d'inscription" : "Retention by sign-up week"}</p>
          <table className="mt-3 w-full text-left text-[12.5px] tabular-nums"><thead className="text-[11px] text-muted-foreground"><tr><th className="py-1">{fr ? "Semaine" : "Week"}</th><th>{fr ? "Comptes" : "Accounts"}</th><th>S+1</th><th>S+2</th><th>S+4</th></tr></thead>
            <tbody>{data.cohorts.map((c) => <tr key={c.week} className="border-t border-border"><td className="py-1.5">{new Date(c.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</td><td>{c.accounts}</td>
              {[c.week1, c.week2, c.week4].map((v, i) => <td key={i}><span className="rounded-md px-1.5 py-0.5" style={{ background: c.accounts ? `rgba(31,122,90,${0.08 + (v / c.accounts) * 0.6})` : undefined }}>{pct(v, c.accounts)}</span></td>)}</tr>)}</tbody></table>
          <p className="mt-2 text-[11px] text-muted-foreground">{fr ? "Part des comptes ayant utilisé une fonction payante pendant la semaine indiquée après leur inscription (les semaines récentes ne sont pas encore complètes)." : "Share of accounts that used a paid feature in that week after sign-up (recent weeks are not complete yet)."}</p>
        </div>
        <div className={card}>
          <p className="flex items-center gap-2 text-[13px] font-semibold"><TrendingUp className="size-4" />{fr ? `Revenus des ${days} derniers jours` : `Revenue of the last ${days} days`}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary/60 p-3"><p className="text-[11.5px] text-muted-foreground">{fr ? "Packs (paiement unique)" : "One-time packs"}</p><p className="mt-1 font-display text-[20px] font-semibold">{fmt(data.revenue.packsXof)} FCFA</p><p className="text-[11.5px] text-muted-foreground">{data.revenue.packsCount} {fr ? "achats" : "purchases"}</p></div>
            <div className="rounded-xl bg-secondary/60 p-3"><p className="text-[11.5px] text-muted-foreground">{fr ? "Formules mensuelles" : "Monthly plans"}</p><p className="mt-1 font-display text-[20px] font-semibold">{fmt(data.revenue.monthlyXof)} FCFA</p><p className="text-[11.5px] text-muted-foreground">{data.revenue.monthlyCount} {fr ? "paiements" : "payments"} · {data.revenue.monthlyActive} {fr ? "actives (30 j)" : "active (30 d)"}</p></div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[12.5px]"><Gift className="size-4 text-violet-500" />{fr ? `${fmt(data.revenue.referralCredits)} crédits offerts par le parrainage (≈ ${fmt(Math.round(data.revenue.referralCredits * 0.5))} FCFA de coût maximum).` : `${fmt(data.revenue.referralCredits)} credits given by referrals (≈ ${fmt(Math.round(data.revenue.referralCredits * 0.5))} FCFA of maximum cost).`}</p>
        </div>
      </div>

      <div className={card}>
        <p className="text-[13px] font-semibold">{fr ? "Marge par fonction" : "Margin per feature"}</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[12.5px] tabular-nums"><thead className="text-[11px] text-muted-foreground"><tr><th className="py-1">{fr ? "Fonction" : "Feature"}</th><th>{fr ? "Appels" : "Calls"}</th><th>{fr ? "Crédits facturés" : "Credits billed"}</th><th>{fr ? "Coût réel" : "Real cost"}</th><th>{fr ? "Revenu estimé" : "Est. revenue"}</th><th>{fr ? "Marge réelle" : "Real margin"}</th></tr></thead>
          <tbody>{data.margins.map((m) => {
            const revenue = m.credits * FCFA_PER_CREDIT, cost = m.costUsd * FCFA_PER_USD, real = revenue > 0 ? 1 - cost / revenue : null;
            const tone = real === null ? "" : real < 0 ? "bg-red-500/15 text-red-700 dark:text-red-300" : real < 0.25 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
            return <tr key={m.mode} className="border-t border-border"><td className="py-1.5">{MODE_LABELS[m.mode] ?? m.mode}</td><td>{fmt(m.calls)}</td><td>{fmt(m.credits)}</td><td>{m.costUsd.toFixed(2)} $ <span className="text-muted-foreground">({fmt(Math.round(cost))} FCFA)</span></td><td>{fmt(Math.round(revenue))} FCFA</td>
              <td><span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${tone}`}>{real !== null && real < 0.25 && <AlertTriangle className="size-3" />}{real === null ? (fr ? "offert" : "free") : `${Math.round(real * 100)} %`}</span></td></tr>;
          })}</tbody></table></div>
        <p className="mt-2 text-[11px] text-muted-foreground">{fr ? `Revenu estimé à ${FCFA_PER_CREDIT} FCFA par crédit (prix moyen des packs), coût à ${FCFA_PER_USD} FCFA le dollar. Orange sous 25 %, rouge en perte : revoyez alors le prix de la fonction.` : `Revenue estimated at ${FCFA_PER_CREDIT} FCFA per credit (average pack price), cost at ${FCFA_PER_USD} FCFA per dollar. Orange below 25 %, red at a loss: then review the feature's price.`}</p>
      </div>
    </>}
  </div>;
}
