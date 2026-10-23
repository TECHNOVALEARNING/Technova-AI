import { useEffect, useState } from "react";
import { BarChart3, Image as ImageIcon, ShieldAlert, Users, Wallet } from "lucide-react";
import { useDashboard } from "./DashboardLayout";
import { getAdminStats, listSecurityEvents } from "@/lib/admin.functions";
import { CreditTransfer } from "./CreditTransfer";
import { SiteModeration } from "./SiteModeration";
import { OnboardingStats } from "./OnboardingStats";

type Ev = { id: string; user_id: string | null; kind: string; severity: string; detail: unknown; created_at: string };
type Stats = Exclude<Awaited<ReturnType<typeof getAdminStats>>, { admin: false }>;

export function AdminPage() {
  const { lang } = useDashboard();
  const [state, setState] = useState<{ admin: boolean; events: Ev[] } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    listSecurityEvents().then(setState).catch(() => setState({ admin: false, events: [] }));
    getAdminStats().then((s) => setStats(s.admin ? s : null)).catch(() => setStats(null));
  }, []);
  const fr = lang !== "en";
  if (!state) return <p className="p-8 text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;
  if (!state.admin) return <div className="p-8"><h1 className="font-display text-xl font-semibold">{fr ? "Accès réservé" : "Restricted"}</h1><p className="mt-1 text-sm text-muted-foreground">{fr ? "Cette page est réservée aux administrateurs." : "This page is for administrators only."}</p></div>;

  const cards = stats ? [
    { icon: Users, label: fr ? "Comptes" : "Accounts", value: String(stats.users) },
    { icon: Wallet, label: fr ? "Crédits distribués" : "Credits distributed", value: stats.creditsDistributed.toLocaleString(fr ? "fr-FR" : "en-US") },
    { icon: BarChart3, label: fr ? "Crédits consommés" : "Credits consumed", value: stats.creditsConsumed.toLocaleString(fr ? "fr-FR" : "en-US") },
    { icon: ImageIcon, label: fr ? "Médias (30 j)" : "Media (30d)", value: `${stats.media.total} (${stats.media.images} img / ${stats.media.videos} vid)` },
  ] : [];

  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
    <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ShieldAlert className="size-5" />{fr ? "Administration" : "Administration"}</h1>

    {stats && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => <div key={c.label} className="rounded-2xl border border-border bg-card/90 p-4">
        <c.icon className="size-4 text-muted-foreground" />
        <p className="mt-2 font-display text-xl font-semibold">{c.value}</p>
        <p className="text-xs text-muted-foreground">{c.label}</p>
      </div>)}
    </div>}

    {stats && <div className="mt-6">
      <h2 className="font-display text-lg font-semibold">{fr ? "Usage par modèle (30 jours)" : "Usage by model (30 days)"}</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90">
        <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-3">{fr ? "Modèle" : "Model"}</th><th className="p-3">{fr ? "Appels" : "Calls"}</th><th className="p-3">Tokens</th><th className="p-3">{fr ? "Crédits" : "Credits"}</th></tr></thead>
          <tbody>{stats.models.length === 0 ? <tr><td colSpan={4} className="p-3 text-muted-foreground">{fr ? "Aucun usage." : "No usage."}</td></tr> : stats.models.map((m) => <tr key={m.model} className="border-t border-border"><td className="p-3">{m.model}</td><td className="p-3">{m.calls}</td><td className="p-3">{m.tokens.toLocaleString(fr ? "fr-FR" : "en-US")}</td><td className="p-3">{m.credits}</td></tr>)}</tbody></table>
      </div>
    </div>}

    <OnboardingStats fr={fr} />

    <CreditTransfer fr={fr} />

    <SiteModeration fr={fr} />

    <h2 className="mt-6 font-display text-lg font-semibold">{fr ? "Journal de sécurité" : "Security log"}</h2>
    <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90">
      <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-3">{fr ? "Date" : "Date"}</th><th className="p-3">{fr ? "Événement" : "Event"}</th><th className="p-3">{fr ? "Niveau" : "Level"}</th><th className="p-3">{fr ? "Détail" : "Detail"}</th></tr></thead>
        <tbody>{state.events.length === 0 ? <tr><td colSpan={4} className="p-3 text-muted-foreground">{fr ? "Aucun événement." : "No events."}</td></tr> : state.events.map((e) => <tr key={e.id} className="border-t border-border"><td className="whitespace-nowrap p-3">{new Date(e.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</td><td className="p-3">{e.kind}</td><td className={`p-3 ${e.severity === "info" ? "" : "text-destructive"}`}>{e.severity}</td><td className="max-w-xs truncate p-3 font-mono text-xs">{JSON.stringify(e.detail)}</td></tr>)}</tbody></table>
    </div>
  </div>;
}
