import { type Evaluator, isErr, type Value } from "./formula";
import { type Cell, type CondRule, type Rect, type Sheet, addr, colName, display, parseLiteral, parseRange, uid } from "./model";

// TechNova Tableur, advanced features: column filters, conditional formatting (rules, data bars, colour scale),
// dropdown lists, merged cells and the summary table (pivot) written with live SOMME.SI / NB.SI formulas.

const inRect = (r: Rect, c: number, row: number) => c >= r.c1 && c <= r.c2 && row >= r.r1 && row <= r.r2;
const text = (v: Value) => (v === null ? "" : isErr(v) ? v.err : typeof v === "boolean" ? (v ? "VRAI" : "FAUX") : String(v));

// ------------------------------------------------------------------ filters

/** Rows hidden by the sheet's filter (never its header row). */
export function hiddenRows(sh: Sheet, ev: Evaluator, si: number): Set<number> {
  const out = new Set<number>();
  const f = sh.filter; if (!f) return out;
  const r = parseRange(f.range); if (!r) return out;
  const cols = Object.entries(f.hide).filter(([, v]) => v.length);
  if (!cols.length) return out;
  for (let row = r.r1 + 1; row <= Math.min(r.r2, sh.rows - 1); row++) {
    for (const [c, hidden] of cols) {
      const cell = sh.cells[addr(Number(c), row)];
      if (hidden.includes(display(ev.value(si, Number(c), row), cell?.s))) { out.add(row); break; }
    }
  }
  return out;
}
/** The distinct shown values of a filter column (for the ▾ menu), with how many rows hold each. */
export function columnValues(sh: Sheet, ev: Evaluator, si: number, c: number): { value: string; count: number }[] {
  const r = sh.filter ? parseRange(sh.filter.range) : null; if (!r) return [];
  const map = new Map<string, number>();
  for (let row = r.r1 + 1; row <= Math.min(r.r2, sh.rows - 1); row++) {
    const v = display(ev.value(si, c, row), sh.cells[addr(c, row)]?.s);
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "fr", { numeric: true }));
}

// ------------------------------------------------------------------ conditional formatting

export type CondLook = { bg?: string; color?: string; b?: boolean; bar?: { pct: number; color: string } };

/** Precomputes every rule (min / max, duplicates, top values) and returns the look of a cell. */
export function condLooks(sh: Sheet, ev: Evaluator, si: number): (c: number, r: number) => CondLook | null {
  const rules = (sh.cond ?? []).map((rule) => {
    const rect = parseRange(rule.range); if (!rect) return null;
    const nums: number[] = []; const counts = new Map<string, number>();
    for (let r = rect.r1; r <= Math.min(rect.r2, sh.rows - 1); r++) for (let c = rect.c1; c <= Math.min(rect.c2, sh.cols - 1); c++) {
      const v = ev.value(si, c, r);
      if (typeof v === "number") nums.push(v);
      if (v !== null && v !== "") counts.set(text(v).toLowerCase(), (counts.get(text(v).toLowerCase()) ?? 0) + 1);
    }
    const sorted = [...nums].sort((a, b) => b - a);
    const topN = Math.max(1, Math.min(sorted.length, Number(rule.a) || 3));
    return { rule, rect, min: Math.min(...nums), max: Math.max(...nums), topMin: sorted[topN - 1] ?? Infinity, counts };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  if (!rules.length) return () => null;
  return (c, r) => {
    let look: CondLook | null = null;
    for (const { rule, rect, min, max, topMin, counts } of rules) {
      if (!inRect(rect, c, r)) continue;
      const v = ev.value(si, c, r);
      const n = typeof v === "number" ? v : null;
      const a = parseLiteral(rule.a ?? "").value, b = parseLiteral(rule.b ?? "").value;
      let hit = false;
      switch (rule.kind) {
        case "gt": hit = n !== null && typeof a === "number" && n > a; break;
        case "lt": hit = n !== null && typeof a === "number" && n < a; break;
        case "between": hit = n !== null && typeof a === "number" && typeof b === "number" && n >= Math.min(a, b) && n <= Math.max(a, b); break;
        case "eq": hit = v !== null && text(v).toLowerCase() === String(rule.a ?? "").trim().toLowerCase(); break;
        case "contains": hit = !!rule.a && text(v).toLowerCase().includes(rule.a.toLowerCase()); break;
        case "neg": hit = n !== null && n < 0; break;
        case "dup": hit = v !== null && v !== "" && (counts.get(text(v).toLowerCase()) ?? 0) > 1; break;
        case "top": hit = n !== null && n >= topMin; break;
        case "bars": if (n !== null && Number.isFinite(max)) look = { ...(look ?? {}), bar: { pct: max > Math.min(0, min) ? Math.max(0, (n - Math.min(0, min)) / (max - Math.min(0, min))) : 0, color: rule.style?.bg ?? "#60a5fa" } }; continue;
        case "scale": if (n !== null && max > min) { const t = (n - min) / (max - min); look = { ...(look ?? {}), bg: scaleColor(t) }; } continue;
      }
      if (hit) look = { ...(look ?? {}), ...rule.style };
    }
    return look;
  };
}
/** Red → yellow → green, light enough to read dark text on it. */
function scaleColor(t: number) {
  const mix = (x: number[], y: number[], k: number) => x.map((v, i) => Math.round(v + (y[i]! - v) * k));
  const red = [248, 180, 180], yellow = [253, 230, 160], green = [170, 220, 180];
  const c = t < 0.5 ? mix(red, yellow, t * 2) : mix(yellow, green, (t - 0.5) * 2);
  return `rgb(${c.join(",")})`;
}

export const COND_KINDS: { id: CondRule["kind"]; fr: string; en: string; needs: 0 | 1 | 2 }[] = [
  { id: "gt", fr: "Supérieur à", en: "Greater than", needs: 1 },
  { id: "lt", fr: "Inférieur à", en: "Less than", needs: 1 },
  { id: "between", fr: "Entre", en: "Between", needs: 2 },
  { id: "eq", fr: "Égal à", en: "Equal to", needs: 1 },
  { id: "contains", fr: "Le texte contient", en: "Text contains", needs: 1 },
  { id: "neg", fr: "Nombres négatifs", en: "Negative numbers", needs: 0 },
  { id: "dup", fr: "Valeurs en double", en: "Duplicate values", needs: 0 },
  { id: "top", fr: "Les N plus grandes valeurs", en: "Top N values", needs: 1 },
  { id: "bars", fr: "Barres de données", en: "Data bars", needs: 0 },
  { id: "scale", fr: "Échelle de couleurs (rouge → vert)", en: "Colour scale (red → green)", needs: 0 },
];

// ------------------------------------------------------------------ merges and lists

export type MergeMap = { master: Map<string, { cs: number; rs: number }>; covered: Set<string> };
export function mergeMap(sh: Sheet): MergeMap {
  const master = new Map<string, { cs: number; rs: number }>(); const covered = new Set<string>();
  for (const m of sh.merges ?? []) {
    const r = parseRange(m); if (!r) continue;
    master.set(addr(r.c1, r.r1), { cs: r.c2 - r.c1 + 1, rs: r.r2 - r.r1 + 1 });
    for (let row = r.r1; row <= r.r2; row++) for (let c = r.c1; c <= r.c2; c++) if (row !== r.r1 || c !== r.c1) covered.add(addr(c, row));
  }
  return { master, covered };
}
export const listAt = (sh: Sheet, c: number, r: number) => (sh.lists ?? []).find((l) => { const rect = parseRange(l.range); return !!rect && inRect(rect, c, r); });

// ------------------------------------------------------------------ summary table (pivot)

export type PivotAgg = "sum" | "avg" | "count" | "min" | "max";
export const PIVOT_AGGS: { id: PivotAgg; fr: string; en: string; fn: string }[] = [
  { id: "sum", fr: "Somme", en: "Sum", fn: "SOMME.SI" },
  { id: "avg", fr: "Moyenne", en: "Average", fn: "MOYENNE.SI" },
  { id: "count", fr: "Nombre", en: "Count", fn: "NB.SI" },
  { id: "min", fr: "Minimum", en: "Minimum", fn: "MIN.SI.ENS" },
  { id: "max", fr: "Maximum", en: "Maximum", fn: "MAX.SI.ENS" },
];

/** A new sheet summarising `source` (header row first): one row per value of `groupCol`, live formulas. */
export function buildPivot(sh: Sheet, ev: Evaluator, si: number, source: Rect, groupCol: number, valueCol: number, agg: PivotAgg, title: string): Sheet {
  const q = (n: string) => (/^[A-Za-z0-9_]+$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`);
  const ref = (c: number) => `${q(sh.name)}!$${colName(c)}$${source.r1 + 2}:$${colName(c)}$${source.r2 + 1}`;
  const groups: string[] = [];
  for (let r = source.r1 + 1; r <= source.r2; r++) {
    const v = ev.value(si, groupCol, r); const t = text(v).trim();
    if (t && !groups.includes(t)) groups.push(t);
  }
  groups.sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const header = text(ev.value(si, groupCol, source.r1)) || colName(groupCol);
  const valueHead = text(ev.value(si, valueCol, source.r1)) || colName(valueCol);
  const a = PIVOT_AGGS.find((x) => x.id === agg)!;
  const cells: Record<string, Cell> = {};
  const head = { b: true, bg: "#1f7a5a", color: "#ffffff", align: "center" as const, border: true };
  cells["A1"] = { v: title, s: { b: true, size: 16, color: "#1f7a5a" } };
  cells["A3"] = { v: header, s: head };
  cells["B3"] = { v: `${a.fr} de ${valueHead}`, s: head };
  const fmt = sh.cells[addr(valueCol, source.r1 + 1)]?.s?.fmt;
  groups.forEach((g, i) => {
    const r = 4 + i;
    cells[`A${r}`] = { v: g, s: { border: true } };
    const crit = `A${r}`;
    const f = agg === "count" ? `=NB.SI(${ref(groupCol)};${crit})`
      : agg === "min" || agg === "max" ? `=${a.fn}(${ref(valueCol)};${ref(groupCol)};${crit})`
      : `=${a.fn}(${ref(groupCol)};${crit};${ref(valueCol)})`;
    cells[`B${r}`] = { v: f, s: { border: true, ...(agg !== "count" && fmt ? { fmt } : {}), ...(agg === "avg" ? { dec: 2 } : {}) } };
  });
  const last = 3 + groups.length;
  if (agg === "sum" || agg === "count") {
    cells[`A${last + 1}`] = { v: "Total", s: { b: true, border: true, bg: "#eef0f4" } };
    cells[`B${last + 1}`] = { v: `=SOMME(B4:B${last})`, s: { b: true, border: true, bg: "#eef0f4", ...(agg === "sum" && fmt ? { fmt } : {}) } };
  }
  return {
    id: uid(), name: title.slice(0, 31), cells, rows: Math.max(60, last + 20), cols: 12, colW: { 0: 220, 1: 170 }, rowH: {}, grid: true, freeze: false,
    charts: groups.length > 1 && groups.length <= 24 ? [{ id: uid(), kind: groups.length <= 6 && agg !== "avg" ? "pie" : "bar", range: `A4:A${last},B4:B${last}`, title: `${a.fr} de ${valueHead} par ${header}`, x: 420, y: 60, w: 480, h: 300 }] : [],
  };
}
