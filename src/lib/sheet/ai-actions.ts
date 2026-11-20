import { z } from "zod";
import { type CellStyle, type Workbook, addr, colIndex, newSheet, parseAddr, parseLiteral, parseRange, uid, MAX_COLS, MAX_ROWS } from "./model";

// Changes the TechNova Tableur assistant may propose. The server validates them with this schema; the browser
// shows them as a list and applies them only when the user clicks « Appliquer » (like approving edits).

const style = z.object({
  b: z.boolean().optional(), i: z.boolean().optional(), u: z.boolean().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  align: z.enum(["left", "center", "right"]).optional(), size: z.number().min(8).max(40).optional(), wrap: z.boolean().optional(),
  fmt: z.enum(["general", "number", "fcfa", "eur", "usd", "percent", "date", "text"]).optional(), dec: z.number().int().min(0).max(6).optional(), border: z.boolean().optional(),
}).strict();
const sheetName = z.string().max(40).optional();
const cellRef = z.string().regex(/^\$?[A-Za-z]{1,3}\$?\d{1,4}$/);
const rangeRef = z.string().regex(/^\$?[A-Za-z]{1,3}\$?\d{1,4}(:\$?[A-Za-z]{1,3}\$?\d{1,4})?$/);

export const sheetAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set"), sheet: sheetName, cells: z.record(cellRef, z.union([z.string().max(2000), z.number(), z.boolean()]).transform((v) => (typeof v === "boolean" ? (v ? "VRAI" : "FAUX") : String(v)))) }),
  z.object({ type: z.literal("format"), sheet: sheetName, range: rangeRef, style }),
  z.object({ type: z.literal("chart"), sheet: sheetName, kind: z.enum(["bar", "line", "area", "pie"]), range: z.string().max(80), title: z.string().max(80) }),
  z.object({ type: z.literal("addSheet"), name: z.string().min(1).max(40) }),
  z.object({ type: z.literal("width"), sheet: sheetName, col: z.string().regex(/^[A-Za-z]{1,3}$/), px: z.number().min(30).max(600) }),
  z.object({ type: z.literal("clear"), sheet: sheetName, range: rangeRef }),
  z.object({ type: z.literal("merge"), sheet: sheetName, range: rangeRef }),
  z.object({ type: z.literal("list"), sheet: sheetName, range: rangeRef, items: z.array(z.string().max(80)).min(1).max(50) }),
  z.object({ type: z.literal("cond"), sheet: sheetName, range: rangeRef, kind: z.enum(["gt", "lt", "between", "eq", "contains", "neg", "dup", "top", "bars", "scale"]), a: z.union([z.string(), z.number()]).transform(String).optional(), b: z.union([z.string(), z.number()]).transform(String).optional(), color: z.enum(["red", "green", "yellow", "blue"]).optional() }),
  z.object({ type: z.literal("filter"), sheet: sheetName, range: rangeRef }),
]);
export type SheetAction = z.infer<typeof sheetAction>;
export const sheetActions = z.array(sheetAction).max(60);

export const AI_CONTEXT_ROWS = 120;
export const AI_CONTEXT_COLS = 20;

/** The sheet as the assistant reads it: "A1=value" per filled cell (formulas as typed), rows capped. */
export function sheetContext(wb: Workbook, si: number, results: (c: number, r: number) => string): string {
  const sh = wb.sheets[si]!;
  const lines: string[] = [];
  for (let r = 0; r < Math.min(sh.rows, AI_CONTEXT_ROWS); r++) {
    const parts: string[] = [];
    for (let c = 0; c < Math.min(sh.cols, AI_CONTEXT_COLS); c++) {
      const cell = sh.cells[addr(c, r)];
      if (!cell || cell.v === "") continue;
      const v = cell.v.length > 120 ? `${cell.v.slice(0, 120)}…` : cell.v;
      parts.push(cell.v.startsWith("=") ? `${addr(c, r)}=${v} → ${results(c, r)}` : `${addr(c, r)}: ${v}`);
    }
    if (parts.length) lines.push(parts.join(" | "));
  }
  return lines.join("\n");
}

const target = (wb: Workbook, name: string | undefined, si: number) => {
  if (!name) return wb.sheets[si]!;
  return wb.sheets.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? wb.sheets[si]!;
};

/** Applies the actions to a copy of the workbook. */
export function applyActions(input: Workbook, si: number, actions: SheetAction[]): Workbook {
  const wb: Workbook = structuredClone(input);
  for (const a of actions) {
    if (a.type === "addSheet") {
      if (!wb.sheets.some((s) => s.name.toLowerCase() === a.name.toLowerCase())) wb.sheets.push(newSheet(a.name));
      continue;
    }
    const sh = target(wb, a.sheet, si);
    if (a.type === "set") {
      for (const [k, raw] of Object.entries(a.cells)) {
        const p = parseAddr(k); if (!p || p.r >= MAX_ROWS || p.c >= MAX_COLS) continue;
        const key = addr(p.c, p.r);
        const prev = sh.cells[key];
        const lit = raw.startsWith("=") ? null : parseLiteral(raw);
        const s: CellStyle | undefined = lit?.fmt && !prev?.s?.fmt ? { ...prev?.s, fmt: lit.fmt } : prev?.s;
        sh.cells[key] = { v: raw, ...(s ? { s } : {}) };
        sh.rows = Math.max(sh.rows, p.r + 20); sh.cols = Math.max(sh.cols, Math.min(MAX_COLS, p.c + 2));
      }
    } else if (a.type === "format" || a.type === "clear") {
      const r = parseRange(a.range); if (!r) continue;
      for (let row = r.r1; row <= Math.min(r.r2, MAX_ROWS - 1); row++) for (let c = r.c1; c <= Math.min(r.c2, MAX_COLS - 1); c++) {
        const key = addr(c, row);
        if (a.type === "clear") { delete sh.cells[key]; continue; }
        const prev = sh.cells[key] ?? { v: "" };
        sh.cells[key] = { ...prev, s: { ...prev.s, ...(Object.fromEntries(Object.entries(a.style).filter(([, v]) => v !== undefined)) as CellStyle) } };
      }
    } else if (a.type === "chart") {
      sh.charts.push({ id: uid(), kind: a.kind, range: a.range, title: a.title, x: 40 + sh.charts.length * 30, y: 60 + sh.charts.length * 30, w: 480, h: 290 });
    } else if (a.type === "merge") {
      const r = parseRange(a.range); if (!r || (r.c1 === r.c2 && r.r1 === r.r2)) continue;
      sh.merges = [...(sh.merges ?? []).filter((m) => m !== a.range.toUpperCase()), a.range.toUpperCase()];
    } else if (a.type === "list") {
      sh.lists = [...(sh.lists ?? []), { id: uid(), range: a.range.toUpperCase(), items: a.items }];
    } else if (a.type === "cond") {
      const colors = { red: { bg: "#fde2e2", color: "#b42318" }, green: { bg: "#dcfce7", color: "#166534" }, yellow: { bg: "#fef3c7", color: "#92400e" }, blue: { bg: "#dbeafe", color: "#1e40af" } } as const;
      sh.cond = [...(sh.cond ?? []), { id: uid(), range: a.range.toUpperCase(), kind: a.kind, ...(a.a !== undefined ? { a: a.a } : {}), ...(a.b !== undefined ? { b: a.b } : {}), ...(a.kind === "bars" ? { style: { bg: "#60a5fa" } } : a.kind === "scale" ? {} : { style: { ...colors[a.color ?? "red"] } }) }];
    } else if (a.type === "filter") {
      sh.filter = { range: a.range.toUpperCase(), hide: {} };
    } else if (a.type === "width") {
      sh.colW[colIndex(a.col)] = a.px;
    }
  }
  return wb;
}

/** One line per action for the approval list. */
export function describeAction(a: SheetAction, fr: boolean): string {
  switch (a.type) {
    case "set": { const keys = Object.keys(a.cells); return fr ? `Remplir ${keys.length} cellule(s) : ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}` : `Fill ${keys.length} cell(s): ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}`; }
    case "format": return fr ? `Mettre en forme ${a.range}` : `Format ${a.range}`;
    case "chart": return fr ? `Graphique « ${a.title} » (${a.range})` : `Chart "${a.title}" (${a.range})`;
    case "addSheet": return fr ? `Nouvelle feuille « ${a.name} »` : `New sheet "${a.name}"`;
    case "width": return fr ? `Largeur de la colonne ${a.col.toUpperCase()}` : `Width of column ${a.col.toUpperCase()}`;
    case "clear": return fr ? `Effacer ${a.range}` : `Clear ${a.range}`;
    case "merge": return fr ? `Fusionner ${a.range}` : `Merge ${a.range}`;
    case "list": return fr ? `Liste déroulante sur ${a.range} (${a.items.length} choix)` : `Dropdown on ${a.range} (${a.items.length} choices)`;
    case "cond": return fr ? `Mise en forme conditionnelle sur ${a.range}` : `Conditional formatting on ${a.range}`;
    case "filter": return fr ? `Filtre sur ${a.range}` : `Filter on ${a.range}`;
  }
}
