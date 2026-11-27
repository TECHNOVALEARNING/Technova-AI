import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, StickyNote, X } from "lucide-react";
import { DocPage, type DesignDoc } from "./doc";

// « Diaporama »: the presentation full screen like PowerPoint's slide show. → / Espace / clic = suivante,
// ← = précédente, Début / Fin, N = notes du présentateur, Échap = quitter. Each slide plays its transition.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const ANIM: Record<string, string> = {
  fade: "tn-show-fade .5s ease both", slide: "tn-show-slide .55s cubic-bezier(.2,.8,.2,1) both", zoom: "tn-show-zoom .5s cubic-bezier(.2,.8,.2,1) both", none: "none",
};

export function SlideShow({ doc, start, lang, onClose }: { doc: DesignDoc; start: number; lang: Lang; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [notes, setNotes] = useState(false);
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 720 : window.innerHeight));
  const root = useRef<HTMLDivElement>(null);
  const last = doc.pages.length - 1;
  const go = useCallback((n: number) => setI((cur) => Math.max(0, Math.min(last, typeof n === "number" ? n : cur))), [last]);
  useEffect(() => {
    void root.current?.requestFullscreen?.().catch(() => {});
    const resize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    const exit = () => { if (!document.fullscreenElement) onClose(); };
    window.addEventListener("resize", resize); document.addEventListener("fullscreenchange", exit);
    return () => { window.removeEventListener("resize", resize); document.removeEventListener("fullscreenchange", exit); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [onClose]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); setI((c) => Math.min(last, c + 1)); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); setI((c) => Math.max(0, c - 1)); }
      else if (e.key === "Home") go(0); else if (e.key === "End") go(last);
      else if (e.key.toLowerCase() === "n") setNotes((v) => !v);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, last, onClose]);
  const page = doc.pages[i];
  const noteH = notes ? Math.min(220, vh * 0.28) : 0;
  const scale = Math.min(vw / doc.w, (vh - noteH) / doc.h);
  return <div ref={root} className="fixed inset-0 z-[200] flex flex-col bg-black text-white" role="dialog" aria-label={tx(lang, "Diaporama", "Slide show")}>
    <style>{`@keyframes tn-show-fade{from{opacity:0}to{opacity:1}}@keyframes tn-show-slide{from{opacity:0;transform:translateX(8%)}to{opacity:1;transform:none}}@keyframes tn-show-zoom{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.tn-show-page{animation:none!important}}`}</style>
    <div className="relative flex min-h-0 flex-1 cursor-pointer items-center justify-center" onClick={() => setI((c) => Math.min(last, c + 1))}>
      <div key={i} className="tn-show-page" style={{ width: doc.w * scale, height: doc.h * scale, animation: ANIM[page?.transition ?? "fade"] ?? ANIM["fade"] }}>
        <div style={{ width: doc.w, height: doc.h, transform: `scale(${scale})`, transformOrigin: "top left" }}><DocPage doc={doc} page={i} /></div>
      </div>
    </div>
    {notes && <div className="shrink-0 overflow-y-auto border-t border-white/15 bg-[#111] px-6 py-4 text-[16px] leading-relaxed" style={{ height: noteH }}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{tx(lang, "Notes du présentateur", "Speaker notes")}</p>
      <p className="whitespace-pre-wrap text-white/90">{page?.notes?.trim() || tx(lang, "Aucune note pour cette diapositive.", "No notes for this slide.")}</p>
    </div>}
    <div className="group absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[13px] opacity-40 backdrop-blur transition hover:opacity-100" style={{ bottom: noteH + 16 }}>
      <button type="button" aria-label={tx(lang, "Précédente", "Previous")} onClick={() => go(i - 1)} disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
      <span className="min-w-[64px] text-center tabular-nums">{i + 1} / {doc.pages.length}</span>
      <button type="button" aria-label={tx(lang, "Suivante", "Next")} onClick={() => go(i + 1)} disabled={i === last} className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"><ChevronRight className="size-4" /></button>
      <button type="button" aria-label={tx(lang, "Notes du présentateur", "Speaker notes")} aria-pressed={notes} onClick={() => setNotes((v) => !v)} className={`grid size-8 place-items-center rounded-full hover:bg-white/15 ${notes ? "bg-white/20" : ""}`} title="N"><StickyNote className="size-4" /></button>
      <button type="button" aria-label={tx(lang, "Quitter le diaporama", "End the show")} onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-white/15" title={tx(lang, "Échap", "Esc")}><X className="size-4" /></button>
    </div>
  </div>;
}
