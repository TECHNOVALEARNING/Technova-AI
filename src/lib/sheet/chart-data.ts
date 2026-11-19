import { type Evaluator, isErr } from "./formula";
import { type Workbook, addr, display, parseRange } from "./model";

// A chart's data from its range: "A1:C13" (first column = labels, other columns = series) or several areas
// "A2:A6,E2:E6" (first area = labels, each other area = one series). A first row of text becomes the series names.

export type ChartData = { rows: Record<string, string | number>[]; series: string[] };

export function chartData(wb: Workbook, ev: Evaluator, si: number, range: string): ChartData {
  const areas = range.split(",").map((s) => parseRange(s)).filter((r): r is NonNullable<typeof r> => !!r);
  if (!areas.length) return { rows: [], series: [] };
  const sheet = wb.sheets[si]!;
  const val = (c: number, r: number) => { const v = ev.value(si, c, r); return isErr(v) ? null : v; };
  const columns: { c: number; r1: number; r2: number }[] = [];
  if (areas.length === 1) { const a = areas[0]!; for (let c = a.c1; c <= a.c2; c++) columns.push({ c, r1: a.r1, r2: a.r2 }); }
  else for (const a of areas) columns.push({ c: a.c1, r1: a.r1, r2: a.r2 });
  if (columns.length === 1) { const only = columns[0]!; columns.unshift({ c: -1, r1: only.r1, r2: only.r2 }); }
  const [labels, ...values] = columns;
  const firstIsHeader = values.some((col) => { const v = val(col.c, col.r1); return typeof v === "string" && v.trim() !== ""; });
  const series = values.map((col, i) => (firstIsHeader ? String(val(col.c, col.r1) ?? `Série ${i + 1}`) : `Série ${i + 1}`));
  const start = firstIsHeader ? 1 : 0;
  const rows: Record<string, string | number>[] = [];
  const len = labels!.r2 - labels!.r1 + 1;
  for (let k = start; k < len; k++) {
    const lr = labels!.r1 + k;
    const lv = labels!.c >= 0 ? val(labels!.c, lr) : k + 1;
    const label = labels!.c >= 0 ? display(lv, sheet.cells[addr(labels!.c, lr)]?.s) : String(lv);
    const row: Record<string, string | number> = { label };
    let any = false;
    values.forEach((col, i) => { const v = val(col.c, col.r1 + k); if (typeof v === "number") { row[series[i]!] = v; any = true; } });
    if (any || label) rows.push(row);
  }
  return { rows: rows.filter((r) => Object.keys(r).length > 1), series };
}


export const CHART_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2", "#ca8a04", "#be185d", "#4f46e5", "#0f766e"];
