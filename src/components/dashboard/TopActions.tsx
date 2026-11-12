import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Crown, Download, Share } from "lucide-react";
import { toast } from "sonner";
import { isStandaloneApp, useInstallApp } from "@/lib/pwa";

// Top-right actions of every dashboard page: install the app (PWA) and move to a higher pack.
// "Get the app" is hidden once the app is installed; "Upgrade" is hidden on the Pro pack (tier 3).
export function TopActions({ lang, tier }: { lang: "fr" | "en"; tier: number | null }) {
  const fr = lang === "fr";
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
    {!installed && <button type="button" onClick={() => void getApp()} className={`${pill} border border-border bg-card text-foreground hover:border-foreground/30`}>
      <Download className="size-3.5" /><span className="hidden sm:inline">{fr ? "Obtenir l'appli" : "Get the app"}</span><span className="sm:hidden">{fr ? "Appli" : "App"}</span>
    </button>}
    {tier !== null && tier < 3 && <Link to="/dashboard/credits" className={`${pill} top-upgrade text-white hover:brightness-110`}>
      <Crown className="size-3.5" /><span className="hidden sm:inline">{fr ? "Passer au forfait supérieur" : "Upgrade your plan"}</span><span className="sm:hidden">{fr ? "Forfait +" : "Upgrade"}</span><ArrowUpRight className="size-3.5" />
    </Link>}
  </div>;
}
