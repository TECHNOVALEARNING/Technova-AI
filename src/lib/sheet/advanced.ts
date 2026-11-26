import { type Evaluator, isErr, type Value } from "./formula";
import { type Cell, type CondRule, type PivotAgg, type PivotConfig, type Rect, type Sheet, type Workbook, addr, colName, display, parseLiteral, parseRange, uid } from "./model";

// TechNova Tableur, advanced features: column filters, conditional formatting (rules, data bars, colour scale),
// dropdown lists, merged cells and pivot tables (tableaux croisés dynamiques) written with live SOMME.SI.ENS / NB.SI.ENS formulas.

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

// ------------------------------------------------------------------ pivot tables (tableaux croisés dynamiques)

export type { PivotAgg, PivotConfig } from "./model";
export const PIVOT_AGGS: { id: PivotAgg; fr: string; en: string }[] = [
  { id: "sum", fr: "Somme", en: "Sum" },
  { id: "count", fr: "Nombre", en: "Count" },
  { id: "avg", fr: "Moyenne", en: "Average" },
  { id: "min", fr: "Minimum", en: "Minimum" },
  { id: "max", fr: "Maximum", en: "Maximum" },
];
export const PIVOT_MAX_COL_ITEMS = 30;
export const PIVOT_MAX_ROW_ITEMS = 500;

/** The filled block around (c, r): grows while a neighbouring row or column holds a value. */
export function blockAround(sh: Sheet, c: number, r: number): Rect {
  const filled = (cc: number, rr: number) => (sh.cells[addr(cc, rr)]?.v ?? "") !== "";
  let c1 = c, c2 = c, r1 = r, r2 = r, grew = true;
  const span = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  while (grew) {
    grew = false;
    if (r1 > 0 && span(c1, c2).some((x) => filled(x, r1 - 1))) { r1--; grew = true; }
    if (r2 < sh.rows - 1 && span(c1, c2).some((x) => filled(x, r2 + 1))) { r2++; grew = true; }
    if (c1 > 0 && span(r1, r2).some((y) => filled(c1 - 1, y))) { c1--; grew = true; }
    if (c2 < sh.cols - 1 && span(r1, r2).some((y) => filled(c2 + 1, y))) { c2++; grew = true; }
  }
  return { c1, c2, r1, r2 };
}

const keyOf = (v: Value) => text(v).trim();
// Month and weekday names sort in calendar order (Janvier, Février… / Lun, Mar…), like Excel's custom lists.
const CALENDAR: string[][] = [
  ["janvier", "janv", "jan", "january"], ["fevrier", "fevr", "fev", "february", "feb"], ["mars", "mar", "march"], ["avril", "avr", "april", "apr"],
  ["mai", "may"], ["juin", "jun", "june"], ["juillet", "juil", "jul", "july"], ["aout", "aug", "august"], ["septembre", "sept", "sep", "september"],
  ["octobre", "oct", "october"], ["novembre", "nov", "november"], ["decembre", "dec", "december"],
];
const WEEK: string[][] = [["lundi", "lun", "monday", "mon"], ["mardi", "tuesday", "tue"], ["mercredi", "mer", "wednesday", "wed"], ["jeudi", "jeu", "thursday", "thu"], ["vendredi", "ven", "friday", "fri"], ["samedi", "sam", "saturday", "sat"], ["dimanche", "dim", "sunday", "sun"]];
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.$/, "").trim();
const rankIn = (list: string[][], v: Value) => { const k = fold(keyOf(v)); return list.findIndex((names) => names.includes(k)); };
function sortList(items: Value[]): Value[] {
  for (const list of [CALENDAR, WEEK]) if (items.length && items.every((v) => typeof v === "string" && rankIn(list, v) >= 0)) return [...items].sort((a, b) => rankIn(list, a) - rankIn(list, b));
  return [...items].sort(sortItems);
}
const sortItems = (a: Value, b: Value) => (typeof a === "number" && typeof b === "number" ? a - b : typeof a === "number" ? -1 : typeof b === "number" ? 1 : keyOf(a).localeCompare(keyOf(b), "fr", { numeric: true }));

/** Distinct values of a source column (header row excluded), for the filter picker. */
export function distinctValues(ev: Evaluator, si: number, src: Rect, col: number): string[] {
  const seen = new Map<string, Value>();
  for (let r = src.r1 + 1; r <= src.r2; r++) { const v = ev.value(si, col, r); const k = keyOf(v); if (k && !seen.has(k)) seen.set(k, v); }
  return sortList([...seen.values()]).map(keyOf);
}

function pivotItems(ev: Evaluator, si: number, src: Rect, cfg: PivotConfig) {
  const rowsSeen = new Map<string, Value>(), colsSeen = new Map<string, Value>(), kept: number[] = [];
  for (let r = src.r1 + 1; r <= src.r2; r++) {
    if (cfg.filter && keyOf(ev.value(si, cfg.filter.col, r)) !== cfg.filter.value) continue;
    const rv = ev.value(si, cfg.rows, r); const rk = keyOf(rv);
    if (!rk) continue;
    kept.push(r);
    if (!rowsSeen.has(rk)) rowsSeen.set(rk, rv);
    if (cfg.cols !== null) { const cv = ev.value(si, cfg.cols, r); const ck = keyOf(cv); if (ck && !colsSeen.has(ck)) colsSeen.set(ck, cv); }
  }
  return { rowItems: sortList([...rowsSeen.values()]), colItems: sortList([...colsSeen.values()]), kept };
}

const aggName = (agg: PivotAgg, lang: "fr" | "en") => PIVOT_AGGS.find((a) => a.id === agg)![lang];
const valueTitle = (agg: PivotAgg, label: string, lang: "fr" | "en") => (lang === "fr" ? `${aggName(agg, lang)} de ${label}` : `${aggName(agg, lang)} of ${label}`);

/** Computes the table in the browser (dialog preview): header row then up to `limit` rows of text. */
export function pivotPreview(ev: Evaluator, si: number, src: Rect, cfg: PivotConfig, lang: "fr" | "en", limit = 6): string[][] {
  const head = (c: number) => keyOf(ev.value(si, c, src.r1)) || colName(c);
  const { rowItems, colItems, kept } = pivotItems(ev, si, src, cfg);
  const cols: { item: Value | null; v: PivotConfig["values"][number] }[] = [];
  if (cfg.cols === null) cfg.values.forEach((v) => cols.push({ item: null, v }));
  else { colItems.slice(0, 8).forEach((item) => cfg.values.forEach((v) => cols.push({ item, v }))); }
  const calc = (rows: number[], v: PivotConfig["values"][number]) => {
    const nums = rows.map((r) => ev.value(si, v.col, r)).filter((x): x is number => typeof x === "number");
    const nonEmpty = rows.filter((r) => keyOf(ev.value(si, v.col, r)) !== "").length;
    const x = v.agg === "sum" ? nums.reduce((a, b) => a + b, 0) : v.agg === "count" ? nonEmpty : !nums.length ? null : v.agg === "avg" ? nums.reduce((a, b) => a + b, 0) / nums.length : v.agg === "min" ? Math.min(...nums) : Math.max(...nums);
    return x === null ? "" : (Math.round(x * 100) / 100).toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  };
  const header = [head(cfg.rows), ...cols.map((c) => (c.item === null ? valueTitle(c.v.agg, head(c.v.col), lang) : cfg.values.length > 1 ? `${keyOf(c.item)} · ${aggName(c.v.agg, lang)}` : keyOf(c.item)))];
  const out = [header];
  for (const item of rowItems.slice(0, limit)) {
    const rows = kept.filter((r) => keyOf(ev.value(si, cfg.rows, r)) === keyOf(item));
    out.push([keyOf(item), ...cols.map((c) => calc(c.item === null ? rows : rows.filter((r) => keyOf(ev.value(si, cfg.cols!, r)) === keyOf(c.item)), c.v))]);
  }
  return out;
}

/** Builds (or rebuilds, keeping `keep` id/name) the pivot sheet with live formulas: SOMME.SI.ENS, NB.SI.ENS,
    MIN.SI.ENS / MAX.SI.ENS and a SIERREUR average, so it follows the data and exports to Excel as is. */
export function buildPivotTable(wb: Workbook, ev: Evaluator, cfg: PivotConfig, lang: "fr" | "en", keep: { id: string; name: string }): Sheet | { error: string } {
  const si = wb.sheets.findIndex((x) => x.id === cfg.source);
  const sh = wb.sheets[si];
  const src = parseRange(cfg.range);
  if (!sh || !src) return { error: lang === "fr" ? "La feuille source n'existe plus." : "The source sheet no longer exists." };
  if (src.r2 <= src.r1) return { error: lang === "fr" ? "La source doit avoir une ligne d'en-têtes et au moins une ligne de données." : "The source needs a header row and at least one data row." };
  const { rowItems, colItems } = pivotItems(ev, si, src, cfg);
  if (!rowItems.length) return { error: lang === "fr" ? "Aucune donnée à regrouper (vérifiez le champ Lignes et le filtre)." : "No data to group (check the Rows field and the filter)." };
  if (colItems.length > PIVOT_MAX_COL_ITEMS) return { error: lang === "fr" ? `Trop de valeurs différentes dans le champ Colonnes (${colItems.length}, ${PIVOT_MAX_COL_ITEMS} au plus).` : `Too many distinct values in the Columns field (${colItems.length}, ${PIVOT_MAX_COL_ITEMS} max).` };
  if (rowItems.length > PIVOT_MAX_ROW_ITEMS) return { error: lang === "fr" ? `Trop de valeurs différentes dans le champ Lignes (${PIVOT_MAX_ROW_ITEMS} au plus).` : `Too many distinct values in the Rows field (${PIVOT_MAX_ROW_ITEMS} max).` };

  const q = /^[A-Za-z0-9_]+$/.test(sh.name) ? sh.name : `'${sh.name.replace(/'/g, "''")}'`;
  const rng = (c: number) => `${q}!$${colName(c)}$${src.r1 + 2}:$${colName(c)}$${src.r2 + 1}`;
  const lit = (v: Value) => (typeof v === "number" ? `"=${String(v)}"` : `"=${keyOf(v).replace(/"/g, '""')}"`);
  const head = (c: number) => keyOf(ev.value(si, c, src.r1)) || colName(c);
  const filterPair = cfg.filter ? [`${rng(cfg.filter.col)};"=${cfg.filter.value.replace(/"/g, '""')}"`] : [];
  const formula = (v: PivotConfig["values"][number], pairs: string[]) => {
    const all = [...pairs, ...filterPair]; const P = all.join(";"); const val = rng(v.col);
    if (v.agg === "sum") return all.length ? `=SOMME.SI.ENS(${val};${P})` : `=SOMME(${val})`;
    if (v.agg === "count") return `=NB.SI.ENS(${val};"<>"${all.length ? ";" + P : ""})`;
    if (v.agg === "avg") return all.length ? `=SIERREUR(SOMME.SI.ENS(${val};${P})/NB.SI.ENS(${val};"<>";${P});"")` : `=SIERREUR(MOYENNE(${val});"")`;
    const fn = v.agg === "min" ? "MIN" : "MAX";
    return all.length ? `=${fn}.SI.ENS(${val};${P})` : `=${fn}(${val})`;
  };
  const fmtOf = (v: PivotConfig["values"][number]): Cell["s"] => {
    const f = sh.cells[addr(v.col, src.r1 + 1)]?.s?.fmt;
    return v.agg === "count" ? {} : v.agg === "avg" ? { ...(f ? { fmt: f } : {}), dec: 2 } : f ? { fmt: f } : {};
  };

  const cells: Record<string, Cell> = {};
  const set = (c: number, r: number, v: string, s?: Cell["s"]) => { cells[addr(c, r)] = { v, ...(s ? { s } : {}) }; };
  const headS = { b: true, bg: "#1f7a5a", color: "#ffffff", border: true, wrap: true } as Cell["s"];
  const totS = { b: true, bg: "#e8f1ed", border: true } as Cell["s"];
  const HR = 3;                         // header row (0-based): row 4
  set(0, 0, keep.name, { b: true, size: 16, color: "#1f7a5a" });
  const info = [`${lang === "fr" ? "Source" : "Source"} : ${sh.name}!${cfg.range}`, cfg.filter ? `${lang === "fr" ? "Filtre" : "Filter"} : ${head(cfg.filter.col)} = ${cfg.filter.value}` : ""].filter(Boolean).join(" · ");
  set(0, 1, info, { i: true, color: "#6b7280" });

  // Column layout: one column per value (no column field), else per column item × value, then the row totals.
  type Col = { item: Value | null; v: PivotConfig["values"][number]; total: boolean };
  const layout: Col[] = [];
  if (cfg.cols === null) cfg.values.forEach((v) => layout.push({ item: null, v, total: false }));
  else {
    colItems.forEach((item) => cfg.values.forEach((v) => layout.push({ item, v, total: false })));
    if (cfg.totals) cfg.values.forEach((v) => layout.push({ item: null, v, total: true }));
    set(1, HR - 1, `${head(cfg.cols)} ▸`, { b: true, color: "#1f7a5a" });
    if (cfg.values.length === 1) set(0, HR - 1, valueTitle(cfg.values[0]!.agg, head(cfg.values[0]!.col), lang), { b: true, color: "#374151" });
  }
  set(0, HR, head(cfg.rows), headS);
  const totalWord = lang === "fr" ? "Total général" : "Grand total";
  layout.forEach((col, k) => {
    const label = col.item === null && !col.total ? valueTitle(col.v.agg, head(col.v.col), lang)
      : col.total ? (cfg.values.length > 1 ? `${totalWord} · ${aggName(col.v.agg, lang)}` : totalWord)
      : cfg.values.length > 1 ? `${keyOf(col.item)} · ${aggName(col.v.agg, lang)}` : keyOf(col.item);
    set(k + 1, HR, label, { ...headS, align: "center" });
  });
  rowItems.forEach((item, i) => {
    const r = HR + 1 + i;
    set(0, r, typeof item === "number" ? String(item) : keyOf(item), { border: true, align: "left" });
    layout.forEach((col, k) => {
      const pairs = [`${rng(cfg.rows)};${lit(item)}`];
      if (col.item !== null && cfg.cols !== null) pairs.push(`${rng(cfg.cols)};${lit(col.item)}`);
      set(k + 1, r, formula(col.v, pairs), { border: true, ...fmtOf(col.v), ...(col.total ? { b: true, bg: "#f3f7f5" } : {}) });
    });
  });
  const last = HR + rowItems.length;
  if (cfg.totals) {
    const r = last + 1;
    set(0, r, totalWord, totS);
    layout.forEach((col, k) => {
      const pairs = col.item !== null && cfg.cols !== null ? [`${rng(cfg.cols)};${lit(col.item)}`] : [];
      set(k + 1, r, formula(col.v, pairs), { ...totS, ...fmtOf(col.v) });
    });
  }

  const colW: Record<number, number> = { 0: 200 };
  layout.forEach((_, k) => { colW[k + 1] = cfg.cols === null ? 170 : 130; });
  const charts: Sheet["charts"] = [];
  const nItems = rowItems.length;
  if (cfg.chart && nItems >= 2 && nItems <= 30) {
    const series = layout.map((c, k) => ({ c, k })).filter((x) => !x.c.total).slice(0, 8);
    const areas = [`A${HR + 1}:A${last + 1}`, ...series.map((x) => `${colName(x.k + 1)}${HR + 1}:${colName(x.k + 1)}${last + 1}`)];
    const v0 = cfg.values[0]!;
    const pie = cfg.cols === null && cfg.values.length === 1 && nItems <= 6 && (v0.agg === "sum" || v0.agg === "count");
    const x = Object.values(colW).reduce((a, b) => a + b, 0) + 60;
    charts.push({ id: uid(), kind: pie ? "pie" : "bar", range: areas.join(","), title: `${valueTitle(v0.agg, head(v0.col), lang)}${lang === "fr" ? " par " : " by "}${head(cfg.rows)}`, x, y: 70, w: 520, h: 320 });
  }
  return {
    id: keep.id, name: keep.name, cells, rows: Math.max(60, last + 20), cols: Math.max(12, layout.length + 6), colW, rowH: {}, grid: true, freeze: false,
    charts, pivot: cfg,
  };
}
