import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { savePref } from "@/lib/consent";
import type { SiteLang } from "@/lib/i18n";

// Announcement bar at the very top of the landing page: a light pearl-white strip above the black hero. Change ANNOUNCEMENT_ID with
// the text so a new announcement shows again to visitors who closed the previous one. The bar's real height is
// published as --announce-h on <html> so the fixed navigation and the hero sit below it.
const ANNOUNCEMENT_ID = "2026-11-models-fable-5-2";
const DISMISS_KEY = "technova-announcement-dismissed" as const;

const copy: Record<SiteLang, { text: string; cta: string; close: string }> = {
  fr: { text: "Claude Fable 5.2, Claude Opus 5.5 et GPT-6.2 Astra sont désormais disponibles sur TechNova AI.", cta: "Les essayer", close: "Fermer l'annonce" },
  en: { text: "Claude Fable 5.2, Claude Opus 5.5 and GPT-6.2 Astra are now available on TechNova AI.", cta: "Try them", close: "Close the announcement" },
  es: { text: "Claude Fable 5.2, Claude Opus 5.5 y GPT-6.2 Astra ya están disponibles en TechNova AI.", cta: "Probarlos", close: "Cerrar el anuncio" },
  pt: { text: "Claude Fable 5.2, Claude Opus 5.5 e GPT-6.2 Astra já estão disponíveis na TechNova AI.", cta: "Experimentar", close: "Fechar o anúncio" },
};

export function AnnouncementBar({ lang }: { lang: SiteLang }) {
  const t = copy[lang] ?? copy.fr;
  // Hidden until mounted (the server cannot read the dismissal), so a closed bar never flashes.
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let closed = false;
    try { closed = localStorage.getItem(DISMISS_KEY) === ANNOUNCEMENT_ID; } catch { /* storage blocked */ }
    setOpen(!closed);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!open || !el) { root.style.setProperty("--announce-h", "0px"); return; }
    const set = () => root.style.setProperty("--announce-h", `${el.offsetHeight}px`);
    const ro = new ResizeObserver(set); ro.observe(el); set();
    return () => { ro.disconnect(); root.style.setProperty("--announce-h", "0px"); };
  }, [open]);
  if (!open) return null;
  return <div ref={ref} role="region" aria-label="Annonce" className="announce-bar fixed inset-x-0 top-0 z-[60] text-[#0b0b0d]">
    <div className="mx-auto flex max-w-6xl items-center justify-center gap-x-4 gap-y-2 px-11 py-2.5 max-sm:flex-wrap max-sm:gap-y-1.5 max-sm:px-10 max-sm:py-1.5">
      <p className="flex items-center gap-2 text-center text-[13.5px] font-medium leading-snug max-sm:text-[12px]">
        <Bell className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
        <span>{t.text}</span>
      </p>
      <a href="/dashboard/chat" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#0b0b0d] px-3 text-[13px] font-semibold max-sm:h-7 max-sm:text-[12px] text-white transition hover:bg-black/80">{t.cta}<ArrowUpRight className="size-3.5" /></a>
    </div>
    <button type="button" aria-label={t.close} onClick={() => { savePref(DISMISS_KEY, ANNOUNCEMENT_ID); setOpen(false); }}
      className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-black/50 transition hover:bg-black/5 hover:text-black sm:right-3"><X className="size-4" /></button>
  </div>;
}
