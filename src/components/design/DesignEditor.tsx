import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, Bold, CaseUpper, Circle, Copy, Heading1, Heading2, Highlighter,
  ImagePlus, Italic, LayoutTemplate, List, ListOrdered, Minus, Plus, Redo2, Smile, Square, Trash2, Type, Underline, Undo2, ChevronUp, ChevronDown, FilePlus2, Files, Pencil,
  Play, RotateCw, Table2, BarChart3, Blend, StickyNote, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
} from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DESIGN_FONTS, EMOJI_GROUPS, FONT_GROUPS } from "@/lib/design-fonts";
import { DocPage, fontStack, textStyle, uid, type ChartEl, type DesignDoc, type DesignEl, type ImageEl, type ShapeEl, type TableEl, type TextEl, type Transition } from "./doc";
import { CHART_KINDS, SHAPE_KINDS, ShapeSvg, iconPng, type ChartKind, type ShapeKind } from "./elements";
import { DESIGN_ICONS } from "./design-icons";
import { ChartDialog, TableDialog } from "./ElementDialogs";
import { SlideShow } from "./SlideShow";
import { ProPanel, type BrandKit } from "./ProPanel";
import type { DesignFormatId } from "@/lib/design-formats";

// The free editor of TechNova Design (step « Mise en forme »): select, move and resize any element on the page
// like Word text boxes or Canva; format text (font, size, bold, italic, underline, highlight, colour, alignment,
// bullets, capitals, line spacing); add text, images (imported from the computer), shapes and emojis; add,
// duplicate, reorder and delete pages; undo / redo. PowerPoint-like tools: shapes of many kinds, tables, charts,
// icons, rotation, shadows, borders, alignment on the page with snapping guides, copy / paste between slides, speaker
// notes and transitions, and the « Diaporama » slide show. Keyboard: Delete, Ctrl+Z / Ctrl+Y, Ctrl+D, Ctrl+C / Ctrl+V,
// arrows, F5 (slide show from the start), Maj+F5 (from this slide).

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const clone = (d: DesignDoc): DesignDoc => JSON.parse(JSON.stringify(d)) as DesignDoc;

/** Reads a picture and keeps it light (1600 px max, JPEG; PNG kept for transparency). */
export async function readImage(file: File, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86);
  } finally { URL.revokeObjectURL(url); }
}

const btn = "grid size-8 place-items-center rounded-lg text-foreground/80 transition hover:bg-secondary disabled:opacity-40";
const on = "bg-foreground text-background hover:bg-foreground";

export function DesignEditor({ doc, onChange, lang, accent, ink, font, format = null, onDerive }: { doc: DesignDoc; onChange: (d: DesignDoc) => void; lang: Lang; accent: string; ink: string; font: string; format?: DesignFormatId | null; onDerive?: (format: DesignFormatId) => void }) {
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [panel, setPanel] = useState<"add" | "emoji" | "pages" | "pro">("add");
  const past = useRef<DesignDoc[]>([]); const future = useRef<DesignDoc[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const [areaW, setAreaW] = useState(700); const [areaH, setAreaH] = useState(500);
  const fileInput = useRef<HTMLInputElement>(null); const replaceInput = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState<number | null>(null);
  const [dialog, setDialog] = useState<null | "table" | "chart">(null);
  const clip = useRef<DesignEl | null>(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  useEffect(() => {
    const el = area.current; if (!el) return;
    const ro = new ResizeObserver(() => { setAreaW(el.clientWidth); setAreaH(el.clientHeight); }); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (page >= doc.pages.length) setPage(Math.max(0, doc.pages.length - 1)); }, [doc.pages.length, page]);
  const pad = areaW < 600 ? 16 : 48;
  const scale = Math.max(0.05, Math.min((areaW - pad) / doc.w, (areaH - pad) / doc.h, 1.2));
  const cur = doc.pages[page];
  const el = cur?.elements.find((x) => x.id === sel) ?? null;

  /** Applies a change and records it for undo. */
  const commit = useCallback((next: DesignDoc) => { past.current = [...past.current.slice(-59), doc]; future.current = []; onChange(next); }, [doc, onChange]);
  const mutate = (fn: (d: DesignDoc) => void) => { const d = clone(doc); fn(d); commit(d); };
  const patch = (id: string, props: Record<string, unknown>) => mutate((d) => { const e = d.pages[page]?.elements.find((x) => x.id === id); if (e) Object.assign(e, props); });
  const undo = () => { const p = past.current.pop(); if (p) { future.current.push(doc); onChange(p); } };
  const redo = () => { const n = future.current.pop(); if (n) { past.current.push(doc); onChange(n); } };
  const add = (e: DesignEl) => { mutate((d) => { d.pages[page]?.elements.push(e); }); setSel(e.id); };
  const remove = () => { if (!sel) return; mutate((d) => { const p = d.pages[page]; if (p) p.elements = p.elements.filter((x) => x.id !== sel); }); setSel(null); };
  const duplicate = () => { if (!el) return; const copy = { ...clone({ w: 0, h: 0, pages: [{ id: "", bg: "", elements: [el] }] }).pages[0]!.elements[0]!, id: uid(), x: el.x + 24, y: el.y + 24 }; add(copy); };
  const layer = (dir: "front" | "back") => sel && mutate((d) => { const p = d.pages[page]; if (!p) return; const i = p.elements.findIndex((x) => x.id === sel); const [e] = p.elements.splice(i, 1); if (e) dir === "front" ? p.elements.push(e) : p.elements.unshift(e); });

  const newText = (kind: "h1" | "h2" | "body" | "list"): TextEl => {
    const size = kind === "h1" ? Math.round(doc.w / 16) : kind === "h2" ? Math.round(doc.w / 26) : Math.round(doc.w / 48);
    return { id: uid(), type: "text", x: Math.round(doc.w * 0.1), y: Math.round(doc.h * 0.4), w: Math.round(doc.w * 0.6), h: Math.round(size * 1.4), text: kind === "h1" ? tx(lang, "Votre titre", "Your title") : kind === "h2" ? tx(lang, "Sous-titre", "Subtitle") : kind === "list" ? tx(lang, "Premier point\nDeuxième point\nTroisième point", "First point\nSecond point\nThird point") : tx(lang, "Votre texte ici", "Your text here"),
      font, size: Math.max(12, size), bold: kind !== "body" && kind !== "list", italic: false, underline: false, color: ink, highlight: "", align: "left", lineHeight: kind === "h1" ? 1.1 : 1.45, spacing: 0, upper: false, list: kind === "list" ? "bullet" : "none" };
  };
  const addShape = (kind: ShapeKind | "line") => {
    const s = Math.round(Math.min(doc.w, doc.h) * 0.25);
    const w = kind === "line" ? s * 2 : kind === "arrow" || kind === "chevron" ? Math.round(s * 1.4) : s;
    add({ id: uid(), type: "shape", x: Math.round(doc.w / 2 - w / 2), y: Math.round(doc.h / 2 - (kind === "line" ? 2 : s / 2)), w, h: kind === "line" ? 4 : s, fill: accent, radius: kind === "line" ? 2 : kind === "rect" ? 12 : 0, border: 0, borderColor: ink, opacity: 1, ...(kind === "line" || kind === "rect" ? {} : { kind }) });
  };
  const addTable = () => add({ id: uid(), type: "table", x: Math.round(doc.w * 0.1), y: Math.round(doc.h * 0.25), w: Math.round(doc.w * 0.8), h: Math.round(doc.h * 0.42), header: true, fill: accent, color: ink, font, size: Math.max(12, Math.round(doc.w / 64)), border: "#d4d4d8",
    rows: lang === "fr" ? [["Offre", "Prix", "Délai"], ["Essentiel", "25 000 FCFA", "3 jours"], ["Standard", "60 000 FCFA", "1 semaine"], ["Premium", "120 000 FCFA", "2 semaines"]] : [["Offer", "Price", "Delay"], ["Essential", "25,000 FCFA", "3 days"], ["Standard", "60,000 FCFA", "1 week"], ["Premium", "120,000 FCFA", "2 weeks"]] });
  const addChart = (kind: ChartKind) => add({ id: uid(), type: "chart", x: Math.round(doc.w * 0.15), y: Math.round(doc.h * 0.18), w: Math.round(doc.w * 0.7), h: Math.round(doc.h * 0.62), kind, title: tx(lang, "Ventes par trimestre", "Sales by quarter"),
    labels: lang === "fr" ? ["T1", "T2", "T3", "T4"] : ["Q1", "Q2", "Q3", "Q4"], values: [120, 180, 150, 240], color: accent, ink, font });
  async function addIcon(Icon: (typeof DESIGN_ICONS)[number]["Icon"]) {
    try {
      const src = await iconPng(renderToStaticMarkup(<Icon size={24} strokeWidth={2} />), accent);
      const s = Math.round(Math.min(doc.w, doc.h) * 0.14);
      add({ id: uid(), type: "image", x: Math.round((doc.w - s) / 2), y: Math.round((doc.h - s) / 2), w: s, h: s, src, radius: 0 });
    } catch { toast.error(tx(lang, "Icône indisponible.", "Icon unavailable.")); }
  }
  /** Aligns the selection on the page, like PowerPoint's « Aligner ». */
  const alignTo = (where: "left" | "center" | "right" | "top" | "middle" | "bottom") => { if (!el) return; patch(el.id, where === "left" ? { x: 0 } : where === "center" ? { x: Math.round((doc.w - el.w) / 2) } : where === "right" ? { x: doc.w - el.w } : where === "top" ? { y: 0 } : where === "middle" ? { y: Math.round((doc.h - el.h) / 2) } : { y: doc.h - el.h }); };
  const paste = () => { const c = clip.current; if (!c) return; add({ ...(JSON.parse(JSON.stringify(c)) as DesignEl), id: uid(), x: c.x + 24, y: c.y + 24 }); clip.current = { ...c, x: c.x + 24, y: c.y + 24 }; };
  const setTransition = (t: Transition, all: boolean) => mutate((d) => { d.pages.forEach((pg, i) => { if (all || i === page) pg.transition = t; }); });
  async function addImage(file: File | undefined, replace = false) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(tx(lang, "Choisissez une image (JPG, PNG, WebP).", "Choose an image (JPG, PNG, WebP).")); return; }
    try {
      const src = await readImage(file);
      if (replace && el?.type === "image") { patch(el.id, { src }); return; }
      const img = await new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const w = Math.round(Math.min(doc.w * 0.5, img.width)); const h = Math.round(w * img.height / img.width);
      add({ id: uid(), type: "image", x: Math.round((doc.w - w) / 2), y: Math.round((doc.h - h) / 2), w, h, src, radius: 0 });
    } catch { toast.error(tx(lang, "Image illisible.", "Unreadable image.")); }
  }
  /** Brand kit: heading / body fonts and colours on every page, background colour, logo top left. */
  const applyBrand = (kit: BrandKit) => mutate((d) => {
    const [text, accentC, bg] = kit.colors;
    for (const p of d.pages) {
      if (bg) p.bg = bg;
      for (const e of p.elements) {
        if (e.type === "text") { const heading = e.size >= d.w / 30 || e.bold && e.size >= d.w / 45; e.font = heading ? kit.font_head : kit.font_body; if (text) e.color = text; }
        else if (e.type === "shape" && accentC && e.fill.toLowerCase() === accent.toLowerCase()) e.fill = accentC;
      }
    }
    if (kit.logo && d.pages[0] && !d.pages[0].elements.some((e) => e.type === "image" && e.src === kit.logo)) {
      const s = Math.round(Math.min(d.w, d.h) * 0.12);
      d.pages[0].elements.push({ id: uid(), type: "image", x: Math.round(d.w * 0.04), y: Math.round(d.h * 0.04), w: s, h: s, src: kit.logo, radius: 0 });
    }
  });
  const addEmoji = (e: string) => {
    if (el?.type === "text") { patch(el.id, { text: `${el.text} ${e}` }); return; }
    const size = Math.round(Math.min(doc.w, doc.h) / 8);
    add({ ...newText("body"), text: e, size, w: Math.round(size * 1.6), h: Math.round(size * 1.3), bold: false, x: Math.round(doc.w / 2 - size / 2), y: Math.round(doc.h / 2 - size / 2) });
  };

  // Pages
  const blankPage = () => ({ id: uid(), bg: cur?.bg ?? "#ffffff", elements: [] as DesignEl[] });
  const addPage = () => { mutate((d) => { d.pages.splice(page + 1, 0, blankPage()); }); setPage(page + 1); setSel(null); };
  const dupPage = () => { mutate((d) => { const p = d.pages[page]; if (p) d.pages.splice(page + 1, 0, { ...clone({ w: 0, h: 0, pages: [p] }).pages[0]!, id: uid(), elements: p.elements.map((x) => ({ ...x, id: uid() })) }); }); setPage(page + 1); };
  const delPage = () => { if (doc.pages.length < 2) return; mutate((d) => { d.pages.splice(page, 1); }); setPage(Math.max(0, page - 1)); setSel(null); };
  const movePage = (dir: -1 | 1) => { const to = page + dir; if (to < 0 || to >= doc.pages.length) return; mutate((d) => { const [p] = d.pages.splice(page, 1); if (p) d.pages.splice(to, 0, p); }); setPage(to); };

  // Drag (move) and resize, in design pixels
  const drag = useRef<{ id: string; sx: number; sy: number; x: number; y: number; w: number; h: number; mode: "move" | "resize"; base: DesignDoc; moved: boolean } | null>(null);
  const startDrag = (e: React.PointerEvent, target: DesignEl, mode: "move" | "resize") => {
    if (editing === target.id) return;
    e.stopPropagation(); e.preventDefault();
    setSel(target.id); setEditing(null);
    drag.current = { id: target.id, sx: e.clientX, sy: e.clientY, x: target.x, y: target.y, w: target.w, h: target.h, mode, base: doc, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      d.moved = true;
      const next = clone(d.base); const t = next.pages[page]?.elements.find((x) => x.id === d.id); if (!t) return;
      if (d.mode === "move") {
        // Snaps to the page's centre lines and edges (PowerPoint's smart guides), shown while they hold.
        let x = Math.round(d.x + dx), y = Math.round(d.y + dy); const snap = 7 / scale; let v = false, h = false;
        if (Math.abs(x + t.w / 2 - next.w / 2) < snap) { x = Math.round(next.w / 2 - t.w / 2); v = true; } else if (Math.abs(x) < snap) x = 0; else if (Math.abs(x + t.w - next.w) < snap) x = next.w - t.w;
        if (Math.abs(y + t.h / 2 - next.h / 2) < snap) { y = Math.round(next.h / 2 - t.h / 2); h = true; } else if (Math.abs(y) < snap) y = 0; else if (Math.abs(y + t.h - next.h) < snap) y = next.h - t.h;
        t.x = x; t.y = y; setGuides((g) => (g.v === v && g.h === h ? g : { v, h }));
      }
      else { t.w = Math.max(16, Math.round(d.w + dx)); t.h = Math.max(8, Math.round(d.h + dy)); }
      onChange(next);
    };
    const up = () => { const d = drag.current; drag.current = null; setGuides({ v: false, h: false }); if (d?.moved) { past.current = [...past.current.slice(-59), d.base]; future.current = []; } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [scale, page, onChange]);

  // Keyboard shortcuts (not while typing in a field)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (editing || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (e.key === "F5") { e.preventDefault(); setShow(e.shiftKey ? page : 0); return; }
      if (mod && e.key.toLowerCase() === "v" && clip.current) { e.preventDefault(); paste(); return; }
      if (!el) return;
      if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); clip.current = JSON.parse(JSON.stringify(el)) as DesignEl; toast.success(tx(lang, "Élément copié : Ctrl+V pour le coller, même sur une autre diapositive.", "Element copied: Ctrl+V to paste it, even on another slide.")); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(); return; }
      const step = e.shiftKey ? 10 : 1;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const a = arrows[e.key]; if (a) { e.preventDefault(); patch(el.id, { x: el.x + a[0], y: el.y + a[1] }); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const t = el?.type === "text" ? el : null;
  const fontSelect = t && <select aria-label={tx(lang, "Police", "Font")} value={t.font} onChange={(e) => patch(t.id, { font: e.target.value })} className="h-8 max-w-[150px] rounded-lg border border-border bg-background px-2 text-[12.5px]" style={{ fontFamily: fontStack(t.font) }}>
    {!DESIGN_FONTS.some((f) => f.name === t.font) && <option value={t.font}>{t.font}</option>}
    {(Object.keys(FONT_GROUPS) as (keyof typeof FONT_GROUPS)[]).map((g) => <optgroup key={g} label={FONT_GROUPS[g][lang]}>{DESIGN_FONTS.filter((f) => f.group === g).map((f) => <option key={f.name} value={f.name} style={{ fontFamily: fontStack(f.name) }}>{f.name}</option>)}</optgroup>)}
  </select>;

  // Phones: the page on top, the tools in a panel underneath; tablets and computers: tools on the left.
  return <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[230px_minmax(0,1fr)] md:grid-rows-1">
    {/* Left panel: add elements, emojis, pages */}
    <div className="order-last flex max-h-[36svh] min-h-0 flex-col border-t border-border md:order-none md:max-h-none md:border-r md:border-t-0">
      <div className="flex shrink-0 gap-1 border-b border-border p-2">{([["add", tx(lang, "Ajouter", "Add")], ["emoji", "Emojis"], ["pages", tx(lang, "Pages", "Pages")], ["pro", "Pro"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setPanel(k)} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", panel === k ? (k === "pro" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "bg-foreground text-background") : k === "pro" ? "text-amber-700 hover:bg-amber-500/10 dark:text-amber-300" : "hover:bg-secondary")}>{l}</button>)}</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {panel === "add" && <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tx(lang, "Texte", "Text")}</p>
          <button type="button" onClick={() => add(newText("h1"))} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-[15px] font-bold hover:bg-secondary"><Heading1 className="size-4" />{tx(lang, "Ajouter un titre", "Add a title")}</button>
          <button type="button" onClick={() => add(newText("h2"))} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-[13.5px] font-semibold hover:bg-secondary"><Heading2 className="size-4" />{tx(lang, "Ajouter un sous-titre", "Add a subtitle")}</button>
          <button type="button" onClick={() => add(newText("body"))} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-[12.5px] hover:bg-secondary"><Type className="size-4" />{tx(lang, "Ajouter un texte", "Add body text")}</button>
          <button type="button" onClick={() => add(newText("list"))} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-[12.5px] hover:bg-secondary"><List className="size-4" />{tx(lang, "Liste à puces", "Bulleted list")}</button>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tx(lang, "Images", "Images")}</p>
          <button type="button" onClick={() => fileInput.current?.click()} className="flex w-full items-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-left text-[12.5px] font-semibold text-background"><ImagePlus className="size-4" />{tx(lang, "Importer une image", "Import an image")}</button>
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => { void addImage(e.target.files?.[0]); e.target.value = ""; }} />
          <p className="text-[11px] text-muted-foreground">{tx(lang, "Photo, logo ou illustration depuis votre ordinateur ou votre téléphone. Pour remplir un cadre « Image », sélectionnez-le puis « Remplacer ».", "Photo, logo or illustration from your computer or phone. To fill an « Image » frame, select it then « Replace ».")}</p>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tx(lang, "Formes", "Shapes")}</p>
          <div className="grid grid-cols-5 gap-1.5">
            <button type="button" aria-label={tx(lang, "Rectangle", "Rectangle")} title={tx(lang, "Rectangle", "Rectangle")} onClick={() => addShape("rect")} className="grid h-10 place-items-center rounded-lg border border-border hover:bg-secondary"><Square className="size-4" /></button>
            <button type="button" aria-label={tx(lang, "Cercle", "Circle")} title={tx(lang, "Cercle", "Circle")} onClick={() => addShape("ellipse")} className="grid h-10 place-items-center rounded-lg border border-border hover:bg-secondary"><Circle className="size-4" /></button>
            {SHAPE_KINDS.filter((k) => k.id !== "rect" && k.id !== "ellipse").map((k) => <button key={k.id} type="button" aria-label={k[lang]} title={k[lang]} onClick={() => addShape(k.id)} className="grid h-10 place-items-center rounded-lg border border-border p-2 hover:bg-secondary"><span className="size-5"><ShapeSvg kind={k.id} fill="currentColor" border={0} borderColor="none" opacity={0.85} /></span></button>)}
            <button type="button" aria-label={tx(lang, "Ligne", "Line")} title={tx(lang, "Ligne", "Line")} onClick={() => addShape("line")} className="grid h-10 place-items-center rounded-lg border border-border hover:bg-secondary"><Minus className="size-4" /></button>
          </div>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tx(lang, "Tableau et graphiques", "Table & charts")}</p>
          <button type="button" onClick={addTable} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-[12.5px] hover:bg-secondary"><Table2 className="size-4" />{tx(lang, "Insérer un tableau", "Insert a table")}</button>
          <div className="grid grid-cols-2 gap-1.5">{CHART_KINDS.map((k) => <button key={k.id} type="button" onClick={() => addChart(k.id)} className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-2 text-left text-[12px] hover:bg-secondary"><BarChart3 className="size-3.5 shrink-0" />{k[lang]}</button>)}</div>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tx(lang, "Icônes", "Icons")}</p>
          <div className="grid grid-cols-6 gap-0.5">{DESIGN_ICONS.map(({ name, fr, Icon }) => <button key={name} type="button" title={lang === "fr" ? fr : name} aria-label={lang === "fr" ? fr : name} onClick={() => void addIcon(Icon)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" style={{ color: accent }}><Icon className="size-4" /></button>)}</div>
        </>}
        {panel === "emoji" && <>
          <p className="text-[11px] text-muted-foreground">{tx(lang, "Cliquez sur un emoji : il s'ajoute à la page, ou au texte sélectionné.", "Click an emoji: it is added to the page, or to the selected text.")}</p>
          {EMOJI_GROUPS.map((g) => <div key={g.fr}><p className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g[lang]}</p>
            <div className="grid grid-cols-6 gap-0.5">{g.list.split(" ").map((em) => <button key={em} type="button" onClick={() => addEmoji(em)} className="grid size-8 place-items-center rounded-lg text-[19px] hover:bg-secondary" style={{ fontFamily: "'Noto Color Emoji', sans-serif" }}>{em}</button>)}</div></div>)}
        </>}
        {panel === "pro" && <ProPanel lang={lang} doc={doc} current={format} image={el?.type === "image" ? el : null}
          onImage={(src) => { if (el?.type === "image") patch(el.id, { src }); }}
          onAddImage={(src, w, h) => add({ id: uid(), type: "image", x: Math.round((doc.w - w) / 2), y: Math.round((doc.h - h) / 2), w, h, src, radius: 0 })}
          onBrand={applyBrand} onDerive={(f) => onDerive?.(f)} />}
        {panel === "pages" && <>
          <button type="button" onClick={() => setShow(0)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground text-[12.5px] font-semibold text-background"><Play className="size-3.5" />{tx(lang, "Diaporama (F5)", "Slide show (F5)")}</button>
          <label className="block space-y-1 text-[11.5px] font-medium"><span className="flex items-center gap-1.5"><StickyNote className="size-3.5" />{tx(lang, `Notes du présentateur · page ${page + 1}`, `Speaker notes · page ${page + 1}`)}</span>
            <textarea key={cur?.id} defaultValue={cur?.notes ?? ""} rows={3} placeholder={tx(lang, "Ce que vous direz pendant cette diapositive (visible dans le diaporama avec N, et dans PowerPoint)", "What you will say on this slide (shown in the slide show with N, and in PowerPoint)")}
              onBlur={(e) => { const v = e.target.value; if (v !== (cur?.notes ?? "")) mutate((d) => { const pg = d.pages[page]; if (pg) pg.notes = v; }); }}
              className="w-full resize-y rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] font-normal outline-none focus:border-foreground/40" /></label>
          <div className="flex items-center gap-1.5 text-[11.5px]">
            <span className="shrink-0 font-medium">{tx(lang, "Transition", "Transition")}</span>
            <select aria-label={tx(lang, "Transition", "Transition")} value={cur?.transition ?? "fade"} onChange={(e) => setTransition(e.target.value as Transition, false)} className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-1.5 text-[12px]">
              {([["none", tx(lang, "Aucune", "None")], ["fade", tx(lang, "Fondu", "Fade")], ["slide", tx(lang, "Glissement", "Slide")], ["zoom", tx(lang, "Zoom", "Zoom")]] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button type="button" onClick={() => setTransition(cur?.transition ?? "fade", true)} className="h-8 shrink-0 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary" title={tx(lang, "Appliquer à toutes les pages", "Apply to every page")}>{tx(lang, "Toutes", "All")}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={addPage} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-border text-[12px] hover:bg-secondary"><FilePlus2 className="size-3.5" />{tx(lang, "Ajouter", "Add")}</button>
            <button type="button" onClick={dupPage} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-border text-[12px] hover:bg-secondary"><Files className="size-3.5" />{tx(lang, "Dupliquer", "Duplicate")}</button>
          </div>
          {doc.pages.map((p, i) => <div key={p.id} className="flex items-center gap-1.5">
            <span className="w-4 text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
            <button type="button" onClick={() => { setPage(i); setSel(null); }} className={cn("min-w-0 flex-1 overflow-hidden rounded-lg border-2 bg-white", page === i ? "border-foreground" : "border-transparent hover:border-border")}>
              <div style={{ width: 150, height: 150 * doc.h / doc.w, overflow: "hidden" }}><div style={{ transform: `scale(${150 / doc.w})`, transformOrigin: "top left", pointerEvents: "none" }}><DocPage doc={doc} page={i} /></div></div>
            </button>
          </div>)}
          <div className="grid grid-cols-3 gap-1 pt-1">
            <button type="button" aria-label={tx(lang, "Monter la page", "Move page up")} onClick={() => movePage(-1)} disabled={page === 0} className={cn(btn, "w-full")}><ChevronUp className="size-4" /></button>
            <button type="button" aria-label={tx(lang, "Descendre la page", "Move page down")} onClick={() => movePage(1)} disabled={page >= doc.pages.length - 1} className={cn(btn, "w-full")}><ChevronDown className="size-4" /></button>
            <button type="button" aria-label={tx(lang, "Supprimer la page", "Delete page")} onClick={delPage} disabled={doc.pages.length < 2} className={cn(btn, "w-full text-destructive")}><Trash2 className="size-4" /></button>
          </div>
        </>}
      </div>
    </div>

    {/* Canvas with its contextual toolbar */}
    <div className="order-first flex min-h-0 flex-col md:order-none">
      <div className="flex min-h-12 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1.5 [scrollbar-width:none] md:flex-wrap">
        <button type="button" className={btn} aria-label={tx(lang, "Annuler", "Undo")} title="Ctrl+Z" onClick={undo} disabled={!past.current.length}><Undo2 className="size-4" /></button>
        <button type="button" className={btn} aria-label={tx(lang, "Rétablir", "Redo")} title="Ctrl+Y" onClick={redo} disabled={!future.current.length}><Redo2 className="size-4" /></button>
        <button type="button" className={cn(btn, "flex w-auto shrink-0 gap-1 px-2 text-[12px] font-semibold")} aria-label={tx(lang, "Diaporama", "Slide show")} title={tx(lang, "Diaporama depuis cette page (Maj+F5)", "Slide show from this page (Shift+F5)")} onClick={() => setShow(page)}><Play className="size-3.5" />{tx(lang, "Diaporama", "Slide show")}</button>
        <span className="mx-1 h-5 w-px bg-border" />
        {t && <>
          <button type="button" className={cn(btn, "w-auto gap-1 px-2 text-[12px] font-medium")} aria-label={tx(lang, "Écrire le texte", "Edit the text")} onClick={() => setEditing(t.id)}><Pencil className="size-3.5" />{tx(lang, "Écrire", "Edit")}</button>
          {fontSelect}
          <button type="button" className={btn} aria-label={tx(lang, "Réduire la taille", "Smaller")} onClick={() => patch(t.id, { size: Math.max(6, Math.round(t.size - 2)) })}><Minus className="size-3.5" /></button>
          <input aria-label={tx(lang, "Taille", "Size")} type="number" min={6} max={400} value={Math.round(t.size)} onChange={(e) => patch(t.id, { size: Math.max(6, Math.min(400, Number(e.target.value) || t.size)) })} className="h-8 w-14 rounded-lg border border-border bg-background px-1.5 text-center text-[12.5px]" />
          <button type="button" className={btn} aria-label={tx(lang, "Agrandir", "Bigger")} onClick={() => patch(t.id, { size: Math.min(400, Math.round(t.size + 2)) })}><Plus className="size-3.5" /></button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" aria-pressed={t.bold} className={cn(btn, t.bold && on)} aria-label={tx(lang, "Gras", "Bold")} onClick={() => patch(t.id, { bold: !t.bold })}><Bold className="size-4" /></button>
          <button type="button" aria-pressed={t.italic} className={cn(btn, t.italic && on)} aria-label={tx(lang, "Italique", "Italic")} onClick={() => patch(t.id, { italic: !t.italic })}><Italic className="size-4" /></button>
          <button type="button" aria-pressed={t.underline} className={cn(btn, t.underline && on)} aria-label={tx(lang, "Souligné", "Underline")} onClick={() => patch(t.id, { underline: !t.underline })}><Underline className="size-4" /></button>
          <button type="button" aria-pressed={t.upper} className={cn(btn, t.upper && on)} aria-label={tx(lang, "Majuscules", "Capitals")} onClick={() => patch(t.id, { upper: !t.upper })}><CaseUpper className="size-4" /></button>
          <label className={cn(btn, "relative cursor-pointer")} title={tx(lang, "Couleur du texte", "Text colour")}><span className="text-[14px] font-bold" style={{ color: t.color, textDecoration: `underline 3px ${t.color}` }}>A</span><input type="color" value={t.color.startsWith("#") ? t.color : "#000000"} onChange={(e) => patch(t.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={tx(lang, "Couleur du texte", "Text colour")} /></label>
          <label className={cn(btn, "relative cursor-pointer", t.highlight && on)} title={tx(lang, "Surlignage", "Highlight")}><Highlighter className="size-4" /><input type="color" value={t.highlight || "#fde047"} onChange={(e) => patch(t.id, { highlight: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={tx(lang, "Surlignage", "Highlight")} /></label>
          {t.highlight && <button type="button" className="h-8 rounded-lg px-1.5 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => patch(t.id, { highlight: "" })}>{tx(lang, "Sans surlignage", "No highlight")}</button>}
          <span className="mx-1 h-5 w-px bg-border" />
          {([["left", AlignLeft, tx(lang, "Aligner à gauche", "Align left")], ["center", AlignCenter, tx(lang, "Centrer", "Centre")], ["right", AlignRight, tx(lang, "Aligner à droite", "Align right")], ["justify", AlignJustify, tx(lang, "Justifier", "Justify")]] as const).map(([a, Icon, l]) => <button key={a} type="button" aria-pressed={t.align === a} aria-label={l} title={l} className={cn(btn, t.align === a && on)} onClick={() => patch(t.id, { align: a })}><Icon className="size-4" /></button>)}
          <button type="button" aria-pressed={t.list === "bullet"} className={cn(btn, t.list === "bullet" && on)} aria-label={tx(lang, "Puces", "Bullets")} onClick={() => patch(t.id, { list: t.list === "bullet" ? "none" : "bullet" })}><List className="size-4" /></button>
          <button type="button" aria-pressed={t.list === "number"} className={cn(btn, t.list === "number" && on)} aria-label={tx(lang, "Numéros", "Numbers")} onClick={() => patch(t.id, { list: t.list === "number" ? "none" : "number" })}><ListOrdered className="size-4" /></button>
          <select aria-label={tx(lang, "Interligne", "Line spacing")} value={String(t.lineHeight)} onChange={(e) => patch(t.id, { lineHeight: Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
            {[...new Set([1, 1.1, 1.25, 1.45, 1.6, 2, t.lineHeight])].sort((a, b) => a - b).map((v) => <option key={v} value={String(v)}>{tx(lang, "Interligne", "Spacing")} {v}</option>)}
          </select>
          <select aria-label={tx(lang, "Espacement des lettres", "Letter spacing")} value={String(t.spacing)} onChange={(e) => patch(t.id, { spacing: Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
            {[...new Set([-1, 0, 0.5, 1, 2, 4, 8, t.spacing])].sort((a, b) => a - b).map((v) => <option key={v} value={String(v)}>{tx(lang, "Lettres", "Letters")} {v}</option>)}
          </select>
          <button type="button" className={btn} aria-label="Emoji" onClick={() => setPanel("emoji")}><Smile className="size-4" /></button>
        </>}
        {el?.type === "image" && <>
          <button type="button" onClick={() => replaceInput.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-semibold text-background"><ImagePlus className="size-4" />{el.src ? tx(lang, "Remplacer l'image", "Replace image") : tx(lang, "Importer une image", "Import an image")}</button>
          <input ref={replaceInput} type="file" accept="image/*" className="sr-only" onChange={(e) => { void addImage(e.target.files?.[0], true); e.target.value = ""; }} />
          <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Arrondi", "Rounding")}<input type="range" min={0} max={Math.round(Math.min(el.w, el.h) / 2)} value={el.radius} onChange={(e) => patch(el.id, { radius: Number(e.target.value) })} /></label>
        </>}
        {el?.type === "shape" && <>
          <label className={cn(btn, "relative flex w-auto shrink-0 cursor-pointer gap-1.5 px-2 text-[12px]")}><span className="size-4 rounded border border-border" style={{ background: el.fill }} />{tx(lang, "Couleur", "Colour")}<input type="color" value={el.fill.startsWith("#") ? el.fill : "#ffffff"} onChange={(e) => patch(el.id, { fill: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          {(!el.kind || el.kind === "rect") && <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Arrondi", "Rounding")}<input type="range" min={0} max={Math.round(Math.min(el.w, el.h) / 2)} value={el.radius} onChange={(e) => patch(el.id, { radius: Number(e.target.value) })} /></label>}
          <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Opacité", "Opacity")}<input type="range" min={10} max={100} value={Math.round(el.opacity * 100)} onChange={(e) => patch(el.id, { opacity: Number(e.target.value) / 100 })} /></label>
          <select aria-label={tx(lang, "Forme", "Shape")} value={el.kind ?? (el.radius >= Math.min(el.w, el.h) / 2.2 ? "ellipse" : "rect")} onChange={(e) => patch(el.id, { kind: e.target.value })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
            {SHAPE_KINDS.map((k) => <option key={k.id} value={k.id}>{k[lang]}</option>)}
          </select>
          <select aria-label={tx(lang, "Contour", "Outline")} value={String(el.border)} onChange={(e) => patch(el.id, { border: Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">
            {[0, 1, 2, 4, 6, 10].map((v) => <option key={v} value={String(v)}>{v ? `${tx(lang, "Contour", "Outline")} ${v} px` : tx(lang, "Sans contour", "No outline")}</option>)}
          </select>
          {el.border > 0 && <label className={cn(btn, "relative cursor-pointer")} title={tx(lang, "Couleur du contour", "Outline colour")}><span className="size-4 rounded-full border-2" style={{ borderColor: el.borderColor }} /><input type="color" value={el.borderColor.startsWith("#") ? el.borderColor : "#000000"} onChange={(e) => patch(el.id, { borderColor: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={tx(lang, "Couleur du contour", "Outline colour")} /></label>}
        </>}
        {el?.type === "table" && <>
          <button type="button" onClick={() => setDialog("table")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-semibold text-background"><Table2 className="size-4" />{tx(lang, "Modifier le tableau", "Edit the table")}</button>
          <button type="button" aria-pressed={el.header} className={cn(btn, "flex w-auto shrink-0 px-2 text-[12px]", el.header && on)} onClick={() => patch(el.id, { header: !el.header })}>{tx(lang, "En-tête", "Header")}</button>
          <label className={cn(btn, "relative flex w-auto shrink-0 cursor-pointer gap-1.5 px-2 text-[12px]")}><span className="size-4 rounded border border-border" style={{ background: el.fill }} />{tx(lang, "Couleur", "Colour")}<input type="color" value={el.fill.startsWith("#") ? el.fill : "#2563eb"} onChange={(e) => patch(el.id, { fill: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          <button type="button" className={btn} aria-label={tx(lang, "Texte plus petit", "Smaller text")} onClick={() => patch(el.id, { size: Math.max(8, el.size - 1) })}><Minus className="size-3.5" /></button>
          <span className="w-7 text-center text-[12px] tabular-nums">{Math.round(el.size)}</span>
          <button type="button" className={btn} aria-label={tx(lang, "Texte plus grand", "Bigger text")} onClick={() => patch(el.id, { size: Math.min(48, el.size + 1) })}><Plus className="size-3.5" /></button>
        </>}
        {el?.type === "chart" && <>
          <button type="button" onClick={() => setDialog("chart")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-semibold text-background"><BarChart3 className="size-4" />{tx(lang, "Modifier les données", "Edit data")}</button>
          <select aria-label={tx(lang, "Type de graphique", "Chart type")} value={el.kind} onChange={(e) => patch(el.id, { kind: e.target.value })} className="h-8 rounded-lg border border-border bg-background px-1.5 text-[12px]">{CHART_KINDS.map((k) => <option key={k.id} value={k.id}>{k[lang]}</option>)}</select>
          <label className={cn(btn, "relative flex w-auto shrink-0 cursor-pointer gap-1.5 px-2 text-[12px]")}><span className="size-4 rounded border border-border" style={{ background: el.color }} />{tx(lang, "Couleur", "Colour")}<input type="color" value={el.color.startsWith("#") ? el.color : "#2563eb"} onChange={(e) => patch(el.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
        </>}
        {el && <>
          <span className="mx-1 h-5 w-px bg-border" />
          <label className="flex items-center gap-1 text-[12px]" title={tx(lang, "Rotation (degrés)", "Rotation (degrees)")}><RotateCw className="size-3.5" /><input aria-label={tx(lang, "Rotation", "Rotation")} type="number" min={-180} max={180} value={Math.round(el.rot ?? 0)} onChange={(e) => patch(el.id, { rot: Math.max(-180, Math.min(180, Number(e.target.value) || 0)) })} className="h-8 w-14 rounded-lg border border-border bg-background px-1 text-center text-[12px]" />°</label>
          <button type="button" aria-pressed={!!el.shadow} className={cn(btn, el.shadow && on)} aria-label={tx(lang, "Ombre", "Shadow")} title={tx(lang, "Ombre", "Shadow")} onClick={() => patch(el.id, { shadow: !el.shadow })}><Blend className="size-4" /></button>
          {([["left", AlignHorizontalJustifyStart, tx(lang, "Aligner à gauche de la page", "Align to page left")], ["center", AlignHorizontalJustifyCenter, tx(lang, "Centrer horizontalement", "Centre horizontally")], ["right", AlignHorizontalJustifyEnd, tx(lang, "Aligner à droite de la page", "Align to page right")],
            ["top", AlignVerticalJustifyStart, tx(lang, "Aligner en haut", "Align to top")], ["middle", AlignVerticalJustifyCenter, tx(lang, "Centrer verticalement", "Centre vertically")], ["bottom", AlignVerticalJustifyEnd, tx(lang, "Aligner en bas", "Align to bottom")]] as const)
            .map(([w, Icon, l]) => <button key={w} type="button" className={btn} aria-label={l} title={l} onClick={() => alignTo(w)}><Icon className="size-4" /></button>)}
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={btn} aria-label={tx(lang, "Premier plan", "Bring to front")} title={tx(lang, "Premier plan", "Bring to front")} onClick={() => layer("front")}><ArrowUpToLine className="size-4" /></button>
          <button type="button" className={btn} aria-label={tx(lang, "Arrière-plan", "Send to back")} title={tx(lang, "Arrière-plan", "Send to back")} onClick={() => layer("back")}><ArrowDownToLine className="size-4" /></button>
          <button type="button" className={btn} aria-label={tx(lang, "Dupliquer", "Duplicate")} title="Ctrl+D" onClick={duplicate}><Copy className="size-4" /></button>
          <button type="button" className={cn(btn, "text-destructive")} aria-label={tx(lang, "Supprimer", "Delete")} title={tx(lang, "Supprimer (Suppr)", "Delete (Del)")} onClick={remove}><Trash2 className="size-4" /></button>
        </>}
        {!el && <>
          <label className={cn(btn, "relative flex w-auto shrink-0 cursor-pointer gap-1.5 px-2 text-[12px]")}><LayoutTemplate className="size-4" />{tx(lang, "Fond de page", "Page background")}<span className="size-4 rounded border border-border" style={{ background: cur?.bg }} /><input type="color" value={cur?.bg.startsWith("#") ? cur.bg : "#ffffff"} onChange={(e) => mutate((d) => { const p = d.pages[page]; if (p) p.bg = e.target.value; })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          <span className="text-[11.5px] text-muted-foreground max-md:hidden">{tx(lang, "Cliquez sur un élément pour le modifier, double-cliquez sur un texte pour l'écrire, glissez pour le déplacer, tirez le coin pour le redimensionner.", "Click an element to change it, double-click a text to type, drag to move, pull the corner to resize.")}</span>
        </>}
      </div>
      <div ref={area} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-secondary/50" onPointerDown={() => { setSel(null); setEditing(null); }}>
        <div style={{ width: doc.w * scale, height: doc.h * scale, position: "relative" }} className="shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]">
          <div style={{ width: doc.w, height: doc.h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <DocPage doc={doc} page={page} selected={sel} editing={editing}
              onPointerDown={(e, x) => startDrag(e, x, "move")}
              onDoubleClick={(x) => { if (x.type === "text") { setSel(x.id); setEditing(x.id); } else if (x.type === "image") { setSel(x.id); replaceInput.current?.click(); } else if (x.type === "table" || x.type === "chart") { setSel(x.id); setDialog(x.type); } }}
              renderEditing={(x) => <textarea autoFocus defaultValue={x.text} onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => { const v = e.target.value; setEditing(null); if (v !== x.text) patch(x.id, { text: v }); }}
                onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur(); }}
                style={{ ...textStyle(x), width: "100%", minHeight: x.h, height: "auto", background: "rgba(109,91,208,0.06)", border: "none", outline: "2px solid #6d5bd0", resize: "none", padding: 0, overflow: "hidden", fieldSizing: "content" } as React.CSSProperties} />} />
          </div>
          {guides.v && <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-[#e11d48]" style={{ left: (doc.w / 2) * scale }} />}
          {guides.h && <div aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-[#e11d48]" style={{ top: (doc.h / 2) * scale }} />}
          {el && editing !== el.id && <div aria-hidden onPointerDown={(e) => startDrag(e, el, "resize")} title={tx(lang, "Redimensionner", "Resize")}
            style={{ position: "absolute", left: (el.x + el.w) * scale - 7, top: (el.y + el.h) * scale - 7, width: 14, height: 14, borderRadius: 4, background: "#fff", border: "2px solid #6d5bd0", cursor: "nwse-resize", touchAction: "none" }} />}
        </div>
        <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">{tx(lang, "Page", "Page")} {page + 1} / {doc.pages.length} · {Math.round(scale * 100)} %</span>
      </div>
    </div>
    {el?.type === "table" && <TableDialog open={dialog === "table"} lang={lang} rows={(el as TableEl).rows} onClose={() => setDialog(null)} onSave={(rows) => patch(el.id, { rows })} />}
    {el?.type === "chart" && <ChartDialog open={dialog === "chart"} lang={lang} kind={(el as ChartEl).kind} title={(el as ChartEl).title} labels={(el as ChartEl).labels} values={(el as ChartEl).values} onClose={() => setDialog(null)} onSave={(v) => patch(el.id, v)} />}
    {show !== null && <SlideShow doc={doc} start={show} lang={lang} onClose={() => setShow(null)} />}
  </div>;
}
