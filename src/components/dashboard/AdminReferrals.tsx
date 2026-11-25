import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Coins, Gift, Link2, Ticket, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminReferrals, type ReferralAdminData } from "@/lib/admin-console.functions";

// Admin → « Parrainage » (migration 0061): how referrals grow — new referrals per day (link or promo code), how
// many referred friends paid and what they brought in, the best referrers and the latest referrals.

export function AdminReferrals({ fr }: { fr: boolean }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReferralAdminData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null); setError("");
    adminReferrals({ data: { days } }).then(setData).catch((e) => setError(e instanceof Error && e.message.includes("0061")
      ? (fr ? "Exécutez les migrations 0060_custom_promo_codes.sql puis 0061_referral_stats_admin.sql dans Supabase pour afficher ce tableau de bord." : "Run migrations 0060 then 0061 in Supabase to show this dashboard.")
      : (fr ? "Statistiques de parrainage indisponibles pour le moment." : "Referral statistics are unavailable right now.")));
  }, [days, fr]);
  const loc = fr ? "fr-FR" : "en-US";
  const n = (v: number) => v.toLocaleString(loc);
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");
  const card = "rounded-2xl border border-border bg-card/90 p-4";
  const o = data?.overview;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-display text-lg font-semibold">{fr ? "Parrainage" : "Referrals"}</h2>
      <div className="ml-auto flex gap-1">{[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`h-8 rounded-full px-3 text-[12px] ${days === d ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{d} {fr ? "j" : "d"}</button>)}</div>
    </div>
    {error && <p className={`${card} flex items-center gap-2 text-sm`}><AlertTriangle className="size-4 text-amber-500" />{error}</p>}
    {!data && !error && <p className="text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>}
    {o && data && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          [Users, fr ? "Filleuls inscrits" : "Referred sign-ups", n(o.total), `${n(o.period)} ${fr ? `sur ${days} j` : `in ${days} d`}`],
          [BadgeCheck, fr ? "Filleuls qui ont payé" : "Referees who paid", n(o.refereesPaid), `${pct(o.refereesPaid, o.total)} ${fr ? "de conversion" : "conversion"}`],
          [Coins, fr ? "Revenus des filleuls" : "Revenue from referees", `${n(o.revenueXof)} FCFA`, `${n(o.periodRevenueXof)} FCFA ${fr ? `sur ${days} j` : `in ${days} d`}`],
          [Gift, fr ? "Crédits offerts" : "Credits given", n(o.creditsGiven), `${n(o.referrers)} ${fr ? "parrains actifs" : "active referrers"}`],
        ] as [typeof Users, string, string, string][]).map(([I, label, value, sub]) => <div key={label} className={card}>
          <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><I className="size-4" />{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</p>
        </div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={card}>
          <p className="flex items-center gap-2 text-[13px] font-semibold"><TrendingUp className="size-4" />{fr ? "Nouveaux filleuls par jour" : "New referrals per day"}</p>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ left: -20, right: 6, top: 6 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                <XAxis dataKey="day" tickFormatter={(v: string) => new Date(v).toLocaleDateString(loc, { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip labelFormatter={(v: string) => new Date(v).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })} formatter={(v: number, k: string) => [n(v), k === "viaPromo" ? (fr ? "par code promo" : "by promo code") : (fr ? "filleuls" : "referrals")]} />
                <Area type="monotone" dataKey="referrals" stroke="#1e3a8a" strokeWidth={2} fill="#1e3a8a" fillOpacity={0.12} />
                <Area type="monotone" dataKey="viaPromo" stroke="#15803d" strokeWidth={2} fill="#15803d" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#1e3a8a]" />{fr ? "Tous les filleuls" : "All referrals"}</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#15803d]" />{fr ? "Par code promo" : "By promo code"}</span></p>
        </div>
        <div className={card}>
          <p className="text-[13px] font-semibold">{fr ? `Sur ${days} jours` : `Last ${days} days`}</p>
          <ul className="mt-3 space-y-3 text-[13px]">
            <li className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-muted-foreground"><Link2 className="size-4" />{fr ? "Par lien" : "By link"}</span><b className="tabular-nums">{n(o.periodLink)}</b></li>
            <li className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-muted-foreground"><Ticket className="size-4" />{fr ? "Par code promo" : "By promo code"}</span><b className="tabular-nums">{n(o.periodPromo)}</b></li>
            <li className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{fr ? "Codes promo créés" : "Promo codes created"}</span><b className="tabular-nums">{n(o.promoCodes)}</b></li>
            <li className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{fr ? "Revenu moyen par filleul payant" : "Average revenue per paying referee"}</span><b className="tabular-nums">{o.refereesPaid ? `${n(Math.round(o.revenueXof / o.refereesPaid))} FCFA` : "—"}</b></li>
          </ul>
        </div>
      </div>

      <div className={card}>
        <p className="text-[13px] font-semibold">{fr ? "Meilleurs parrains" : "Top referrers"}</p>
        {data.top.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{fr ? "Aucun parrainage pour le moment." : "No referrals yet."}</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[13px]">
          <thead className="text-[11.5px] text-muted-foreground"><tr><th className="py-2 font-medium">{fr ? "Parrain" : "Referrer"}</th><th className="font-medium">{fr ? "Code promo" : "Promo code"}</th><th className="text-right font-medium">{fr ? "Filleuls" : "Referred"}</th><th className="text-right font-medium">{fr ? "Ont payé" : "Paid"}</th><th className="text-right font-medium">{fr ? "Revenus" : "Revenue"}</th><th className="pl-4 font-medium">{fr ? "Dernier" : "Latest"}</th></tr></thead>
          <tbody>{data.top.map((r) => <tr key={r.email} className="border-t border-border">
            <td className="py-2.5"><p className="font-medium">{r.name || r.email}</p>{r.name && <p className="text-[11.5px] text-muted-foreground">{r.email}</p>}</td>
            <td className="font-mono text-[12px]">{r.promoCode ?? "—"}</td>
            <td className="text-right tabular-nums">{n(r.referred)}</td>
            <td className="text-right tabular-nums">{n(r.paid)} <span className="text-[11px] text-muted-foreground">({pct(r.paid, r.referred)})</span></td>
            <td className="text-right tabular-nums">{n(r.revenueXof)} FCFA</td>
            <td className="pl-4 text-muted-foreground">{r.lastAt ? new Date(r.lastAt).toLocaleDateString(loc, { day: "numeric", month: "short" }) : "—"}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>

      <div className={card}>
        <p className="text-[13px] font-semibold">{fr ? "Derniers parrainages" : "Latest referrals"}</p>
        {data.recent.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{fr ? "Aucun parrainage pour le moment." : "No referrals yet."}</p> :
        <ul className="mt-2 divide-y divide-border">{data.recent.map((r, i) => <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
          <span className="text-[11.5px] text-muted-foreground tabular-nums">{new Date(r.at).toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="min-w-0 flex-1 truncate"><b className="font-medium">{r.referrer}</b> → {r.referee}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.via === "promo" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-[#1e3a8a]/10 text-[#1e3a8a] dark:text-blue-300"}`}>{r.via === "promo" ? (fr ? "Code promo" : "Promo code") : (fr ? "Lien" : "Link")}</span>
          {r.paid && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{fr ? "A payé" : "Paid"}</span>}
        </li>)}</ul>}
      </div>
    </>}
  </div>;
}
