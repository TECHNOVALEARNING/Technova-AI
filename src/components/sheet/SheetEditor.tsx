import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, AreaChart as AreaIcon, ArrowDownAZ, ArrowUpAZ, BarChart3, Bold, Columns3, Copy, Download, Eraser, FileSpreadsheet,
  FileUp, Grid3x3, Italic, LineChart as LineIcon, Minus, PaintBucket, PieChart as PieIcon, Plus, Printer, Redo2, Rows3, Sigma, Snowflake, Sparkles,
  Save, Strikethrough, Table2, RefreshCw, SlidersHorizontal, Search, StickyNote, CalendarDays, Maximize2, Eye, AlertTriangle, PanelTop, Info, FileX2, Trash2, Filter, Paintbrush, ListChecks, Merge, Lock, Underline, Undo2, WrapText, X, ChevronDown, FunctionSquare, Scissors, ClipboardPaste, Square, Share2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "@/components/ConfirmHost";
import { PublishDialog } from "@/components/dashboard/PublishDialog";
import { cn } from "@/lib/utils";
import { FUNCTION_MENU, adjustFormula, isErr, makeEvaluator, shiftFormula } from "@/lib/sheet/formula";
import { chartData } from "@/lib/sheet/chart-data";
import {
  type Cell, type CellStyle, type ChartKind, DEFAULT_COL_W, DEFAULT_ROW_H, MAX_COLS, MAX_ROWS, type NumFmt, type Rect, type Sheet, type SheetChart, type Workbook,
  addr, colName, display, newSheet, parseAddr, parseLiteral, parseRange, rangeText, uid,
} from "@/lib/sheet/model";
import { exportCsv, exportXlsx, importFile, printWorkbook, sheetFromRows, usedSize } from "@/lib/sheet/sheet-io";
import { confirmAiCredits } from "@/lib/ai-credit-notice";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";
import { SheetChartView } from "./SheetChart";
import { usePlanTier } from "@/lib/plan-client";
import { CondDialog, ListDialog, PivotDialog, type PivotDraft } from "./SheetDataDialogs";
import { FormulaSuggest, under, useFormulaAssist } from "./FormulaAssist";
import { SheetFind } from "./SheetFind";
import { FUNCTIONS, fnName, type FnInfo } from "@/lib/sheet/functions";
import { applyDedupe, duplicateRows, errorCells, findMatches, replaceIn, stepMatch, workbookStats, type FindOpts } from "@/lib/sheet/tools";
import { blockAround, buildPivotTable, columnValues, condLooks, distinctValues, hiddenRows, listAt, mergeMap, pivotPreview } from "@/lib/sheet/advanced";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { saveCreation, saveErrorText } from "@/lib/creations";
import { SheetAssistant } from "./SheetAssistant";
import { DriveImport } from "./DriveImport";

// TechNova Tableur: a mini Excel in the browser. Grid with formulas (French and English names), formats (FCFA,
// €, $, %, dates), styles, borders, gridlines, frozen header, sorting, insert / delete rows and columns, copy /
// paste with moving references, fill down, several sheets, floating charts, an AI assistant whose changes are
// approved before they apply, imports (.xlsx, .csv, PDF tables, Google Drive) and exports (.xlsx, .csv, PDF, Google
// Sheets, share link). The workbook lives in the browser; a draft is kept on this device only.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
type Pos = { c: number; r: number };
type Sel = { a: Pos; f: Pos };
type Editing = { c: number; r: number; text: string; refAt?: [number, number] | undefined };
const HEAD_H = 26, ROW_HEAD_W = 46;
export const SHEET_DRAFT_KEY = "technova-sheet-draft";

const rectOf = (s: Sel): Rect => ({ c1: Math.min(s.a.c, s.f.c), r1: Math.min(s.a.r, s.f.r), c2: Math.max(s.a.c, s.f.c), r2: Math.max(s.a.r, s.f.r) });
const FORMATS: [NumFmt, string, string][] = [["general", "Standard", "General"], ["number", "Nombre", "Number"], ["fcfa", "FCFA", "FCFA"], ["eur", "Euro (€)", "Euro (€)"], ["usd", "Dollar ($)", "Dollar ($)"], ["percent", "Pourcentage", "Percent"], ["date", "Date", "Date"], ["text", "Texte", "Text"]];
const SWATCHES = ["#111827", "#6b7280", "#ffffff", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0f766e", "#0891b2", "#2563eb", "#4f46e5", "#9333ea", "#be185d", "#1f7a5a", "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#ede9fe", "#f3f4f6"];

/** Where a dropdown opens: under its button, in fixed position so the sideways-scrolling ribbon never clips it. */
const dropAt = (el: HTMLElement | null, w: number) => { const b = el?.getBoundingClientRect(); return b ? { left: Math.max(8, Math.min(b.left, window.innerWidth - w - 8)), top: b.bottom + 4 } : { left: 8, top: 120 }; };

function ColorMenu({ label, icon, value, onPick, allowNone }: { label: string; icon: React.ReactNode; value?: string | undefined; onPick: (c: string | undefined) => void; allowNone?: boolean }) {
  const [open, setOpen] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  return <div className="relative">
    <button ref={ref} type="button" title={label} aria-label={label} onClick={() => setOpen((o) => (o ? null : dropAt(ref.current, 188)))} className="tb-btn flex-col gap-0">
      {icon}<span className="mt-[1px] block h-[3px] w-4 rounded-full" style={{ background: value ?? "transparent", outline: value ? "none" : "1px solid #d4d4d8" }} />
    </button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
      <div className="fixed z-50 w-[188px] rounded-xl border border-border bg-popover p-2 shadow-xl" style={open}>
        <div className="grid grid-cols-5 gap-1.5">{SWATCHES.map((c) => <button key={c} type="button" aria-label={c} onClick={() => { onPick(c); setOpen(null); }} className="size-7 rounded-md border border-black/10" style={{ background: c }} />)}</div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12px] hover:bg-secondary">
          <input type="color" className="size-5 cursor-pointer" value={value ?? "#000000"} onChange={(e) => onPick(e.target.value)} />Personnalisée
        </label>
        {allowNone && <button type="button" onClick={() => { onPick(undefined); setOpen(null); }} className="mt-1 w-full rounded-lg px-1.5 py-1 text-left text-[12px] hover:bg-secondary">Aucune</button>}
      </div>
    </>}
  </div>;
}

function Menu({ label, icon, children, wide, big, lock }: { label: string; icon: React.ReactNode; children: (close: () => void) => React.ReactNode; wide?: boolean; big?: boolean; lock?: boolean }) {
  const [open, setOpen] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const w = wide ? 320 : 240;
  return <div className="relative">
    <button ref={ref} type="button" onClick={() => setOpen((o) => (o ? null : dropAt(ref.current, w)))} className={big ? "tb-big" : "tb-btn w-auto gap-1 px-2 text-[12.5px]"} aria-expanded={!!open}>
      {icon}{big ? <span className="inline-flex items-center gap-0.5">{label}{lock && <Lock className="size-2.5" />}<ChevronDown className="size-3 opacity-60" /></span> : <><span className="hidden xl:inline">{label}</span><ChevronDown className="size-3 opacity-60" /></>}
    </button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
      <div className="fixed z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl" style={{ ...open, width: w }}>{children(() => setOpen(null))}</div>
    </>}
  </div>;
}
/** A big ribbon button: icon above its label, like Excel. */
const Big = ({ icon, label, onClick, active, lock, title }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean | undefined; lock?: boolean; title?: string }) =>
  <button type="button" onClick={onClick} title={title ?? label} aria-pressed={active} className={cn("tb-big", active && "tb-on")}>{icon}<span className="inline-flex items-center gap-0.5">{label}{lock && <Lock className="size-2.5" />}</span></button>;
/** A ribbon group with its name underneath. */
const Group = ({ label, children }: { label: string; children: React.ReactNode }) =>
  <div className="flex shrink-0 flex-col border-r border-border px-1.5 last:border-r-0"><div className="flex h-[62px] items-center gap-0.5">{children}</div><span className="pb-1 text-center text-[10.5px] text-muted-foreground">{label}</span></div>;
type RibbonTab = "file" | "home" | "insert" | "layout" | "formulas" | "data" | "review" | "view";
const MenuItem = ({ onClick, icon, children, hint }: { onClick: () => void; icon?: React.ReactNode; children: React.ReactNode; hint?: string | undefined }) =>
  <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] hover:bg-secondary">
    {icon && <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">{icon}</span>}
    <span className="min-w-0 flex-1"><span className="block">{children}</span>{hint && <span className={cn("block text-muted-foreground", /^[=.]/.test(hint) ? "truncate font-mono text-[10.5px]" : "text-[11px] leading-snug")}>{hint}</span>}</span>
  </button>;

/** ▾ menu of a filtered column: sort, search and tick the values to show. */
function FilterMenu({ lang, x, y, values, hidden, onApply, onSort, onClose }: { lang: Lang; x: number; y: number; values: { value: string; count: number }[]; hidden: string[]; onApply: (hidden: string[]) => void; onSort: (asc: boolean) => void; onClose: () => void }) {
  const [hide, setHide] = useState<string[]>(hidden);
  const [q, setQ] = useState("");
  const shown = values.filter((v) => v.value.toLowerCase().includes(q.toLowerCase()));
  return <>
    <div className="fixed inset-0 z-[60]" onClick={onClose} />
    <div className="fixed z-[61] w-64 rounded-xl border border-border bg-popover p-2 text-[12.5px] shadow-xl" style={{ left: Math.min(x, window.innerWidth - 270), top: Math.min(y, window.innerHeight - 380) }}>
      <button type="button" onClick={() => onSort(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary"><ArrowDownAZ className="size-4" />{tx(lang, "Trier de A à Z", "Sort A to Z")}</button>
      <button type="button" onClick={() => onSort(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary"><ArrowUpAZ className="size-4" />{tx(lang, "Trier de Z à A", "Sort Z to A")}</button>
      <div className="my-1.5 h-px bg-border" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(lang, "Rechercher", "Search")} className="mb-1.5 h-8 w-full rounded-lg border border-border bg-background px-2 outline-none" />
      <div className="flex gap-2 px-1 pb-1 text-[11.5px]"><button type="button" className="text-[#1f7a5a] hover:underline" onClick={() => setHide([])}>{tx(lang, "Tout cocher", "Select all")}</button><button type="button" className="text-muted-foreground hover:underline" onClick={() => setHide(values.map((v) => v.value))}>{tx(lang, "Tout décocher", "Clear all")}</button></div>
      <div className="max-h-52 overflow-y-auto">{shown.map((v) => <label key={v.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-secondary">
        <input type="checkbox" checked={!hide.includes(v.value)} onChange={(e) => setHide((h) => (e.target.checked ? h.filter((x) => x !== v.value) : [...h, v.value]))} />
        <span className="min-w-0 flex-1 truncate">{v.value || tx(lang, "(vide)", "(blank)")}</span><span className="text-[11px] text-muted-foreground">{v.count}</span>
      </label>)}</div>
      <div className="mt-2 flex justify-end gap-1.5"><button type="button" onClick={onClose} className="h-8 rounded-full border border-border px-3 hover:bg-secondary">{tx(lang, "Annuler", "Cancel")}</button><button type="button" onClick={() => onApply(hide)} className="h-8 rounded-full bg-[#1f7a5a] px-3 font-semibold text-white">OK</button></div>
    </div>
  </>;
}

export function SheetEditor({ initial, lang, onClose, saved }: { initial: Workbook; lang: Lang; onClose: () => void; saved?: { id: string; projectId: string | null } | null }) {
  const [wb, setWbRaw] = useState<Workbook>(initial);
  const [si, setSi] = useState(0);
  const [sel, setSel] = useState<Sel>({ a: { c: 0, r: 0 }, f: { c: 0, r: 0 } });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [chartSel, setChartSel] = useState<string | null>(null);
  const [assistant, setAssistant] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Advanced tools (Données menu) need the Pro plan; sheets that already hold filters or rules still display them.
  const tier = usePlanTier();
  const [filterMenu, setFilterMenu] = useState<{ c: number; x: number; y: number } | null>(null);
  const [dlg, setDlg] = useState<null | "cond" | "list" | "pivot">(null);
  // Pivot dialog: a new table from the current data, or editing the active pivot sheet.
  const [pivotEdit, setPivotEdit] = useState(false);
  // Excel-like ribbon: the open tab, view options and the find panel.
  const [tab, setTab] = useState<RibbonTab>("home");
  const [showFormulas, setShowFormulas] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [orient, setOrient] = useState<"auto" | "portrait" | "landscape">("auto");
  const [find, setFind] = useState<null | "find" | "replace">(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [savedRef, setSavedRef] = useState<{ id: string; projectId: string | null; at: string } | null>(saved ? { ...saved, at: "" } : null);
  const saveTo = async (title: string, projectId: string | null) => {
    const row = await saveCreation({ id: savedRef?.id ?? null, kind: "sheet", title, subtitle: `${wb.sheets.length} ${tx(lang, "feuille(s)", "sheet(s)")}`, data: { ...wb, title }, projectId });
    setWbRaw((w) => ({ ...w, title }));
    setSavedRef({ id: row.id, projectId: row.project_id, at: row.expires_at });
    toast.success(tx(lang, `Enregistré dans vos projets · gardé jusqu'au ${new Date(row.expires_at).toLocaleDateString("fr-FR")}`, `Saved to your projects · kept until ${new Date(row.expires_at).toLocaleDateString("en-GB")}`));
  };
  const quickSave = () => { if (savedRef) void saveTo(wb.title, savedRef.projectId).catch((e) => toast.error(saveErrorText(e instanceof Error ? e.message : "", lang === "fr"))); else setSaveOpen(true); };
  const past = useRef<Workbook[]>([]);
  const future = useRef<Workbook[]>([]);
  const clip = useRef<{ text: string; cells: (Cell | undefined)[][]; origin: Pos; cut: boolean } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const gridFocus = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  // Formula suggestions after « = » (functions, then the arguments of the function being typed).
  const [assistAt, setAssistAt] = useState<"cell" | "bar">("cell");
  const assist = useFormulaAssist(lang, editing, (text, caret) => {
    setEditing((e) => (e ? { ...e, text, refAt: undefined } : e));
    window.setTimeout(() => { const el = assistAt === "bar" ? bar.current : editor.current; if (el) { el.focus(); el.setSelectionRange(caret, caret); } }, 0);
  });
  const dragging = useRef<"cells" | "fill" | null>(null);
  const fillTo = useRef<Pos | null>(null);
  const [fillPreview, setFillPreview] = useState<Rect | null>(null);
  const [view, setView] = useState({ top: 0, height: 600 });
  const sheet = wb.sheets[si] ?? wb.sheets[0]!;
  const ev = useMemo(() => makeEvaluator(wb), [wb]);
  const rect = rectOf(sel);
  const active = sel.f;
  const activeCell = sheet.cells[addr(sel.a.c, sel.a.r)];

  // ---------------------------------------------------------------- history and draft
  const commit = useCallback((next: Workbook | ((w: Workbook) => Workbook)) => {
    setWbRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value === prev) return prev;
      past.current.push(prev); if (past.current.length > 80) past.current.shift();
      future.current = [];
      return value;
    });
  }, []);
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(wb); setWbRaw(p); };
  const redo = () => { const n = future.current.pop(); if (!n) return; past.current.push(wb); setWbRaw(n); };
  useEffect(() => {
    const t = window.setTimeout(() => { try { localStorage.setItem(SHEET_DRAFT_KEY, JSON.stringify({ at: Date.now(), wb })); } catch { /* storage full or blocked */ } }, 800);
    return () => window.clearTimeout(t);
  }, [wb]);

  /** Mutates a copy of the active sheet. */
  const editSheet = useCallback((fn: (sh: Sheet) => void) => commit((w) => {
    const copy: Workbook = { ...w, sheets: w.sheets.map((s, i) => (i === si ? structuredClone(s) : s)) };
    fn(copy.sheets[si]!);
    return copy;
  }), [commit, si]);

  // ---------------------------------------------------------------- geometry
  const colW = (c: number) => sheet.colW[c] ?? DEFAULT_COL_W;
  const colLeft = useMemo(() => { const out: number[] = [0]; for (let c = 0; c < sheet.cols; c++) out.push(out[c]! + (sheet.colW[c] ?? DEFAULT_COL_W)); return out; }, [sheet.colW, sheet.cols]);
  const totalW = colLeft[sheet.cols]!;
  // Rows hidden by a filter take no height: rowTops[r] is the top of row r inside the grid.
  const hidden = useMemo(() => hiddenRows(sheet, ev, si), [sheet, ev, si]);
  const rowTops = useMemo(() => { const t = new Float64Array(sheet.rows + 1); for (let r = 0; r < sheet.rows; r++) t[r + 1] = t[r]! + (hidden.has(r) ? 0 : DEFAULT_ROW_H); return t; }, [sheet.rows, hidden]);
  const rowAt = (y: number) => { let lo = 0, hi = sheet.rows - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (rowTops[m]! <= y) lo = m; else hi = m - 1; } return lo; };
  const totalH = rowTops[sheet.rows]!;
  const merges = useMemo(() => mergeMap(sheet), [sheet]);
  const looks = useMemo(() => condLooks(sheet, ev, si), [sheet, ev, si]);
  const filterRect = sheet.filter ? parseRange(sheet.filter.range) : null;
  useLayoutEffect(() => {
    const el = scroller.current; if (!el) return;
    const on = () => setView({ top: el.scrollTop, height: el.clientHeight });
    on(); el.addEventListener("scroll", on, { passive: true });
    const ro = new ResizeObserver(on); ro.observe(el);
    return () => { el.removeEventListener("scroll", on); ro.disconnect(); };
  }, []);
  const firstRow = Math.max(0, rowAt(view.top) - 4);
  const lastRow = Math.min(sheet.rows - 1, rowAt(view.top + view.height) + 4);
  const posFromPoint = (x: number, y: number): Pos => {
    const el = scroller.current!; const b = el.getBoundingClientRect();
    const px = x - b.left + el.scrollLeft - ROW_HEAD_W, py = y - b.top + el.scrollTop - HEAD_H;
    let c = 0; while (c < sheet.cols - 1 && colLeft[c + 1]! <= px) c++;
    return { c: Math.max(0, c), r: Math.max(0, Math.min(sheet.rows - 1, rowAt(Math.max(0, py)))) };
  };
  const scrollInto = (p: Pos) => {
    const el = scroller.current; if (!el) return;
    const x = colLeft[p.c]!, y = rowTops[p.r]!, w = colW(p.c);
    if (x < el.scrollLeft) el.scrollLeft = x; else if (x + w + ROW_HEAD_W > el.scrollLeft + el.clientWidth) el.scrollLeft = x + w + ROW_HEAD_W - el.clientWidth + 8;
    const top = sheet.freeze ? DEFAULT_ROW_H : 0;
    if (y < el.scrollTop + top) el.scrollTop = y - top; else if (y + DEFAULT_ROW_H + HEAD_H > el.scrollTop + el.clientHeight) el.scrollTop = y + DEFAULT_ROW_H + HEAD_H - el.clientHeight + 8;
  };

  // ---------------------------------------------------------------- editing
  const startEdit = (text?: string) => {
    const c = sheet.cells[addr(active.c, active.r)];
    setSel({ a: active, f: active });
    setEditing({ c: active.c, r: active.r, text: text ?? c?.v ?? "" });
    setAssistAt("cell");
    window.setTimeout(() => { const el = editor.current; if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n); assist.track(el, true); } }, 0);
  };
  const writeCell = (sh: Sheet, c: number, r: number, raw: string) => {
    const key = addr(c, r);
    const prev = sh.cells[key];
    if (raw === "" && !prev?.s && !prev?.n) { delete sh.cells[key]; return; }
    const lit = raw.startsWith("=") ? null : parseLiteral(raw);
    const s: CellStyle | undefined = lit?.fmt && (!prev?.s?.fmt || prev.s.fmt === "general") ? { ...prev?.s, fmt: lit.fmt } : prev?.s;
    const v = lit?.fmt === "percent" ? String(lit.value) : lit?.fmt === "date" ? raw.trim() : raw;
    sh.cells[key] = { v, ...(s ? { s } : {}), ...(prev?.n ? { n: prev.n } : {}) };
    if (r >= sh.rows - 5) sh.rows = Math.min(MAX_ROWS, sh.rows + 50);
  };
  const finishEdit = (move?: Pos) => {
    if (!editing) return;
    const raw = editing.text;
    const { c, r } = editing;
    const prev = sheet.cells[addr(c, r)]?.v ?? "";
    if (raw !== prev) editSheet((sh) => writeCell(sh, c, r, raw.startsWith("=") ? autoClose(raw) : raw));
    setEditing(null);
    const next = move ? { c: Math.max(0, Math.min(sheet.cols - 1, c + move.c)), r: Math.max(0, Math.min(sheet.rows - 1, r + move.r)) } : { c, r };
    setSel({ a: next, f: next });
    scrollInto(next);
    gridFocus.current?.focus();
  };
  const autoClose = (f: string) => { let open = 0; let q = false; for (const ch of f) { if (ch === '"') q = !q; else if (!q && ch === "(") open++; else if (!q && ch === ")") open--; } return open > 0 ? f + ")".repeat(open) : f; };

  /** While typing a formula, clicking a cell inserts its reference (dragging extends it to a range). */
  const formulaWantsRef = (e: Editing) => {
    if (!e.text.startsWith("=")) return false;
    const el = editor.current ?? bar.current; const caret = el?.selectionStart ?? e.text.length;
    if (e.refAt) return true;
    return /[=(;,+\-*/^&<>:]\s*$/.test(e.text.slice(0, caret));
  };
  const insertRef = (ref: string, keep: boolean) => {
    setEditing((e) => {
      if (!e) return e;
      const el = editor.current; const caret = el?.selectionStart ?? e.text.length;
      const [s0, s1] = keep && e.refAt ? e.refAt : [caret, caret];
      const text = e.text.slice(0, s0) + ref + e.text.slice(s1);
      window.setTimeout(() => { const x = editor.current; if (x) { x.focus(); x.setSelectionRange(s0 + ref.length, s0 + ref.length); } }, 0);
      return { ...e, text, refAt: [s0, s0 + ref.length] };
    });
  };
  const refStart = useRef<Pos | null>(null);

  // ---------------------------------------------------------------- selection helpers
  const forEachSel = (fn: (sh: Sheet, c: number, r: number) => void) => editSheet((sh) => {
    for (let r = rect.r1; r <= rect.r2; r++) for (let c = rect.c1; c <= rect.c2; c++) fn(sh, c, r);
  });
  const setStyle = (patch: { [K in keyof CellStyle]?: CellStyle[K] | undefined }) => forEachSel((sh, c, r) => {
    const k = addr(c, r); const prev = sh.cells[k] ?? { v: "" };
    const s = { ...prev.s, ...patch } as CellStyle;
    for (const key of Object.keys(s) as (keyof CellStyle)[]) if (s[key] === undefined) delete s[key];
    sh.cells[k] = { ...prev, s };
  });
  const toggle = (key: "b" | "i" | "u" | "strike" | "wrap" | "border") => setStyle({ [key]: !activeCell?.s?.[key] });
  const clearContents = () => forEachSel((sh, c, r) => { const k = addr(c, r); const p = sh.cells[k]; if (!p) return; if (p.s || p.n) sh.cells[k] = { v: "", ...(p.s ? { s: p.s } : {}), ...(p.n ? { n: p.n } : {}) }; else delete sh.cells[k]; });
  const clearFormats = () => forEachSel((sh, c, r) => { const k = addr(c, r); const p = sh.cells[k]; if (p) { if (p.v === "" && !p.n) delete sh.cells[k]; else sh.cells[k] = { v: p.v, ...(p.n ? { n: p.n } : {}) }; } });
  const clearNotes = () => forEachSel((sh, c, r) => { const k = addr(c, r); const p = sh.cells[k]; if (p?.n) { if (p.v === "" && !p.s) delete sh.cells[k]; else sh.cells[k] = { v: p.v, ...(p.s ? { s: p.s } : {}) }; } });

  // ---------------------------------------------------------------- copy / paste / fill
  const copySel = (cut: boolean) => {
    const cells: (Cell | undefined)[][] = []; const lines: string[] = [];
    for (let r = rect.r1; r <= rect.r2; r++) {
      const row: (Cell | undefined)[] = []; const vals: string[] = [];
      for (let c = rect.c1; c <= rect.c2; c++) { const cell = sheet.cells[addr(c, r)]; row.push(cell ? structuredClone(cell) : undefined); vals.push(display(ev.value(si, c, r), cell?.s)); }
      cells.push(row); lines.push(vals.join("\t"));
    }
    const text = lines.join("\n");
    clip.current = { text, cells, origin: { c: rect.c1, r: rect.r1 }, cut };
    void navigator.clipboard?.writeText(text).catch(() => {});
    toast.success(cut ? tx(lang, "Coupé", "Cut") : tx(lang, "Copié", "Copied"));
  };
  const pasteText = (text: string) => {
    const mine = clip.current && clip.current.text === text.replace(/\r/g, "") ? clip.current : null;
    editSheet((sh) => {
      if (mine) {
        const dc = rect.c1 - mine.origin.c, dr = rect.r1 - mine.origin.r;
        if (mine.cut) mine.cells.forEach((row, ri) => row.forEach((_, ci) => { delete sh.cells[addr(mine.origin.c + ci, mine.origin.r + ri)]; }));
        mine.cells.forEach((row, ri) => row.forEach((cell, ci) => {
          const k = addr(rect.c1 + ci, rect.r1 + ri);
          if (!cell) { delete sh.cells[k]; return; }
          sh.cells[k] = { ...cell, v: mine.cut ? cell.v : shiftFormula(cell.v, dc, dr) };
        }));
        sh.rows = Math.max(sh.rows, rect.r1 + mine.cells.length + 10);
      } else {
        const rows = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
        rows.forEach((row, ri) => row.forEach((v, ci) => writeCell(sh, rect.c1 + ci, rect.r1 + ri, v)));
        sh.rows = Math.max(sh.rows, rect.r1 + rows.length + 10);
      }
    });
    if (mine?.cut) clip.current = null;
  };
  const fill = (to: Rect) => editSheet((sh) => {
    const src = rect;
    const h = src.r2 - src.r1 + 1, w = src.c2 - src.c1 + 1;
    // Two or more numbers in a column (or row) continue as a series; anything else repeats with moving references.
    for (let r = to.r1; r <= to.r2; r++) for (let c = to.c1; c <= to.c2; c++) {
      if (r >= src.r1 && r <= src.r2 && c >= src.c1 && c <= src.c2) continue;
      const down = to.r2 > src.r2 || to.r1 < src.r1;
      const sr = down ? src.r1 + (((r - src.r1) % h) + h) % h : r;
      const sc = down ? c : src.c1 + (((c - src.c1) % w) + w) % w;
      const cell = sh.cells[addr(sc, sr)];
      const seq: number[] = [];
      if (down && h > 1) for (let k = src.r1; k <= src.r2; k++) { const v = sh.cells[addr(c, k)]?.v ?? ""; const n = v.startsWith("=") ? null : parseLiteral(v).value; if (typeof n === "number") seq.push(n); }
      if (!down && w > 1) for (let k = src.c1; k <= src.c2; k++) { const v = sh.cells[addr(k, r)]?.v ?? ""; const n = v.startsWith("=") ? null : parseLiteral(v).value; if (typeof n === "number") seq.push(n); }
      const len = down ? h : w;
      if (seq.length === len && len > 1) {
        const step = (seq[len - 1]! - seq[0]!) / (len - 1);
        const k = down ? r - src.r1 : c - src.c1;
        sh.cells[addr(c, r)] = { v: String(Math.round((seq[0]! + step * k) * 1e9) / 1e9), ...(cell?.s ? { s: cell.s } : {}) };
        continue;
      }
      if (!cell) { delete sh.cells[addr(c, r)]; continue; }
      sh.cells[addr(c, r)] = { ...structuredClone(cell), v: shiftFormula(cell.v, c - sc, r - sr) };
    }
  });

  // ---------------------------------------------------------------- rows, columns, sort
  const moveRefs = (w: Workbook, axis: "row" | "col", at: number, delta: number): Workbook => ({
    ...w,
    sheets: w.sheets.map((s, i) => {
      const same = i === si;
      const cells: Record<string, Cell> = {};
      for (const [k, cell] of Object.entries(s.cells)) {
        const p = parseAddr(k)!; let { c, r } = p;
        if (same) {
          if (axis === "row") { if (delta < 0 && r >= at && r < at - delta) continue; if (r >= at) r += delta; }
          else { if (delta < 0 && c >= at && c < at - delta) continue; if (c >= at) c += delta; }
        }
        cells[addr(c, r)] = { ...cell, v: adjustFormula(cell.v, axis, at, delta, same, w.sheets[si]!.name) };
      }
      const colW: Record<number, number> = {};
      for (const [k, v] of Object.entries(s.colW)) { let c = Number(k); if (same && axis === "col") { if (delta < 0 && c >= at && c < at - delta) continue; if (c >= at) c += delta; } colW[c] = v; }
      return { ...s, cells, colW, rows: same && axis === "row" ? Math.max(1, s.rows + delta) : s.rows, cols: same && axis === "col" ? Math.max(1, Math.min(MAX_COLS, s.cols + delta)) : s.cols };
    }),
  });
  const insertRows = (above: boolean) => { const n = rect.r2 - rect.r1 + 1; commit((w) => moveRefs(w, "row", above ? rect.r1 : rect.r2 + 1, n)); };
  const deleteRows = () => { const n = rect.r2 - rect.r1 + 1; commit((w) => moveRefs(w, "row", rect.r1, -n)); };
  const insertCols = (left: boolean) => { const n = rect.c2 - rect.c1 + 1; if (sheet.cols + n > MAX_COLS) return void toast.error(tx(lang, `${MAX_COLS} colonnes au plus.`, `${MAX_COLS} columns at most.`)); commit((w) => moveRefs(w, "col", left ? rect.c1 : rect.c2 + 1, n)); };
  const deleteCols = () => { const n = rect.c2 - rect.c1 + 1; commit((w) => moveRefs(w, "col", rect.c1, -n)); };
  const sort = (asc: boolean) => {
    const used = usedSize(sheet);
    let area: Rect = rect;
    if (rect.r1 === rect.r2) {
      const headerBold = !!sheet.cells[addr(active.c, 0)]?.s?.b;
      area = { c1: 0, c2: used.cols - 1, r1: headerBold ? 1 : 0, r2: used.rows - 1 };
    }
    sortRange(area, active.c, asc);
  };
  const sortRange = (area: Rect, key: number, asc: boolean) => {
    editSheet((sh) => {
      const rows: { r: number; cells: (Cell | undefined)[]; v: unknown }[] = [];
      for (let r = area.r1; r <= area.r2; r++) {
        const cells: (Cell | undefined)[] = [];
        for (let c = area.c1; c <= area.c2; c++) cells.push(sh.cells[addr(c, r)]);
        rows.push({ r, cells, v: ev.value(si, key, r) });
      }
      const rank = (v: unknown) => (v === null || v === "" ? 2 : typeof v === "number" ? 0 : 1);
      rows.sort((x, y) => {
        const a = x.v, b = y.v;
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        const d = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "fr", { numeric: true });
        return asc ? d : -d;
      });
      rows.forEach((row, i) => row.cells.forEach((cell, ci) => {
        const k = addr(area.c1 + ci, area.r1 + i);
        if (cell) sh.cells[k] = { ...cell, v: shiftFormula(cell.v, 0, area.r1 + i - row.r) }; else delete sh.cells[k];
      }));
    });
  };

  // ---------------------------------------------------------------- functions and charts
  const autoSum = (fn = "SOMME") => {
    if (rect.r1 !== rect.r2 || rect.c1 !== rect.c2) {
      editSheet((sh) => { for (let c = rect.c1; c <= rect.c2; c++) writeCell(sh, c, rect.r2 + 1, `=${fn}(${addr(c, rect.r1)}:${addr(c, rect.r2)})`); });
      return;
    }
    let r = active.r - 1;
    while (r >= 0 && typeof ev.value(si, active.c, r) === "number") r--;
    const from = r + 1;
    startEdit(from < active.r ? `=${fn}(${addr(active.c, from)}:${addr(active.c, active.r - 1)})` : `=${fn}(`);
  };
  const insertFunction = (name: string) => { startEdit(`=${name}(`); };
  const addChart = (kind: ChartKind) => {
    const range = rect.r1 === rect.r2 && rect.c1 === rect.c2 ? (() => { const u = usedSize(sheet); return `A1:${addr(Math.min(u.cols - 1, 3), u.rows - 1)}`; })() : rangeText(rect);
    const ch: SheetChart = { id: uid(), kind, range, title: tx(lang, "Graphique", "Chart"), x: (colLeft[rect.c2 + 1] ?? 400) + 24, y: rowTops[rect.r1]!, w: 480, h: 290 };
    const head = ev.value(si, rect.c1 + 1, rect.r1);
    if (typeof head === "string" && head) ch.title = head;
    editSheet((sh) => sh.charts.push(ch));
    setChartSel(ch.id);
  };
  const patchChart = (id: string, patch: Partial<SheetChart>, save: boolean) => {
    if (save) { editSheet((sh) => { const c = sh.charts.find((x) => x.id === id); if (c) Object.assign(c, patch); }); return; }
    setWbRaw((w) => ({ ...w, sheets: w.sheets.map((s, i) => (i === si ? { ...s, charts: s.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : s)) }));
  };
  const chartStart = useRef<Workbook | null>(null);

  // ---------------------------------------------------------------- data tools (filters, rules, lists, merges, summary)
  /** The block around the selection (a single cell expands to the filled area around it). */
  const dataBlock = (): Rect => {
    if (rect.r1 !== rect.r2 || rect.c1 !== rect.c2) return rect;
    const filled = (c: number, r: number) => (sheet.cells[addr(c, r)]?.v ?? "") !== "";
    let { c1, c2, r1, r2 } = { c1: rect.c1, c2: rect.c1, r1: rect.r1, r2: rect.r1 };
    let grew = true;
    while (grew) {
      grew = false;
      if (r1 > 0 && Array.from({ length: c2 - c1 + 1 }, (_, i) => c1 + i).some((c) => filled(c, r1 - 1))) { r1--; grew = true; }
      if (r2 < sheet.rows - 1 && Array.from({ length: c2 - c1 + 1 }, (_, i) => c1 + i).some((c) => filled(c, r2 + 1))) { r2++; grew = true; }
      if (c1 > 0 && Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i).some((r) => filled(c1 - 1, r))) { c1--; grew = true; }
      if (c2 < sheet.cols - 1 && Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i).some((r) => filled(c2 + 1, r))) { c2++; grew = true; }
    }
    return { c1, c2, r1, r2 };
  };
  const toggleFilter = () => {
    if (sheet.filter) { editSheet((sh) => { sh.filter = null; }); return; }
    const b = dataBlock();
    if (b.r2 <= b.r1) return void toast.error(tx(lang, "Sélectionnez un tableau avec une ligne d'en-tête et des données.", "Select a table with a header row and data."));
    editSheet((sh) => { sh.filter = { range: rangeText(b), hide: {} }; });
  };
  const setFilterHide = (c: number, values: string[]) => editSheet((sh) => { if (sh.filter) sh.filter = { ...sh.filter, hide: { ...sh.filter.hide, [c]: values } }; });
  const sortColumn = (c: number, asc: boolean) => {
    const r = filterRect; if (!r) return;
    const save = sel; setSel({ a: { c, r: r.r1 + 1 }, f: { c: r.c2, r: r.r2 } });
    window.setTimeout(() => { sortRange({ c1: r.c1, c2: r.c2, r1: r.r1 + 1, r2: r.r2 }, c, asc); setSel(save); }, 0);
  };
  const toggleMerge = () => {
    const key = rangeText(rect);
    const existing = (sheet.merges ?? []).find((m) => { const r = parseRange(m); return !!r && r.c1 <= rect.c1 && r.c2 >= rect.c1 && r.r1 <= rect.r1 && r.r2 >= rect.r1; });
    if (existing) { editSheet((sh) => { sh.merges = (sh.merges ?? []).filter((m) => m !== existing); }); return; }
    if (rect.c1 === rect.c2 && rect.r1 === rect.r2) return void toast.error(tx(lang, "Sélectionnez plusieurs cellules à fusionner.", "Select several cells to merge."));
    const others: string[] = []; for (let r = rect.r1; r <= rect.r2; r++) for (let c = rect.c1; c <= rect.c2; c++) if ((c !== rect.c1 || r !== rect.r1) && (sheet.cells[addr(c, r)]?.v ?? "") !== "") others.push(addr(c, r));
    const doIt = () => editSheet((sh) => {
      sh.merges = [...(sh.merges ?? []).filter((m) => { const r = parseRange(m); return !r || r.c2 < rect.c1 || r.c1 > rect.c2 || r.r2 < rect.r1 || r.r1 > rect.r2; }), key];
      for (const k of others) delete sh.cells[k];
      const m = sh.cells[addr(rect.c1, rect.r1)] ?? { v: "" }; sh.cells[addr(rect.c1, rect.r1)] = { ...m, s: { ...m.s, align: m.s?.align ?? "center" } };
    });
    if (others.length) void confirmDialog({ title: tx(lang, "Fusionner les cellules ?", "Merge cells?"), description: tx(lang, "Seule la valeur en haut à gauche est gardée.", "Only the top-left value is kept."), confirmLabel: tx(lang, "Fusionner", "Merge") }).then((ok) => { if (ok) doIt(); });
    else doIt();
  };
  // ---- pivot tables (tableaux croisés dynamiques)
  /** Where the pivot reads from: the active pivot's source when editing it, else the data around the selection. */
  const pivotSource = (): { si: number; rect: Rect } | null => {
    const cfg = pivotEdit ? sheet.pivot : undefined;
    if (cfg) {
      const i = wb.sheets.findIndex((x) => x.id === cfg.source); const r = parseRange(cfg.range);
      if (i < 0 || !r) return null;
      return { si: i, rect: blockAround(wb.sheets[i]!, r.c1, r.r1) };
    }
    return { si, rect: dataBlock() };
  };
  const pivotFields = () => {
    const src = pivotSource(); if (!src) return [];
    const sh = wb.sheets[src.si]!; const b = src.rect;
    return Array.from({ length: b.c2 - b.c1 + 1 }, (_, i) => b.c1 + i).map((c) => ({ c, label: display(ev.value(src.si, c, b.r1), sh.cells[addr(c, b.r1)]?.s) || colName(c), num: typeof ev.value(src.si, c, b.r1 + 1) === "number" }));
  };
  const placePivot = (draft: PivotDraft, target: { id: string; name: string } | null, srcOverride?: { si: number; rect: Rect }) => {
    const src = srcOverride ?? pivotSource();
    if (!src) return void toast.error(tx(lang, "La feuille source n'existe plus.", "The source sheet no longer exists."));
    let name = target?.name ?? tx(lang, "Tableau croisé", "Pivot table");
    if (!target) { const base = name; let n = 1; while (wb.sheets.some((x) => x.name === name)) name = `${base} ${++n}`; }
    const cfg = { ...draft, source: wb.sheets[src.si]!.id, range: rangeText(src.rect) };
    const built = buildPivotTable(wb, ev, cfg, lang, { id: target?.id ?? uid(), name });
    if ("error" in built) return void toast.error(built.error);
    if (target) { commit((w) => ({ ...w, sheets: w.sheets.map((x) => (x.id === target.id ? built : x)) })); toast.success(tx(lang, "Tableau croisé mis à jour.", "Pivot table updated.")); }
    else { commit((w) => ({ ...w, sheets: [...w.sheets, built] })); setSi(wb.sheets.length); toast.success(tx(lang, "Tableau croisé créé dans une nouvelle feuille : il suit vos données.", "Pivot table created in a new sheet: it follows your data.")); }
  };
  const refreshPivot = () => {
    const cfg = sheet.pivot; if (!cfg) return;
    const i = wb.sheets.findIndex((x) => x.id === cfg.source); const r = parseRange(cfg.range);
    if (i < 0 || !r) return void toast.error(tx(lang, "La feuille source n'existe plus.", "The source sheet no longer exists."));
    const { source: _s, range: _r, ...draft } = cfg;
    placePivot(draft, { id: sheet.id, name: sheet.name }, { si: i, rect: blockAround(wb.sheets[i]!, r.c1, r.r1) });
  };
  const openPivot = (edit: boolean) => {
    if (tier !== null && tier < 3) return void toast(tx(lang, "Le tableau croisé dynamique fait partie du Tableur avancé (forfait Pro ou Mensuel Pro).", "Pivot tables are part of the advanced spreadsheet (Pro pack or Mensuel Pro)."), { action: { label: tx(lang, "Voir les offres", "See plans"), onClick: () => { window.location.href = "/dashboard/credits"; } } });
    setPivotEdit(edit); setDlg("pivot");
  };
  const activeList = !editing ? listAt(sheet, sel.a.c, sel.a.r) : undefined;
  useEffect(() => { setListOpen(false); }, [sel.a.c, sel.a.r]);

  // ---------------------------------------------------------------- sheets
  const addSheetTab = () => { const name = `Feuille ${wb.sheets.length + 1}`; commit((w) => ({ ...w, sheets: [...w.sheets, newSheet(name)] })); setSi(wb.sheets.length); setSel({ a: { c: 0, r: 0 }, f: { c: 0, r: 0 } }); };
  const renameSheet = async (i: number) => {
    const name = await promptDialog({ title: tx(lang, "Renommer la feuille", "Rename sheet"), input: { label: tx(lang, "Nom", "Name"), defaultValue: wb.sheets[i]!.name, required: true }, confirmLabel: tx(lang, "Renommer", "Rename") });
    const clean = name?.trim().replace(/[\\/?*[\]:!']/g, "").slice(0, 31);
    if (!clean) return;
    if (wb.sheets.some((s, k) => k !== i && s.name.toLowerCase() === clean.toLowerCase())) return void toast.error(tx(lang, "Une feuille porte déjà ce nom.", "A sheet already has this name."));
    commit((w) => ({ ...w, sheets: w.sheets.map((s, k) => (k === i ? { ...s, name: clean } : s)) }));
  };
  const deleteSheet = async (i: number) => {
    if (wb.sheets.length < 2) return;
    if (!(await confirmDialog({ title: tx(lang, `Supprimer « ${wb.sheets[i]!.name} » ?`, `Delete "${wb.sheets[i]!.name}"?`), description: tx(lang, "Les formules qui la citent afficheront #REF!. Ctrl+Z annule.", "Formulas that use it will show #REF!. Ctrl+Z undoes it."), confirmLabel: tx(lang, "Supprimer", "Delete"), tone: "danger" }))) return;
    commit((w) => ({ ...w, sheets: w.sheets.filter((_, k) => k !== i) }));
    setSi((s) => Math.max(0, s >= i ? s - 1 : s));
  };
  const duplicateSheet = (i: number) => {
    const src = wb.sheets[i]!;
    let name = `${src.name} (2)`; let n = 2; while (wb.sheets.some((s) => s.name === name)) name = `${src.name} (${++n})`;
    commit((w) => { const copy = { ...structuredClone(src), id: uid(), name, charts: src.charts.map((c) => ({ ...c, id: uid() })) }; const sheets = [...w.sheets]; sheets.splice(i + 1, 0, copy); return { ...w, sheets }; });
    setSi(i + 1);
  };

  // ---------------------------------------------------------------- import / export
  const openFile = async (file: File) => {
    setBusy(tx(lang, "Ouverture…", "Opening…"));
    try {
      const book = await importFile(file);
      const replace = await confirmDialog({ title: tx(lang, "Ouvrir ce fichier", "Open this file"), description: tx(lang, `« ${file.name} » : ${book.sheets.length} feuille(s). Les ajouter à ce classeur, ou remplacer le classeur ouvert ?`, `"${file.name}": ${book.sheets.length} sheet(s). Add them to this workbook, or replace the open workbook?`), confirmLabel: tx(lang, "Remplacer", "Replace"), cancelLabel: tx(lang, "Ajouter les feuilles", "Add the sheets") });
      if (replace) { commit(book); setSi(0); }
      else { commit((w) => ({ ...w, sheets: [...w.sheets, ...book.sheets.map((s) => ({ ...s, name: w.sheets.some((x) => x.name === s.name) ? `${s.name} (importé)` : s.name }))] })); setSi(wb.sheets.length); }
      setSel({ a: { c: 0, r: 0 }, f: { c: 0, r: 0 } });
      toast.success(tx(lang, "Fichier ouvert.", "File opened."));
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "TOO_BIG" ? tx(lang, "Fichier trop lourd (15 Mo au plus).", "File too large (15 MB max).") : m === "UNSUPPORTED" ? tx(lang, "Format non pris en charge : .xlsx, .csv ou PDF.", "Unsupported format: .xlsx, .csv or PDF.") : tx(lang, "Impossible de lire ce fichier.", "Could not read this file."));
    } finally { setBusy(null); }
  };
  const importPdf = async (file: File) => {
    if (!(await confirmAiCredits("pdf", lang))) return;
    if (file.size > 8 * 1024 * 1024) return void toast.error(tx(lang, "PDF trop lourd (8 Mo au plus).", "PDF too large (8 MB max)."));
    setBusy(tx(lang, "Lecture des tableaux du PDF…", "Reading the PDF tables…"));
    try {
      const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/sheet-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ kind: "pdf", lang, name: file.name, data }) });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { sheets: { name: string; rows: string[][] }[]; credits?: number };
      notifyCreditsChanged();
      const sheets = json.sheets.map((t, i) => sheetFromRows((t.name || `PDF ${i + 1}`).replace(/[\\/?*[\]:!']/g, "").slice(0, 30), t.rows));
      commit((w) => ({ ...w, sheets: [...w.sheets, ...sheets.map((s) => ({ ...s, name: w.sheets.some((x) => x.name === s.name) ? `${s.name} (PDF)` : s.name }))] }));
      setSi(wb.sheets.length);
      toast.success(tx(lang, `${sheets.length} tableau(x) importé(s) du PDF${json.credits ? ` · ${json.credits} crédits utilisés` : ""}. Vérifiez les chiffres.`, `${sheets.length} table(s) imported from the PDF${json.credits ? ` · ${json.credits} credits used` : ""}. Check the figures.`));
    } catch (e) {
      toast.error(e instanceof Error && e.message && e.message.length < 200 ? e.message : tx(lang, "Le PDF n'a pas pu être lu.", "The PDF could not be read."));
    } finally { setBusy(null); }
  };
  const doExportXlsx = async () => { setBusy(tx(lang, "Création du fichier Excel…", "Creating the Excel file…")); try { await exportXlsx(wb); } catch { toast.error(tx(lang, "Export impossible.", "Export failed.")); } finally { setBusy(null); } };
  const toGoogleSheets = async () => {
    await doExportXlsx();
    window.open("https://docs.google.com/spreadsheets/u/0/", "_blank", "noopener");
    toast.info(tx(lang, "Le fichier .xlsx est téléchargé. Dans Google Sheets : Fichier → Importer → Importer le fichier.", "The .xlsx file is downloaded. In Google Sheets: File → Import → Upload."), { duration: 9000 });
  };
  const shareHtmlPage = () => {
    const printable = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${wb.title.replace(/</g, "&lt;")}</title><style>body{margin:0;background:#f4f4f6;font:14px Inter,system-ui,sans-serif;color:#111}main{max-width:1200px;margin:0 auto;padding:24px 14px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;color:#555;margin:24px 0 8px}.wrap{overflow-x:auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px -18px rgba(0,0,0,.35);padding:8px}table{border-collapse:collapse}td{padding:6px 10px;white-space:nowrap;border:1px solid #ececf0}footer{text-align:center;color:#8a8a94;font-size:12px;margin-top:24px}</style></head><body><main><h1>${wb.title.replace(/</g, "&lt;")}</h1>${wb.sheets.map((sh, i) => {
      const { rows, cols } = usedSize(sh);
      let t = `<h2>${sh.name.replace(/</g, "&lt;")}</h2><div class="wrap"><table>`;
      for (let r = 0; r < rows; r++) { t += "<tr>"; for (let c = 0; c < cols; c++) { const cell = sh.cells[addr(c, r)]; const s = cell?.s; const v = ev.value(i, c, r); t += `<td style="${[s?.b ? "font-weight:700" : "", s?.i ? "font-style:italic" : "", s?.color ? `color:${s.color}` : "", s?.bg ? `background:${s.bg}` : "", `text-align:${s?.align ?? (typeof v === "number" ? "right" : "left")}`].filter(Boolean).join(";")}">${display(v, s).replace(/[&<>]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[x]!)}</td>`; } t += "</tr>"; }
      return `${t}</table></div>`;
    }).join("")}<footer>Créé avec TechNova AI Hub</footer></main></body></html>`;
    return printable;
  };

  // ---------------------------------------------------------------- keyboard
  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (mod && k.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (mod && k.toLowerCase() === "s") { e.preventDefault(); quickSave(); return; }
    if (mod && (k.toLowerCase() === "f" || k.toLowerCase() === "h")) { e.preventDefault(); setFind(k.toLowerCase() === "h" ? "replace" : "find"); return; }
    if (mod && k.toLowerCase() === "b") { e.preventDefault(); toggle("b"); return; }
    if (mod && k.toLowerCase() === "i") { e.preventDefault(); toggle("i"); return; }
    if (mod && k.toLowerCase() === "u") { e.preventDefault(); toggle("u"); return; }
    if (mod && k.toLowerCase() === "a") { e.preventDefault(); const u = usedSize(sheet); setSel({ a: { c: 0, r: 0 }, f: { c: u.cols - 1, r: u.rows - 1 } }); return; }
    if (mod && k.toLowerCase() === "d") { e.preventDefault(); if (rect.r2 > rect.r1) { const save = sel; setSel({ a: { c: rect.c1, r: rect.r1 }, f: { c: rect.c2, r: rect.r1 } }); window.setTimeout(() => { fill(rect); setSel(save); }, 0); } return; }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); if (chartSel) { editSheet((sh) => { sh.charts = sh.charts.filter((c) => c.id !== chartSel); }); setChartSel(null); } else clearContents(); return; }
    if (k === "F2") { e.preventDefault(); startEdit(); return; }
    if (k === "Enter") { e.preventDefault(); const n = { c: active.c, r: Math.min(sheet.rows - 1, active.r + (e.shiftKey ? -1 : 1)) }; setSel({ a: n, f: n }); scrollInto(n); return; }
    if (k === "Tab") { e.preventDefault(); const n = { c: Math.max(0, Math.min(sheet.cols - 1, active.c + (e.shiftKey ? -1 : 1))), r: active.r }; setSel({ a: n, f: n }); scrollInto(n); return; }
    const dirs: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const d = dirs[k];
    if (d) {
      e.preventDefault();
      let n = { c: active.c + d[0], r: active.r + d[1] };
      if (mod) { // jump to the edge of the data
        n = { ...active };
        const filled = (p: Pos) => (sheet.cells[addr(p.c, p.r)]?.v ?? "") !== "";
        const step = () => ({ c: n.c + d[0], r: n.r + d[1] });
        const inside = (p: Pos) => p.c >= 0 && p.r >= 0 && p.c < sheet.cols && p.r < sheet.rows;
        const startFilled = filled(n) && inside(step()) && filled(step());
        while (inside(step()) && (startFilled ? filled(step()) : !filled(step()))) n = step();
        if (!startFilled && inside(step())) n = step();
      }
      n = { c: Math.max(0, Math.min(sheet.cols - 1, n.c)), r: Math.max(0, Math.min(sheet.rows - 1, n.r)) };
      while (d[1] !== 0 && hidden.has(n.r) && n.r > 0 && n.r < sheet.rows - 1) n = { ...n, r: n.r + d[1] };
      setSel(e.shiftKey ? { a: sel.a, f: n } : { a: n, f: n });
      scrollInto(n);
      return;
    }
    if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); startEdit(k); }
  };
  useEffect(() => {
    const el = gridFocus.current; if (!el) return;
    const onCopy = (e: ClipboardEvent) => { if (editing) return; e.preventDefault(); copySel(false); };
    const onCut = (e: ClipboardEvent) => { if (editing) return; e.preventDefault(); copySel(true); };
    const onPaste = (e: ClipboardEvent) => { if (editing) return; e.preventDefault(); pasteText(e.clipboardData?.getData("text/plain") ?? ""); };
    el.addEventListener("copy", onCopy); el.addEventListener("cut", onCut); el.addEventListener("paste", onPaste);
    return () => { el.removeEventListener("copy", onCopy); el.removeEventListener("cut", onCut); el.removeEventListener("paste", onPaste); };
  });
  useEffect(() => { gridFocus.current?.focus(); }, [si]);

  // ---------------------------------------------------------------- pointer on the grid
  const onGridDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-sheet-chart]") || t.closest("[data-no-grid]")) return;
    setChartSel(null); setCtx(null);
    const p = posFromPoint(e.clientX, e.clientY);
    if (editing) {
      if (formulaWantsRef(editing) && !(p.c === editing.c && p.r === editing.r)) {
        e.preventDefault(); refStart.current = p; insertRef(addr(p.c, p.r), Boolean(editing.refAt));
        dragging.current = "cells"; scroller.current?.setPointerCapture(e.pointerId); return;
      }
      finishEdit();
    }
    if (t.dataset["fill"]) { dragging.current = "fill"; fillTo.current = null; scroller.current?.setPointerCapture(e.pointerId); return; }
    setSel((s) => (e.shiftKey ? { a: s.a, f: p } : { a: p, f: p }));
    dragging.current = "cells";
    scroller.current?.setPointerCapture(e.pointerId);
    gridFocus.current?.focus();
  };
  const onGridMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = posFromPoint(e.clientX, e.clientY);
    if (dragging.current === "fill") {
      const down = Math.abs(p.r - (p.r > rect.r2 ? rect.r2 : rect.r1)) >= Math.abs(p.c - (p.c > rect.c2 ? rect.c2 : rect.c1));
      const to: Rect = down ? { c1: rect.c1, c2: rect.c2, r1: Math.min(rect.r1, p.r), r2: Math.max(rect.r2, p.r) } : { r1: rect.r1, r2: rect.r2, c1: Math.min(rect.c1, p.c), c2: Math.max(rect.c2, p.c) };
      fillTo.current = p; setFillPreview(to); return;
    }
    if (editing && refStart.current) { const r = rectOf({ a: refStart.current, f: p }); insertRef(rangeText(r), true); return; }
    setSel((s) => (s.f.c === p.c && s.f.r === p.r ? s : { a: s.a, f: p }));
  };
  const onGridUp = () => {
    if (dragging.current === "fill" && fillPreview) { fill(fillPreview); setSel({ a: { c: fillPreview.c1, r: fillPreview.r1 }, f: { c: fillPreview.c2, r: fillPreview.r2 } }); }
    dragging.current = null; refStart.current = null; setFillPreview(null);
  };

  // ---------------------------------------------------------------- column resize
  const resizeCol = (e: React.PointerEvent, c: number) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = colW(c);
    const before = wb;
    const mv = (ev2: PointerEvent) => setWbRaw((w) => ({ ...w, sheets: w.sheets.map((s, i) => (i === si ? { ...s, colW: { ...s.colW, [c]: Math.max(28, Math.min(800, w0 + ev2.clientX - x0)) } } : s)) }));
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); past.current.push(before); future.current = []; };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const autoFit = (c: number) => {
    let w = 48;
    const ctxCanvas = document.createElement("canvas").getContext("2d");
    for (let r = 0; r < Math.min(sheet.rows, 500); r++) {
      const cell = sheet.cells[addr(c, r)]; if (!cell) continue;
      if (ctxCanvas) { ctxCanvas.font = `${cell.s?.b ? "700" : "400"} ${cell.s?.size ?? 13}px Inter, sans-serif`; w = Math.max(w, ctxCanvas.measureText(display(ev.value(si, c, r), cell.s)).width + 20); }
    }
    editSheet((sh) => { sh.colW[c] = Math.min(480, Math.round(w)); });
  };

  // ---------------------------------------------------------------- status
  const stats = useMemo(() => {
    if (rect.r1 === rect.r2 && rect.c1 === rect.c2) return null;
    let sum = 0, n = 0, count = 0;
    for (let r = rect.r1; r <= Math.min(rect.r2, rect.r1 + 5000); r++) for (let c = rect.c1; c <= rect.c2; c++) {
      const v = ev.value(si, c, r);
      if (v !== null && v !== "") count++;
      if (typeof v === "number") { sum += v; n++; }
    }
    return { sum, avg: n ? sum / n : 0, n, count };
  }, [rect.r1, rect.r2, rect.c1, rect.c2, ev, si]);

  // ---------------------------------------------------------------- rendering helpers
  const cellBox = (c: number, r: number) => {
    const m = merges.master.get(addr(c, r));
    const c2 = m ? c + m.cs - 1 : c, r2 = m ? r + m.rs - 1 : r;
    return { left: ROW_HEAD_W + colLeft[c]!, top: HEAD_H + rowTops[r]!, width: colLeft[c2 + 1]! - colLeft[c]!, height: rowTops[r2 + 1]! - rowTops[r]! };
  };
  const renderCell = (c: number, r: number) => {
    const key = addr(c, r);
    if (merges.covered.has(key)) return null;
    const merged = merges.master.get(key);
    const cell = sheet.cells[key]; const s = cell?.s;
    const look = looks(c, r);
    const v = cell ? ev.value(si, c, r) : null;
    const text = cell ? (showFormulas && cell.v.startsWith("=") ? cell.v : display(v, s)) : "";
    const err = isErr(v);
    const align = s?.align ?? (typeof v === "number" ? "right" : typeof v === "boolean" || err ? "center" : "left");
    // Like Excel, left-aligned text runs over the empty cells to its right.
    let width = merged ? colLeft[c + merged.cs]! - colLeft[c]! : colW(c);
    const height = merged ? rowTops[r + merged.rs]! - rowTops[r]! : DEFAULT_ROW_H;
    if (!merged && typeof v === "string" && align === "left" && !s?.wrap && text) {
      for (let k = c + 1; k < Math.min(sheet.cols, c + 12); k++) { const n = sheet.cells[addr(k, r)]; if (n && (n.v !== "" || n.s?.bg)) break; width += colW(k); }
    }
    const spill = !merged && width > colW(c);
    const isFilterHead = !!filterRect && r === filterRect.r1 && c >= filterRect.c1 && c <= filterRect.c2;
    const filtered = isFilterHead && (sheet.filter?.hide[c]?.length ?? 0) > 0;
    const bg = look?.bg ?? s?.bg ?? (merged ? "#ffffff" : undefined);
    return <div key={key} className={cn("sheet-cell absolute overflow-hidden px-1.5", merged ? "flex items-center" : "leading-[26px]", sheet.grid ? "border-b border-r border-[#e5e7eb]" : "border-transparent", s?.wrap ? "whitespace-normal break-words leading-[1.2] py-0.5" : "whitespace-nowrap")}
      style={{ left: colLeft[c]! + ROW_HEAD_W, top: 0, width, height, zIndex: spill || merged ? 1 : undefined, borderRightColor: spill ? "transparent" : undefined, textAlign: align, justifyContent: merged ? (align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start") : undefined, fontWeight: s?.b || look?.b ? 700 : undefined, fontStyle: s?.i ? "italic" : undefined,
        textDecoration: [s?.u ? "underline" : "", s?.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined, color: err && !(showFormulas && cell?.v.startsWith("=")) ? "#dc2626" : look?.color ?? s?.color, background: look?.bar ? `linear-gradient(90deg, ${look.bar.color}66 ${Math.round(look.bar.pct * 100)}%, ${bg ?? "transparent"} ${Math.round(look.bar.pct * 100)}%)` : bg, fontSize: s?.size, fontFamily: s?.font,
        boxShadow: s?.border ? "inset -1px -1px 0 #9ca3af, inset 1px 1px 0 #9ca3af" : undefined, paddingRight: isFilterHead ? 22 : undefined }}
      title={cell?.n ? (text ? `${text}\n\n${tx(lang, "Note", "Note")} : ${cell.n}` : cell.n) : text.length > 18 ? text : undefined}>{text}
      {cell?.n && <span aria-hidden className="pointer-events-none absolute right-0 top-0 size-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-[#dc2626]" />}
      {isFilterHead && <button type="button" data-no-grid aria-label={tx(lang, "Filtrer cette colonne", "Filter this column")} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); setFilterMenu({ c, x: b.left, y: b.bottom + 4 }); }}
        className={cn("absolute right-1 top-1/2 grid size-[18px] -translate-y-1/2 place-items-center rounded border text-[10px]", filtered ? "border-[#1f7a5a] bg-[#1f7a5a] text-white" : "border-zinc-300 bg-white text-zinc-600")}>{filtered ? <Filter className="size-2.5" /> : "▾"}</button>}
    </div>;
  };
  const renderRow = (r: number, sticky = false) => <div key={`r${r}`} className={cn("absolute left-0", sticky && "z-[6]")} style={{ top: sticky ? undefined : HEAD_H + rowTops[r]!, height: DEFAULT_ROW_H, width: ROW_HEAD_W + totalW, ...(sticky ? { position: "sticky", top: HEAD_H } : {}) }}>
    <div className={cn("sticky left-0 z-[5] grid h-full place-items-center border-b border-r border-[#e1e3e8] text-[11px] tabular-nums", r >= rect.r1 && r <= rect.r2 ? "bg-[#dfece6] font-semibold text-[#1f7a5a]" : "bg-[#f6f7f9] text-[#6b7280]")} style={{ width: ROW_HEAD_W }}>{r + 1}</div>
    {Array.from({ length: sheet.cols }, (_, c) => renderCell(c, r))}
  </div>;

  const selBox = (() => { const a = cellBox(rect.c1, rect.r1); const b = cellBox(rect.c2, rect.r2); return { left: a.left, top: a.top, width: b.left + b.width - a.left, height: b.top + b.height - a.top }; })();
  const activeBox = cellBox(sel.a.c, sel.a.r);
  const fmtValue = activeCell?.s?.fmt ?? "general";
  const btn = "tb-btn";
  const on = "tb-on";

  // ---------------------------------------------------------------- ribbon tools
  const locked = tier !== null && tier < 3;
  /** Runs a Pro-only tool, or explains the plan (the server and the menus still check it). */
  const pro = (fn: () => void) => () => {
    if (locked) return void toast(tx(lang, "Cet outil fait partie du Tableur avancé (forfait Pro ou Mensuel Pro).", "This tool is part of the advanced spreadsheet (Pro pack or Mensuel Pro)."), { action: { label: tx(lang, "Voir les offres", "See plans"), onClick: () => { window.location.href = "/dashboard/credits"; } } });
    fn();
  };
  const goTo = (m: { s: number; c: number; r: number }) => { if (m.s !== si) setSi(m.s); const p = { c: m.c, r: m.r }; setSel({ a: p, f: p }); window.setTimeout(() => scrollInto(p), m.s !== si ? 80 : 0); };
  const findNext = (o: FindOpts, back: boolean) => {
    const list = findMatches(wb, ev, si, o);
    if (!list.length) return tx(lang, "Aucun résultat.", "No results.");
    const i = stepMatch(list, { s: si, c: active.c, r: active.r }, back);
    goTo(list[i]!);
    return tx(lang, `Résultat ${i + 1} sur ${list.length}`, `Result ${i + 1} of ${list.length}`);
  };
  const replaceOne = (o: FindOpts) => {
    const cell = sheet.cells[addr(active.c, active.r)];
    const next = cell ? replaceIn(cell.v, o) : null;
    if (next !== null) editSheet((sh) => writeCell(sh, active.c, active.r, next));
    return findNext(o, false);
  };
  const replaceAll = (o: FindOpts) => {
    const list = findMatches(wb, ev, si, { ...o, formulas: true });
    let n = 0;
    commit((w) => ({ ...w, sheets: w.sheets.map((sh, i) => {
      const mine = list.filter((m) => m.s === i); if (!mine.length) return sh;
      const copy = structuredClone(sh);
      for (const m of mine) { const k = addr(m.c, m.r); const cell = copy.cells[k]; const v = cell ? replaceIn(cell.v, o) : null; if (cell && v !== null) { copy.cells[k] = { ...cell, v }; n++; } }
      return copy;
    }) }));
    return tx(lang, `${n} remplacement${n > 1 ? "s" : ""}.`, `${n} replacement${n === 1 ? "" : "s"}.`);
  };
  const removeDuplicates = () => {
    const b = dataBlock();
    if (b.r2 <= b.r1) return void toast.error(tx(lang, "Sélectionnez un tableau avec une ligne d'en-têtes.", "Select a table with a header row."));
    const { keep, removed } = duplicateRows(ev, si, b);
    if (!removed) return void toast.success(tx(lang, `Aucun doublon dans ${rangeText(b)}.`, `No duplicates in ${rangeText(b)}.`));
    void confirmDialog({ title: tx(lang, "Supprimer les doublons ?", "Remove duplicates?"), description: tx(lang, `${removed} ligne${removed > 1 ? "s" : ""} identique${removed > 1 ? "s" : ""} à une ligne précédente dans ${rangeText(b)} (la première ligne est l'en-tête). ${keep.length} ligne${keep.length > 1 ? "s" : ""} unique${keep.length > 1 ? "s" : ""} restent. Ctrl+Z pour annuler.`, `${removed} row(s) identical to an earlier row in ${rangeText(b)} (first row = headers). ${keep.length} unique row(s) remain. Ctrl+Z to undo.`), confirmLabel: tx(lang, "Supprimer", "Remove"), tone: "danger" })
      .then((ok) => { if (ok) { editSheet((sh) => applyDedupe(sh, b, keep)); toast.success(tx(lang, `${removed} doublon${removed > 1 ? "s" : ""} supprimé${removed > 1 ? "s" : ""}.`, `${removed} duplicate(s) removed.`)); } });
  };
  const editNote = async () => {
    const k = addr(active.c, active.r); const cur = sheet.cells[k]?.n ?? "";
    const t = await promptDialog({ title: tx(lang, `Note de la cellule ${k}`, `Note on cell ${k}`), description: tx(lang, "Une note s'affiche au survol de la cellule (triangle rouge) et part dans l'export Excel.", "A note shows when hovering the cell (red triangle) and goes into the Excel export."), input: { label: tx(lang, "Note", "Note"), defaultValue: cur }, confirmLabel: tx(lang, "Enregistrer", "Save") });
    if (t === null) return;
    editSheet((sh) => { const prev = sh.cells[k] ?? { v: "" }; const n = t.trim().slice(0, 1000); const { n: _old, ...rest } = prev; if (n) sh.cells[k] = { ...rest, n }; else if (rest.v === "" && !rest.s) delete sh.cells[k]; else sh.cells[k] = rest; });
  };
  const insertToday = () => { const d = new Date(); editSheet((sh) => writeCell(sh, active.c, active.r, `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`)); };
  const errors = useMemo(() => errorCells(sheet, ev, si), [sheet, ev, si]);
  const nextError = () => {
    if (!errors.length) return void toast.success(tx(lang, "Aucune erreur de formule dans cette feuille.", "No formula errors in this sheet."));
    const i = stepMatch(errors.map((e) => ({ s: si, ...e })), { s: si, c: active.c, r: active.r }, false);
    goTo({ s: si, ...errors[i]! });
    const v = ev.value(si, errors[i]!.c, errors[i]!.r);
    toast(tx(lang, `Erreur ${i + 1} sur ${errors.length} : ${addr(errors[i]!.c, errors[i]!.r)} affiche ${isErr(v) ? v.err : ""}`, `Error ${i + 1} of ${errors.length}: ${addr(errors[i]!.c, errors[i]!.r)} shows ${isErr(v) ? v.err : ""}`));
  };
  const showStats = () => {
    const st = workbookStats(wb);
    void confirmDialog({ title: tx(lang, "Statistiques du classeur", "Workbook statistics"), description: tx(lang, `${st.sheets} feuille(s) · ${st.cells} cellule(s) remplie(s) · ${st.formulas} formule(s) · ${st.notes} note(s) · ${st.charts} graphique(s) · ${st.pivots} tableau(x) croisé(s) dynamique(s)`, `${st.sheets} sheet(s) · ${st.cells} filled cell(s) · ${st.formulas} formula(s) · ${st.notes} note(s) · ${st.charts} chart(s) · ${st.pivots} pivot table(s)`), confirmLabel: "OK" });
  };
  const toggleFullscreen = () => { const el = rootRef.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.().catch(() => {}); };
  const pasteFromClipboard = async () => { try { pasteText(await navigator.clipboard.readText()); } catch { toast(tx(lang, "Utilisez Ctrl+V pour coller.", "Use Ctrl+V to paste.")); } };
  const fitAll = () => { const u = usedSize(sheet); for (let c = 0; c < Math.max(1, u.cols); c++) autoFit(c); };
  const categories: { id: FnInfo["cat"]; fr: string; en: string }[] = [
    { id: "math", fr: "Maths", en: "Math" }, { id: "stat", fr: "Statistiques", en: "Statistics" }, { id: "logic", fr: "Logique", en: "Logical" },
    { id: "lookup", fr: "Recherche", en: "Lookup" }, { id: "text", fr: "Texte", en: "Text" }, { id: "date", fr: "Date et heure", en: "Date & time" }, { id: "info", fr: "Informations", en: "Information" },
  ];
  const fnList = (cat: FnInfo["cat"], close: () => void) => FUNCTIONS.filter((f) => f.cat === cat).map((f) => <MenuItem key={f.en} onClick={() => { close(); insertFunction(fnName(f, lang)); }} hint={lang === "fr" ? f.fr_ : f.en_}><span className="font-mono font-semibold">{fnName(f, lang)}</span></MenuItem>);
  const sumMenu = (close: () => void) => ([["SOMME", "SUM", tx(lang, "Somme", "Sum")], ["MOYENNE", "AVERAGE", tx(lang, "Moyenne", "Average")], ["NB", "COUNT", tx(lang, "Nombre", "Count")], ["MAX", "MAX", "Max"], ["MIN", "MIN", "Min"]] as const)
    .map(([fr, en, l]) => <MenuItem key={fr} icon={<Sigma className="size-4" />} onClick={() => { close(); autoSum(lang === "fr" ? fr : en); }} hint={`=${lang === "fr" ? fr : en}(…)`}>{l}</MenuItem>);
  const TABS: [RibbonTab, string, string][] = [["file", "Fichier", "File"], ["home", "Accueil", "Home"], ["insert", "Insertion", "Insert"], ["layout", "Mise en page", "Page layout"], ["formulas", "Formules", "Formulas"], ["data", "Données", "Data"], ["review", "Révision", "Review"], ["view", "Affichage", "View"]];
  const driveIcon = <svg viewBox="0 0 87.3 78" className="size-5"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" /><path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 0 0 0 53h27.5z" fill="#00ac47" /><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" /><path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" /><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" /><path d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" /></svg>;
  const I = "size-5";

  return <div ref={rootRef} className="flex h-full min-h-0 flex-col bg-[#f8f9fb] text-[13px] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <style>{`.tb-btn{display:inline-flex;height:32px;min-width:32px;align-items:center;justify-content:center;border-radius:8px;color:inherit;transition:background .15s}.tb-btn:hover{background:rgba(0,0,0,.06)}.dark .tb-btn:hover{background:rgba(255,255,255,.08)}.tb-btn:disabled{opacity:.35}.tb-on{background:#dcebe4!important;color:#155e45}.tb-big{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:58px;min-width:58px;max-width:92px;padding:4px 7px;border-radius:10px;font-size:11px;line-height:1.15;text-align:center;color:inherit;transition:background .15s}.tb-big:hover{background:rgba(0,0,0,.06)}.dark .tb-big:hover{background:rgba(255,255,255,.08)}.ribbon-scroll{scrollbar-width:thin}.sheet-grid ::selection{background:transparent}`}</style>
    {/* Title + main actions */}
    <div className="flex items-center gap-1.5 border-b border-border bg-background px-2 py-2 sm:gap-2 sm:px-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1f7a5a] text-white max-sm:hidden"><FileSpreadsheet className="size-4.5" /></span>
      <input aria-label={tx(lang, "Titre du classeur", "Workbook title")} value={wb.title} onChange={(e) => setWbRaw((w) => ({ ...w, title: e.target.value.slice(0, 80) }))}
        className="min-w-0 max-w-[340px] flex-1 rounded-lg max-sm:text-[13.5px] bg-transparent px-2 py-1 text-[15px] font-semibold outline-none hover:bg-secondary focus:bg-secondary" />
      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" onClick={quickSave} title="Ctrl+S" aria-label={tx(lang, "Enregistrer dans un projet", "Save to a project")} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-semibold hover:bg-secondary"><Save className="size-3.5" /><span className="max-md:hidden">{savedRef ? tx(lang, "Enregistrer", "Save") : tx(lang, "Enregistrer dans un projet", "Save to a project")}</span></button>
        <button type="button" onClick={() => setAssistant((a) => !a)} aria-pressed={assistant}
          className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition", assistant ? "bg-[#1f7a5a] text-white" : "bg-gradient-to-r from-[#1f7a5a] to-[#2b9b74] text-white hover:brightness-110")}>
          <Sparkles className="size-3.5" /><span className="max-sm:hidden">{tx(lang, "Assistant IA", "AI assistant")}</span><span className="sm:hidden">IA</span>
        </button>
        <button type="button" onClick={onClose} aria-label={tx(lang, "Fermer", "Close")} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-4" /></button>
      </div>
      <input ref={fileInput} type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
      <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importPdf(f); }} />
    </div>

    {/* Ribbon: Excel-like tabs (quick undo / redo on the left) */}
    <div className="border-b border-border bg-background">
      <div className="ribbon-scroll flex items-center gap-0.5 overflow-x-auto px-2 pt-1">
        <button type="button" className={btn} title="Ctrl+Z" aria-label={tx(lang, "Annuler", "Undo")} onClick={undo} disabled={!past.current.length}><Undo2 className="size-4" /></button>
        <button type="button" className={btn} title="Ctrl+Y" aria-label={tx(lang, "Rétablir", "Redo")} onClick={redo} disabled={!future.current.length}><Redo2 className="size-4" /></button>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <div role="tablist" aria-label={tx(lang, "Onglets du ruban", "Ribbon tabs")} className="flex shrink-0 items-end gap-0.5">
          {TABS.map(([id, fr, en]) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("relative h-8 shrink-0 rounded-t-lg px-3 text-[12.5px] font-medium transition", id === "file" ? "bg-[#1f7a5a] text-white hover:bg-[#196649]" : tab === id ? "text-[#1f7a5a]" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              tab === id && id !== "file" && "after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[#1f7a5a]", tab === id && id === "file" && "ring-2 ring-[#1f7a5a]/30")}>{lang === "fr" ? fr : en}</button>)}
        </div>
        {busy && <span className="ml-auto inline-flex shrink-0 items-center gap-2 pr-2 text-[12px] text-muted-foreground"><span className="size-3 animate-spin rounded-full border-2 border-[#1f7a5a] border-t-transparent" />{busy}</span>}
      </div>
      <div className="ribbon-scroll flex items-stretch overflow-x-auto border-t border-border/70 px-1 py-0.5">
        {tab === "file" && <>
          <Group label={tx(lang, "Ouvrir", "Open")}>
            <Big icon={<FileSpreadsheet className={I} />} label={tx(lang, "Excel ou CSV", "Excel or CSV")} onClick={() => fileInput.current?.click()} />
            <Big icon={<FileUp className={I} />} label={tx(lang, "Tableaux d'un PDF", "Tables from PDF")} onClick={() => pdfInput.current?.click()} />
            <Big icon={driveIcon} label="Google Drive" onClick={() => setDriveOpen(true)} />
          </Group>
          <Group label={tx(lang, "Nouveau", "New")}><Big icon={<Plus className={I} />} label={tx(lang, "Nouvelle feuille", "New sheet")} onClick={addSheetTab} /></Group>
          <Group label={tx(lang, "Enregistrer", "Save")}><Big icon={<Save className={I} />} label={savedRef ? tx(lang, "Enregistrer", "Save") : tx(lang, "Dans un projet", "To a project")} onClick={quickSave} title="Ctrl+S" /></Group>
          <Group label={tx(lang, "Exporter", "Export")}>
            <Big icon={<FileSpreadsheet className={cn(I, "text-[#1f7a5a]")} />} label="Excel (.xlsx)" onClick={() => void doExportXlsx()} />
            <Big icon={<Table2 className={I} />} label="CSV" onClick={() => exportCsv(wb, si)} />
            <Big icon={<ExternalLink className={I} />} label="Google Sheets" onClick={() => void toGoogleSheets()} />
          </Group>
          <Group label={tx(lang, "Imprimer · PDF", "Print · PDF")}>
            <Big icon={<Printer className={I} />} label={tx(lang, "Feuille active", "Active sheet")} onClick={() => printWorkbook(wb, si, orient)} />
            <Big icon={<Printer className={I} />} label={tx(lang, "Tout le classeur", "Whole workbook")} onClick={() => printWorkbook(wb, undefined, orient)} />
          </Group>
          <Group label={tx(lang, "Partager", "Share")}><Big icon={<Share2 className={I} />} label={tx(lang, "Publier (lecture seule)", "Publish (read-only)")} onClick={() => setPublishOpen(true)} /></Group>
        </>}

        {tab === "home" && <>
          <Group label={tx(lang, "Presse-papiers", "Clipboard")}>
            <Big icon={<ClipboardPaste className={I} />} label={tx(lang, "Coller", "Paste")} onClick={() => void pasteFromClipboard()} title="Ctrl+V" />
            <div className="flex flex-col gap-0.5">
              <button type="button" className={cn(btn, "w-auto justify-start gap-1.5 px-2 text-[11.5px]")} onClick={() => copySel(true)} title="Ctrl+X"><Scissors className="size-3.5" />{tx(lang, "Couper", "Cut")}</button>
              <button type="button" className={cn(btn, "w-auto justify-start gap-1.5 px-2 text-[11.5px]")} onClick={() => copySel(false)} title="Ctrl+C"><Copy className="size-3.5" />{tx(lang, "Copier", "Copy")}</button>
            </div>
          </Group>
          <Group label={tx(lang, "Police", "Font")}>
            <select aria-label={tx(lang, "Taille", "Size")} value={String(activeCell?.s?.size ?? 13)} onChange={(e) => setStyle({ size: Number(e.target.value) === 13 ? undefined : Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
              {[10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button type="button" className={cn(btn, activeCell?.s?.b && on)} title="Ctrl+B" aria-label={tx(lang, "Gras", "Bold")} onClick={() => toggle("b")}><Bold className="size-4" /></button>
            <button type="button" className={cn(btn, activeCell?.s?.i && on)} title="Ctrl+I" aria-label={tx(lang, "Italique", "Italic")} onClick={() => toggle("i")}><Italic className="size-4" /></button>
            <button type="button" className={cn(btn, activeCell?.s?.u && on)} title="Ctrl+U" aria-label={tx(lang, "Souligné", "Underline")} onClick={() => toggle("u")}><Underline className="size-4" /></button>
            <button type="button" className={cn(btn, activeCell?.s?.strike && on)} aria-label={tx(lang, "Barré", "Strikethrough")} title={tx(lang, "Barré", "Strikethrough")} onClick={() => toggle("strike")}><Strikethrough className="size-4" /></button>
            <ColorMenu label={tx(lang, "Couleur du texte", "Text colour")} icon={<span className="text-[14px] font-bold leading-none">A</span>} value={activeCell?.s?.color} onPick={(c) => setStyle({ color: c })} allowNone />
            <ColorMenu label={tx(lang, "Couleur de remplissage", "Fill colour")} icon={<PaintBucket className="size-4" />} value={activeCell?.s?.bg} onPick={(c) => setStyle({ bg: c })} allowNone />
            <button type="button" className={cn(btn, activeCell?.s?.border && on)} aria-label={tx(lang, "Bordures", "Borders")} title={tx(lang, "Bordures", "Borders")} onClick={() => toggle("border")}><Square className="size-4" /></button>
          </Group>
          <Group label={tx(lang, "Alignement", "Alignment")}>
            {([["left", AlignLeft, tx(lang, "Gauche", "Left")], ["center", AlignCenter, tx(lang, "Centrer", "Centre")], ["right", AlignRight, tx(lang, "Droite", "Right")]] as const).map(([a, Icon, l]) =>
              <button key={a} type="button" className={cn(btn, activeCell?.s?.align === a && on)} aria-label={l} title={l} onClick={() => setStyle({ align: activeCell?.s?.align === a ? undefined : a })}><Icon className="size-4" /></button>)}
            <button type="button" className={cn(btn, activeCell?.s?.wrap && on)} aria-label={tx(lang, "Renvoyer à la ligne", "Wrap text")} title={tx(lang, "Renvoyer à la ligne", "Wrap text")} onClick={() => toggle("wrap")}><WrapText className="size-4" /></button>
            <Big icon={<Merge className={I} />} label={tx(lang, "Fusionner", "Merge")} lock={locked} onClick={pro(toggleMerge)} />
          </Group>
          <Group label={tx(lang, "Nombre", "Number")}>
            <select aria-label={tx(lang, "Format des nombres", "Number format")} value={fmtValue} onChange={(e) => setStyle({ fmt: e.target.value === "general" ? undefined : e.target.value as NumFmt })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
              {FORMATS.map(([f, fr, en]) => <option key={f} value={f}>{lang === "fr" ? fr : en}</option>)}
            </select>
            <button type="button" className={btn} aria-label={tx(lang, "Moins de décimales", "Fewer decimals")} title={tx(lang, "Moins de décimales", "Fewer decimals")} onClick={() => setStyle({ dec: Math.max(0, (activeCell?.s?.dec ?? 2) - 1) })}><span className="text-[11px] font-semibold">,0</span></button>
            <button type="button" className={btn} aria-label={tx(lang, "Plus de décimales", "More decimals")} title={tx(lang, "Plus de décimales", "More decimals")} onClick={() => setStyle({ dec: Math.min(6, (activeCell?.s?.dec ?? 0) + 1) })}><span className="text-[11px] font-semibold">,00</span></button>
          </Group>
          <Group label={tx(lang, "Styles", "Styles")}><Big icon={<Paintbrush className={I} />} label={tx(lang, "Mise en forme conditionnelle", "Conditional formatting")} lock={locked} onClick={pro(() => setDlg("cond"))} /></Group>
          <Group label={tx(lang, "Cellules", "Cells")}>
            <Menu big label={tx(lang, "Insérer", "Insert")} icon={<Plus className={I} />}>{(close) => <>
              <MenuItem icon={<Plus className="size-4" />} onClick={() => { close(); insertRows(true); }}>{tx(lang, "Ligne au-dessus", "Row above")}</MenuItem>
              <MenuItem icon={<Plus className="size-4" />} onClick={() => { close(); insertRows(false); }}>{tx(lang, "Ligne en dessous", "Row below")}</MenuItem>
              <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); insertCols(true); }}>{tx(lang, "Colonne à gauche", "Column left")}</MenuItem>
              <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); insertCols(false); }}>{tx(lang, "Colonne à droite", "Column right")}</MenuItem>
              <MenuItem icon={<Plus className="size-4" />} onClick={() => { close(); addSheetTab(); }}>{tx(lang, "Nouvelle feuille", "New sheet")}</MenuItem>
            </>}</Menu>
            <Menu big label={tx(lang, "Supprimer", "Delete")} icon={<Minus className={I} />}>{(close) => <>
              <MenuItem icon={<Minus className="size-4" />} onClick={() => { close(); deleteRows(); }}>{tx(lang, "Ligne(s)", "Row(s)")}</MenuItem>
              <MenuItem icon={<Minus className="size-4" />} onClick={() => { close(); deleteCols(); }}>{tx(lang, "Colonne(s)", "Column(s)")}</MenuItem>
            </>}</Menu>
            <Menu big label="Format" icon={<Rows3 className={I} />}>{(close) => <>
              <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); for (let c = rect.c1; c <= rect.c2; c++) autoFit(c); }}>{tx(lang, "Ajuster la largeur au contenu", "Fit column width")}</MenuItem>
              <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); fitAll(); }}>{tx(lang, "Ajuster toutes les colonnes", "Fit every column")}</MenuItem>
              <MenuItem icon={<Eraser className="size-4" />} onClick={() => { close(); clearFormats(); }}>{tx(lang, "Effacer la mise en forme", "Clear formatting")}</MenuItem>
            </>}</Menu>
          </Group>
          <Group label={tx(lang, "Édition", "Editing")}>
            <Menu big label={tx(lang, "Somme auto", "AutoSum")} icon={<Sigma className={I} />}>{sumMenu}</Menu>
            <Menu big label={tx(lang, "Trier et filtrer", "Sort & filter")} icon={<ArrowDownAZ className={I} />}>{(close) => <>
              <MenuItem icon={<ArrowDownAZ className="size-4" />} onClick={() => { close(); sort(true); }}>{tx(lang, "Trier de A à Z", "Sort A to Z")}</MenuItem>
              <MenuItem icon={<ArrowUpAZ className="size-4" />} onClick={() => { close(); sort(false); }}>{tx(lang, "Trier de Z à A", "Sort Z to A")}</MenuItem>
              <MenuItem icon={<Filter className="size-4" />} onClick={() => { close(); pro(toggleFilter)(); }} hint={locked ? tx(lang, "Forfait Pro", "Pro plan") : undefined}>{sheet.filter ? tx(lang, "Retirer le filtre", "Remove the filter") : tx(lang, "Filtrer", "Filter")}</MenuItem>
            </>}</Menu>
            <Big icon={<Search className={I} />} label={tx(lang, "Rechercher", "Find")} onClick={() => setFind("find")} title="Ctrl+F · Ctrl+H" />
            <Menu big label={tx(lang, "Effacer", "Clear")} icon={<Eraser className={I} />}>{(close) => <>
              <MenuItem icon={<Eraser className="size-4" />} onClick={() => { close(); clearContents(); }}>{tx(lang, "Le contenu", "Contents")}</MenuItem>
              <MenuItem icon={<Eraser className="size-4" />} onClick={() => { close(); clearFormats(); }}>{tx(lang, "La mise en forme", "Formatting")}</MenuItem>
              <MenuItem icon={<StickyNote className="size-4" />} onClick={() => { close(); clearNotes(); }}>{tx(lang, "Les notes", "Notes")}</MenuItem>
              <MenuItem icon={<Trash2 className="size-4" />} onClick={() => { close(); clearContents(); clearFormats(); clearNotes(); }}>{tx(lang, "Tout", "All")}</MenuItem>
            </>}</Menu>
          </Group>
        </>}

        {tab === "insert" && <>
          <Group label={tx(lang, "Tableaux", "Tables")}><Big icon={<Table2 className={I} />} label={tx(lang, "Tableau croisé dynamique", "Pivot table")} lock={locked} onClick={() => openPivot(false)} /></Group>
          <Group label={tx(lang, "Graphiques (sélectionnez d'abord les données)", "Charts (select the data first)")}>
            <Big icon={<BarChart3 className={I} />} label={tx(lang, "Histogramme", "Column")} onClick={() => addChart("bar")} />
            <Big icon={<LineIcon className={I} />} label={tx(lang, "Courbes", "Line")} onClick={() => addChart("line")} />
            <Big icon={<AreaIcon className={I} />} label={tx(lang, "Aires", "Area")} onClick={() => addChart("area")} />
            <Big icon={<PieIcon className={I} />} label={tx(lang, "Secteurs", "Pie")} onClick={() => addChart("pie")} />
          </Group>
          <Group label={tx(lang, "Éléments", "Items")}>
            <Big icon={<FunctionSquare className={I} />} label={tx(lang, "Fonction", "Function")} onClick={() => startEdit("=")} />
            <Big icon={<StickyNote className={I} />} label={tx(lang, "Note", "Note")} onClick={() => void editNote()} />
            <Big icon={<CalendarDays className={I} />} label={tx(lang, "Date du jour", "Today's date")} onClick={insertToday} />
            <Big icon={<ListChecks className={I} />} label={tx(lang, "Liste déroulante", "Dropdown")} lock={locked} onClick={pro(() => setDlg("list"))} />
          </Group>
          <Group label={tx(lang, "Feuilles", "Sheets")}><Big icon={<Plus className={I} />} label={tx(lang, "Nouvelle feuille", "New sheet")} onClick={addSheetTab} /></Group>
        </>}

        {tab === "layout" && <>
          <Group label={tx(lang, "Impression", "Printing")}>
            <Menu big label={orient === "auto" ? tx(lang, "Orientation auto", "Auto orientation") : orient === "portrait" ? tx(lang, "Portrait", "Portrait") : tx(lang, "Paysage", "Landscape")} icon={<FileX2 className={cn(I, orient === "landscape" && "rotate-90")} />}>{(close) => <>
              {([["auto", tx(lang, "Automatique (selon la largeur)", "Automatic (by width)")], ["portrait", tx(lang, "Portrait", "Portrait")], ["landscape", tx(lang, "Paysage", "Landscape")]] as const).map(([o, l]) => <MenuItem key={o} onClick={() => { close(); setOrient(o); }} hint={orient === o ? tx(lang, "Choisi", "Selected") : undefined}>{l}</MenuItem>)}
            </>}</Menu>
            <Big icon={<Printer className={I} />} label={tx(lang, "Imprimer la feuille", "Print sheet")} onClick={() => printWorkbook(wb, si, orient)} />
            <Big icon={<Printer className={I} />} label={tx(lang, "Imprimer le classeur", "Print workbook")} onClick={() => printWorkbook(wb, undefined, orient)} />
          </Group>
          <Group label={tx(lang, "Feuille", "Sheet")}>
            <Big icon={<Grid3x3 className={I} />} label={tx(lang, "Quadrillage", "Gridlines")} active={sheet.grid} onClick={() => editSheet((sh) => { sh.grid = !sh.grid; })} />
            <Big icon={<Columns3 className={I} />} label={tx(lang, "Ajuster les colonnes", "Fit columns")} onClick={fitAll} />
          </Group>
        </>}

        {tab === "formulas" && <>
          <Group label={tx(lang, "Bibliothèque de fonctions", "Function library")}>
            <Big icon={<FunctionSquare className={I} />} label={tx(lang, "Insérer une fonction", "Insert function")} onClick={() => startEdit("=")} title={tx(lang, "Tapez = dans une cellule : la liste des fonctions s'affiche", "Type = in a cell: the function list appears")} />
            <Menu big label={tx(lang, "Somme auto", "AutoSum")} icon={<Sigma className={I} />}>{sumMenu}</Menu>
            {categories.map((cat) => <Menu key={cat.id} big wide label={cat[lang]} icon={<FunctionSquare className={cn(I, "opacity-70")} />}>{(close) => fnList(cat.id, close)}</Menu>)}
          </Group>
          <Group label={tx(lang, "Vérification", "Auditing")}>
            <Big icon={<Eye className={I} />} label={tx(lang, "Afficher les formules", "Show formulas")} active={showFormulas} onClick={() => setShowFormulas((v) => !v)} />
            <Big icon={<AlertTriangle className={cn(I, errors.length ? "text-[#dc2626]" : "")} />} label={errors.length ? tx(lang, `Erreurs (${errors.length})`, `Errors (${errors.length})`) : tx(lang, "Vérifier les erreurs", "Check errors")} onClick={nextError} />
          </Group>
        </>}

        {tab === "data" && <>
          <Group label={tx(lang, "Récupérer des données", "Get data")}>
            <Big icon={<FileSpreadsheet className={I} />} label={tx(lang, "Excel ou CSV", "Excel or CSV")} onClick={() => fileInput.current?.click()} />
            <Big icon={<FileUp className={I} />} label={tx(lang, "PDF", "PDF")} onClick={() => pdfInput.current?.click()} />
            <Big icon={driveIcon} label="Google Drive" onClick={() => setDriveOpen(true)} />
          </Group>
          <Group label={tx(lang, "Trier et filtrer", "Sort & filter")}>
            <Big icon={<ArrowDownAZ className={I} />} label={tx(lang, "De A à Z", "A to Z")} onClick={() => sort(true)} />
            <Big icon={<ArrowUpAZ className={I} />} label={tx(lang, "De Z à A", "Z to A")} onClick={() => sort(false)} />
            <Big icon={<Filter className={I} />} label={sheet.filter ? tx(lang, "Retirer le filtre", "Remove filter") : tx(lang, "Filtrer", "Filter")} active={!!sheet.filter} lock={locked} onClick={pro(toggleFilter)} />
          </Group>
          <Group label={tx(lang, "Outils de données", "Data tools")}>
            <Big icon={<Copy className={I} />} label={tx(lang, "Supprimer les doublons", "Remove duplicates")} onClick={removeDuplicates} />
            <Big icon={<ListChecks className={I} />} label={tx(lang, "Liste déroulante", "Dropdown list")} lock={locked} onClick={pro(() => setDlg("list"))} />
            <Big icon={<Paintbrush className={I} />} label={tx(lang, "Mise en forme conditionnelle", "Conditional formatting")} lock={locked} onClick={pro(() => setDlg("cond"))} />
            {((sheet.cond?.length ?? 0) > 0 || (sheet.lists?.length ?? 0) > 0) && <Big icon={<Eraser className={I} />} label={tx(lang, "Effacer règles et listes", "Clear rules & lists")} onClick={() => editSheet((sh) => { sh.cond = []; sh.lists = []; })} />}
          </Group>
          <Group label={tx(lang, "Analyse", "Analysis")}>
            <Big icon={<Table2 className={I} />} label={tx(lang, "Tableau croisé dynamique", "Pivot table")} lock={locked} onClick={() => openPivot(false)} />
            <Big icon={<Sparkles className={I} />} label={tx(lang, "Assistant IA", "AI assistant")} active={assistant} onClick={() => setAssistant((a) => !a)} />
          </Group>
        </>}

        {tab === "review" && <>
          <Group label={tx(lang, "Recherche", "Search")}>
            <Big icon={<Search className={I} />} label={tx(lang, "Rechercher", "Find")} onClick={() => setFind("find")} title="Ctrl+F" />
            <Big icon={<RefreshCw className={I} />} label={tx(lang, "Remplacer", "Replace")} onClick={() => setFind("replace")} title="Ctrl+H" />
          </Group>
          <Group label={tx(lang, "Notes", "Notes")}>
            <Big icon={<StickyNote className={I} />} label={activeCell?.n ? tx(lang, "Modifier la note", "Edit note") : tx(lang, "Nouvelle note", "New note")} onClick={() => void editNote()} />
            <Big icon={<Trash2 className={I} />} label={tx(lang, "Supprimer les notes", "Delete notes")} onClick={clearNotes} title={tx(lang, "Notes des cellules sélectionnées", "Notes of the selected cells")} />
          </Group>
          <Group label={tx(lang, "Vérification", "Proofing")}>
            <Big icon={<AlertTriangle className={cn(I, errors.length ? "text-[#dc2626]" : "")} />} label={errors.length ? tx(lang, `Erreurs (${errors.length})`, `Errors (${errors.length})`) : tx(lang, "Vérifier les erreurs", "Check errors")} onClick={nextError} />
            <Big icon={<Info className={I} />} label={tx(lang, "Statistiques", "Statistics")} onClick={showStats} />
          </Group>
        </>}

        {tab === "view" && <>
          <Group label={tx(lang, "Afficher", "Show")}>
            <Big icon={<Grid3x3 className={I} />} label={tx(lang, "Quadrillage", "Gridlines")} active={sheet.grid} onClick={() => editSheet((sh) => { sh.grid = !sh.grid; })} />
            <Big icon={<PanelTop className={I} />} label={tx(lang, "Barre de formule", "Formula bar")} active={showBar} onClick={() => setShowBar((v) => !v)} />
            <Big icon={<Eye className={I} />} label={tx(lang, "Formules", "Formulas")} active={showFormulas} onClick={() => setShowFormulas((v) => !v)} />
          </Group>
          <Group label={tx(lang, "Figer", "Freeze")}><Big icon={<Snowflake className={I} />} label={tx(lang, "Figer la 1re ligne", "Freeze top row")} active={sheet.freeze} onClick={() => editSheet((sh) => { sh.freeze = !sh.freeze; })} /></Group>
          <Group label={tx(lang, "Fenêtre", "Window")}><Big icon={<Maximize2 className={I} />} label={tx(lang, "Plein écran", "Full screen")} onClick={toggleFullscreen} /></Group>
        </>}
      </div>
    </div>

    {/* Formula bar */}
    <div className={cn("relative flex items-center gap-2 border-b border-border bg-background px-2 py-1.5", !showBar && "hidden")}>
      <input aria-label={tx(lang, "Zone nom", "Name box")} defaultValue={rangeText(rect)} key={rangeText(rect)}
        onKeyDown={(e) => { if (e.key === "Enter") { const r = parseRange(e.currentTarget.value); if (r) { setSel({ a: { c: r.c1, r: r.r1 }, f: { c: r.c2, r: r.r2 } }); scrollInto({ c: r.c1, r: r.r1 }); gridFocus.current?.focus(); } } }}
        className="h-8 w-[92px] rounded-lg border border-border bg-background px-2 text-center font-mono text-[12px] outline-none focus:border-[#1f7a5a]" />
      <span className="font-serif text-[15px] italic text-muted-foreground">fx</span>
      <input ref={bar} aria-label={tx(lang, "Barre de formule", "Formula bar")} spellCheck={false}
        value={editing ? editing.text : activeCell?.v ?? ""}
        onFocus={() => { setAssistAt("bar"); if (!editing) setEditing({ c: sel.a.c, r: sel.a.r, text: activeCell?.v ?? "" }); }}
        onChange={(e) => { assist.track(e.target, true); setEditing((ed) => ({ c: ed?.c ?? sel.a.c, r: ed?.r ?? sel.a.r, text: e.target.value, refAt: undefined })); }}
        onSelect={(e) => assist.track(e.currentTarget, false)}
        onKeyDown={(e) => { if (assist.onKey(e)) return; if (e.key === "Enter") { e.preventDefault(); finishEdit({ c: 0, r: 1 }); } else if (e.key === "Escape") { setEditing(null); gridFocus.current?.focus(); } }}
        placeholder={tx(lang, "Valeur ou formule : =SOMME(B2:B10), =SI(C2>=10;\"Admis\";\"Ajourné\")…", "Value or formula: =SUM(B2:B10), =IF(C2>=10,\"Pass\",\"Fail\")…")}
        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 font-mono text-[12.5px] outline-none focus:border-[#1f7a5a]" />
      {editing && assistAt === "bar" && <FormulaSuggest assist={assist} lang={lang} style={under(bar, { left: 140, top: 44 })} />}
    </div>

    {sheet.pivot && <div className="flex flex-wrap items-center gap-2 border-b border-[#cfe3d9] bg-[#eef6f2] px-3 py-1.5 text-[12px] text-[#14532d]">
      <Table2 className="size-4" /><b className="font-semibold">{tx(lang, "Tableau croisé dynamique", "Pivot table")}</b>
      <span className="text-[#3f6b55]">· {tx(lang, "source", "source")} {wb.sheets.find((x) => x.id === sheet.pivot!.source)?.name ?? "?"}!{sheet.pivot.range}</span>
      <span className="hidden text-[#3f6b55] md:inline">· {tx(lang, "les valeurs suivent vos données ; « Actualiser » ajoute les nouvelles lignes et catégories", "values follow your data; « Refresh » adds new rows and categories")}</span>
      <span className="ml-auto flex gap-1.5">
        <button type="button" onClick={refreshPivot} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#1f7a5a] px-3 font-semibold text-white"><RefreshCw className="size-3.5" />{tx(lang, "Actualiser", "Refresh")}</button>
        <button type="button" onClick={() => openPivot(true)} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#1f7a5a]/40 bg-white px-3 font-semibold"><SlidersHorizontal className="size-3.5" />{tx(lang, "Modifier", "Edit")}</button>
      </span>
    </div>}
    <div className="relative flex min-h-0 flex-1">
      {find && <SheetFind lang={lang} replace={find === "replace"} onClose={() => { setFind(null); gridFocus.current?.focus(); }} onNext={findNext} onReplace={replaceOne} onReplaceAll={replaceAll} />}
      {/* Grid */}
      <div ref={gridFocus} tabIndex={0} onKeyDown={onKey} className="sheet-grid relative min-w-0 flex-1 outline-none" onContextMenu={(e) => { e.preventDefault(); const p = posFromPoint(e.clientX, e.clientY); if (p.c < rect.c1 || p.c > rect.c2 || p.r < rect.r1 || p.r > rect.r2) setSel({ a: p, f: p }); setCtx({ x: e.clientX, y: e.clientY }); }}>
        <div ref={scroller} className="absolute inset-0 overflow-auto bg-white dark:bg-zinc-900" onPointerDown={onGridDown} onPointerMove={onGridMove} onPointerUp={onGridUp}
          onDoubleClick={(e) => { if ((e.target as HTMLElement).closest("[data-sheet-chart]")) return; startEdit(); }}>
          <div className="relative select-none" style={{ width: ROW_HEAD_W + totalW + 200, height: HEAD_H + totalH + 120 }}>
            {/* Column headers */}
            <div className="sticky top-0 z-[8] flex" style={{ height: HEAD_H, width: ROW_HEAD_W + totalW }}>
              <div className="sticky left-0 z-[9] border-b border-r border-[#e1e3e8] bg-[#eef0f3]" style={{ width: ROW_HEAD_W }} />
              {Array.from({ length: sheet.cols }, (_, c) => <div key={c} data-no-grid
                onPointerDown={(e) => { if ((e.target as HTMLElement).dataset["resize"]) return; e.stopPropagation(); setChartSel(null); setSel(e.shiftKey ? { a: sel.a, f: { c, r: sheet.rows - 1 } } : { a: { c, r: 0 }, f: { c, r: sheet.rows - 1 } }); gridFocus.current?.focus(); }}
                className={cn("relative grid shrink-0 place-items-center border-b border-r border-[#e1e3e8] text-[11.5px] font-medium", c >= rect.c1 && c <= rect.c2 ? "bg-[#dfece6] text-[#1f7a5a]" : "bg-[#f6f7f9] text-[#6b7280]")} style={{ width: colW(c) }}>
                {colName(c)}
                <span data-resize="1" onPointerDown={(e) => resizeCol(e, c)} onDoubleClick={() => autoFit(c)} className="absolute right-[-3px] top-0 z-10 h-full w-[6px] cursor-col-resize hover:bg-[#1f7a5a]/40" />
              </div>)}
            </div>
            {/* Rows */}
            {sheet.freeze && renderRow(0, true)}
            {Array.from({ length: lastRow - firstRow + 1 }, (_, i) => firstRow + i).filter((r) => !(sheet.freeze && r === 0) && !hidden.has(r)).map((r) => renderRow(r))}
            {/* Selection */}
            <div className="pointer-events-none absolute z-[4] border-2 border-[#1f7a5a] bg-[#1f7a5a]/[0.07]" style={selBox} />
            <div className="pointer-events-none absolute z-[4] border-2 border-[#1f7a5a]" style={activeBox} />
            {fillPreview && <div className="pointer-events-none absolute z-[4] border-2 border-dashed border-[#1f7a5a]" style={(() => { const a = cellBox(fillPreview.c1, fillPreview.r1), b = cellBox(fillPreview.c2, fillPreview.r2); return { left: a.left, top: a.top, width: b.left + b.width - a.left, height: b.top + b.height - a.top }; })()} />}
            {!editing && <div data-fill="1" title={tx(lang, "Tirer pour recopier", "Drag to fill")} className="absolute z-[7] size-[9px] cursor-crosshair border-2 border-white bg-[#1f7a5a]" style={{ left: selBox.left + selBox.width - 5, top: selBox.top + selBox.height - 5 }} />}
            {activeList && <button type="button" data-no-grid onPointerDown={(e) => e.stopPropagation()} onClick={() => setListOpen((o) => !o)} aria-label={tx(lang, "Choisir dans la liste", "Pick from the list")}
              className="absolute z-[8] grid size-[20px] place-items-center rounded border border-zinc-300 bg-white text-[10px] text-zinc-700 shadow-sm" style={{ left: activeBox.left + activeBox.width - 22, top: activeBox.top + 3 }}>▾</button>}
            {activeList && listOpen && <div data-no-grid onPointerDown={(e) => e.stopPropagation()} className="absolute z-[30] max-h-64 w-48 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-[12.5px] shadow-xl" style={{ left: activeBox.left, top: activeBox.top + activeBox.height + 2 }}>
              {activeList.items.map((it) => <button key={it} type="button" onClick={() => { editSheet((sh) => writeCell(sh, sel.a.c, sel.a.r, it)); setListOpen(false); gridFocus.current?.focus(); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-secondary">{it}</button>)}
            </div>}
            {/* In-cell editor */}
            {editing && <input ref={editor} data-no-grid spellCheck={false} value={editing.text}
              onChange={(e) => { assist.track(e.target, true); setEditing((ed) => (ed ? { ...ed, text: e.target.value, refAt: undefined } : ed)); }}
              onSelect={(e) => assist.track(e.currentTarget, false)}
              onFocus={() => setAssistAt("cell")}
              onKeyDown={(e) => {
                if (assist.onKey(e)) return;
                if (e.key === "Enter") { e.preventDefault(); finishEdit({ c: 0, r: e.shiftKey ? -1 : 1 }); }
                else if (e.key === "Tab") { e.preventDefault(); finishEdit({ c: e.shiftKey ? -1 : 1, r: 0 }); }
                else if (e.key === "Escape") { e.preventDefault(); setEditing(null); gridFocus.current?.focus(); }
              }}
              onBlur={(e) => { if (e.relatedTarget === bar.current) return; if (!dragging.current) window.setTimeout(() => { if (document.activeElement !== editor.current && document.activeElement !== bar.current) finishEdit(); }, 120); }}
              className="absolute z-[11] border-2 border-[#1f7a5a] bg-white px-1.5 font-[inherit] text-[13px] text-zinc-900 shadow-lg outline-none"
              style={{ ...cellBox(editing.c, editing.r), minWidth: colW(editing.c), width: Math.max(colW(editing.c), editing.text.length * 7.6 + 16), fontWeight: sheet.cells[addr(editing.c, editing.r)]?.s?.b ? 700 : undefined }} />}
            {editing && assistAt === "cell" && (() => { const b = cellBox(editing.c, editing.r); return <FormulaSuggest assist={assist} lang={lang} style={{ left: b.left, top: b.top + b.height + 3 }} />; })()}
            {/* Charts */}
            {sheet.charts.map((ch) => <SheetChartView key={ch.id} chart={ch} data={chartData(wb, ev, si, ch.range)} left={ROW_HEAD_W + ch.x} top={HEAD_H + ch.y} selected={chartSel === ch.id}
              onSelect={() => { setChartSel(ch.id); if (!chartStart.current) chartStart.current = wb; }}
              onChange={(patch, save) => {
                if (save && Object.keys(patch).length === 0) { if (chartStart.current) { past.current.push(chartStart.current); future.current = []; chartStart.current = null; } return; }
                patchChart(ch.id, patch, save);
              }}
              onDelete={() => { editSheet((sh) => { sh.charts = sh.charts.filter((c) => c.id !== ch.id); }); setChartSel(null); }}
              onRename={async () => { const t = await promptDialog({ title: tx(lang, "Titre du graphique", "Chart title"), input: { label: tx(lang, "Titre", "Title"), defaultValue: ch.title, required: true }, confirmLabel: "OK" }); if (t?.trim()) patchChart(ch.id, { title: t.trim().slice(0, 80) }, true); }}
              onEditRange={async () => { const t = await promptDialog({ title: tx(lang, "Données du graphique", "Chart data"), description: tx(lang, "Plage comme A1:C13, ou étiquettes puis valeurs : A2:A6,E2:E6", "Range like A1:C13, or labels then values: A2:A6,E2:E6"), input: { label: tx(lang, "Plage", "Range"), defaultValue: ch.range, required: true }, confirmLabel: "OK" }); if (t?.trim() && t.split(",").every((x) => parseRange(x))) patchChart(ch.id, { range: t.trim().toUpperCase() }, true); }} />)}
          </div>
        </div>
        {ctx && <>
          <div className="fixed inset-0 z-40" onClick={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }} />
          <div className="fixed z-50 w-[230px] rounded-xl border border-border bg-popover p-1.5 shadow-xl" style={{ left: Math.min(ctx.x, window.innerWidth - 240), top: Math.min(ctx.y, window.innerHeight - 380) }}>
            <MenuItem icon={<Scissors className="size-4" />} onClick={() => { setCtx(null); copySel(true); }}>{tx(lang, "Couper", "Cut")}</MenuItem>
            <MenuItem icon={<Copy className="size-4" />} onClick={() => { setCtx(null); copySel(false); }}>{tx(lang, "Copier", "Copy")}</MenuItem>
            <MenuItem icon={<ClipboardPaste className="size-4" />} onClick={async () => { setCtx(null); const t = clip.current?.text ?? await navigator.clipboard?.readText().catch(() => "") ?? ""; if (t) pasteText(t); }}>{tx(lang, "Coller", "Paste")}</MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem icon={<Plus className="size-4" />} onClick={() => { setCtx(null); insertRows(true); }}>{tx(lang, "Insérer une ligne au-dessus", "Insert row above")}</MenuItem>
            <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { setCtx(null); insertCols(true); }}>{tx(lang, "Insérer une colonne à gauche", "Insert column left")}</MenuItem>
            <MenuItem icon={<Minus className="size-4" />} onClick={() => { setCtx(null); deleteRows(); }}>{tx(lang, "Supprimer la ligne", "Delete row")}</MenuItem>
            <MenuItem icon={<Minus className="size-4" />} onClick={() => { setCtx(null); deleteCols(); }}>{tx(lang, "Supprimer la colonne", "Delete column")}</MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem icon={<Trash2 className="size-4" />} onClick={() => { setCtx(null); clearContents(); }}>{tx(lang, "Effacer le contenu", "Clear contents")}</MenuItem>
            <MenuItem icon={<Eraser className="size-4" />} onClick={() => { setCtx(null); clearFormats(); }}>{tx(lang, "Effacer la mise en forme", "Clear formatting")}</MenuItem>
            <MenuItem icon={<Sparkles className="size-4" />} onClick={() => { setCtx(null); setAssistant(true); }}>{tx(lang, "Demander à l'assistant IA", "Ask the AI assistant")}</MenuItem>
          </div>
        </>}
      </div>
      {assistant && <SheetAssistant lang={lang} wb={wb} si={si} selection={rangeText(rect)} ev={ev}
        onApply={(next) => { commit(next); if (next.sheets.length > wb.sheets.length) setSi(next.sheets.length - 1); }} onClose={() => setAssistant(false)} />}
    </div>

    {/* Sheet tabs + status */}
    <div className="flex items-center gap-1 border-t border-border bg-background px-2 py-1">
      <button type="button" onClick={addSheetTab} aria-label={tx(lang, "Nouvelle feuille", "New sheet")} title={tx(lang, "Nouvelle feuille", "New sheet")} className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-secondary"><Plus className="size-4" /></button>
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {wb.sheets.map((s, i) => <div key={s.id} className={cn("group flex shrink-0 items-center rounded-md text-[12.5px]", i === si ? "bg-[#dfece6] font-semibold text-[#155e45]" : "hover:bg-secondary")}>
          <button type="button" onClick={() => { setSi(i); setSel({ a: { c: 0, r: 0 }, f: { c: 0, r: 0 } }); setChartSel(null); }} onDoubleClick={() => void renameSheet(i)} className="px-3 py-1">{s.name}</button>
          {i === si && <Menu label="" icon={<span className="sr-only">{tx(lang, "Options de la feuille", "Sheet options")}</span>}>{(close) => <>
            <MenuItem onClick={() => { close(); void renameSheet(i); }}>{tx(lang, "Renommer", "Rename")}</MenuItem>
            <MenuItem onClick={() => { close(); duplicateSheet(i); }}>{tx(lang, "Dupliquer", "Duplicate")}</MenuItem>
            {wb.sheets.length > 1 && <MenuItem onClick={() => { close(); void deleteSheet(i); }}>{tx(lang, "Supprimer", "Delete")}</MenuItem>}
          </>}</Menu>}
        </div>)}
      </div>
      <div className="hidden shrink-0 items-center gap-3 pr-1 text-[11.5px] tabular-nums text-muted-foreground md:flex">
        {stats && <>{stats.n > 0 && <span>{tx(lang, "Somme", "Sum")} : <strong className="text-foreground">{display(stats.sum, { fmt: "number", dec: Number.isInteger(stats.sum) ? 0 : 2 })}</strong></span>}
          {stats.n > 0 && <span>{tx(lang, "Moyenne", "Average")} : <strong className="text-foreground">{display(stats.avg, { fmt: "number", dec: 2 })}</strong></span>}
          <span>{tx(lang, "Nombre", "Count")} : <strong className="text-foreground">{stats.count}</strong></span></>}
        <span className="hidden lg:inline">{tx(lang, "Brouillon gardé sur cet appareil", "Draft kept on this device")}</span>
      </div>
    </div>

    {filterMenu && <FilterMenu lang={lang} x={filterMenu.x} y={filterMenu.y} values={columnValues(sheet, ev, si, filterMenu.c)} hidden={sheet.filter?.hide[filterMenu.c] ?? []}
      onApply={(h) => { setFilterHide(filterMenu.c, h); setFilterMenu(null); }} onSort={(asc) => { sortColumn(filterMenu.c, asc); setFilterMenu(null); }} onClose={() => setFilterMenu(null)} />}
    <CondDialog open={dlg === "cond"} onOpenChange={(o) => setDlg(o ? "cond" : null)} lang={lang} range={rangeText(rect.r1 === rect.r2 && rect.c1 === rect.c2 ? dataBlock() : rect)} onAdd={(rule) => editSheet((sh) => { sh.cond = [...(sh.cond ?? []), rule]; })} />
    <ListDialog open={dlg === "list"} onOpenChange={(o) => setDlg(o ? "list" : null)} lang={lang} range={rangeText(rect)} onAdd={(range, items) => editSheet((sh) => { sh.lists = [...(sh.lists ?? []).filter((l) => l.range !== range), { id: uid(), range, items }]; })} />
    {dlg === "pivot" && (() => { const src = pivotSource(); const cfg = pivotEdit ? sheet.pivot : undefined; return <PivotDialog open onOpenChange={(o) => setDlg(o ? "pivot" : null)} lang={lang} fields={pivotFields()}
      source={src ? `${wb.sheets[src.si]!.name}!${rangeText(src.rect)}` : "?"}
      initial={cfg ? { rows: cfg.rows, cols: cfg.cols, values: cfg.values, filter: cfg.filter, totals: cfg.totals, chart: cfg.chart } : null}
      distinct={(c) => (src ? distinctValues(ev, src.si, src.rect, c) : [])}
      preview={(d) => (src ? pivotPreview(ev, src.si, src.rect, { ...d, source: "", range: "" }, lang) : [])}
      onBuild={(d) => placePivot(d, cfg ? { id: sheet.id, name: sheet.name } : null)} />; })()}
    <SaveToProject open={saveOpen} onOpenChange={setSaveOpen} lang={lang} defaultTitle={wb.title} projectId={savedRef?.projectId ?? null} onSave={saveTo} />
    {publishOpen && <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} title={wb.title} files={[{ path: "index.html", content: shareHtmlPage(), done: true }]} lang={lang}
      shareText={tx(lang, `Voici le tableau « ${wb.title} »`, `Here is the spreadsheet "${wb.title}"`)} />}
    {driveOpen && <DriveImport lang={lang} open={driveOpen} onOpenChange={setDriveOpen} onBook={(book) => {
      commit((w) => ({ ...w, sheets: [...w.sheets, ...book.sheets.map((s) => ({ ...s, name: w.sheets.some((x) => x.name === s.name) ? `${s.name} (Drive)` : s.name }))] }));
      setSi(wb.sheets.length); toast.success(tx(lang, "Fichier Drive ouvert.", "Drive file opened."));
    }} />}
  </div>;
}
