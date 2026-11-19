import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, Bold, CaseUpper, Circle, Copy, Heading1, Heading2, Highlighter,
  ImagePlus, Italic, LayoutTemplate, List, ListOrdered, Minus, Plus, Redo2, Smile, Square, Trash2, Type, Underline, Undo2, ChevronUp, ChevronDown, FilePlus2, Files,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DESIGN_FONTS, EMOJI_GROUPS, FONT_GROUPS } from "@/lib/design-fonts";
import { DocPage, fontStack, textStyle, uid, type DesignDoc, type DesignEl, type ImageEl, type ShapeEl, type TextEl } from "./doc";

// The free editor of TechNova Design (step « Mise en forme »): select, move and resize any element on the page
// like Word text boxes or Canva; format text (font, size, bold, italic, underline, highlight, colour, alignment,
// bullets, capitals, line spacing); add text, images (imported from the computer), shapes and emojis; add,
// duplicate, reorder and delete pages; undo / redo. Keyboard: Delete, Ctrl+Z / Ctrl+Y, Ctrl+D, arrows.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const clone = (d: DesignDoc): DesignDoc => JSON.parse(JSON.stringify(d)) as DesignDoc;

/** Reads a picture and keeps it light (1600 px max, JPEG; PNG kept for transparency). */
export async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86);
  } finally { URL.revokeObjectURL(url); }
}

const btn = "grid size-8 place-items-center rounded-lg text-foreground/80 transition hover:bg-secondary disabled:opacity-40";
const on = "bg-foreground text-background hover:bg-foreground";

export function DesignEditor({ doc, onChange, lang, accent, ink, font }: { doc: DesignDoc; onChange: (d: DesignDoc) => void; lang: Lang; accent: string; ink: string; font: string }) {
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [panel, setPanel] = useState<"add" | "emoji" | "pages">("add");
  const past = useRef<DesignDoc[]>([]); const future = useRef<DesignDoc[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const [areaW, setAreaW] = useState(700); const [areaH, setAreaH] = useState(500);
  const fileInput = useRef<HTMLInputElement>(null); const replaceInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = area.current; if (!el) return;
    const ro = new ResizeObserver(() => { setAreaW(el.clientWidth); setAreaH(el.clientHeight); }); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (page >= doc.pages.length) setPage(Math.max(0, doc.pages.length - 1)); }, [doc.pages.length, page]);
  const scale = Math.min((areaW - 48) / doc.w, (areaH - 48) / doc.h, 1.2);
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
  const addShape = (kind: "rect" | "circle" | "line") => { const s = Math.round(Math.min(doc.w, doc.h) * 0.25); add({ id: uid(), type: "shape", x: Math.round(doc.w / 2 - s / 2), y: Math.round(doc.h / 2 - (kind === "line" ? 2 : s / 2)), w: kind === "line" ? s * 2 : s, h: kind === "line" ? 4 : s, fill: accent, radius: kind === "circle" ? s : kind === "line" ? 2 : 12, border: 0, borderColor: ink, opacity: 1 }); };
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
      if (d.mode === "move") { t.x = Math.round(d.x + dx); t.y = Math.round(d.y + dy); }
      else { t.w = Math.max(16, Math.round(d.w + dx)); t.h = Math.max(8, Math.round(d.h + dy)); }
      onChange(next);
    };
    const up = () => { const d = drag.current; drag.current = null; if (d?.moved) { past.current = [...past.current.slice(-59), d.base]; future.current = []; } };
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
      if (!el) return;
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

  return <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">
    {/* Left panel: add elements, emojis, pages */}
    <div className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
      <div className="flex shrink-0 gap-1 border-b border-border p-2">{([["add", tx(lang, "Ajouter", "Add")], ["emoji", "Emojis"], ["pages", tx(lang, "Pages", "Pages")]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setPanel(k)} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", panel === k ? "bg-foreground text-background" : "hover:bg-secondary")}>{l}</button>)}</div>
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
          <div className="grid grid-cols-3 gap-2">
            <button type="button" aria-label={tx(lang, "Rectangle", "Rectangle")} onClick={() => addShape("rect")} className="grid h-12 place-items-center rounded-xl border border-border hover:bg-secondary"><Square className="size-5" /></button>
            <button type="button" aria-label={tx(lang, "Cercle", "Circle")} onClick={() => addShape("circle")} className="grid h-12 place-items-center rounded-xl border border-border hover:bg-secondary"><Circle className="size-5" /></button>
            <button type="button" aria-label={tx(lang, "Ligne", "Line")} onClick={() => addShape("line")} className="grid h-12 place-items-center rounded-xl border border-border hover:bg-secondary"><Minus className="size-5" /></button>
          </div>
        </>}
        {panel === "emoji" && <>
          <p className="text-[11px] text-muted-foreground">{tx(lang, "Cliquez sur un emoji : il s'ajoute à la page, ou au texte sélectionné.", "Click an emoji: it is added to the page, or to the selected text.")}</p>
          {EMOJI_GROUPS.map((g) => <div key={g.fr}><p className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g[lang]}</p>
            <div className="grid grid-cols-6 gap-0.5">{g.list.split(" ").map((em) => <button key={em} type="button" onClick={() => addEmoji(em)} className="grid size-8 place-items-center rounded-lg text-[19px] hover:bg-secondary" style={{ fontFamily: "'Noto Color Emoji', sans-serif" }}>{em}</button>)}</div></div>)}
        </>}
        {panel === "pages" && <>
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
    <div className="flex min-h-0 flex-col">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-border bg-background px-2 py-1.5">
        <button type="button" className={btn} aria-label={tx(lang, "Annuler", "Undo")} title="Ctrl+Z" onClick={undo} disabled={!past.current.length}><Undo2 className="size-4" /></button>
        <button type="button" className={btn} aria-label={tx(lang, "Rétablir", "Redo")} title="Ctrl+Y" onClick={redo} disabled={!future.current.length}><Redo2 className="size-4" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        {t && <>
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
          <button type="button" className={btn} aria-label="Emoji" onClick={() => setPanel("emoji")}><Smile className="size-4" /></button>
        </>}
        {el?.type === "image" && <>
          <button type="button" onClick={() => replaceInput.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-semibold text-background"><ImagePlus className="size-4" />{el.src ? tx(lang, "Remplacer l'image", "Replace image") : tx(lang, "Importer une image", "Import an image")}</button>
          <input ref={replaceInput} type="file" accept="image/*" className="sr-only" onChange={(e) => { void addImage(e.target.files?.[0], true); e.target.value = ""; }} />
          <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Arrondi", "Rounding")}<input type="range" min={0} max={Math.round(Math.min(el.w, el.h) / 2)} value={el.radius} onChange={(e) => patch(el.id, { radius: Number(e.target.value) })} /></label>
        </>}
        {el?.type === "shape" && <>
          <label className={cn(btn, "relative w-auto cursor-pointer gap-1.5 px-2 text-[12px]")}><span className="size-4 rounded border border-border" style={{ background: el.fill }} />{tx(lang, "Couleur", "Colour")}<input type="color" value={el.fill.startsWith("#") ? el.fill : "#ffffff"} onChange={(e) => patch(el.id, { fill: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Arrondi", "Rounding")}<input type="range" min={0} max={Math.round(Math.min(el.w, el.h) / 2)} value={el.radius} onChange={(e) => patch(el.id, { radius: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-1.5 px-2 text-[12px]">{tx(lang, "Opacité", "Opacity")}<input type="range" min={10} max={100} value={Math.round(el.opacity * 100)} onChange={(e) => patch(el.id, { opacity: Number(e.target.value) / 100 })} /></label>
        </>}
        {el && <>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={btn} aria-label={tx(lang, "Premier plan", "Bring to front")} title={tx(lang, "Premier plan", "Bring to front")} onClick={() => layer("front")}><ArrowUpToLine className="size-4" /></button>
          <button type="button" className={btn} aria-label={tx(lang, "Arrière-plan", "Send to back")} title={tx(lang, "Arrière-plan", "Send to back")} onClick={() => layer("back")}><ArrowDownToLine className="size-4" /></button>
          <button type="button" className={btn} aria-label={tx(lang, "Dupliquer", "Duplicate")} title="Ctrl+D" onClick={duplicate}><Copy className="size-4" /></button>
          <button type="button" className={cn(btn, "text-destructive")} aria-label={tx(lang, "Supprimer", "Delete")} title={tx(lang, "Supprimer (Suppr)", "Delete (Del)")} onClick={remove}><Trash2 className="size-4" /></button>
        </>}
        {!el && <>
          <label className={cn(btn, "relative w-auto cursor-pointer gap-1.5 px-2 text-[12px]")}><LayoutTemplate className="size-4" />{tx(lang, "Fond de page", "Page background")}<span className="size-4 rounded border border-border" style={{ background: cur?.bg }} /><input type="color" value={cur?.bg.startsWith("#") ? cur.bg : "#ffffff"} onChange={(e) => mutate((d) => { const p = d.pages[page]; if (p) p.bg = e.target.value; })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          <span className="text-[11.5px] text-muted-foreground">{tx(lang, "Cliquez sur un élément pour le modifier, double-cliquez sur un texte pour l'écrire, glissez pour le déplacer, tirez le coin pour le redimensionner.", "Click an element to change it, double-click a text to type, drag to move, pull the corner to resize.")}</span>
        </>}
      </div>
      <div ref={area} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-secondary/50" onPointerDown={() => { setSel(null); setEditing(null); }}>
        <div style={{ width: doc.w * scale, height: doc.h * scale, position: "relative" }} className="shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]">
          <div style={{ width: doc.w, height: doc.h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <DocPage doc={doc} page={page} selected={sel} editing={editing}
              onPointerDown={(e, x) => startDrag(e, x, "move")}
              onDoubleClick={(x) => { if (x.type === "text") { setSel(x.id); setEditing(x.id); } else if (x.type === "image") { setSel(x.id); replaceInput.current?.click(); } }}
              renderEditing={(x) => <textarea autoFocus defaultValue={x.text} onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => { const v = e.target.value; setEditing(null); if (v !== x.text) patch(x.id, { text: v }); }}
                onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur(); }}
                style={{ ...textStyle(x), width: "100%", minHeight: x.h, height: "auto", background: "rgba(109,91,208,0.06)", border: "none", outline: "2px solid #6d5bd0", resize: "none", padding: 0, overflow: "hidden", fieldSizing: "content" } as React.CSSProperties} />} />
          </div>
          {el && editing !== el.id && <div aria-hidden onPointerDown={(e) => startDrag(e, el, "resize")} title={tx(lang, "Redimensionner", "Resize")}
            style={{ position: "absolute", left: (el.x + el.w) * scale - 7, top: (el.y + el.h) * scale - 7, width: 14, height: 14, borderRadius: 4, background: "#fff", border: "2px solid #6d5bd0", cursor: "nwse-resize", touchAction: "none" }} />}
        </div>
        <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">{tx(lang, "Page", "Page")} {page + 1} / {doc.pages.length} · {Math.round(scale * 100)} %</span>
      </div>
    </div>
  </div>;
}
