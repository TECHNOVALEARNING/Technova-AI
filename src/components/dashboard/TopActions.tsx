import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Coins, Crown, Download, Share } from "lucide-react";
import { toast } from "sonner";
import { isStandaloneApp, useInstallApp } from "@/lib/pwa";
import { supabase } from "@/integrations/supabase/client";

/** Ask the chat top bar to re-read the balance (after a reply, a creation or a Studio stage). */
export const CREDITS_CHANGED = "technova-credits-changed";
export function notifyCreditsChanged() { try { window.dispatchEvent(new Event(CREDITS_CHANGED)); } catch { /* not in a browser */ } }

/** Available credits (balance minus reserved), read from the server ledger; null until known. */
function useAvailableCredits(enabled: boolean) {
  const [available, setAvailable] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id; if (!uid) return;
      const { data } = await supabase.rpc("get_wallet_balance", { _owner: uid });
      const w = (data ?? null) as { balance?: number; reserved?: number } | null;
      if (alive && w) setAvailable(Math.max(0, Math.floor((w.balance ?? 0) - (w.reserved ?? 0))));
    };
    void load().catch(() => {});
    const again = () => { void load().catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === "visible") again(); };
    window.addEventListener(CREDITS_CHANGED, again);
    document.addEventListener("visibilitychange", onVisible);
    // A reply billed at its real cost settles a moment after the stream ends: re-read now and then.
    const timer = window.setInterval(onVisible, 30_000);
    return () => { alive = false; window.removeEventListener(CREDITS_CHANGED, again); document.removeEventListener("visibilitychange", onVisible); window.clearInterval(timer); };
  }, [enabled]);
  return enabled ? available : null;
}

// Top-right actions of every dashboard page: install the app (PWA) and move to a higher pack.
// "Get the app" is hidden once the app is installed; "Upgrade" is hidden on the Pro pack (tier 3).
// On chat pages (home and conversations) the remaining credits show first, linking to Tarifs et crédits.
export function TopActions({ lang, tier, showCredits = false }: { lang: "fr" | "en"; tier: number | null; showCredits?: boolean }) {
  const fr = lang === "fr";
  const credits = useAvailableCredits(showCredits);
  const { mode, install } = useInstallApp();
  // Read after mount: the server cannot know whether the app is installed.
  const [installed, setInstalled] = useState(false);
  useEffect(() => { setInstalled(isStandaloneApp()); }, []);

  async function getApp() {
    if (mode === "prompt") { await install(); return; }
    if (mode === "ios") {
      toast(fr ? "Installer TechNova sur iPhone / iPad" : "Install TechNova on iPhone / iPad", { description: fr ? "Dans Safari, touchez Partager puis « Sur l'écran d'accueil »." : "In Safari, tap Share then “Add to Home Screen”.", icon: <Share className="size-4" /> });
      return;
    }
    toast(fr ? "Installer TechNova" : "Install TechNova", { description: fr ? "Dans Chrome ou Edge, ouvrez le menu ⋮ puis « Installer TechNova » (ou l'icône d'installation dans la barre d'adresse)." : "In Chrome or Edge, open the ⋮ menu then “Install TechNova” (or the install icon in the address bar)." });
  }

  const pill = "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold shadow-sm transition";
  return <div className="flex items-center gap-2">
    {credits !== null && <Link to="/dashboard/credits" title={fr ? "Crédits restants — recharger" : "Credits left — top up"} aria-label={fr ? `${credits} crédits restants` : `${credits} credits left`} className={`${pill} top-credits border border-border bg-card text-foreground tabular-nums hover:border-foreground/30 ${credits < 100 ? "text-amber-600 dark:text-amber-400" : ""}`}>
      <Coins className="size-3.5" /><span>{credits.toLocaleString(fr ? "fr-FR" : "en-US")}</span><span className="hidden sm:inline font-medium text-muted-foreground">{fr ? "crédits" : "credits"}</span>
    </Link>}
    {!installed && <button type="button" onClick={() => void getApp()} className={`${pill} border border-border bg-card text-foreground hover:border-foreground/30`}>
      <Download className="size-3.5" /><span className="hidden sm:inline">{fr ? "Obtenir l'appli" : "Get the app"}</span><span className="sm:hidden">{fr ? "Appli" : "App"}</span>
    </button>}
    {tier !== null && tier < 3 && <Link to="/dashboard/credits" className={`${pill} top-upgrade text-white hover:brightness-110`}>
      <Crown className="size-3.5" /><span className="hidden sm:inline">{fr ? "Passer au forfait supérieur" : "Upgrade your plan"}</span><span className="sm:hidden">{fr ? "Forfait +" : "Upgrade"}</span><ArrowUpRight className="size-3.5" />
    </Link>}
  </div>;
}
