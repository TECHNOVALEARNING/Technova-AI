import { useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, FileSpreadsheet, FileUp, History, Sparkles, BarChart3, Calculator, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirmDialog } from "@/components/ConfirmHost";
import { cn } from "@/lib/utils";
import { isErr, makeEvaluator } from "@/lib/sheet/formula";
import { type Workbook, addr, display, newWorkbook } from "@/lib/sheet/model";
import { importFile } from "@/lib/sheet/sheet-io";
import { loadCreation } from "@/lib/creations";
import { SHEET_GROUPS, SHEET_TEMPLATES, type SheetTemplate } from "./sheet-templates";
import { SHEET_DRAFT_KEY, SheetEditor } from "./SheetEditor";

// Templates → « Tableur et Excel »: TechNova Tableur's start page — blank workbook, open a file, resume the draft
// kept on this device, or one of the templates (budget, sales, invoice, quote, stock, cash flow, tontine,
// grades, guests, project, content calendar, dashboard, to-do, expenses). Opens the editor full screen.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);

function MiniSheet({ wb, accent }: { wb: Workbook; accent: string }) {
  const ev = useMemo(() => makeEvaluator(wb), [wb]);
  const sh = wb.sheets[0]!;
  const rows = 9, cols = 5;
  return <div className="h-full w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-[7px] leading-[13px] text-zinc-800 shadow-sm">
    <div className="flex h-[13px] border-b border-zinc-200 bg-zinc-50 text-zinc-400"><span className="w-4 border-r border-zinc-200" />{Array.from({ length: cols }, (_, c) => <span key={c} className="flex-1 border-r border-zinc-200 text-center">{String.fromCharCode(65 + c)}</span>)}</div>
    {Array.from({ length: rows }, (_, r) => <div key={r} className="flex border-b border-zinc-100">
      <span className="w-4 shrink-0 border-r border-zinc-200 bg-zinc-50 text-center text-zinc-400">{r + 1}</span>
      {Array.from({ length: cols }, (_, c) => { const cell = sh.cells[addr(c, r)]; const v = cell ? ev.value(0, c, r) : null; const s = cell?.s;
        return <span key={c} className="flex-1 truncate border-r border-zinc-100 px-0.5" style={{ background: s?.bg, color: s?.color ?? (isErr(v) ? "#dc2626" : undefined), fontWeight: s?.b ? 700 : undefined, textAlign: typeof v === "number" ? "right" : (s?.align ?? "left") }}>{display(v, s)}</span>; })}
    </div>)}
    <div className="h-1" style={{ background: accent }} />
  </div>;
}

export function SheetGallery({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<Workbook | null>(null);
  const [saved, setSaved] = useState<{ id: string; projectId: string | null } | null>(null);
  // Opened from Projects: /dashboard/registry?section=sheet&creation=ID
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("creation");
    if (!id) return;
    void loadCreation(id).then((c) => {
      if (!c || c.kind !== "sheet") { if (!c) toast.error(lang === "fr" ? "Ce fichier n'existe plus (supprimé après 14 jours ?)." : "This file no longer exists (deleted after 14 days?)."); return; }
      setSaved({ id: c.id, projectId: c.project_id }); setOpen(c.data as unknown as Workbook);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [group, setGroup] = useState<SheetTemplate["group"] | "all">("all");
  const [draft, setDraft] = useState<{ at: number; wb: Workbook } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const built = useMemo(() => SHEET_TEMPLATES.map((t) => ({ t, wb: t.build() })), []);
  useEffect(() => {
    if (open) return;
    try { const raw = localStorage.getItem(SHEET_DRAFT_KEY); if (raw) { const d = JSON.parse(raw) as { at: number; wb: Workbook }; if (d?.wb?.sheets?.length) setDraft(d); } } catch { /* ignore */ }
  }, [open]);
  const start = async (wb: Workbook) => {
    if (draft && Date.now() - draft.at < 30 * 86_400_000 && !(await confirmDialog({ title: tx(lang, "Commencer un nouveau classeur ?", "Start a new workbook?"), description: tx(lang, `Le brouillon « ${draft.wb.title} » gardé sur cet appareil sera remplacé. Exportez-le d'abord en Excel si vous voulez le garder.`, `The draft "${draft.wb.title}" kept on this device will be replaced. Export it to Excel first to keep it.`), confirmLabel: tx(lang, "Continuer", "Continue") }))) return;
    setSaved(null); setOpen(structuredClone(wb));
  };
  const openFile = async (f: File) => {
    try { setSaved(null); setOpen(await importFile(f)); }
    catch (e) { const m = e instanceof Error ? e.message : ""; toast.error(m === "TOO_BIG" ? tx(lang, "Fichier trop lourd (15 Mo au plus).", "File too large (15 MB max).") : tx(lang, "Ouvrez un fichier .xlsx ou .csv (les PDF s'importent depuis le classeur : Ouvrir → Tableaux d'un PDF).", "Open an .xlsx or .csv file (PDFs import from inside the workbook: Open → Tables from a PDF).")); }
  };
  const list = built.filter(({ t }) => group === "all" || t.group === group);
  const feature = (icon: React.ReactNode, title: string, text: string) => <div className="flex gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1f7a5a]/10 text-[#1f7a5a]">{icon}</span><div><strong className="block text-[12.5px]">{title}</strong><span className="block text-[11.5px] leading-snug text-muted-foreground">{text}</span></div></div>;

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="grid gap-5 p-5 md:grid-cols-[1.3fr_1fr] md:p-6">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f7a5a]"><FileSpreadsheet className="size-3.5" />TechNova Tableur</p>
          <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight">{tx(lang, "Vos tableaux Excel, sans installer Excel", "Your Excel spreadsheets, without installing Excel")}</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{tx(lang, "Formules (SOMME, SI, RECHERCHEX…), mise en forme, FCFA, graphiques, plusieurs feuilles, et un assistant IA qui vous propose les colonnes, les formules et la mise en forme. Ouvrez vos fichiers Excel, CSV, PDF ou Google Sheets, puis exportez en Excel, PDF ou lien à partager.", "Formulas (SUM, IF, XLOOKUP…), formatting, currencies, charts, several sheets, and an AI assistant that suggests columns, formulas and formatting. Open Excel, CSV, PDF or Google Sheets files, then export to Excel, PDF or a share link.")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void start(newWorkbook(tx(lang, "Classeur sans titre", "Untitled workbook")))} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1f7a5a] px-4 text-[13px] font-semibold text-white hover:brightness-110"><FilePlus2 className="size-4" />{tx(lang, "Classeur vierge", "Blank workbook")}</button>
            <button type="button" onClick={() => file.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-[13px] font-semibold hover:bg-secondary"><FileUp className="size-4" />{tx(lang, "Ouvrir un fichier Excel ou CSV", "Open an Excel or CSV file")}</button>
            {draft && <button type="button" onClick={() => { setSaved(null); setOpen(draft.wb); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1f7a5a]/40 bg-[#1f7a5a]/[0.06] px-4 text-[13px] font-semibold text-[#155e45] hover:bg-[#1f7a5a]/10 dark:text-emerald-300"><History className="size-4" />{tx(lang, `Reprendre « ${draft.wb.title.slice(0, 28)} »`, `Resume "${draft.wb.title.slice(0, 28)}"`)}</button>}
            <input ref={file} type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-2xl bg-secondary/50 p-4">
          {feature(<Calculator className="size-4" />, tx(lang, "Plus de 50 fonctions", "50+ functions"), tx(lang, "En français ou en anglais, avec ; ou , comme dans Excel.", "French or English names, ; or , like in Excel."))}
          {feature(<Sparkles className="size-4" />, tx(lang, "Assistant IA", "AI assistant"), tx(lang, "Il propose, vous validez chaque changement.", "It proposes, you approve every change."))}
          {feature(<BarChart3 className="size-4" />, tx(lang, "Graphiques", "Charts"), tx(lang, "Barres, courbes, aires, secteurs, déplaçables sur la feuille.", "Bars, lines, areas, pies, movable on the sheet."))}
          {feature(<Share2 className="size-4" />, tx(lang, "Exports et partage", "Export and share"), tx(lang, "Excel, PDF, CSV, Google Sheets, lien et WhatsApp.", "Excel, PDF, CSV, Google Sheets, link and WhatsApp."))}
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={tx(lang, "Catégories", "Categories")}>
      {(["all", ...Object.keys(SHEET_GROUPS)] as (SheetTemplate["group"] | "all")[]).map((g) => <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)}
        className={cn("h-8 rounded-full border px-3.5 text-[12.5px] transition", group === g ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-secondary")}>
        {g === "all" ? tx(lang, "Tous les modèles", "All templates") : SHEET_GROUPS[g][lang]} <span className="opacity-60">{g === "all" ? built.length : built.filter((b) => b.t.group === g).length}</span>
      </button>)}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {list.map(({ t, wb }) => <button key={t.id} type="button" onClick={() => void start(wb)} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="aspect-[16/10] bg-secondary/60 p-3"><MiniSheet wb={wb} accent={t.accent} /></div>
        <div className="flex items-start gap-2.5 px-4 py-3">
          <span className="mt-0.5 size-2.5 shrink-0 rounded-full" style={{ background: t.accent }} />
          <span className="min-w-0"><strong className="block text-[13.5px]">{t[lang]}</strong><span className="block text-[11.5px] leading-snug text-muted-foreground">{lang === "fr" ? t.descFr : t.descEn}</span></span>
        </div>
      </button>)}
    </div>

    <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
      <DialogContent className="flex h-[100svh] max-h-[100svh] w-screen max-w-[1600px] flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[96vh] sm:max-h-[96vh] sm:w-[98vw] sm:rounded-2xl [&>button.absolute]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">{open?.title ?? "TechNova Tableur"}</DialogTitle>
        <DialogDescription className="sr-only">{tx(lang, "Éditeur de tableur", "Spreadsheet editor")}</DialogDescription>
        {open && <SheetEditor initial={open} lang={lang} saved={saved} onClose={() => { setOpen(null); setSaved(null); }} />}
      </DialogContent>
    </Dialog>
  </div>;
}
