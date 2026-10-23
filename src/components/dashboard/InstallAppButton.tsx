import { useState } from "react";
import { MonitorSmartphone, Share, X } from "lucide-react";
import { toast } from "sonner";
import { useInstallApp } from "@/lib/pwa";

/** Shown only when the app can be installed (Chrome/Edge/Android prompt, or iPhone instructions). */
export function InstallAppButton({ fr, compact }: { fr: boolean; compact?: boolean }) {
  const { mode, install } = useInstallApp();
  const [iosHelp, setIosHelp] = useState(false);
  if (mode === "none") return null;
  const label = fr ? "Installer l'application" : "Install the app";
  async function onClick() {
    if (mode === "ios") { setIosHelp((v) => !v); return; }
    if (await install()) toast.success(fr ? "TechNova est installé sur votre appareil." : "TechNova is installed on your device.");
  }
  return <div className="relative">
    <button type="button" onClick={() => void onClick()} title={label} aria-label={label}
      className={compact
        ? "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        : "flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[12px] font-medium hover:bg-secondary"}>
      <MonitorSmartphone className="size-4 shrink-0" />{!compact && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
    {iosHelp && <div role="dialog" aria-label={label} className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg">
      <button type="button" onClick={() => setIosHelp(false)} aria-label={fr ? "Fermer" : "Close"} className="absolute right-2 top-2 text-muted-foreground"><X className="size-3.5" /></button>
      <p className="pr-4 font-semibold">{label}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
        <li>{fr ? "Touchez le bouton Partager" : "Tap the Share button"} <Share className="inline size-3.5 align-text-bottom" /> {fr ? "de Safari" : "in Safari"}</li>
        <li>{fr ? "Choisissez « Sur l'écran d'accueil »" : "Choose “Add to Home Screen”"}</li>
        <li>{fr ? "Validez avec « Ajouter »" : "Confirm with “Add”"}</li>
      </ol>
    </div>}
  </div>;
}
