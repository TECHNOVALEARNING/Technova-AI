import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { COND_KINDS, PIVOT_AGGS, type PivotAgg } from "@/lib/sheet/advanced";
import { type CondRule, colName, uid } from "@/lib/sheet/model";

// Dialogs of the « Données » menu: conditional formatting, dropdown list, summary table.

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

export function PivotDialog({ open, onOpenChange, lang, headers, onBuild }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; headers: { c: number; label: string }[]; onBuild: (group: number, value: number, agg: PivotAgg) => void }) {
  const [group, setGroup] = useState(headers[0]?.c ?? 0); const [value, setValue] = useState(headers[1]?.c ?? 0); const [agg, setAgg] = useState<PivotAgg>("sum");
  useEffect(() => { if (open) { setGroup(headers[0]?.c ?? 0); setValue(headers[Math.min(1, headers.length - 1)]?.c ?? 0); } }, [open, headers]);
  const opt = (h: { c: number; label: string }) => <option key={h.c} value={h.c}>{colName(h.c)} · {h.label}</option>;
  return <Shell open={open} onOpenChange={onOpenChange} title={tx(lang, "Tableau récapitulatif", "Summary table")} sub={tx(lang, "Regroupe vos lignes (par produit, client, mois…) et calcule un total, une moyenne ou un nombre, dans une nouvelle feuille qui se met à jour toute seule.", "Groups your rows (by product, customer, month…) and computes a total, average or count, in a new sheet that updates itself.")}
    ok={tx(lang, "Créer le récapitulatif", "Create the summary")} disabled={headers.length < 1} onOk={() => { onBuild(group, value, agg); onOpenChange(false); }}>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Regrouper par", "Group by")}<select className={field} value={group} onChange={(e) => setGroup(Number(e.target.value))}>{headers.map(opt)}</select></label>
    <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "Calcul", "Calculation")}<select className={field} value={agg} onChange={(e) => setAgg(e.target.value as PivotAgg)}>{PIVOT_AGGS.map((p) => <option key={p.id} value={p.id}>{p[lang]}</option>)}</select></label>
    {agg !== "count" && <label className="grid gap-1 text-[12.5px] font-medium">{tx(lang, "De la colonne", "Of the column")}<select className={field} value={value} onChange={(e) => setValue(Number(e.target.value))}>{headers.map(opt)}</select></label>}
  </Shell>;
}
