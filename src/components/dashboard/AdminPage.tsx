import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useDashboard } from "./DashboardLayout";
import { listSecurityEvents } from "@/lib/admin.functions";
import { CreditTransfer } from "./CreditTransfer";
import { SiteModeration } from "./SiteModeration";
import { OnboardingStats } from "./OnboardingStats";
import { AdminOverview, AdminPacks, AdminPayments, AdminRegistryModeration, AdminUsers } from "./AdminConsole";

type Ev = { id: string; user_id: string | null; kind: string; severity: string; detail: unknown; created_at: string };
type Tab = "overview" | "users" | "payments" | "packs" | "credits" | "moderation" | "security";

export function AdminPage() {
  const { lang } = useDashboard();
  const fr = lang !== "en";
  const [state, setState] = useState<{ admin: boolean; events: Ev[] } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [creditEmail, setCreditEmail] = useState("");
  useEffect(() => { listSecurityEvents().then(setState).catch(() => setState({ admin: false, events: [] })); }, []);
  if (!state) return <p className="p-8 text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;
  if (!state.admin) return <div className="p-8"><h1 className="font-display text-xl font-semibold">{fr ? "Accès réservé" : "Restricted"}</h1><p className="mt-1 text-sm text-muted-foreground">{fr ? "Cette page est réservée aux administrateurs." : "This page is for administrators only."}</p></div>;

  const tabs: [Tab, string][] = [
    ["overview", fr ? "Vue d'ensemble" : "Overview"], ["users", fr ? "Utilisateurs" : "Users"], ["payments", fr ? "Paiements" : "Payments"],
    ["packs", fr ? "Packs" : "Packs"], ["credits", fr ? "Crédits" : "Credits"], ["moderation", fr ? "Modération" : "Moderation"], ["security", fr ? "Sécurité" : "Security"],
  ];
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
    <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ShieldAlert className="size-5" />Administration</h1>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">{tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
      className={`h-8 shrink-0 rounded-full px-3.5 text-[12px] font-medium transition ${tab === k ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>)}</div>
    <div className="mt-5">
      {tab === "overview" && <><AdminOverview fr={fr} /><OnboardingStats fr={fr} /></>}
      {tab === "users" && <AdminUsers fr={fr} onCredit={(email) => { setCreditEmail(email); setTab("credits"); }} />}
      {tab === "payments" && <AdminPayments fr={fr} />}
      {tab === "packs" && <AdminPacks fr={fr} />}
      {tab === "credits" && <CreditTransfer key={creditEmail} fr={fr} initialEmail={creditEmail} />}
      {tab === "moderation" && <><SiteModeration fr={fr} /><AdminRegistryModeration fr={fr} /></>}
      {tab === "security" && <>
        <h2 className="font-display text-lg font-semibold">{fr ? "Journal de sécurité" : "Security log"}</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90">
          <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">{fr ? "Événement" : "Event"}</th><th className="p-3">{fr ? "Niveau" : "Level"}</th><th className="p-3">{fr ? "Détail" : "Detail"}</th></tr></thead>
            <tbody>{state.events.length === 0 ? <tr><td colSpan={4} className="p-3 text-muted-foreground">{fr ? "Aucun événement." : "No events."}</td></tr> : state.events.map((e) => <tr key={e.id} className="border-t border-border"><td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</td><td className="p-3">{e.kind}</td><td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${e.severity === "critical" ? "bg-destructive/15 text-destructive" : e.severity === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-secondary"}`}>{e.severity}</span></td><td className="max-w-md truncate p-3 font-mono text-xs text-muted-foreground">{JSON.stringify(e.detail)}</td></tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>
  </div>;
}
