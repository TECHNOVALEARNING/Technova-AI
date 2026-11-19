import { type Evaluator, isErr, makeEvaluator, toExcelFormula } from "./formula";
import { type Cell, type CellStyle, DEFAULT_COL_W, type NumFmt, type Sheet, type Workbook, addr, colName, display, newSheet, serialToDate, uid } from "./model";

// Import and export of TechNova Tableur, all in the browser: .xlsx (exceljs, loaded on demand: values, formulas,
// styles, widths, frozen header, gridlines, charts as pictures), .csv, and a print page for PDF. Nothing is sent
// to TechNova.

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "classeur";
export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/** The used part of a sheet (last row / column holding a value), at least 1×1. */
export function usedSize(sh: Sheet) {
  let rows = 0, cols = 0;
  for (const [k, cell] of Object.entries(sh.cells)) {
    if (cell.v === "" && !cell.s?.bg && !cell.s?.border) continue;
    const m = /^([A-Z]+)(\d+)$/.exec(k); if (!m) continue;
    let c = 0; for (const ch of m[1]!) c = c * 26 + ch.charCodeAt(0) - 64;
    rows = Math.max(rows, Number(m[2])); cols = Math.max(cols, c);
  }
  return { rows: Math.max(1, rows), cols: Math.max(1, cols) };
}

// ------------------------------------------------------------------ CSV

function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = [";", "\t", ","].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function sheetFromRows(name: string, rows: string[][]): Sheet {
  const sh = newSheet(name, Math.max(100, rows.length + 20), Math.max(26, ...rows.map((r) => r.length + 2)));
  rows.forEach((r, ri) => r.forEach((v, ci) => { if (v !== "") sh.cells[addr(ci, ri)] = { v, ...(ri === 0 ? { s: { b: true } } : {}) }; }));
  return sh;
}

export function exportCsv(wb: Workbook, si: number) {
  const sh = wb.sheets[si]!; const ev = makeEvaluator(wb); const { rows, cols } = usedSize(sh);
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const out: string[] = [];
    for (let c = 0; c < cols; c++) {
      const v = ev.value(si, c, r);
      const t = typeof v === "number" ? String(v).replace(".", ",") : display(v, sh.cells[addr(c, r)]?.s);
      out.push(/[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    }
    lines.push(out.join(";"));
  }
  saveBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${slug(`${wb.title}-${sh.name}`)}.csv`);
}

// ------------------------------------------------------------------ XLSX

const argb = (hex?: string) => (hex && /^#[0-9a-f]{6}$/i.test(hex) ? `FF${hex.slice(1).toUpperCase()}` : undefined);
const hexOf = (a?: string) => (a && /^[0-9a-f]{8}$/i.test(a) ? `#${a.slice(2).toLowerCase()}` : undefined);
const EXCEL_FMT: Record<NumFmt, (dec: number | undefined) => string | undefined> = {
  general: (d) => (d === undefined ? undefined : `#,##0${d ? `.${"0".repeat(d)}` : ""}`),
  number: (d) => `#,##0${(d ?? 2) ? `.${"0".repeat(d ?? 2)}` : ""}`,
  fcfa: (d) => `#,##0${d ? `.${"0".repeat(d)}` : ""} "FCFA"`,
  eur: (d) => `#,##0${(d ?? 2) ? `.${"0".repeat(d ?? 2)}` : ""} "€"`,
  usd: (d) => `"$"#,##0${(d ?? 2) ? `.${"0".repeat(d ?? 2)}` : ""}`,
  percent: (d) => `0${d ? `.${"0".repeat(d)}` : ""}%`,
  date: () => "dd/mm/yyyy",
  text: () => "@",
};
function fmtFromExcel(f?: string): { fmt?: NumFmt; dec?: number } {
  if (!f || f === "General") return {};
  const dec = /\.(0+)/.exec(f)?.[1]?.length;
  const d = dec !== undefined ? { dec } : {};
  if (f.includes("%")) return { fmt: "percent", ...d };
  if (/FCFA|XOF|CFA/i.test(f)) return { fmt: "fcfa", ...d };
  if (f.includes("€")) return { fmt: "eur", ...d };
  if (f.includes("$")) return { fmt: "usd", ...d };
  if (/[dy]/i.test(f) && /m/i.test(f)) return { fmt: "date" };
  if (f === "@") return { fmt: "text" };
  if (/[#0]/.test(f)) return { fmt: "number", dec: dec ?? 0 };
  return {};
}

/** Reads an .xlsx file into a workbook (all sheets, values, formulas, main styles). */
export async function importXlsx(file: File | ArrayBuffer, title: string): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(file instanceof File ? await file.arrayBuffer() : file);
  const sheets: Sheet[] = [];
  book.eachSheet((ws) => {
    const sh = newSheet(ws.name.slice(0, 40), Math.min(2000, Math.max(100, ws.rowCount + 20)), Math.min(60, Math.max(26, ws.columnCount + 2)));
    ws.columns?.forEach((col, i) => { if (col?.width) sh.colW[i] = Math.round(col.width * 7 + 5); });
    const view = ws.views?.[0] as { showGridLines?: boolean; state?: string; ySplit?: number } | undefined;
    if (view?.showGridLines === false) sh.grid = false;
    if (view?.state === "frozen" && (view.ySplit ?? 0) >= 1) sh.freeze = true;
    ws.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn > 2000) return;
      row.eachCell({ includeEmpty: false }, (cell, cn) => {
        if (cn > 60) return;
        const v = cell.value as unknown;
        let raw = "";
        let style: CellStyle = {};
        if (v === null || v === undefined) raw = "";
        else if (typeof v === "number" || typeof v === "boolean") raw = String(v);
        else if (typeof v === "string") raw = v;
        else if (v instanceof Date) { raw = `${String(v.getUTCDate()).padStart(2, "0")}/${String(v.getUTCMonth() + 1).padStart(2, "0")}/${v.getUTCFullYear()}`; style.fmt = "date"; }
        else if (typeof v === "object") {
          const o = v as { formula?: string; sharedFormula?: string; result?: unknown; richText?: { text: string }[]; text?: string; error?: string };
          const formula = cell.formula || o.formula;
          if (formula) raw = `=${formula}`;
          else if (o.richText) raw = o.richText.map((t) => t.text).join("");
          else if (o.text !== undefined) raw = String(o.text);
          else if (o.result !== undefined) raw = String(o.result);
          else if (o.error) raw = o.error;
        }
        const f = cell.font; const fill = cell.fill as { type?: string; fgColor?: { argb?: string } } | undefined; const al = cell.alignment;
        if (f?.bold) style.b = true; if (f?.italic) style.i = true; if (f?.underline) style.u = true; if (f?.strike) style.strike = true;
        if (f?.size && f.size !== 11) style.size = Math.round(f.size * 1.333);
        const fc = hexOf(f?.color?.argb); if (fc && fc !== "#000000") style.color = fc;
        if (fill?.type === "pattern") { const bg = hexOf(fill.fgColor?.argb); if (bg && bg !== "#ffffff") style.bg = bg; }
        if (al?.horizontal === "center" || al?.horizontal === "right" || al?.horizontal === "left") style.align = al.horizontal;
        if (al?.wrapText) style.wrap = true;
        if (cell.border && (cell.border.top || cell.border.bottom)) style.border = true;
        style = { ...style, ...fmtFromExcel(cell.numFmt) };
        const key = addr(cn - 1, rn - 1);
        const c: Cell = { v: raw };
        if (Object.keys(style).length) c.s = style;
        sh.cells[key] = c;
      });
    });
    sheets.push(sh);
  });
  if (!sheets.length) sheets.push(newSheet("Feuille 1"));
  return { title, sheets };
}

export async function importFile(file: File): Promise<Workbook> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error("TOO_BIG");
  const title = file.name.replace(/\.[^.]+$/, "");
  if (/\.(xlsx|xlsm)$/i.test(file.name)) return importXlsx(file, title);
  if (/\.(csv|tsv|txt)$/i.test(file.name)) return { title, sheets: [sheetFromRows(title.slice(0, 30) || "Feuille 1", parseCsv(await file.text()))] };
  throw new Error("UNSUPPORTED");
}

/** PNG of a chart drawn on screen (its SVG), for the .xlsx export. */
async function chartPng(id: string): Promise<string | null> {
  const svg = document.querySelector<SVGSVGElement>(`[data-sheet-chart="${id}"] svg.recharts-surface`);
  const box = document.querySelector<HTMLElement>(`[data-sheet-chart="${id}"]`);
  if (!svg || !box) return null;
  const w = box.clientWidth, h = box.clientHeight;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
  await new Promise((r) => { img.onload = r; img.onerror = r; });
  const canvas = document.createElement("canvas"); canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext("2d"); if (!ctx) return null;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(2, 2);
  const title = box.querySelector("[data-chart-title]")?.textContent ?? "";
  ctx.fillStyle = "#111"; ctx.font = "600 14px Inter, sans-serif"; ctx.fillText(title, 12, 20);
  const svgBox = svg.getBoundingClientRect(), outer = box.getBoundingClientRect();
  try { ctx.drawImage(img, svgBox.left - outer.left, svgBox.top - outer.top, svgBox.width, svgBox.height); } catch { return null; }
  return canvas.toDataURL("image/png");
}

/** Writes the workbook as a real Excel file: formulas (with their results), formats, widths, charts as pictures. */
export async function exportXlsx(wb: Workbook) {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.creator = "TechNova AI Hub";
  const ev = makeEvaluator(wb);
  for (const [si, sh] of wb.sheets.entries()) {
    const ws = book.addWorksheet(sh.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || `Feuille ${si + 1}`, {
      views: [{ showGridLines: sh.grid, ...(sh.freeze ? { state: "frozen" as const, ySplit: 1 } : {}) }],
      properties: { defaultRowHeight: 18 },
    });
    if (sh.tab) ws.properties.tabColor = { argb: argb(sh.tab)! };
    const { rows, cols } = usedSize(sh);
    for (let c = 0; c < Math.max(cols, 1); c++) ws.getColumn(c + 1).width = Math.max(4, ((sh.colW[c] ?? DEFAULT_COL_W) - 5) / 7);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const key = addr(c, r); const cell = sh.cells[key]; if (!cell) continue;
      const x = ws.getCell(key);
      const value = ev.value(si, c, r);
      if (cell.v.startsWith("=")) {
        const result = isErr(value) ? undefined : value;
        x.value = { formula: toExcelFormula(cell.v), ...(result !== undefined && result !== null ? { result: (cell.s?.fmt === "date" && typeof result === "number" ? serialToDate(result) : result) as never } : {}) } as never;
      } else if (typeof value === "number" && cell.s?.fmt === "date") x.value = serialToDate(value);
      else x.value = isErr(value) ? value.err : (value as never);
      const s = cell.s; if (!s) continue;
      x.font = { name: "Calibri", size: s.size ? Math.round(s.size * 0.75) : 11, ...(s.b ? { bold: true } : {}), ...(s.i ? { italic: true } : {}), ...(s.u ? { underline: true } : {}), ...(s.strike ? { strike: true } : {}), ...(argb(s.color) ? { color: { argb: argb(s.color)! } } : {}) };
      if (argb(s.bg)) x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(s.bg)! } };
      if (s.align || s.wrap) x.alignment = { ...(s.align ? { horizontal: s.align } : {}), ...(s.wrap ? { wrapText: true } : {}), vertical: "middle" };
      if (s.border) { const t = { style: "thin" as const, color: { argb: "FFD4D4D8" } }; x.border = { top: t, left: t, bottom: t, right: t }; }
      const nf = EXCEL_FMT[s.fmt ?? "general"](s.dec); if (nf) x.numFmt = nf;
    }
    for (const ch of sh.charts) {
      const png = await chartPng(ch.id);
      if (!png) continue;
      const id = book.addImage({ base64: png, extension: "png" });
      let col = 0, acc = 0; while (acc + (sh.colW[col] ?? DEFAULT_COL_W) < ch.x) { acc += sh.colW[col] ?? DEFAULT_COL_W; col++; }
      ws.addImage(id, { tl: { col: col + (ch.x - acc) / (sh.colW[col] ?? DEFAULT_COL_W), row: ch.y / 20 } as never, ext: { width: ch.w, height: ch.h } });
    }
  }
  const buf = await book.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(wb.title)}.xlsx`);
}

// ------------------------------------------------------------------ Print / PDF

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function sheetHtml(wb: Workbook, ev: Evaluator, si: number) {
  const sh = wb.sheets[si]!; const { rows, cols } = usedSize(sh);
  let html = `<h2>${escHtml(sh.name)}</h2><table class="${sh.grid ? "grid" : ""}"><colgroup>${Array.from({ length: cols }, (_, c) => `<col style="width:${sh.colW[c] ?? DEFAULT_COL_W}px">`).join("")}</colgroup>`;
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < cols; c++) {
      const cell = sh.cells[addr(c, r)]; const s = cell?.s; const v = ev.value(si, c, r);
      const align = s?.align ?? (typeof v === "number" ? "right" : "left");
      const st = [`text-align:${align}`, s?.b ? "font-weight:700" : "", s?.i ? "font-style:italic" : "", s?.u ? "text-decoration:underline" : "", s?.color ? `color:${s.color}` : "", s?.bg ? `background:${s.bg}` : "", s?.size ? `font-size:${s.size}px` : "", s?.border ? "border:1px solid #d4d4d8" : "", s?.wrap ? "white-space:normal" : ""].filter(Boolean).join(";");
      html += `<td style="${st}">${escHtml(display(v, s))}</td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  const charts = sh.charts.map((ch) => document.querySelector(`[data-sheet-chart="${ch.id}"]`)?.outerHTML ?? "").join("");
  if (charts) html += `<div class="charts">${charts}</div>`;
  return html;
}

/** Print dialog (Imprimer / Enregistrer en PDF) of one sheet or the whole workbook, landscape when wide. */
export function printWorkbook(wb: Workbook, only?: number) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const ev = makeEvaluator(wb);
  const list = only === undefined ? wb.sheets.map((_, i) => i) : [only];
  const wide = list.some((i) => { const sh = wb.sheets[i]!; const { cols } = usedSize(sh); let w = 0; for (let c = 0; c < cols; c++) w += sh.colW[c] ?? DEFAULT_COL_W; return w > 720; });
  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escHtml(wb.title)}</title><style>
@page { size: A4 ${wide ? "landscape" : "portrait"}; margin: 12mm; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
body { font: 12px Inter, "Segoe UI", system-ui, sans-serif; color: #111; margin: 0; }
h1 { font-size: 18px; margin: 0 0 4px; } h2 { font-size: 13px; color: #555; margin: 18px 0 6px; }
table { border-collapse: collapse; table-layout: fixed; } td { padding: 3px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 22px; }
table.grid td { border: 1px solid #e4e4e7; }
.charts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; } .charts > div { position: static !important; box-shadow: none !important; border: 1px solid #e4e4e7; break-inside: avoid; }
.charts button { display: none !important; }
section { break-after: page; } section:last-child { break-after: auto; }
</style></head><body><h1>${escHtml(wb.title)}</h1>${list.map((i) => `<section>${sheetHtml(wb, ev, i)}</section>`).join("")}</body></html>`);
  win.document.close();
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* closed */ } }, 500);
  return true;
}

export const freshCopy = (wb: Workbook): Workbook => ({ ...structuredClone(wb), sheets: wb.sheets.map((s) => ({ ...structuredClone(s), id: uid() })) });
export { colName };
