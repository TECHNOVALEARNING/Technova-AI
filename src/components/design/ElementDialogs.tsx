import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CHART_KINDS, type ChartKind } from "./elements";

// Editing windows of TechNova Design's PowerPoint-like elements: a table's cells and a chart's data.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const cell = "h-9 w-full min-w-[90px] rounded-lg border border-border bg-background px-2 text-[13px] outline-none focus:border-foreground/40";
const small = "inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[12px] hover:bg-secondary disabled:opacity-40";

function Footer({ lang, onCancel, onOk }: { lang: Lang; onCancel: () => void; onOk: () => void }) {
  return <div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onCancel} className="h-10 rounded-full border border-border px-4 text-[13px] hover:bg-secondary">{tx(lang, "Annuler", "Cancel")}</button>
    <button type="button" onClick={onOk} className="h-10 rounded-full bg-foreground px-5 text-[13px] font-semibold text-background">{tx(lang, "Appliquer", "Apply")}</button>
  </div>;
}

export function TableDialog({ open, lang, rows, onClose, onSave }: { open: boolean; lang: Lang; rows: string[][]; onClose: () => void; onSave: (rows: string[][]) => void }) {
  const [r, setR] = useState<string[][]>(rows);
  useEffect(() => { if (open) setR(rows.map((x) => [...x])); }, [open, rows]);
  const cols = Math.max(1, ...r.map((x) => x.length));
  const set = (i: number, k: number, v: string) => setR((t) => t.map((row, a) => (a === i ? row.map((c, b) => (b === k ? v : c)) : row)));
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-[860px] rounded-2xl">
      <DialogTitle>{tx(lang, "Modifier le tableau", "Edit the table")}</DialogTitle>
      <DialogDescription>{tx(lang, "Écrivez dans les cases ; la première ligne sert d'en-tête si l'option est cochée.", "Type in the cells; the first row is the header when the option is on.")}</DialogDescription>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={small} disabled={r.length >= 20} onClick={() => setR((t) => [...t, Array(cols).fill("")])}><Plus className="size-3.5" />{tx(lang, "Ligne", "Row")}</button>
        <button type="button" className={small} disabled={r.length <= 1} onClick={() => setR((t) => t.slice(0, -1))}><Minus className="size-3.5" />{tx(lang, "Ligne", "Row")}</button>
        <button type="button" className={small} disabled={cols >= 8} onClick={() => setR((t) => t.map((row) => [...row, ""]))}><Plus className="size-3.5" />{tx(lang, "Colonne", "Column")}</button>
        <button type="button" className={small} disabled={cols <= 1} onClick={() => setR((t) => t.map((row) => row.slice(0, -1)))}><Minus className="size-3.5" />{tx(lang, "Colonne", "Column")}</button>
      </div>
      <div className="max-h-[52vh] overflow-auto">
        <table className="border-separate border-spacing-1"><tbody>{r.map((row, i) => <tr key={i}>{Array.from({ length: cols }, (_, k) =>
          <td key={k}><input aria-label={`${i + 1}-${k + 1}`} className={cell} value={row[k] ?? ""} onChange={(e) => set(i, k, e.target.value)} /></td>)}</tr>)}</tbody></table>
      </div>
      <Footer lang={lang} onCancel={onClose} onOk={() => { onSave(r.map((row) => Array.from({ length: cols }, (_, k) => row[k] ?? ""))); onClose(); }} />
    </DialogContent>
  </Dialog>;
}

export function ChartDialog({ open, lang, kind, title, labels, values, onClose, onSave }: { open: boolean; lang: Lang; kind: ChartKind; title: string; labels: string[]; values: number[]; onClose: () => void; onSave: (v: { kind: ChartKind; title: string; labels: string[]; values: number[] }) => void }) {
  const [k, setK] = useState<ChartKind>(kind);
  const [t, setT] = useState(title);
  const [rows, setRows] = useState<[string, string][]>([]);
  useEffect(() => { if (open) { setK(kind); setT(title); setRows(labels.map((l, i) => [l, String(values[i] ?? 0).replace(".", ",")])); } }, [open, kind, title, labels, values]);
  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", ".")) || 0;
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-[560px] rounded-2xl">
      <DialogTitle>{tx(lang, "Données du graphique", "Chart data")}</DialogTitle>
      <DialogDescription>{tx(lang, "Une ligne par catégorie : son nom et sa valeur. Le graphique se met à jour quand vous appliquez.", "One row per category: its name and value. The chart updates when you apply.")}</DialogDescription>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Type", "Type")}<select className={cell} value={k} onChange={(e) => setK(e.target.value as ChartKind)}>{CHART_KINDS.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}</select></label>
        <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Titre", "Title")}<input className={cell} value={t} onChange={(e) => setT(e.target.value)} placeholder={tx(lang, "Facultatif", "Optional")} /></label>
      </div>
      <div className="max-h-[42vh] space-y-1.5 overflow-y-auto">
        {rows.map(([l, v], i) => <div key={i} className="flex gap-1.5">
          <input aria-label={tx(lang, "Catégorie", "Category")} className={cell} value={l} onChange={(e) => setRows((x) => x.map((r, a) => (a === i ? [e.target.value, r[1]] : r)))} />
          <input aria-label={tx(lang, "Valeur", "Value")} className={`${cell} max-w-[140px] text-right`} inputMode="decimal" value={v} onChange={(e) => setRows((x) => x.map((r, a) => (a === i ? [r[0], e.target.value] : r)))} />
          <button type="button" aria-label={tx(lang, "Retirer", "Remove")} disabled={rows.length <= 1} onClick={() => setRows((x) => x.filter((_, a) => a !== i))} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-40"><Minus className="size-3.5" /></button>
        </div>)}
      </div>
      <button type="button" className={small} disabled={rows.length >= 12} onClick={() => setRows((x) => [...x, [tx(lang, "Nouvelle", "New"), "0"]])}><Plus className="size-3.5" />{tx(lang, "Ajouter une catégorie", "Add a category")}</button>
      <Footer lang={lang} onCancel={onClose} onOk={() => { onSave({ kind: k, title: t.trim(), labels: rows.map((r) => r[0]), values: rows.map((r) => num(r[1])) }); onClose(); }} />
    </DialogContent>
  </Dialog>;
}
