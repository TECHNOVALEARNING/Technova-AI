// TechNova Tableur: the workbook model shared by the editor, the formula engine, the AI assistant and the
// import / export code. Cells keep what the user typed (a value or a "=formula"); results are computed in the
// browser (formula.ts). Nothing here is stored on TechNova's servers.

export type NumFmt = "general" | "number" | "fcfa" | "eur" | "usd" | "percent" | "date" | "text";
export type CellStyle = {
  b?: boolean; i?: boolean; u?: boolean; strike?: boolean;
  color?: string; bg?: string; size?: number; font?: string;
  align?: "left" | "center" | "right"; wrap?: boolean;
  fmt?: NumFmt; dec?: number; border?: boolean;
};
export type Cell = { v: string; s?: CellStyle };
export type ChartKind = "bar" | "line" | "area" | "pie";
export type SheetChart = { id: string; kind: ChartKind; range: string; title: string; x: number; y: number; w: number; h: number };
export type Sheet = {
  id: string; name: string; cells: Record<string, Cell>; rows: number; cols: number;
  colW: Record<number, number>; rowH: Record<number, number>; grid: boolean; freeze: boolean; charts: SheetChart[]; tab?: string;
};
export type Workbook = { title: string; sheets: Sheet[] };

export const DEFAULT_COL_W = 104;
export const DEFAULT_ROW_H = 26;
export const MAX_ROWS = 2000;
export const MAX_COLS = 60;

export const uid = () => Math.random().toString(36).slice(2, 10);

export function colName(c: number): string {
  let s = ""; let n = c + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
export function colIndex(name: string): number {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export const addr = (c: number, r: number) => `${colName(c)}${r + 1}`;
export function parseAddr(a: string): { c: number; r: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,6})$/.exec(a.trim());
  if (!m) return null;
  return { c: colIndex(m[1]!), r: Number(m[2]) - 1 };
}
export type Rect = { c1: number; r1: number; c2: number; r2: number };
export function parseRange(s: string): Rect | null {
  const [a, b] = s.trim().split(":");
  const p = a ? parseAddr(a) : null; const q = b ? parseAddr(b) : p;
  if (!p || !q) return null;
  return { c1: Math.min(p.c, q.c), r1: Math.min(p.r, q.r), c2: Math.max(p.c, q.c), r2: Math.max(p.r, q.r) };
}
export const rangeText = (r: Rect) => (r.c1 === r.c2 && r.r1 === r.r2 ? addr(r.c1, r.r1) : `${addr(r.c1, r.r1)}:${addr(r.c2, r.r2)}`);

export function newSheet(name: string, rows = 100, cols = 26): Sheet {
  return { id: uid(), name, cells: {}, rows, cols, colW: {}, rowH: {}, grid: true, freeze: false, charts: [] };
}
export function newWorkbook(title = "Classeur sans titre"): Workbook {
  return { title, sheets: [newSheet("Feuille 1")] };
}

/** Excel's serial dates (days since 1899-12-30), so dates add and subtract like numbers. */
export const dateToSerial = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86_400_000);
export const serialToDate = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000);

/** What a typed literal means: number (French or English notation), percentage, date, boolean or text. */
export function parseLiteral(raw: string): { value: number | string | boolean; fmt?: NumFmt } {
  const t = raw.trim();
  if (t === "") return { value: "" };
  if (/^(vrai|true)$/i.test(t)) return { value: true };
  if (/^(faux|false)$/i.test(t)) return { value: false };
  const pct = /^(-?[\d\s  ]*[.,]?\d+)\s*%$/.exec(t);
  if (pct) { const n = toNumber(pct[1]!); if (n !== null) return { value: n / 100, fmt: "percent" }; }
  const date = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (date) {
    const d = new Date(Number(date[3]), Number(date[2]) - 1, Number(date[1]));
    if (!Number.isNaN(d.getTime()) && d.getDate() === Number(date[1])) return { value: dateToSerial(d), fmt: "date" };
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return { value: dateToSerial(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))), fmt: "date" };
  const money = /^(-?[\d\s  .,]+)\s*(fcfa|xof|f cfa|€|eur)$/i.exec(t) ?? /^(\$)\s*(-?[\d,.]+)$/.exec(t);
  if (money) {
    const isUsd = money[1] === "$";
    const n = toNumber(isUsd ? money[2]! : money[1]!);
    if (n !== null) return { value: n, fmt: isUsd ? "usd" : /€|eur/i.test(money[2]!) ? "eur" : "fcfa" };
  }
  const n = toNumber(t);
  if (n !== null) return { value: n };
  return { value: t };
}

/** "1 234,5", "1234.5", "1,234.5" → number; anything else → null. */
export function toNumber(s: string): number | null {
  let t = s.replace(/[\s  ]/g, "");
  if (!/^-?[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
  const lastComma = t.lastIndexOf(","), lastDot = t.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) t = lastComma > lastDot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (lastComma > -1) t = t.match(/,/g)!.length > 1 ? t.replace(/,/g, "") : t.replace(",", ".");
  else if ((t.match(/\./g)?.length ?? 0) > 1) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const group = (n: number, dec: number, locale: string) => n.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** How a computed value is shown in the grid (and in exports that keep the look). */
export function display(v: unknown, s?: CellStyle): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "object" && v && "err" in v) return String((v as { err: string }).err);
  if (typeof v === "boolean") return v ? "VRAI" : "FAUX";
  if (typeof v === "string") return v;
  if (typeof v !== "number" || !Number.isFinite(v)) return String(v);
  const fmt = s?.fmt ?? "general";
  const dec = s?.dec;
  switch (fmt) {
    case "number": return group(v, dec ?? 2, "fr-FR");
    case "fcfa": return `${group(v, dec ?? 0, "fr-FR")} FCFA`;
    case "eur": return `${group(v, dec ?? 2, "fr-FR")} €`;
    case "usd": return `$${group(v, dec ?? 2, "en-US")}`;
    case "percent": return `${group(v * 100, dec ?? 0, "fr-FR")} %`;
    case "date": { const d = serialToDate(v); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; }
    case "text": return String(v);
    default: {
      if (dec !== undefined) return group(v, dec, "fr-FR");
      if (Number.isInteger(v)) return Math.abs(v) >= 10000 ? group(v, 0, "fr-FR") : String(v);
      return String(Math.round(v * 1e10) / 1e10).replace(".", ",");
    }
  }
}

export const isNumericFmt = (s?: CellStyle) => !!s?.fmt && s.fmt !== "general" && s.fmt !== "text";
