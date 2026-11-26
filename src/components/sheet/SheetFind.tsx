import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

// « Rechercher et remplacer » (Ctrl+F / Ctrl+H): a small panel over the grid, like Excel's. The editor does the
// searching (values as shown, or the formulas themselves) and the replacing (always in what was typed).

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
import type { FindOpts } from "@/lib/sheet/tools";

export function SheetFind({ lang, replace, onClose, onNext, onReplace, onReplaceAll }: {
  lang: Lang; replace: boolean; onClose: () => void;
  onNext: (o: FindOpts, back: boolean) => string; onReplace: (o: FindOpts) => string; onReplaceAll: (o: FindOpts) => string;
}) {
  const [o, setO] = useState<FindOpts>({ q: "", rep: "", caseSens: false, whole: false, formulas: false, allSheets: false });
  const [showRep, setShowRep] = useState(replace);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setShowRep(replace); }, [replace]);
  const set = (p: Partial<FindOpts>) => { setO((x) => ({ ...x, ...p })); setStatus(""); };
  const field = "h-8 w-full rounded-lg border border-border bg-background px-2.5 text-[12.5px] outline-none focus:border-[#1f7a5a]";
  const box = "inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground";
  return <div data-no-grid onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-2 z-[45] w-[330px] rounded-xl border border-border bg-popover p-3 text-[12.5px] shadow-2xl">
    <div className="mb-2 flex items-center gap-2">
      <Search className="size-4 text-[#1f7a5a]" />
      <div className="flex gap-1">
        <button type="button" onClick={() => setShowRep(false)} className={`rounded-full px-2.5 py-0.5 text-[12px] ${!showRep ? "bg-[#1f7a5a] text-white" : "hover:bg-secondary"}`}>{tx(lang, "Rechercher", "Find")}</button>
        <button type="button" onClick={() => setShowRep(true)} className={`rounded-full px-2.5 py-0.5 text-[12px] ${showRep ? "bg-[#1f7a5a] text-white" : "hover:bg-secondary"}`}>{tx(lang, "Remplacer", "Replace")}</button>
      </div>
      <button type="button" onClick={onClose} aria-label={tx(lang, "Fermer", "Close")} className="ml-auto grid size-7 place-items-center rounded-full hover:bg-secondary"><X className="size-4" /></button>
    </div>
    <div className="flex gap-1.5">
      <input ref={input} className={field} value={o.q} placeholder={tx(lang, "Rechercher…", "Find…")} onChange={(e) => set({ q: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setStatus(onNext(o, e.shiftKey)); } else if (e.key === "Escape") onClose(); }} />
      <button type="button" aria-label={tx(lang, "Précédent", "Previous")} disabled={!o.q} onClick={() => setStatus(onNext(o, true))} className="grid size-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-40"><ChevronUp className="size-4" /></button>
      <button type="button" aria-label={tx(lang, "Suivant", "Next")} disabled={!o.q} onClick={() => setStatus(onNext(o, false))} className="grid size-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-40"><ChevronDown className="size-4" /></button>
    </div>
    {showRep && <div className="mt-1.5 space-y-1.5">
      <input className={field} value={o.rep} placeholder={tx(lang, "Remplacer par…", "Replace with…")} onChange={(e) => set({ rep: e.target.value })} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} />
      <div className="flex gap-1.5">
        <button type="button" disabled={!o.q} onClick={() => setStatus(onReplace(o))} className="h-8 flex-1 rounded-lg border border-border font-medium hover:bg-secondary disabled:opacity-40">{tx(lang, "Remplacer", "Replace")}</button>
        <button type="button" disabled={!o.q} onClick={() => setStatus(onReplaceAll(o))} className="h-8 flex-1 rounded-lg bg-[#1f7a5a] font-semibold text-white disabled:opacity-40">{tx(lang, "Tout remplacer", "Replace all")}</button>
      </div>
    </div>}
    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
      <label className={box}><input type="checkbox" checked={o.caseSens} onChange={(e) => set({ caseSens: e.target.checked })} />{tx(lang, "Respecter la casse", "Match case")}</label>
      <label className={box}><input type="checkbox" checked={o.whole} onChange={(e) => set({ whole: e.target.checked })} />{tx(lang, "Cellule entière", "Entire cell")}</label>
      <label className={box}><input type="checkbox" checked={o.formulas} onChange={(e) => set({ formulas: e.target.checked })} />{tx(lang, "Dans les formules", "In formulas")}</label>
      <label className={box}><input type="checkbox" checked={o.allSheets} onChange={(e) => set({ allSheets: e.target.checked })} />{tx(lang, "Tout le classeur", "Whole workbook")}</label>
    </div>
    {status && <p className="mt-2 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-[12px]">{status}</p>}
  </div>;
}
