import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { adminOnboardingStats } from "@/lib/admin.functions";
import { accountTypes, labelFor, referralSources, workDomains } from "@/lib/onboarding";

type Stats = Awaited<ReturnType<typeof adminOnboardingStats>>;

function Bars({ title, counts, list, fr }: { title: string; counts: Record<string, number> | undefined; list: { key: string; fr: string; en: string }[]; fr: boolean }) {
  const rows = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((n, [, v]) => n + v, 0);
  return <div className="rounded-2xl border border-border bg-card/90 p-4">
    <p className="text-xs font-semibold text-muted-foreground">{title}</p>
    {rows.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">{fr ? "Pas encore de réponses." : "No answers yet."}</p>
      : <ul className="mt-3 space-y-2">{rows.map(([k, v]) => <li key={k} className="text-xs">
        <div className="flex justify-between gap-2"><span className="truncate">{labelFor(list, k, fr)}</span><span className="tabular-nums text-muted-foreground">{v} · {Math.round((v / total) * 100)} %</span></div>
        <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-chat-glow" style={{ width: `${(v / total) * 100}%` }} /></div>
      </li>)}</ul>}
  </div>;
}

/** Admin: who signs up and where they heard about TechNova. */
export function OnboardingStats({ fr }: { fr: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { adminOnboardingStats().then(setStats).catch(() => setStats({})); }, []);
  return <section className="mt-6">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Megaphone className="size-4" />{fr ? "Profils des inscrits et acquisition" : "Sign-up profiles and acquisition"}</h2>
    <div className="mt-2 grid gap-3 md:grid-cols-3">
      <Bars fr={fr} title={fr ? "Où ils ont entendu parler de nous" : "Where they heard about us"} counts={stats?.referral_source} list={referralSources} />
      <Bars fr={fr} title={fr ? "Domaines" : "Fields"} counts={stats?.work_domain} list={workDomains} />
      <Bars fr={fr} title={fr ? "Type de compte" : "Account type"} counts={stats?.account_type} list={accountTypes} />
    </div>
  </section>;
}
