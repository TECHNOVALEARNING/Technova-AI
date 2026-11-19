// Formula engine of TechNova Tableur: a small Excel-compatible parser and evaluator that runs in the browser.
// Formulas accept English and French function names (SUM / SOMME, IF / SI, VLOOKUP / RECHERCHEV…) and both
// "," and ";" as argument separators; references can be relative or absolute ($A$1), ranges (A1:B9), whole
// columns (B:B) and other sheets ('Feuille 2'!A1). Errors use Excel's codes (#DIV/0!, #REF!, #NAME?…).

import { type Rect, type Workbook, addr, colIndex, dateToSerial, parseLiteral, serialToDate } from "./model";

export type Err = { err: string };
export type Value = number | string | boolean | null | Err;
type Matrix = { m: Value[][] };
type Arg = Value | Matrix;

export const isErr = (v: unknown): v is Err => typeof v === "object" && v !== null && "err" in v;
const E = (code: string): Err => ({ err: code });

// ---------------------------------------------------------------- tokens

type Tok =
  | { t: "num"; v: number } | { t: "str"; v: string } | { t: "op"; v: string } | { t: "id"; v: string }
  | { t: "ref"; sheet: string | null; a: string; b?: string } | { t: "cols"; sheet: string | null; a: string; b: string };

const SHEET = /^(?:'((?:[^']|'')+)'!|([A-Za-z_À-ÿ][\wÀ-ÿ.]*)!)/;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    const rest = src.slice(i);
    if (ch === '"') {
      let j = i + 1, s = "";
      while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j]; j++; }
      if (j >= src.length) throw new Error("#ERROR!");
      out.push({ t: "str", v: s }); i = j + 1; continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);
    if (num) { out.push({ t: "num", v: Number(num[0]) }); i += num[0].length; continue; }
    const sh = SHEET.exec(rest);
    const sheet = sh ? (sh[1] ? sh[1].replace(/''/g, "'") : sh[2]!) : null;
    const after = sh ? rest.slice(sh[0].length) : rest;
    const cell = /^(\$?[A-Za-z]{1,3}\$?\d{1,6})(?::(\$?[A-Za-z]{1,3}\$?\d{1,6}))?(?![\w(])/.exec(after);
    if (cell) { out.push({ t: "ref", sheet, a: cell[1]!, ...(cell[2] ? { b: cell[2] } : {}) }); i += (sh?.[0].length ?? 0) + cell[0].length; continue; }
    const cols = /^(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![\w(])/.exec(after);
    if (cols) { out.push({ t: "cols", sheet, a: cols[1]!.replace("$", ""), b: cols[2]!.replace("$", "") }); i += (sh?.[0].length ?? 0) + cols[0].length; continue; }
    if (sh) throw new Error("#REF!");
    const id = /^[A-Za-z_À-ÿ][\wÀ-ÿ.]*/.exec(rest);
    if (id) { out.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
    const op = /^(<>|<=|>=|[-+*/^&=<>(),;:%])/.exec(rest);
    if (op) { out.push({ t: "op", v: op[0] }); i += op[0].length; continue; }
    throw new Error("#ERROR!");
  }
  return out;
}

// ---------------------------------------------------------------- parser

export type Node =
  | { k: "num"; v: number } | { k: "str"; v: string } | { k: "bool"; v: boolean }
  | { k: "ref"; sheet: string | null; c: number; r: number }
  | { k: "range"; sheet: string | null; rect: Rect; wholeCols?: boolean }
  | { k: "un"; op: string; a: Node } | { k: "pct"; a: Node } | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; name: string; args: Node[] };

const PREC: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

function cellOf(s: string) {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(s)!;
  return { c: colIndex(m[1]!), r: Number(m[2]) - 1 };
}

export function parse(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => { const t = toks[p]; return t?.t === "op" && t.v === v; };
  function primary(): Node {
    const t = toks[p++];
    if (!t) throw new Error("#ERROR!");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "ref") {
      const a = cellOf(t.a);
      if (!t.b) return { k: "ref", sheet: t.sheet, ...a };
      const b = cellOf(t.b);
      return { k: "range", sheet: t.sheet, rect: { c1: Math.min(a.c, b.c), r1: Math.min(a.r, b.r), c2: Math.max(a.c, b.c), r2: Math.max(a.r, b.r) } };
    }
    if (t.t === "cols") { const a = colIndex(t.a), b = colIndex(t.b); return { k: "range", sheet: t.sheet, rect: { c1: Math.min(a, b), r1: 0, c2: Math.max(a, b), r2: 1e6 }, wholeCols: true }; }
    if (t.t === "id") {
      const name = t.v.toUpperCase();
      if (isOp("(")) {
        p++;
        const args: Node[] = [];
        if (!isOp(")")) {
          for (;;) {
            if (isOp(",") || isOp(";")) { args.push({ k: "str", v: "" }); p++; continue; }
            args.push(expr(0));
            if (isOp(",") || isOp(";")) { p++; continue; }
            break;
          }
        }
        if (!isOp(")")) throw new Error("#ERROR!");
        p++;
        return { k: "call", name, args };
      }
      if (name === "TRUE" || name === "VRAI") return { k: "bool", v: true };
      if (name === "FALSE" || name === "FAUX") return { k: "bool", v: false };
      throw new Error("#NAME?");
    }
    if (t.v === "(") { const e = expr(0); if (!isOp(")")) throw new Error("#ERROR!"); p++; return e; }
    if (t.v === "-" || t.v === "+") return { k: "un", op: t.v, a: unaryOperand() };
    throw new Error("#ERROR!");
  }
  function unaryOperand(): Node {
    let n = primary();
    while (isOp("%")) { p++; n = { k: "pct", a: n }; }
    if (isOp("^")) { p++; n = { k: "bin", op: "^", a: n, b: unaryOperand() }; }
    return n;
  }
  function expr(min: number): Node {
    let left = unaryOperand();
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || PREC[t.v] === undefined || PREC[t.v]! < min) break;
      const prec = PREC[t.v]!;
      p++;
      const right = expr(t.v === "^" ? prec : prec + 1);
      left = { k: "bin", op: t.v, a: left, b: right };
    }
    return left;
  }
  const e = expr(0);
  if (p < toks.length) throw new Error("#ERROR!");
  return e;
}

// ---------------------------------------------------------------- functions

/** French Excel names → English ones (the engine and the .xlsx export use English). */
export const FR_NAMES: Record<string, string> = {
  SOMME: "SUM", MOYENNE: "AVERAGE", NB: "COUNT", NBVAL: "COUNTA", "NB.VIDE": "COUNTBLANK", PRODUIT: "PRODUCT", MEDIANE: "MEDIAN",
  ARRONDI: "ROUND", "ARRONDI.SUP": "ROUNDUP", "ARRONDI.INF": "ROUNDDOWN", ENT: "INT", RACINE: "SQRT", PUISSANCE: "POWER",
  SI: "IF", "SI.CONDITIONS": "IFS", SIERREUR: "IFERROR", ET: "AND", OU: "OR", NON: "NOT",
  "SOMME.SI": "SUMIF", "NB.SI": "COUNTIF", "MOYENNE.SI": "AVERAGEIF", "SOMME.SI.ENS": "SUMIFS", "NB.SI.ENS": "COUNTIFS",
  RECHERCHEV: "VLOOKUP", RECHERCHEH: "HLOOKUP", RECHERCHEX: "XLOOKUP", INDEX: "INDEX", EQUIV: "MATCH",
  CONCATENER: "CONCATENATE", CONCAT: "CONCAT", JOINDRE: "TEXTJOIN", "JOINDRE.TEXTE": "TEXTJOIN", GAUCHE: "LEFT", DROITE: "RIGHT", STXT: "MID", NBCAR: "LEN",
  MAJUSCULE: "UPPER", MINUSCULE: "LOWER", NOMPROPRE: "PROPER", SUPPRESPACE: "TRIM",
  AUJOURDHUI: "TODAY", "AUJOURD'HUI": "TODAY", MAINTENANT: "NOW", ANNEE: "YEAR", MOIS: "MONTH", JOUR: "DAY",
  ESTVIDE: "ISBLANK", ESTNUM: "ISNUMBER", ESTERREUR: "ISERROR", "MAX.SI.ENS": "MAXIFS", "MIN.SI.ENS": "MINIFS",
};

/** Functions offered in the toolbar's « Fonctions » menu (French label, English name inserted as typed). */
export const FUNCTION_MENU: { fr: string; en: string; name: string; hint: string }[] = [
  { fr: "Somme", en: "Sum", name: "SOMME", hint: "=SOMME(B2:B10)" },
  { fr: "Moyenne", en: "Average", name: "MOYENNE", hint: "=MOYENNE(B2:B10)" },
  { fr: "Minimum", en: "Minimum", name: "MIN", hint: "=MIN(B2:B10)" },
  { fr: "Maximum", en: "Maximum", name: "MAX", hint: "=MAX(B2:B10)" },
  { fr: "Nombre de valeurs", en: "Count", name: "NBVAL", hint: "=NBVAL(A2:A10)" },
  { fr: "Si (condition)", en: "If", name: "SI", hint: '=SI(C2>=10;"Admis";"Ajourné")' },
  { fr: "Somme si", en: "Sum if", name: "SOMME.SI", hint: '=SOMME.SI(A2:A20;"Loyer";B2:B20)' },
  { fr: "Nombre si", en: "Count if", name: "NB.SI", hint: '=NB.SI(C2:C20;"Payé")' },
  { fr: "Recherche (RECHERCHEX)", en: "Lookup (XLOOKUP)", name: "RECHERCHEX", hint: "=RECHERCHEX(E2;A2:A20;B2:B20)" },
  { fr: "Recherche verticale", en: "VLOOKUP", name: "RECHERCHEV", hint: "=RECHERCHEV(E2;A2:C20;3;FAUX)" },
  { fr: "Arrondi", en: "Round", name: "ARRONDI", hint: "=ARRONDI(B2*1,18;0)" },
  { fr: "Si erreur", en: "If error", name: "SIERREUR", hint: '=SIERREUR(B2/C2;0)' },
  { fr: "Concaténer", en: "Concatenate", name: "CONCAT", hint: '=CONCAT(A2;" ";B2)' },
  { fr: "Aujourd'hui", en: "Today", name: "AUJOURDHUI", hint: "=AUJOURDHUI()" },
];

const flat = (args: Arg[]): Value[] => args.flatMap((a) => (a && typeof a === "object" && "m" in a ? a.m.flat() : [a as Value]));

function num(v: Value): number | Err {
  if (isErr(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === "") return 0;
  const p = parseLiteral(v).value;
  return typeof p === "number" ? p : E("#VALUE!");
}
/** Numbers of a list: from ranges only real numbers count (like Excel); direct arguments are coerced. */
function numbers(args: Arg[]): number[] | Err {
  const out: number[] = [];
  for (const a of args) {
    if (a && typeof a === "object" && "m" in a) { for (const v of a.m.flat()) { if (isErr(v)) return v; if (typeof v === "number") out.push(v); } }
    else { const n = num(a as Value); if (isErr(n)) return n; out.push(n); }
  }
  return out;
}
const text = (v: Value): string => (v === null ? "" : isErr(v) ? v.err : typeof v === "boolean" ? (v ? "VRAI" : "FAUX") : typeof v === "number" ? String(Math.round(v * 1e10) / 1e10).replace(".", ",") : v);
const truthy = (v: Value): boolean | Err => (isErr(v) ? v : typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : v === null || v === "" ? false : /^(vrai|true)$/i.test(v) ? true : /^(faux|false)$/i.test(v) ? false : E("#VALUE!"));
const scalar = (a: Arg | undefined): Value => (a === undefined ? null : a && typeof a === "object" && "m" in a ? (a.m[0]?.[0] ?? null) : (a as Value));
const matrix = (a: Arg | undefined): Value[][] => (a && typeof a === "object" && "m" in a ? a.m : [[(a as Value) ?? null]]);

function compare(a: Value, b: Value): number {
  const rank = (v: Value) => (typeof v === "number" || v === null ? 0 : typeof v === "string" ? 1 : 2);
  const x = a ?? 0, y = b ?? 0;
  if (rank(x) !== rank(y)) {
    if (typeof x === "string" && x === "" && y === 0) return 0;
    return rank(x) - rank(y);
  }
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "string" && typeof y === "string") return x.localeCompare(y, "fr", { sensitivity: "base" });
  return Number(x) - Number(y);
}

function matcher(criterion: Value): (v: Value) => boolean {
  if (typeof criterion === "number" || typeof criterion === "boolean") return (v) => compare(v, criterion) === 0;
  const s = criterion === null || isErr(criterion) ? "" : criterion;
  const m = /^(<>|<=|>=|=|<|>)?(.*)$/s.exec(s)!;
  const op = m[1] ?? "=";
  const operand = m[2]!;
  const n = parseLiteral(operand).value;
  if (typeof n === "number" && operand.trim() !== "") {
    return (v) => {
      if (typeof v !== "number") return op === "<>";
      const d = v - n;
      return op === "=" ? d === 0 : op === "<>" ? d !== 0 : op === "<" ? d < 0 : op === ">" ? d > 0 : op === "<=" ? d <= 0 : d >= 0;
    };
  }
  const re = new RegExp(`^${operand.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
  return (v) => {
    const t = v === null ? "" : text(v);
    const eq = re.test(t);
    return op === "<>" ? !eq : op === "=" ? eq : (() => { const c = compare(t, operand); return op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0; })();
  };
}

function lookupIndex(needle: Value, list: Value[], exact = true): number {
  for (let i = 0; i < list.length; i++) if (compare(list[i]!, needle) === 0) return i;
  if (exact) return -1;
  let best = -1;
  for (let i = 0; i < list.length; i++) if (typeof list[i] === typeof needle && compare(list[i]!, needle) <= 0) best = i;
  return best;
}

const round = (n: number, d: number, mode: "round" | "up" | "down") => {
  const f = 10 ** d;
  const x = n * f;
  const r = mode === "round" ? Math.sign(x) * Math.round(Math.abs(x) + 1e-9) : mode === "up" ? Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9) : Math.sign(x) * Math.floor(Math.abs(x) + 1e-9);
  return r / f;
};

function sumifs(args: Arg[], kind: "sum" | "count" | "avg" | "max" | "min", sumFirst: boolean): Value {
  const target = sumFirst ? matrix(args[0]).flat() : null;
  const pairs: [Value[], (v: Value) => boolean][] = [];
  for (let i = sumFirst ? 1 : 0; i + 1 < args.length; i += 2) pairs.push([matrix(args[i]).flat(), matcher(scalar(args[i + 1]))]);
  const len = pairs[0]?.[0].length ?? 0;
  const vals: number[] = [];
  let count = 0;
  for (let i = 0; i < len; i++) {
    if (!pairs.every(([r, f]) => f(r[i] ?? null))) continue;
    count++;
    const v = target ? target[i] : pairs[0]![0][i];
    if (typeof v === "number") vals.push(v);
  }
  if (kind === "count") return count;
  if (kind === "sum") return vals.reduce((a, b) => a + b, 0);
  if (!vals.length) return kind === "avg" ? E("#DIV/0!") : 0;
  return kind === "avg" ? vals.reduce((a, b) => a + b, 0) / vals.length : kind === "max" ? Math.max(...vals) : Math.min(...vals);
}

type Fn = (args: Arg[]) => Value;
const FNS: Record<string, Fn> = {
  SUM: (a) => { const n = numbers(a); return isErr(n) ? n : n.reduce((x, y) => x + y, 0); },
  AVERAGE: (a) => { const n = numbers(a); return isErr(n) ? n : n.length ? n.reduce((x, y) => x + y, 0) / n.length : E("#DIV/0!"); },
  MIN: (a) => { const n = numbers(a); return isErr(n) ? n : n.length ? Math.min(...n) : 0; },
  MAX: (a) => { const n = numbers(a); return isErr(n) ? n : n.length ? Math.max(...n) : 0; },
  COUNT: (a) => flat(a).filter((v) => typeof v === "number").length,
  COUNTA: (a) => flat(a).filter((v) => v !== null && v !== "").length,
  COUNTBLANK: (a) => flat(a).filter((v) => v === null || v === "").length,
  PRODUCT: (a) => { const n = numbers(a); return isErr(n) ? n : n.reduce((x, y) => x * y, 1); },
  MEDIAN: (a) => { const n = numbers(a); if (isErr(n)) return n; if (!n.length) return E("#NUM!"); const s = [...n].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; },
  ROUND: (a) => { const n = num(scalar(a[0])), d = num(scalar(a[1]) ?? 0); return isErr(n) ? n : isErr(d) ? d : round(n, d, "round"); },
  ROUNDUP: (a) => { const n = num(scalar(a[0])), d = num(scalar(a[1]) ?? 0); return isErr(n) ? n : isErr(d) ? d : round(n, d, "up"); },
  ROUNDDOWN: (a) => { const n = num(scalar(a[0])), d = num(scalar(a[1]) ?? 0); return isErr(n) ? n : isErr(d) ? d : round(n, d, "down"); },
  INT: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : Math.floor(n); },
  ABS: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : Math.abs(n); },
  MOD: (a) => { const n = num(scalar(a[0])), d = num(scalar(a[1])); if (isErr(n)) return n; if (isErr(d)) return d; if (d === 0) return E("#DIV/0!"); return n - d * Math.floor(n / d); },
  SQRT: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : n < 0 ? E("#NUM!") : Math.sqrt(n); },
  POWER: (a) => { const n = num(scalar(a[0])), d = num(scalar(a[1])); return isErr(n) ? n : isErr(d) ? d : n ** d; },
  PI: () => Math.PI,
  IF: (a) => { const c = truthy(scalar(a[0])); if (isErr(c)) return c; return c ? scalar(a[1]) ?? true : a.length > 2 ? scalar(a[2]) : false; },
  IFS: (a) => { for (let i = 0; i + 1 < a.length; i += 2) { const c = truthy(scalar(a[i])); if (isErr(c)) return c; if (c) return scalar(a[i + 1]); } return E("#N/A"); },
  IFERROR: (a) => { const v = scalar(a[0]); return isErr(v) ? scalar(a[1]) : v; },
  AND: (a) => { for (const v of flat(a)) { if (v === null) continue; const t = truthy(v); if (isErr(t)) return t; if (!t) return false; } return true; },
  OR: (a) => { for (const v of flat(a)) { if (v === null) continue; const t = truthy(v); if (isErr(t)) return t; if (t) return true; } return false; },
  NOT: (a) => { const t = truthy(scalar(a[0])); return isErr(t) ? t : !t; },
  SUMIF: (a) => (a.length > 2 ? sumifs([a[2]!, a[0]!, a[1]!], "sum", true) : sumifs([a[0]!, a[0]!, a[1]!], "sum", true)),
  COUNTIF: (a) => sumifs(a, "count", false),
  AVERAGEIF: (a) => (a.length > 2 ? sumifs([a[2]!, a[0]!, a[1]!], "avg", true) : sumifs([a[0]!, a[0]!, a[1]!], "avg", true)),
  SUMIFS: (a) => sumifs(a, "sum", true),
  COUNTIFS: (a) => sumifs(a, "count", false),
  MAXIFS: (a) => sumifs(a, "max", true),
  MINIFS: (a) => sumifs(a, "min", true),
  VLOOKUP: (a) => {
    const m = matrix(a[1]); const col = num(scalar(a[2])); if (isErr(col)) return col;
    const exact = a.length > 3 ? !(truthy(scalar(a[3])) === true) : false;
    const i = lookupIndex(scalar(a[0]), m.map((r) => r[0] ?? null), exact);
    if (i < 0) return E("#N/A");
    return m[i]?.[col - 1] ?? E("#REF!");
  },
  HLOOKUP: (a) => {
    const m = matrix(a[1]); const row = num(scalar(a[2])); if (isErr(row)) return row;
    const exact = a.length > 3 ? !(truthy(scalar(a[3])) === true) : false;
    const i = lookupIndex(scalar(a[0]), m[0] ?? [], exact);
    if (i < 0) return E("#N/A");
    return m[row - 1]?.[i] ?? E("#REF!");
  },
  XLOOKUP: (a) => {
    const look = matrix(a[1]).flat(), ret = matrix(a[2]).flat();
    const i = lookupIndex(scalar(a[0]), look, true);
    return i < 0 ? (a.length > 3 ? scalar(a[3]) : E("#N/A")) : ret[i] ?? E("#REF!");
  },
  MATCH: (a) => { const i = lookupIndex(scalar(a[0]), matrix(a[1]).flat(), a.length > 2 ? num(scalar(a[2])) === 0 : false); return i < 0 ? E("#N/A") : i + 1; },
  INDEX: (a) => { const m = matrix(a[0]); const r = num(scalar(a[1]) ?? 1), c = num(scalar(a[2]) ?? 1); if (isErr(r)) return r; if (isErr(c)) return c; return m[Math.max(1, r) - 1]?.[Math.max(1, c) - 1] ?? E("#REF!"); },
  CONCAT: (a) => flat(a).map(text).join(""),
  CONCATENATE: (a) => flat(a).map(text).join(""),
  TEXTJOIN: (a) => { const sep = text(scalar(a[0])); const skip = truthy(scalar(a[1])) === true; return flat(a.slice(2)).map(text).filter((t) => !skip || t !== "").join(sep); },
  LEFT: (a) => { const n = num(scalar(a[1]) ?? 1); return isErr(n) ? n : text(scalar(a[0])).slice(0, n); },
  RIGHT: (a) => { const n = num(scalar(a[1]) ?? 1); return isErr(n) ? n : n <= 0 ? "" : text(scalar(a[0])).slice(-n); },
  MID: (a) => { const s = num(scalar(a[1])), n = num(scalar(a[2])); return isErr(s) ? s : isErr(n) ? n : text(scalar(a[0])).slice(s - 1, s - 1 + n); },
  LEN: (a) => text(scalar(a[0])).length,
  UPPER: (a) => text(scalar(a[0])).toUpperCase(),
  LOWER: (a) => text(scalar(a[0])).toLowerCase(),
  PROPER: (a) => text(scalar(a[0])).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, s: string, l: string) => s + l.toUpperCase()),
  TRIM: (a) => text(scalar(a[0])).trim().replace(/\s+/g, " "),
  TODAY: () => dateToSerial(new Date()),
  NOW: () => dateToSerial(new Date()) + (Date.now() % 86_400_000) / 86_400_000,
  DATE: (a) => { const y = num(scalar(a[0])), m = num(scalar(a[1])), d = num(scalar(a[2])); if (isErr(y)) return y; if (isErr(m)) return m; if (isErr(d)) return d; return dateToSerial(new Date(y, m - 1, d)); },
  YEAR: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : serialToDate(n).getUTCFullYear(); },
  MONTH: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : serialToDate(n).getUTCMonth() + 1; },
  DAY: (a) => { const n = num(scalar(a[0])); return isErr(n) ? n : serialToDate(n).getUTCDate(); },
  ISBLANK: (a) => { const v = scalar(a[0]); return v === null || v === ""; },
  ISNUMBER: (a) => typeof scalar(a[0]) === "number",
  ISERROR: (a) => isErr(scalar(a[0])),
};
const NO_ERROR_PROPAGATION = new Set(["IFERROR", "ISERROR", "ISBLANK", "ISNUMBER", "IF", "IFS", "COUNT", "COUNTA", "COUNTBLANK"]);

export const canonicalName = (name: string) => FR_NAMES[name] ?? name;
export const knownFunction = (name: string) => canonicalName(name.toUpperCase()) in FNS;

// ---------------------------------------------------------------- evaluation

export type Evaluator = { value: (sheet: number, c: number, r: number) => Value };

/** Computes cells on demand with a cache, detecting circular references (#CYCLE!). */
export function makeEvaluator(wb: Workbook): Evaluator {
  const cache = new Map<string, Value>();
  const visiting = new Set<string>();
  const asts = new Map<string, Node | Err>();
  const sheetIndex = (name: string | null, cur: number) => (name === null ? cur : wb.sheets.findIndex((s) => s.name.toLowerCase() === name.toLowerCase()));

  function value(si: number, c: number, r: number): Value {
    const key = `${si}!${c},${r}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const sheet = wb.sheets[si];
    const cell = sheet?.cells[addr(c, r)];
    if (!cell || cell.v === "") return null;
    let out: Value;
    if (!cell.v.startsWith("=") || cell.v.length < 2) {
      out = cell.s?.fmt === "text" ? cell.v : (parseLiteral(cell.v).value as Value);
    } else {
      if (visiting.has(key)) return E("#CYCLE!");
      visiting.add(key);
      let ast = asts.get(cell.v);
      if (!ast) { try { ast = parse(cell.v.slice(1)); } catch (e) { ast = E(e instanceof Error && e.message.startsWith("#") ? e.message : "#ERROR!"); } asts.set(cell.v, ast); }
      try { out = isErr(ast) ? ast : collapse(evalNode(ast, si)); } catch { out = E("#ERROR!"); }
      visiting.delete(key);
    }
    cache.set(key, out);
    return out;
  }

  const collapse = (a: Arg): Value => (a && typeof a === "object" && "m" in a ? (a.m.length === 1 && a.m[0]!.length === 1 ? a.m[0]![0]! : E("#VALUE!")) : a);

  function evalNode(n: Node, si: number): Arg {
    switch (n.k) {
      case "num": return n.v;
      case "str": return n.v;
      case "bool": return n.v;
      case "ref": { const s = sheetIndex(n.sheet, si); return s < 0 ? E("#REF!") : value(s, n.c, n.r) ?? null; }
      case "range": {
        const s = sheetIndex(n.sheet, si); if (s < 0) return E("#REF!");
        const sh = wb.sheets[s]!;
        const r2 = Math.min(n.rect.r2, sh.rows - 1), c2 = Math.min(n.rect.c2, sh.cols - 1);
        const m: Value[][] = [];
        for (let r = n.rect.r1; r <= r2; r++) { const row: Value[] = []; for (let c = n.rect.c1; c <= c2; c++) row.push(value(s, c, r)); m.push(row); }
        return { m };
      }
      case "un": { const v = num(collapse(evalNode(n.a, si))); return isErr(v) ? v : n.op === "-" ? -v : v; }
      case "pct": { const v = num(collapse(evalNode(n.a, si))); return isErr(v) ? v : v / 100; }
      case "bin": {
        const a = collapse(evalNode(n.a, si)), b = collapse(evalNode(n.b, si));
        if (isErr(a)) return a; if (isErr(b)) return b;
        if (n.op === "&") return text(a) + text(b);
        if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
          const c = compare(typeof a === "string" ? a : a, typeof b === "string" ? b : b);
          return n.op === "=" ? c === 0 : n.op === "<>" ? c !== 0 : n.op === "<" ? c < 0 : n.op === ">" ? c > 0 : n.op === "<=" ? c <= 0 : c >= 0;
        }
        const x = num(a), y = num(b);
        if (isErr(x)) return x; if (isErr(y)) return y;
        if (n.op === "+") return x + y;
        if (n.op === "-") return x - y;
        if (n.op === "*") return x * y;
        if (n.op === "/") return y === 0 ? E("#DIV/0!") : x / y;
        if (n.op === "^") return x ** y;
        return E("#ERROR!");
      }
      case "call": {
        const name = canonicalName(n.name);
        const fn = FNS[name];
        if (!fn) return E("#NAME?");
        const args = n.args.map((x) => evalNode(x, si));
        if (!NO_ERROR_PROPAGATION.has(name)) {
          const e = args.find((x) => isErr(x));
          if (e) return e;
        }
        const out = fn(args);
        if (typeof out === "number" && !Number.isFinite(out)) return E("#NUM!");
        return out;
      }
    }
  }
  return { value };
}

// ---------------------------------------------------------------- references when cells move

const REF_RE = /((?:'(?:[^']|'')+'|[A-Za-z_À-ÿ][\wÀ-ÿ.]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d{1,6})(?![\w(!])/g;

/** Splits a formula into string literals (left untouched) and code. */
function mapCode(f: string, fn: (code: string) => string): string {
  return f.split(/("(?:[^"]|"")*")/).map((part, i) => (i % 2 ? part : fn(part))).join("");
}
const precededByLetter = (s: string, at: number) => at > 0 && /[A-Za-z_\d.À-ÿ]/.test(s[at - 1]!);

/** Copy / fill: relative references move by (dc, dr); $-fixed parts stay. */
export function shiftFormula(f: string, dc: number, dr: number): string {
  if (!f.startsWith("=")) return f;
  return mapCode(f, (code) => code.replace(REF_RE, (m, sheet: string | undefined, dC: string, col: string, dR: string, row: string, at: number) => {
    if (!sheet && precededByLetter(code, at)) return m;
    const c = dC ? colIndex(col) : colIndex(col) + dc;
    const r = dR ? Number(row) - 1 : Number(row) - 1 + dr;
    if (c < 0 || r < 0) return "#REF!";
    return `${sheet ?? ""}${dC}${addrCol(c)}${dR}${r + 1}`;
  }));
}
const addrCol = (c: number) => addr(c, 0).replace(/\d+$/, "");

/** Insert / delete rows or columns: references at or after `at` move by `delta`; deleted ones become #REF!. */
export function adjustFormula(f: string, axis: "row" | "col", at: number, delta: number, sameSheet: boolean, sheetName: string): string {
  if (!f.startsWith("=")) return f;
  return mapCode(f, (code) => code.replace(REF_RE, (m, sheet: string | undefined, dC: string, col: string, dR: string, row: string, pos: number) => {
    if (!sheet && precededByLetter(code, pos)) return m;
    const target = sheet ? sheet.slice(0, -1).replace(/^'|'$/g, "").replace(/''/g, "'") : null;
    const applies = target ? target.toLowerCase() === sheetName.toLowerCase() : sameSheet;
    if (!applies) return m;
    let c = colIndex(col), r = Number(row) - 1;
    if (axis === "row") { if (delta < 0 && r >= at && r < at - delta) return "#REF!"; if (r >= at) r += delta; }
    else { if (delta < 0 && c >= at && c < at - delta) return "#REF!"; if (c >= at) c += delta; }
    return `${sheet ?? ""}${dC}${addrCol(c)}${dR}${r + 1}`;
  }));
}

/** The formula as Excel stores it: English function names and "," separators (for .xlsx export). */
export function toExcelFormula(f: string): string {
  return mapCode(f.replace(/^=/, ""), (code) => code
    .replace(/([A-Za-zÀ-ÿ][\wÀ-ÿ.']*)\s*\(/g, (m, name: string) => { const en = FR_NAMES[name.toUpperCase()]; return en ? `${en}(` : `${name.toUpperCase()}(`; })
    .replace(/;/g, ",")
    .replace(/\bVRAI\b/gi, "TRUE").replace(/\bFAUX\b/gi, "FALSE"));
}
