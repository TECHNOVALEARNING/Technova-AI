import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Globe2, Loader2, Lock, Plug, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { featureMinTier, packNames, upgradeSentence } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import { SupabaseCard } from "./DashboardTools";
import { Button } from "@/components/ui/button";
import { useDashboard } from "./DashboardLayout";
import { CONNECTOR_CATALOG } from "@/lib/connectors";
import { BrandLogo } from "./BrandLogo";
import { disconnectConnector, listConnections, startConnect } from "@/lib/connections.functions";
import { connectErrorText } from "@/lib/connect-errors";
import { listMySites, unpublishSite } from "@/lib/publishing.functions";

type Status = { id: string; configured: boolean; connected: boolean; label: string | null };
const tx = (lang: string, fr: string, en: string) => (lang === "en" ? en : fr);

/** Waits for the popup's return page, which finishes the connection itself. Resolves "done", or the failure
 *  reason it reports; a popup closed without any message resolves "closed" (the caller then re-reads the status). */
function waitForReturn(popup: Window, connectorId: string) {
  return new Promise<string>((resolve) => {
    const cleanup = () => { window.removeEventListener("message", onMsg); window.clearInterval(poll); };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.connectorId !== connectorId) return;
      if (e.data.type === "technovaOAuthDone") { cleanup(); resolve("done"); }
      else if (e.data.type === "technovaOAuthFailed") { cleanup(); resolve(typeof e.data.reason === "string" && e.data.reason ? e.data.reason : "failed"); }
    };
    window.addEventListener("message", onMsg);
    const poll = window.setInterval(() => { if (popup.closed) { cleanup(); resolve("closed"); } }, 500);
  });
}

/** Connectors reserved to a plan (the server re-checks on every connection). */
const connectorFeature: Record<string, "github" | "publish" | "site" | undefined> = { github: "github", netlify: "publish", vercel: "publish", stripe: "site" };

export function ConnectionsPage() {
  const { lang } = useDashboard();
  const tier = usePlanTier();
  const [status, setStatus] = useState<Status[]>([]);
  const [sites, setSites] = useState<{ slug: string; title: string; updated_at: string; disabled_at: string | null }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { const [s, p] = await Promise.all([listConnections(), listMySites()]); setStatus(s); setSites(p); } catch { setNotice(tx(lang, "Impossible de charger vos connexions.", "Could not load connections.")); }
  }, [lang]);
  useEffect(() => { void load(); }, [load]);

  const connect = async (id: string) => {
    const popup = window.open("", "technova-connect", "width=600,height=720");
    if (!popup) { setNotice(tx(lang, "Autorisez les fenêtres pop-up puis réessayez.", "Allow popups and try again.")); return; }
    setBusy(id); setNotice("");
    let authorizationUrl: string;
    try {
      ({ authorizationUrl } = await startConnect({ data: { connectorId: id } }));
    } catch (e) {
      popup.close();
      setNotice(connectErrorText(e instanceof Error ? e.message : "", lang !== "en"));
      setBusy(null);
      return;
    }
    const wait = waitForReturn(popup, id);
    popup.location.href = authorizationUrl;
    const result = await wait;
    // The status is re-read in every case: the popup may have finished even if its message was lost.
    const fresh = await listConnections().catch(() => null);
    if (fresh) setStatus(fresh);
    const connected = fresh?.find((x) => x.id === id)?.connected ?? false;
    setNotice(connected ? tx(lang, "Compte connecté.", "Account connected.") : connectErrorText(result, lang !== "en"));
    setBusy(null);
  };
  const disconnect = async (id: string) => { setBusy(id); await disconnectConnector({ data: { connectorId: id } }).catch(() => {}); await load(); setBusy(null); };
  const unpublish = async (slug: string) => { setBusy(slug); await unpublishSite({ data: { slug } }).catch(() => {}); await load(); setBusy(null); };

  return <div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-8">
    <header><h1 className="font-display text-2xl font-semibold">{tx(lang, "Connexions", "Connections")}</h1><p className="mt-1 text-sm text-muted-foreground">{tx(lang, "Reliez vos propres comptes. Vos accès restent chiffrés et privés.", "Link your own accounts. Access stays encrypted and private.")}</p></header>
    {notice && <p role="status" className="rounded-xl border border-border bg-card px-4 py-2 text-sm">{notice}</p>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CONNECTOR_CATALOG.map((c) => {
        const s = status.find((x) => x.id === c.id);
        return <article key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur">
          <div className="flex items-center gap-3"><BrandLogo id={c.id} /><div className="min-w-0"><h2 className="font-medium">{c.name}</h2>{s?.connected && <p className="flex items-center gap-1 truncate text-xs text-primary"><CheckCircle2 className="size-3" />{s.label ?? tx(lang, "Connecté", "Connected")}</p>}</div></div>
          <p className="flex-1 text-sm text-muted-foreground">{tx(lang, c.fr, c.en)}</p>
          {(() => { const f = connectorFeature[c.id]; return f && tier !== null && tier < featureMinTier[f] && !s?.connected ? <p className="text-xs text-muted-foreground">{upgradeSentence(f, lang !== "en")}</p> : null; })()}
          {c.kind === "soon" ? <Button size="sm" variant="outline" disabled>{tx(lang, "Bientôt disponible", "Coming soon")}</Button>
            : !s || tier === null ? <Button size="sm" variant="outline" disabled><Loader2 className="size-4 animate-spin" /></Button>
            : (() => { const f = connectorFeature[c.id]; return f && tier < featureMinTier[f] && !s.connected; })() ? <Button size="sm" asChild><Link to="/dashboard/credits"><Lock className="size-4" />{(() => { const name = packNames[featureMinTier[connectorFeature[c.id]!]]; return tx(lang, `Passer au forfait ${name}`, `Upgrade to ${name}`); })()}</Link></Button>
            : !s.configured ? <Button size="sm" variant="outline" disabled>{tx(lang, "Configuration requise", "Setup required")}</Button>
            : s.connected ? <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => void disconnect(c.id)}><Trash2 className="size-4" />{tx(lang, "Déconnecter", "Disconnect")}</Button>
            : <Button size="sm" disabled={busy === c.id} onClick={() => void connect(c.id)}>{busy === c.id ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}{tx(lang, "Connecter", "Connect")}</Button>}
        </article>;
      })}
    </section>
    <SupabaseCard />
    <section><h2 className="mb-3 font-display text-lg font-semibold">{tx(lang, "Mes sites publiés", "My published sites")}</h2>
      {sites.length === 0 ? <p className="text-sm text-muted-foreground">{tx(lang, "Publiez un site depuis le panneau Artefact du mode Créer.", "Publish a site from the Artifact panel in Create mode.")}</p>
        : <ul className="divide-y divide-border rounded-2xl border border-border bg-card/90">{sites.map((s) => <li key={s.slug} className="flex items-center gap-3 p-3"><Globe2 className="size-4 text-muted-foreground" /><a href={`/s/${s.slug}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">/s/{s.slug}</a>{s.disabled_at && <span title={tx(lang, "Signalé puis suspendu, en attente de vérification par TechNova.", "Reported and suspended, pending review by TechNova.")} className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">{tx(lang, "Suspendu", "Suspended")}</span>}<Button size="sm" variant="ghost" disabled={busy === s.slug} onClick={() => void unpublish(s.slug)}>{tx(lang, "Dépublier", "Unpublish")}</Button></li>)}</ul>}
    </section>
  </div>;
}
