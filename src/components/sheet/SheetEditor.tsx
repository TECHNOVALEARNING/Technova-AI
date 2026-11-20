import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, AreaChart as AreaIcon, ArrowDownAZ, ArrowUpAZ, BarChart3, Bold, Columns3, Copy, Download, Eraser, FileSpreadsheet,
  FileUp, Grid3x3, Italic, LineChart as LineIcon, Minus, PaintBucket, PieChart as PieIcon, Plus, Printer, Redo2, Rows3, Sigma, Snowflake, Sparkles,
  Save, Strikethrough, Table2, Trash2, Filter, Paintbrush, ListChecks, Merge, Lock, Underline, Undo2, WrapText, X, ChevronDown, FunctionSquare, Scissors, ClipboardPaste, Square, Share2, ExternalLink,
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
import { SHEET_AI_CREDITS, SHEET_PDF_CREDITS } from "@/lib/sheet/limits";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";
import { SheetChartView } from "./SheetChart";
import { usePlanTier } from "@/lib/plan-client";
import { CondDialog, ListDialog, PivotDialog } from "./SheetDataDialogs";
import { buildPivot, columnValues, condLooks, hiddenRows, listAt, mergeMap, type PivotAgg } from "@/lib/sheet/advanced";
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

function ColorMenu({ label, icon, value, onPick, allowNone }: { label: string; icon: React.ReactNode; value?: string | undefined; onPick: (c: string | undefined) => void; allowNone?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button type="button" title={label} aria-label={label} onClick={() => setOpen((o) => !o)} className="tb-btn flex-col gap-0">
      {icon}<span className="mt-[1px] block h-[3px] w-4 rounded-full" style={{ background: value ?? "transparent", outline: value ? "none" : "1px solid #d4d4d8" }} />
    </button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="absolute left-0 top-9 z-50 w-[188px] rounded-xl border border-border bg-popover p-2 shadow-xl">
        <div className="grid grid-cols-5 gap-1.5">{SWATCHES.map((c) => <button key={c} type="button" aria-label={c} onClick={() => { onPick(c); setOpen(false); }} className="size-7 rounded-md border border-black/10" style={{ background: c }} />)}</div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12px] hover:bg-secondary">
          <input type="color" className="size-5 cursor-pointer" value={value ?? "#000000"} onChange={(e) => onPick(e.target.value)} />Personnalisée
        </label>
        {allowNone && <button type="button" onClick={() => { onPick(undefined); setOpen(false); }} className="mt-1 w-full rounded-lg px-1.5 py-1 text-left text-[12px] hover:bg-secondary">Aucune</button>}
      </div>
    </>}
  </div>;
}

function Menu({ label, icon, children, wide }: { label: string; icon: React.ReactNode; children: (close: () => void) => React.ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button type="button" onClick={() => setOpen((o) => !o)} className="tb-btn w-auto gap-1 px-2 text-[12.5px]" aria-expanded={open}>{icon}<span className="hidden xl:inline">{label}</span><ChevronDown className="size-3 opacity-60" /></button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className={cn("absolute left-0 top-9 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl", wide ? "w-[300px]" : "w-[230px]")}>{children(() => setOpen(false))}</div>
    </>}
  </div>;
}
const MenuItem = ({ onClick, icon, children, hint }: { onClick: () => void; icon?: React.ReactNode; children: React.ReactNode; hint?: string }) =>
  <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] hover:bg-secondary">
    {icon && <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">{icon}</span>}
    <span className="min-w-0 flex-1"><span className="block">{children}</span>{hint && <span className="block truncate font-mono text-[10.5px] text-muted-foreground">{hint}</span>}</span>
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
    window.setTimeout(() => { const el = editor.current; if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n); } }, 0);
  };
  const writeCell = (sh: Sheet, c: number, r: number, raw: string) => {
    const key = addr(c, r);
    const prev = sh.cells[key];
    if (raw === "" && !prev?.s) { delete sh.cells[key]; return; }
    const lit = raw.startsWith("=") ? null : parseLiteral(raw);
    const s: CellStyle | undefined = lit?.fmt && (!prev?.s?.fmt || prev.s.fmt === "general") ? { ...prev?.s, fmt: lit.fmt } : prev?.s;
    const v = lit?.fmt === "percent" ? String(lit.value) : lit?.fmt === "date" ? raw.trim() : raw;
    sh.cells[key] = { v, ...(s ? { s } : {}) };
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
  const clearContents = () => forEachSel((sh, c, r) => { const k = addr(c, r); const p = sh.cells[k]; if (!p) return; if (p.s) sh.cells[k] = { v: "", s: p.s }; else delete sh.cells[k]; });
  const clearFormats = () => forEachSel((sh, c, r) => { const k = addr(c, r); const p = sh.cells[k]; if (p) { if (p.v === "") delete sh.cells[k]; else sh.cells[k] = { v: p.v }; } });

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
  const autoSum = () => {
    if (rect.r1 !== rect.r2 || rect.c1 !== rect.c2) {
      editSheet((sh) => { for (let c = rect.c1; c <= rect.c2; c++) writeCell(sh, c, rect.r2 + 1, `=SOMME(${addr(c, rect.r1)}:${addr(c, rect.r2)})`); });
      return;
    }
    let r = active.r - 1;
    while (r >= 0 && typeof ev.value(si, active.c, r) === "number") r--;
    const from = r + 1;
    startEdit(from < active.r ? `=SOMME(${addr(active.c, from)}:${addr(active.c, active.r - 1)})` : "=SOMME()");
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
  const pivotHeaders = () => { const b = dataBlock(); return Array.from({ length: b.c2 - b.c1 + 1 }, (_, i) => b.c1 + i).map((c) => ({ c, label: display(ev.value(si, c, b.r1), sheet.cells[addr(c, b.r1)]?.s) || colName(c) })); };
  const makePivot = (group: number, value: number, agg: PivotAgg) => {
    const b = dataBlock();
    let title = tx(lang, "Récapitulatif", "Summary"); let n = 1; while (wb.sheets.some((x) => x.name === title)) title = `${tx(lang, "Récapitulatif", "Summary")} ${++n}`;
    const piv = buildPivot(sheet, ev, si, b, group, value, agg, title);
    commit((w) => ({ ...w, sheets: [...w.sheets, piv] })); setSi(wb.sheets.length);
    toast.success(tx(lang, "Récapitulatif créé : il se met à jour quand vos données changent.", "Summary created: it updates when your data changes."));
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
      toast.success(tx(lang, `${sheets.length} tableau(x) importé(s) du PDF (${json.credits ?? SHEET_PDF_CREDITS} crédits). Vérifiez les chiffres.`, `${sheets.length} table(s) imported from the PDF (${json.credits ?? SHEET_PDF_CREDITS} credits). Check the figures.`));
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
    const text = cell ? display(v, s) : "";
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
        textDecoration: [s?.u ? "underline" : "", s?.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined, color: err ? "#dc2626" : look?.color ?? s?.color, background: look?.bar ? `linear-gradient(90deg, ${look.bar.color}66 ${Math.round(look.bar.pct * 100)}%, ${bg ?? "transparent"} ${Math.round(look.bar.pct * 100)}%)` : bg, fontSize: s?.size, fontFamily: s?.font,
        boxShadow: s?.border ? "inset -1px -1px 0 #9ca3af, inset 1px 1px 0 #9ca3af" : undefined, paddingRight: isFilterHead ? 22 : undefined }}
      title={text.length > 18 ? text : undefined}>{text}
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

  return <div className="flex h-full min-h-0 flex-col bg-[#f8f9fb] text-[13px] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <style>{`.tb-btn{display:inline-flex;height:32px;min-width:32px;align-items:center;justify-content:center;border-radius:8px;color:inherit;transition:background .15s}.tb-btn:hover{background:rgba(0,0,0,.06)}.dark .tb-btn:hover{background:rgba(255,255,255,.08)}.tb-btn:disabled{opacity:.35}.tb-on{background:#dcebe4!important;color:#155e45}.sheet-grid ::selection{background:transparent}`}</style>
    {/* Title + main actions */}
    <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1f7a5a] text-white"><FileSpreadsheet className="size-4.5" /></span>
      <input aria-label={tx(lang, "Titre du classeur", "Workbook title")} value={wb.title} onChange={(e) => setWbRaw((w) => ({ ...w, title: e.target.value.slice(0, 80) }))}
        className="min-w-0 max-w-[340px] flex-1 rounded-lg bg-transparent px-2 py-1 text-[15px] font-semibold outline-none hover:bg-secondary focus:bg-secondary" />
      <div className="ml-auto flex items-center gap-1.5">
        <Menu label={tx(lang, "Ouvrir", "Open")} icon={<FileUp className="size-4" />}>{(close) => <>
          <MenuItem icon={<FileSpreadsheet className="size-4" />} onClick={() => { close(); fileInput.current?.click(); }} hint=".xlsx · .csv">{tx(lang, "Fichier Excel ou CSV", "Excel or CSV file")}</MenuItem>
          <MenuItem icon={<FileUp className="size-4" />} onClick={() => { close(); pdfInput.current?.click(); }} hint={tx(lang, `Tableaux lus par l'IA · ${SHEET_PDF_CREDITS} crédits`, `Tables read by AI · ${SHEET_PDF_CREDITS} credits`)}>{tx(lang, "Tableaux d'un PDF", "Tables from a PDF")}</MenuItem>
          <MenuItem icon={<svg viewBox="0 0 87.3 78" className="size-4"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" /><path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 0 0 0 53h27.5z" fill="#00ac47" /><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" /><path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" /><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" /><path d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" /></svg>} onClick={() => { close(); setDriveOpen(true); }} hint="Google Sheets · .xlsx">{tx(lang, "Depuis Google Drive", "From Google Drive")}</MenuItem>
        </>}</Menu>
        <Menu label={tx(lang, "Exporter", "Export")} icon={<Download className="size-4" />}>{(close) => <>
          <MenuItem icon={<FileSpreadsheet className="size-4 text-[#1f7a5a]" />} onClick={() => { close(); void doExportXlsx(); }} hint={tx(lang, "Formules, formats, graphiques", "Formulas, formats, charts")}>Excel (.xlsx)</MenuItem>
          <MenuItem icon={<Printer className="size-4" />} onClick={() => { close(); printWorkbook(wb, si); }} hint={tx(lang, "Feuille active", "Active sheet")}>{tx(lang, "PDF ou impression", "PDF or print")}</MenuItem>
          <MenuItem icon={<Printer className="size-4" />} onClick={() => { close(); printWorkbook(wb); }} hint={tx(lang, "Toutes les feuilles", "All sheets")}>{tx(lang, "PDF du classeur entier", "PDF of the whole workbook")}</MenuItem>
          <MenuItem icon={<Table2 className="size-4" />} onClick={() => { close(); exportCsv(wb, si); }} hint={tx(lang, "Feuille active, séparateur ;", "Active sheet, ; separator")}>CSV</MenuItem>
          <MenuItem icon={<ExternalLink className="size-4" />} onClick={() => { close(); void toGoogleSheets(); }} hint={tx(lang, "Télécharge le .xlsx puis ouvre Sheets", "Downloads the .xlsx then opens Sheets")}>Google Sheets</MenuItem>
          <MenuItem icon={<Share2 className="size-4" />} onClick={() => { close(); setPublishOpen(true); }} hint={tx(lang, "Lien, WhatsApp, Netlify, Vercel, GitHub", "Link, WhatsApp, Netlify, Vercel, GitHub")}>{tx(lang, "Publier en lecture seule", "Publish read-only")}</MenuItem>
        </>}</Menu>
        <button type="button" onClick={quickSave} title="Ctrl+S" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-semibold hover:bg-secondary"><Save className="size-3.5" />{savedRef ? tx(lang, "Enregistrer", "Save") : tx(lang, "Enregistrer dans un projet", "Save to a project")}</button>
        <button type="button" onClick={() => setAssistant((a) => !a)} aria-pressed={assistant}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition", assistant ? "bg-[#1f7a5a] text-white" : "bg-gradient-to-r from-[#1f7a5a] to-[#2b9b74] text-white hover:brightness-110")}>
          <Sparkles className="size-3.5" />{tx(lang, "Assistant IA", "AI assistant")}<span className="rounded-full bg-white/20 px-1.5 text-[10px]">{tx(lang, `${SHEET_AI_CREDITS} crédits`, `${SHEET_AI_CREDITS} credits`)}</span>
        </button>
        <button type="button" onClick={onClose} aria-label={tx(lang, "Fermer", "Close")} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-4" /></button>
      </div>
      <input ref={fileInput} type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
      <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importPdf(f); }} />
    </div>

    {/* Ribbon */}
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1">
      <button type="button" className={btn} title="Ctrl+Z" aria-label={tx(lang, "Annuler", "Undo")} onClick={undo} disabled={!past.current.length}><Undo2 className="size-4" /></button>
      <button type="button" className={btn} title="Ctrl+Y" aria-label={tx(lang, "Rétablir", "Redo")} onClick={redo} disabled={!future.current.length}><Redo2 className="size-4" /></button>
      <span className="mx-1 h-5 w-px bg-border" />
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
      <span className="mx-1 h-5 w-px bg-border" />
      {([["left", AlignLeft, tx(lang, "Gauche", "Left")], ["center", AlignCenter, tx(lang, "Centrer", "Centre")], ["right", AlignRight, tx(lang, "Droite", "Right")]] as const).map(([a, Icon, l]) =>
        <button key={a} type="button" className={cn(btn, activeCell?.s?.align === a && on)} aria-label={l} title={l} onClick={() => setStyle({ align: activeCell?.s?.align === a ? undefined : a })}><Icon className="size-4" /></button>)}
      <button type="button" className={cn(btn, activeCell?.s?.wrap && on)} aria-label={tx(lang, "Renvoyer à la ligne", "Wrap text")} title={tx(lang, "Renvoyer à la ligne", "Wrap text")} onClick={() => toggle("wrap")}><WrapText className="size-4" /></button>
      <span className="mx-1 h-5 w-px bg-border" />
      <select aria-label={tx(lang, "Format des nombres", "Number format")} value={fmtValue} onChange={(e) => setStyle({ fmt: e.target.value === "general" ? undefined : e.target.value as NumFmt })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
        {FORMATS.map(([f, fr, en]) => <option key={f} value={f}>{lang === "fr" ? fr : en}</option>)}
      </select>
      <button type="button" className={btn} aria-label={tx(lang, "Moins de décimales", "Fewer decimals")} title={tx(lang, "Moins de décimales", "Fewer decimals")} onClick={() => setStyle({ dec: Math.max(0, (activeCell?.s?.dec ?? 2) - 1) })}><span className="text-[11px] font-semibold">,0</span></button>
      <button type="button" className={btn} aria-label={tx(lang, "Plus de décimales", "More decimals")} title={tx(lang, "Plus de décimales", "More decimals")} onClick={() => setStyle({ dec: Math.min(6, (activeCell?.s?.dec ?? 0) + 1) })}><span className="text-[11px] font-semibold">,00</span></button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn} aria-label={tx(lang, "Somme automatique", "AutoSum")} title={tx(lang, "Somme automatique", "AutoSum")} onClick={autoSum}><Sigma className="size-4" /></button>
      <Menu label={tx(lang, "Fonctions", "Functions")} icon={<FunctionSquare className="size-4" />} wide>{(close) => FUNCTION_MENU.map((f) => <MenuItem key={f.name} onClick={() => { close(); insertFunction(f.name); }} hint={f.hint}>{lang === "fr" ? f.fr : f.en}</MenuItem>)}</Menu>
      <Menu label={tx(lang, "Graphique", "Chart")} icon={<BarChart3 className="size-4" />}>{(close) => <>
        <p className="px-2.5 pb-1 pt-1 text-[11px] text-muted-foreground">{tx(lang, "Sélectionnez les étiquettes et les nombres, puis :", "Select labels and numbers, then:")}</p>
        <MenuItem icon={<BarChart3 className="size-4" />} onClick={() => { close(); addChart("bar"); }}>{tx(lang, "Histogramme", "Column chart")}</MenuItem>
        <MenuItem icon={<LineIcon className="size-4" />} onClick={() => { close(); addChart("line"); }}>{tx(lang, "Courbes", "Line chart")}</MenuItem>
        <MenuItem icon={<AreaIcon className="size-4" />} onClick={() => { close(); addChart("area"); }}>{tx(lang, "Aires", "Area chart")}</MenuItem>
        <MenuItem icon={<PieIcon className="size-4" />} onClick={() => { close(); addChart("pie"); }}>{tx(lang, "Secteurs (camembert)", "Pie chart")}</MenuItem>
      </>}</Menu>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn} aria-label={tx(lang, "Trier de A à Z", "Sort A to Z")} title={tx(lang, "Trier de A à Z (colonne active)", "Sort A to Z (active column)")} onClick={() => sort(true)}><ArrowDownAZ className="size-4" /></button>
      <button type="button" className={btn} aria-label={tx(lang, "Trier de Z à A", "Sort Z to A")} title={tx(lang, "Trier de Z à A (colonne active)", "Sort Z to A (active column)")} onClick={() => sort(false)}><ArrowUpAZ className="size-4" /></button>
      <Menu label={tx(lang, "Lignes et colonnes", "Rows & columns")} icon={<Rows3 className="size-4" />}>{(close) => <>
        <MenuItem icon={<Plus className="size-4" />} onClick={() => { close(); insertRows(true); }}>{tx(lang, "Insérer une ligne au-dessus", "Insert row above")}</MenuItem>
        <MenuItem icon={<Plus className="size-4" />} onClick={() => { close(); insertRows(false); }}>{tx(lang, "Insérer une ligne en dessous", "Insert row below")}</MenuItem>
        <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); insertCols(true); }}>{tx(lang, "Insérer une colonne à gauche", "Insert column left")}</MenuItem>
        <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); insertCols(false); }}>{tx(lang, "Insérer une colonne à droite", "Insert column right")}</MenuItem>
        <MenuItem icon={<Minus className="size-4" />} onClick={() => { close(); deleteRows(); }}>{tx(lang, "Supprimer la ou les lignes", "Delete row(s)")}</MenuItem>
        <MenuItem icon={<Minus className="size-4" />} onClick={() => { close(); deleteCols(); }}>{tx(lang, "Supprimer la ou les colonnes", "Delete column(s)")}</MenuItem>
        <MenuItem icon={<Columns3 className="size-4" />} onClick={() => { close(); for (let c = rect.c1; c <= rect.c2; c++) autoFit(c); }}>{tx(lang, "Ajuster la largeur au contenu", "Fit column width")}</MenuItem>
      </>}</Menu>
      <Menu label={tx(lang, "Données", "Data")} icon={<Filter className="size-4" />}>{(close) => tier !== null && tier < 3 ? <div className="space-y-2 p-2 text-[12.5px]">
        <p className="flex items-center gap-1.5 font-semibold"><Lock className="size-3.5" />{tx(lang, "Tableur avancé · forfait Pro", "Advanced spreadsheet · Pro plan")}</p>
        <p className="text-muted-foreground">{tx(lang, "Filtres, mise en forme conditionnelle, listes déroulantes, fusion de cellules et tableau récapitulatif sont inclus avec le forfait Pro et la formule Mensuel Pro.", "Filters, conditional formatting, dropdowns, merged cells and the summary table come with the Pro pack and the Mensuel Pro plan.")}</p>
        <a href="/dashboard/credits" onClick={close} className="inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-[12px] font-semibold text-background">{tx(lang, "Voir les offres", "See plans")}</a>
      </div> : <>
        <MenuItem icon={<Filter className="size-4" />} onClick={() => { close(); toggleFilter(); }} hint={tx(lang, "▾ dans les en-têtes", "▾ in the headers")}>{sheet.filter ? tx(lang, "Retirer le filtre", "Remove the filter") : tx(lang, "Filtrer le tableau", "Filter the table")}</MenuItem>
        <MenuItem icon={<Paintbrush className="size-4" />} onClick={() => { close(); setDlg("cond"); }} hint={tx(lang, "Couleurs selon la valeur", "Colours by value")}>{tx(lang, "Mise en forme conditionnelle…", "Conditional formatting…")}</MenuItem>
        <MenuItem icon={<ListChecks className="size-4" />} onClick={() => { close(); setDlg("list"); }} hint={tx(lang, "Choix dans une liste", "Pick from a list")}>{tx(lang, "Liste déroulante…", "Dropdown list…")}</MenuItem>
        <MenuItem icon={<Merge className="size-4" />} onClick={() => { close(); toggleMerge(); }}>{tx(lang, "Fusionner / défusionner", "Merge / unmerge")}</MenuItem>
        <MenuItem icon={<Table2 className="size-4" />} onClick={() => { close(); setDlg("pivot"); }} hint={tx(lang, "Totaux par catégorie", "Totals by category")}>{tx(lang, "Tableau récapitulatif…", "Summary table…")}</MenuItem>
        {((sheet.cond?.length ?? 0) > 0 || (sheet.lists?.length ?? 0) > 0) && <MenuItem icon={<Eraser className="size-4" />} onClick={() => { close(); editSheet((sh) => { sh.cond = []; sh.lists = []; }); }}>{tx(lang, "Effacer les règles et listes de la feuille", "Clear the sheet's rules and lists")}</MenuItem>}
      </>}</Menu>
      <button type="button" className={cn(btn, sheet.grid && on)} aria-label={tx(lang, "Quadrillage", "Gridlines")} title={tx(lang, "Afficher le quadrillage", "Show gridlines")} onClick={() => editSheet((sh) => { sh.grid = !sh.grid; })}><Grid3x3 className="size-4" /></button>
      <button type="button" className={cn(btn, sheet.freeze && on)} aria-label={tx(lang, "Figer la première ligne", "Freeze top row")} title={tx(lang, "Figer la première ligne", "Freeze top row")} onClick={() => editSheet((sh) => { sh.freeze = !sh.freeze; })}><Snowflake className="size-4" /></button>
      <button type="button" className={btn} aria-label={tx(lang, "Effacer la mise en forme", "Clear formatting")} title={tx(lang, "Effacer la mise en forme", "Clear formatting")} onClick={clearFormats}><Eraser className="size-4" /></button>
      {busy && <span className="ml-auto inline-flex items-center gap-2 pr-2 text-[12px] text-muted-foreground"><span className="size-3 animate-spin rounded-full border-2 border-[#1f7a5a] border-t-transparent" />{busy}</span>}
    </div>

    {/* Formula bar */}
    <div className="flex items-center gap-2 border-b border-border bg-background px-2 py-1.5">
      <input aria-label={tx(lang, "Zone nom", "Name box")} defaultValue={rangeText(rect)} key={rangeText(rect)}
        onKeyDown={(e) => { if (e.key === "Enter") { const r = parseRange(e.currentTarget.value); if (r) { setSel({ a: { c: r.c1, r: r.r1 }, f: { c: r.c2, r: r.r2 } }); scrollInto({ c: r.c1, r: r.r1 }); gridFocus.current?.focus(); } } }}
        className="h-8 w-[92px] rounded-lg border border-border bg-background px-2 text-center font-mono text-[12px] outline-none focus:border-[#1f7a5a]" />
      <span className="font-serif text-[15px] italic text-muted-foreground">fx</span>
      <input ref={bar} aria-label={tx(lang, "Barre de formule", "Formula bar")} spellCheck={false}
        value={editing ? editing.text : activeCell?.v ?? ""}
        onFocus={() => { if (!editing) setEditing({ c: sel.a.c, r: sel.a.r, text: activeCell?.v ?? "" }); }}
        onChange={(e) => setEditing((ed) => ({ c: ed?.c ?? sel.a.c, r: ed?.r ?? sel.a.r, text: e.target.value, refAt: undefined }))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finishEdit({ c: 0, r: 1 }); } else if (e.key === "Escape") { setEditing(null); gridFocus.current?.focus(); } }}
        placeholder={tx(lang, "Valeur ou formule : =SOMME(B2:B10), =SI(C2>=10;\"Admis\";\"Ajourné\")…", "Value or formula: =SUM(B2:B10), =IF(C2>=10,\"Pass\",\"Fail\")…")}
        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 font-mono text-[12.5px] outline-none focus:border-[#1f7a5a]" />
    </div>

    <div className="flex min-h-0 flex-1">
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
              onChange={(e) => setEditing((ed) => (ed ? { ...ed, text: e.target.value, refAt: undefined } : ed))}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); finishEdit({ c: 0, r: e.shiftKey ? -1 : 1 }); }
                else if (e.key === "Tab") { e.preventDefault(); finishEdit({ c: e.shiftKey ? -1 : 1, r: 0 }); }
                else if (e.key === "Escape") { e.preventDefault(); setEditing(null); gridFocus.current?.focus(); }
              }}
              onBlur={(e) => { if (e.relatedTarget === bar.current) return; if (!dragging.current) window.setTimeout(() => { if (document.activeElement !== editor.current && document.activeElement !== bar.current) finishEdit(); }, 120); }}
              className="absolute z-[11] border-2 border-[#1f7a5a] bg-white px-1.5 font-[inherit] text-[13px] text-zinc-900 shadow-lg outline-none"
              style={{ ...cellBox(editing.c, editing.r), minWidth: colW(editing.c), width: Math.max(colW(editing.c), editing.text.length * 7.6 + 16), fontWeight: sheet.cells[addr(editing.c, editing.r)]?.s?.b ? 700 : undefined }} />}
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
    {dlg === "pivot" && <PivotDialog open onOpenChange={(o) => setDlg(o ? "pivot" : null)} lang={lang} headers={pivotHeaders()} onBuild={makePivot} />}
    <SaveToProject open={saveOpen} onOpenChange={setSaveOpen} lang={lang} defaultTitle={wb.title} projectId={savedRef?.projectId ?? null} onSave={saveTo} />
    {publishOpen && <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} title={wb.title} files={[{ path: "index.html", content: shareHtmlPage(), done: true }]} lang={lang}
      shareText={tx(lang, `Voici le tableau « ${wb.title} »`, `Here is the spreadsheet "${wb.title}"`)} />}
    {driveOpen && <DriveImport lang={lang} open={driveOpen} onOpenChange={setDriveOpen} onBook={(book) => {
      commit((w) => ({ ...w, sheets: [...w.sheets, ...book.sheets.map((s) => ({ ...s, name: w.sheets.some((x) => x.name === s.name) ? `${s.name} (Drive)` : s.name }))] }));
      setSi(wb.sheets.length); toast.success(tx(lang, "Fichier Drive ouvert.", "Drive file opened."));
    }} />}
  </div>;
}
