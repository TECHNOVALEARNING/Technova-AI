// Ribbon tools of TechNova Tableur that work on the workbook itself: find & replace, remove duplicates, error
// checking and workbook statistics. Pure functions; the editor applies the results through its undo history.

import { type Evaluator, isErr, shiftFormula, type Value } from "./formula";
import { type Cell, type Rect, type Sheet, type Workbook, addr, display, parseAddr } from "./model";

export type FindOpts = { q: string; rep: string; caseSens: boolean; whole: boolean; formulas: boolean; allSheets: boolean };
export type Match = { s: number; c: number; r: number };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sortedKeys = (sh: Sheet) => Object.keys(sh.cells).map((k) => parseAddr(k)).filter((p): p is { c: number; r: number } => !!p).sort((a, b) => a.r - b.r || a.c - b.c);

/** Cells whose shown value (or formula, with « Dans les formules ») contains the search, row by row. */
export function findMatches(wb: Workbook, ev: Evaluator, si: number, o: FindOpts): Match[] {
  if (!o.q) return [];
  const norm = (t: string) => (o.caseSens ? t : t.toLocaleLowerCase("fr"));
  const q = norm(o.q);
  const out: Match[] = [];
  const sheets = o.allSheets ? wb.sheets.map((_, i) => i) : [si];
  for (const s of sheets) {
    const sh = wb.sheets[s]!;
    for (const p of sortedKeys(sh)) {
      const cell = sh.cells[addr(p.c, p.r)]!;
      const hay = norm(o.formulas ? cell.v : display(ev.value(s, p.c, p.r), cell.s));
      if (o.whole ? hay === q : hay.includes(q)) out.push({ s, c: p.c, r: p.r });
    }
  }
  return out;
}

/** The match after (or before, with `back`) the given position, wrapping around. */
export function stepMatch(list: Match[], at: Match, back: boolean): number {
  const after = (m: Match) => m.s > at.s || (m.s === at.s && (m.r > at.r || (m.r === at.r && m.c > at.c)));
  const before = (m: Match) => m.s < at.s || (m.s === at.s && (m.r < at.r || (m.r === at.r && m.c < at.c)));
  if (!back) { const i = list.findIndex(after); return i >= 0 ? i : 0; }
  for (let i = list.length - 1; i >= 0; i--) if (before(list[i]!)) return i;
  return list.length - 1;
}

/** What a cell becomes after « Remplacer »: always in what was typed (text or formula), never in a computed value. */
export function replaceIn(raw: string, o: FindOpts): string | null {
  if (o.whole) return (o.caseSens ? raw === o.q : raw.toLocaleLowerCase("fr") === o.q.toLocaleLowerCase("fr")) ? o.rep : null;
  const re = new RegExp(escapeRe(o.q), o.caseSens ? "g" : "gi");
  if (!re.test(raw)) return null;
  return raw.replace(new RegExp(escapeRe(o.q), o.caseSens ? "g" : "gi"), () => o.rep);
}

const key = (v: Value) => (v === null ? "" : isErr(v) ? v.err : String(v));

/** « Supprimer les doublons »: rows of `b` (first row = headers) identical to an earlier row on every column. */
export function duplicateRows(ev: Evaluator, si: number, b: Rect): { keep: number[]; removed: number } {
  const seen = new Set<string>(); const keep: number[] = []; let removed = 0;
  for (let r = b.r1 + 1; r <= b.r2; r++) {
    const k = Array.from({ length: b.c2 - b.c1 + 1 }, (_, i) => key(ev.value(si, b.c1 + i, r)).trim()).join("\u0001");
    if (seen.has(k)) { removed++; continue; }
    seen.add(k); keep.push(r);
  }
  return { keep, removed };
}

/** Moves the kept rows up inside the block (formulas follow their row) and empties the rest of the block. */
export function applyDedupe(sh: Sheet, b: Rect, keep: number[]) {
  const moved: [string, Cell][] = [];
  keep.forEach((r, i) => {
    const nr = b.r1 + 1 + i;
    for (let c = b.c1; c <= b.c2; c++) {
      const cell = sh.cells[addr(c, r)];
      if (cell) moved.push([addr(c, nr), nr === r || !cell.v.startsWith("=") ? cell : { ...cell, v: shiftFormula(cell.v, 0, nr - r) }]);
    }
  });
  for (let r = b.r1 + 1; r <= b.r2; r++) for (let c = b.c1; c <= b.c2; c++) delete sh.cells[addr(c, r)];
  for (const [k, cell] of moved) sh.cells[k] = cell;
}

/** Cells of the sheet whose value is an error (#DIV/0!, #N/A, #REF!…), row by row. */
export function errorCells(sh: Sheet, ev: Evaluator, si: number): { c: number; r: number }[] {
  return sortedKeys(sh).filter((p) => isErr(ev.value(si, p.c, p.r)));
}

export function workbookStats(wb: Workbook) {
  let cells = 0, formulas = 0, notes = 0, charts = 0;
  for (const sh of wb.sheets) {
    charts += sh.charts.length;
    for (const cell of Object.values(sh.cells)) { if (cell.v !== "") cells++; if (cell.v.startsWith("=")) formulas++; if (cell.n) notes++; }
  }
  return { sheets: wb.sheets.length, cells, formulas, notes, charts, pivots: wb.sheets.filter((s) => s.pivot).length };
}
