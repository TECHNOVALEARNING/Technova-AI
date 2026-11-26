import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { COND_KINDS, PIVOT_AGGS, type PivotAgg, type PivotConfig } from "@/lib/sheet/advanced";
import { type CondRule, colName, uid } from "@/lib/sheet/model";

// Dialogs of the « Données » menu: conditional formatting, dropdown list, pivot table.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-foreground/40";
const STYLES: { id: string; fr: string; en: string; style: NonNullable<CondRule["style"]> }[] = [
  { id: "red", fr: "Rouge clair", en: "Light red", style: { bg: "#fde2e2", color: "#b42318" } },
  { id: "green", fr: "Vert clair", en: "Light green", style: { bg: "#dcfce7", color: "#166534" } },
  { id: "yellow", fr: "Jaune", en: "Yellow", style: { bg: "#fef3c7", color: "#92400e" } },
  { id: "blue", fr: "Bleu clair", en: "Light blue", style: { bg: "#dbeafe", color: "#1e40af" } },
  { id: "bold", fr: "Gras rouge", en: "Bold red", style: { color: "#dc2626", b: true } },
];

function Shell({ open, onOpenChange, title, sub, children, onOk, ok, disabled }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; sub: string; children: React.ReactNode; onOk: () => void; ok: string; disabled?: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[460px] rounded-2xl">
      <DialogTitle>{title}</DialogTitle><DialogDescription>{sub}</DialogDescription>
      <div className="space-y-3">{children}</div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-full border border-border px-4 text-[13px] hover:bg-secondary">Annuler</button>
        <button type="button" disabled={disabled} onClick={onOk} className="h-10 rounded-full bg-[#1f7a5a] px-5 text-[13px] font-semibold text-white disabled:opacity-50">{ok}</button>
      </div>
    </DialogContent>
  </Dialog>;
}

export function CondDialog({ open, onOpenChange, lang, range, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; range: string; onAdd: (rule: CondRule) => void }) {
  const [kind, setKind] = useState<CondRule["kind"]>("gt");
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [style, setStyle] = useState("red");
  const [r, setR] = useState(range);
  useEffect(() => { if (open) setR(range); }, [open, range]);
  const needs = COND_KINDS.find((k) => k.id === kind)!.needs;
  return <Shell open={open} onOpenChange={onOpenChange} title={tx(lang, "Mise en forme conditionnelle", "Conditional formatting")} sub={tx(lang, "Les cellules qui respectent la règle changent de couleur automatiquement.", "Cells that match the rule change colour automatically.")}
    ok={tx(lang, "Ajouter la règle", "Add the rule")} disabled={needs > 0 && !a.trim() || needs > 1 && !b.trim()}
    onOk={() => { onAdd({ id: uid(), range: r.toUpperCase().replace(/\s/g, ""), kind, ...(a ? { a } : {}), ...(b ? { b } : {}), ...(kind === "bars" ? { style: { bg: "#60a5fa" } } : kind === "scale" ? {} : { style: STYLES.find((s) => s.id === style)!.style }) }); onOpenChange(false); }}>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Plage", "Range")}<input className={field} value={r} onChange={(e) => setR(e.target.value)} /></label>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Règle", "Rule")}<select className={field} value={kind} onChange={(e) => setKind(e.target.value as CondRule["kind"])}>{COND_KINDS.map((k) => <option key={k.id} value={k.id}>{k[lang]}</option>)}</select></label>
    {needs > 0 && <div className="flex gap-2"><input className={field} value={a} onChange={(e) => setA(e.target.value)} placeholder={kind === "top" ? "3" : kind === "contains" || kind === "eq" ? tx(lang, "Ex. : Payé", "E.g. Paid") : "10000"} />{needs > 1 && <input className={field} value={b} onChange={(e) => setB(e.target.value)} placeholder="50000" />}</div>}
    {kind !== "bars" && kind !== "scale" && <div className="flex flex-wrap gap-1.5">{STYLES.map((s) => <button key={s.id} type="button" onClick={() => setStyle(s.id)} aria-pressed={style === s.id} className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${style === s.id ? "border-foreground" : "border-border"}`} style={{ background: s.style.bg, color: s.style.color, fontWeight: s.style.b ? 700 : 500 }}>{s[lang]}</button>)}</div>}
  </Shell>;
}

export function ListDialog({ open, onOpenChange, lang, range, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; range: string; onAdd: (range: string, items: string[]) => void }) {
  const [items, setItems] = useState(tx(lang, "Payé\nEn attente\nAnnulé", "Paid\nPending\nCancelled"));
  const [r, setR] = useState(range);
  useEffect(() => { if (open) setR(range); }, [open, range]);
  const list = items.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  return <Shell open={open} onOpenChange={onOpenChange} title={tx(lang, "Liste déroulante", "Dropdown list")} sub={tx(lang, "Les cellules proposent un choix dans la liste (▾), pour des données propres et homogènes.", "Cells offer a choice from the list (▾), for clean, consistent data.")}
    ok={tx(lang, "Créer la liste", "Create the list")} disabled={!list.length} onOk={() => { onAdd(r.toUpperCase().replace(/\s/g, ""), list); onOpenChange(false); }}>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Plage", "Range")}<input className={field} value={r} onChange={(e) => setR(e.target.value)} /></label>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Choix (un par ligne)", "Choices (one per line)")}<textarea className={`${field} h-32 py-2`} value={items} onChange={(e) => setItems(e.target.value)} /></label>
  </Shell>;
}

export type PivotField = { c: number; label: string; num: boolean };
export type PivotDraft = Omit<PivotConfig, "source" | "range">;

/** Tableau croisé dynamique: rows, optional columns, up to 3 values, an optional filter, totals and a chart,
    with a live preview of the first rows. */
export function PivotDialog({ open, onOpenChange, lang, fields, source, initial, distinct, preview, onBuild }: {
  open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; fields: PivotField[]; source: string; initial: PivotDraft | null;
  distinct: (col: number) => string[]; preview: (d: PivotDraft) => string[][]; onBuild: (d: PivotDraft) => void;
}) {
  const firstText = fields.find((f) => !f.num) ?? fields[0];
  const firstNum = fields.find((f) => f.num && f.c !== firstText?.c) ?? fields[1] ?? fields[0];
  const fresh = (): PivotDraft => ({ rows: firstText?.c ?? 0, cols: null, values: [{ col: firstNum?.c ?? 0, agg: firstNum?.num ? "sum" : "count" }], filter: null, totals: true, chart: true });
  const [d, setD] = useState<PivotDraft>(initial ?? fresh());
  useEffect(() => { if (open) setD(initial ?? fresh()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (p: Partial<PivotDraft>) => setD((x) => ({ ...x, ...p }));
  const opts = (none?: string) => <>{none && <option value="-1">{none}</option>}{fields.map((f) => <option key={f.c} value={f.c}>{f.label} ({colName(f.c)})</option>)}</>;
  const rows = useMemo(() => (open && fields.length ? preview(d) : []), [open, d, fields.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterValues = useMemo(() => (d.filter ? distinct(d.filter.col) : []), [d.filter?.col]); // eslint-disable-line react-hooks/exhaustive-deps
  const lab = "grid gap-1 text-[12.5px] font-medium";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[860px] rounded-2xl">
      <DialogTitle>{initial ? tx(lang, "Modifier le tableau croisé dynamique", "Edit the pivot table") : tx(lang, "Tableau croisé dynamique", "Pivot table")}</DialogTitle>
      <DialogDescription>{tx(lang, `Source : ${source}. Choisissez ce qui va en lignes, en colonnes et les valeurs à calculer ; le tableau se met à jour avec vos données.`, `Source: ${source}. Choose rows, columns and the values to compute; the table updates with your data.`)}</DialogDescription>
      <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className={lab}>{tx(lang, "Lignes", "Rows")}<select className={field} value={d.rows} onChange={(e) => patch({ rows: Number(e.target.value) })}>{opts()}</select></label>
          <label className={lab}>{tx(lang, "Colonnes", "Columns")}<select className={field} value={d.cols ?? -1} onChange={(e) => { const v = Number(e.target.value); patch({ cols: v < 0 ? null : v }); }}>{opts(tx(lang, "(aucune)", "(none)"))}</select></label>
          <div className="grid gap-1.5 text-[12.5px] font-medium">{tx(lang, "Valeurs", "Values")}
            {d.values.map((v, i) => <div key={i} className="flex gap-1.5">
              <select className={`${field.replace("w-full ", "")} w-[112px] shrink-0 px-2`} value={v.agg} onChange={(e) => patch({ values: d.values.map((x, k) => (k === i ? { ...x, agg: e.target.value as PivotAgg } : x)) })}>{PIVOT_AGGS.map((a) => <option key={a.id} value={a.id}>{a[lang]}</option>)}</select>
              <select className={`${field.replace("w-full ", "")} min-w-0 flex-1`} value={v.col} onChange={(e) => patch({ values: d.values.map((x, k) => (k === i ? { ...x, col: Number(e.target.value) } : x)) })}>{opts()}</select>
              {d.values.length > 1 && <button type="button" aria-label={tx(lang, "Retirer cette valeur", "Remove this value")} onClick={() => patch({ values: d.values.filter((_, k) => k !== i) })} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary">×</button>}
            </div>)}
            {d.values.length < 3 && <button type="button" onClick={() => patch({ values: [...d.values, { col: firstNum?.c ?? 0, agg: "sum" }] })} className="h-9 rounded-xl border border-dashed border-border text-[12.5px] text-muted-foreground hover:bg-secondary">+ {tx(lang, "Ajouter une valeur", "Add a value")}</button>}
          </div>
          <label className={lab}>{tx(lang, "Filtre", "Filter")}<select className={field} value={d.filter?.col ?? -1} onChange={(e) => { const v = Number(e.target.value); patch({ filter: v < 0 ? null : { col: v, value: distinct(v)[0] ?? "" } }); }}>{opts(tx(lang, "(aucun)", "(none)"))}</select></label>
          {d.filter && <select className={field} aria-label={tx(lang, "Valeur du filtre", "Filter value")} value={d.filter.value} onChange={(e) => patch({ filter: { col: d.filter!.col, value: e.target.value } })}>{filterValues.map((v) => <option key={v} value={v}>{v}</option>)}</select>}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[12.5px]">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.totals} onChange={(e) => patch({ totals: e.target.checked })} />{tx(lang, "Totaux généraux", "Grand totals")}</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.chart} onChange={(e) => patch({ chart: e.target.checked })} />{tx(lang, "Graphique", "Chart")}</label>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">{tx(lang, "Aperçu", "Preview")}</p>
          <div className="max-h-[340px] overflow-auto rounded-xl border border-border bg-white text-[12px] text-zinc-900">
            {rows.length > 1 ? <table className="w-full border-collapse">
              <thead><tr>{rows[0]!.map((h, i) => <th key={i} className="whitespace-nowrap border border-[#d7e6df] bg-[#1f7a5a] px-2 py-1.5 text-left font-semibold text-white">{h}</th>)}</tr></thead>
              <tbody>{rows.slice(1).map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k} className={`whitespace-nowrap border border-[#eef0f2] px-2 py-1 ${k ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>)}</tbody>
            </table> : <p className="p-4 text-muted-foreground">{tx(lang, "Aucune donnée à regrouper avec ces choix.", "No data to group with these choices.")}</p>}
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{tx(lang, "Le tableau est créé dans une nouvelle feuille, avec des formules (SOMME.SI.ENS…) qui suivent vos données et s'ouvrent telles quelles dans Excel. « Actualiser » ajoute les nouvelles catégories.", "The table is created in a new sheet with formulas (SUMIFS…) that follow your data and open as is in Excel. « Refresh » adds new categories.")}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-full border border-border px-4 text-[13px] hover:bg-secondary">{tx(lang, "Annuler", "Cancel")}</button>
        <button type="button" disabled={!fields.length || rows.length < 2} onClick={() => { onBuild(d); onOpenChange(false); }} className="h-10 rounded-full bg-[#1f7a5a] px-5 text-[13px] font-semibold text-white disabled:opacity-50">{initial ? tx(lang, "Mettre à jour", "Update") : tx(lang, "Créer le tableau croisé", "Create the pivot table")}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
