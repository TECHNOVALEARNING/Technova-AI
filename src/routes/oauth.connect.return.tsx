import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { completeConnect } from "@/lib/connections.functions";
import { connectErrorText } from "@/lib/connect-errors";

export const Route = createFileRoute("/oauth/connect/return")({
  head: () => ({ meta: [
    { title: "Connexion en cours | TechNova AI Hub" },
    { name: "description", content: "Finalisation de la connexion du service." },
    { name: "robots", content: "noindex" },
  ] }),
  component: OAuthReturn,
});

// The provider sends the visitor back here (in the popup). This page finishes the connection itself — the
// server checks the signed state and the signed-in user — then tells the dashboard tab and closes. Finishing
// here (instead of in the opener) keeps working when the opener reference or its message is lost.
function OAuthReturn() {
  const [view, setView] = useState<{ tone: "busy" | "ok" | "error"; text: string }>({ tone: "busy", text: "Finalisation de la connexion…" });
  useEffect(() => {
    const fr = !(navigator.language || "fr").toLowerCase().startsWith("en");
    const p = new URLSearchParams(window.location.search);
    const state = p.get("state") ?? "";
    // The connector id is only read for routing; the server verifies the signed state.
    let connectorId: string | null = null;
    try { connectorId = (JSON.parse(atob((state.split(".")[0] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { c?: string }).c ?? null; } catch { connectorId = null; }
    const notify = (ok: boolean, reason = "") => {
      try { window.opener?.postMessage({ type: ok ? "technovaOAuthDone" : "technovaOAuthFailed", connectorId, reason }, window.location.origin); } catch { /* opener gone */ }
    };
    const fail = (reason: string) => { setView({ tone: "error", text: connectErrorText(reason, fr) }); notify(false, reason); };
    const code = p.get("code");
    const providerError = p.get("error");
    if (providerError) { fail(providerError); return; }
    if (!code || !connectorId) { fail("CONNECT_STATE_INVALID"); return; }
    const id = connectorId;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { fail("CONNECT_SIGNED_OUT"); return; }
      try {
        await completeConnect({ data: { code, state, connectorId: id } });
        setView({ tone: "ok", text: fr ? "Compte connecté. Cette fenêtre va se fermer." : "Account connected. This window will close." });
        notify(true);
        window.setTimeout(() => window.close(), 900);
      } catch (e) { fail(e instanceof Error ? e.message : ""); }
    })();
  }, []);
  const Icon = view.tone === "ok" ? CheckCircle2 : view.tone === "error" ? XCircle : Loader2;
  return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
    <div className="max-w-sm text-center">
      <Icon className={`mx-auto size-8 ${view.tone === "busy" ? "animate-spin text-muted-foreground" : view.tone === "ok" ? "text-emerald-600" : "text-destructive"}`} />
      <p className="mt-3 text-sm">{view.text}</p>
      {view.tone === "error" && <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={() => window.close()} className="h-9 rounded-full border border-border px-4 text-sm">Fermer</button>
        <a href="/dashboard/connexions" className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background">Connexions</a>
      </div>}
    </div>
  </main>;
}
