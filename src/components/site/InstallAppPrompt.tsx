import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X, Zap, Maximize2, BellRing } from "lucide-react";
import { useInstallApp } from "@/lib/pwa";
import type { Lang } from "@/lib/i18n";

// Landing-page invitation to install the PWA: appears once the visitor has scrolled past the hero,
// never blocks the page, and stays hidden for two weeks after "Plus tard".
const DISMISS_KEY = "technova-install-dismissed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const copy = {
  fr: {
    title: "Installez TechNova",
    sub: "Toutes vos IA à un clic, directement depuis votre écran d'accueil.",
    perks: ["Ouverture instantanée", "Plein écran, sans onglets", "Accès rapide au chat et aux crédits"],
    install: "Installer l'application", later: "Plus tard", close: "Fermer",
    ios: ["Touchez", "Partager", "dans Safari", "puis « Sur l'écran d'accueil »"],
    free: "Gratuit · mobile et ordinateur",
  },
  en: {
    title: "Install TechNova",
    sub: "All your AI one tap away, right from your home screen.",
    perks: ["Opens instantly", "Full screen, no tabs", "Quick access to chat and credits"],
    install: "Install the app", later: "Not now", close: "Close",
    ios: ["Tap", "Share", "in Safari", "then “Add to Home Screen”"],
    free: "Free · mobile and desktop",
  },
} as const;

function snoozed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < SNOOZE_MS; } catch { return false; }
}

export function InstallAppPrompt({ lang }: { lang: Lang }) {
  const { mode, install } = useInstallApp();
  const [visible, setVisible] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    if (mode === "none" || snoozed()) return;
    const show = () => { if (window.scrollY > window.innerHeight * 0.6) { setVisible(true); window.removeEventListener("scroll", show); } };
    show();
    window.addEventListener("scroll", show, { passive: true });
    return () => window.removeEventListener("scroll", show);
  }, [mode]);

  if (mode === "none" || !visible) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
    setVisible(false);
  }
  async function onInstall() {
    if (await install()) setVisible(false);
  }

  const perkIcons = [Zap, Maximize2, BellRing];

  return (
    <aside role="dialog" aria-labelledby="install-title" aria-describedby="install-sub"
      className="install-prompt fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]">
      <div className="relative overflow-hidden rounded-[22px] border border-ink-foreground/10 bg-ink p-5 text-ink-foreground shadow-lift">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-iris opacity-30 blur-3xl" />
        <button type="button" onClick={dismiss} aria-label={t.close}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink-foreground/60 transition hover:bg-ink-foreground/10 hover:text-ink-foreground">
          <X className="size-4" />
        </button>
        <div className="relative flex items-center gap-3.5 pr-8">
          <img src="/icons/icon-192.png" alt="" width={52} height={52} className="size-[52px] shrink-0 rounded-[14px] shadow-lift ring-1 ring-ink-foreground/15" />
          <div className="min-w-0">
            <h2 id="install-title" className="font-display text-lg font-semibold leading-tight">{t.title}</h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-foreground/50">{t.free}</p>
          </div>
        </div>
        <p id="install-sub" className="relative mt-3.5 text-sm text-ink-foreground/75">{t.sub}</p>
        <ul className="relative mt-3 space-y-1.5">
          {perkIcons.map((Icon, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] text-ink-foreground/85"><Icon className="size-3.5 shrink-0 text-iris-2" />{t.perks[i]}</li>
          ))}
        </ul>
        {mode === "ios" ? (
          <p className="relative mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-ink-foreground/[0.07] px-3 py-2.5 text-[13px] text-ink-foreground/85">
            {t.ios[0]} <span className="inline-flex items-center gap-1 font-semibold text-ink-foreground"><Share className="size-3.5" />{t.ios[1]}</span> {t.ios[2]}, {t.ios[3]} <SquarePlus className="size-3.5" />
          </p>
        ) : (
          <div className="relative mt-4 flex items-center gap-2">
            <button type="button" onClick={() => void onInstall()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink-foreground px-4 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris-2">
              <Download className="size-4" />{t.install}
            </button>
            <button type="button" onClick={dismiss}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-foreground/70 transition hover:bg-ink-foreground/10 hover:text-ink-foreground">
              {t.later}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
