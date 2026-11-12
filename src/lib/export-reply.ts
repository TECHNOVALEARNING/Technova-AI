// Turns an AI reply (Markdown) into a downloadable file, entirely in the browser: Word, Excel, PowerPoint,
// PDF (print to PDF), Markdown, HTML or CSV. Libraries load only when a format is chosen. Nothing is sent
// anywhere and no credit is used.
import type { Token, Tokens } from "marked";

export type ExportFormat = "docx" | "xlsx" | "pptx" | "pdf" | "md" | "html" | "csv";

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2");
const fileName = (title: string, ext: string) => `${(title || "technova-reponse").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "technova-reponse"}-${stamp()}.${ext}`;

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Plain text of inline Markdown (bold, links, code…) for cells and slides. */
const plain = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|\*|_|~~|`)/g, "").replace(/<[^>]+>/g, "").trim();
/** "1 234,5", "12 %", "$1,200" → number when the whole cell is a number. */
function asNumber(v: string): number | string {
  const t = v.replace(/[\s  ]/g, "").replace(/[€$£%]|FCFA|XOF/gi, "");
  if (!/^-?[\d.,]+$/.test(t)) return v;
  const normalized = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : v;
}

type Table = { header: string[]; rows: string[][] };
function tablesOf(tokens: Token[]): Table[] {
  return tokens.filter((t): t is Tokens.Table => t.type === "table").map((t) => ({ header: t.header.map((h) => plain(h.text)), rows: t.rows.map((r) => r.map((c) => plain(c.text))) }));
}
function titleOf(tokens: Token[], fallback: string) {
  const h = tokens.find((t): t is Tokens.Heading => t.type === "heading");
  return h ? plain(h.text) : fallback;
}

export async function exportReply(markdown: string, format: ExportFormat, lang: "fr" | "en") {
  const { marked } = await import("marked");
  const tokens = marked.lexer(markdown);
  const title = titleOf(tokens, lang === "fr" ? "Réponse TechNova" : "TechNova reply");
  const tables = tablesOf(tokens);

  if (format === "md") return save(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), fileName(title, "md"));

  if (format === "csv") {
    if (!tables.length) throw new Error(lang === "fr" ? "Cette réponse ne contient pas de tableau à exporter en CSV." : "This reply has no table to export as CSV.");
    const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = tables.map((t) => [t.header, ...t.rows].map((r) => r.map(esc).join(";")).join("\r\n")).join("\r\n\r\n");
    return save(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), fileName(title, "csv"));
  }

  if (format === "html" || format === "pdf") {
    // Raw HTML in a reply is shown as text and only http(s)/mailto links are kept: a reply (or a document it
    // quotes) can never run script in the page that prints it.
    const { Marked } = await import("marked");
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safe = new Marked({ renderer: {
      html: ({ text }) => esc(text),
      link({ href, tokens }) { const label = this.parser.parseInline(tokens); return /^(https?:|mailto:)/i.test(href) ? `<a href="${esc(href)}" rel="noopener noreferrer">${label}</a>` : label; },
      image: ({ text }) => esc(text),
    } });
    const body = await safe.parse(markdown);
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:820px;margin:40px auto;padding:0 24px}header{display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e5e5;padding-bottom:14px;margin-bottom:24px;color:#555;font-size:13px}header b{color:#111;letter-spacing:.12em}h1,h2,h3{line-height:1.25}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}th{background:#f4f4f6}pre{background:#1f1f24;color:#e6e6e6;padding:14px;border-radius:10px;overflow:auto}code{font-family:ui-monospace,Consolas,monospace}blockquote{border-left:3px solid #ddd;margin:0;padding-left:14px;color:#555}@media print{body{margin:0}}</style></head>
<body><header><b>TECHNOVA</b><span>AI Hub · ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}</span></header>${body}</body></html>`;
    if (format === "html") return save(new Blob([html], { type: "text/html;charset=utf-8" }), fileName(title, "html"));
    // PDF: the browser's own print dialog, with "Save as PDF" (keeps text selectable and the layout clean).
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) throw new Error(lang === "fr" ? "Autorisez les fenêtres pop-up pour enregistrer en PDF." : "Allow pop-ups to save as PDF.");
    w.document.open(); w.document.write(html.replace("</body>", "<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script></body>")); w.document.close();
    return;
  }

  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const book = new ExcelJS.Workbook();
    book.creator = "TechNova AI Hub";
    const list = tables.length ? tables : [{ header: [lang === "fr" ? "Contenu" : "Content"], rows: markdown.split("\n").filter((l) => l.trim()).map((l) => [plain(l.replace(/^#+\s*|^[-*+]\s+|^\d+\.\s+/, ""))]) }];
    list.forEach((t, i) => {
      const sheet = book.addWorksheet(`${lang === "fr" ? "Tableau" : "Table"} ${i + 1}`.slice(0, 31));
      sheet.addRow(t.header);
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDF2" } };
      for (const r of t.rows) sheet.addRow(r.map(asNumber));
      sheet.columns.forEach((col, c) => { col.width = Math.min(60, Math.max(10, ...[t.header[c] ?? "", ...t.rows.map((r) => r[c] ?? "")].map((v) => String(v).length + 2))); });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    });
    const buf = await book.xlsx.writeBuffer();
    return save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName(title, "xlsx"));
  }

  if (format === "docx") {
    const d = await import("docx");
    const runs = (text: string) => {
      // **bold**, *italic*, `code` — the rest as plain text.
      const out: InstanceType<typeof d.TextRun>[] = [];
      for (const part of text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean)) {
        if (part.startsWith("**")) out.push(new d.TextRun({ text: part.slice(2, -2), bold: true }));
        else if (part.startsWith("`")) out.push(new d.TextRun({ text: part.slice(1, -1), font: "Consolas" }));
        else if (part.startsWith("*") && part.length > 2) out.push(new d.TextRun({ text: part.slice(1, -1), italics: true }));
        else out.push(new d.TextRun(part));
      }
      return out;
    };
    const levels = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4];
    const children: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];
    for (const t of tokens) {
      if (t.type === "heading") children.push(new d.Paragraph({ heading: levels[Math.min(3, t.depth - 1)] ?? d.HeadingLevel.HEADING_2, children: runs(t.text) }));
      else if (t.type === "paragraph") children.push(new d.Paragraph({ children: runs(t.text), spacing: { after: 120 } }));
      else if (t.type === "list") (t as Tokens.List).items.forEach((item, i) => children.push(new d.Paragraph({ children: runs(item.text.split("\n")[0] ?? ""), ...((t as Tokens.List).ordered ? { numbering: { reference: "numbers", level: 0 } } : { bullet: { level: 0 } }), ...(i === 0 ? {} : {}) })));
      else if (t.type === "code") (t as Tokens.Code).text.split("\n").forEach((line) => children.push(new d.Paragraph({ children: [new d.TextRun({ text: line || " ", font: "Consolas", size: 19 })], shading: { type: d.ShadingType.CLEAR, fill: "F2F2F5", color: "auto" } })));
      else if (t.type === "blockquote") children.push(new d.Paragraph({ children: runs(plain((t as Tokens.Blockquote).text)), indent: { left: 400 }, border: { left: { style: d.BorderStyle.SINGLE, size: 12, color: "BBBBBB", space: 8 } } }));
      else if (t.type === "table") {
        const tb = t as Tokens.Table;
        const row = (cells: string[], head = false) => new d.TableRow({ tableHeader: head, children: cells.map((c) => new d.TableCell({ children: [new d.Paragraph({ children: head ? [new d.TextRun({ text: c, bold: true })] : runs(c) })], ...(head ? { shading: { type: d.ShadingType.CLEAR, fill: "EDEDF2", color: "auto" } } : {}) })) });
        children.push(new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: [row(tb.header.map((h) => plain(h.text)), true), ...tb.rows.map((r) => row(r.map((c) => c.text)))] }));
        children.push(new d.Paragraph(""));
      } else if (t.type === "hr") children.push(new d.Paragraph({ border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "DDDDDD", space: 4 } } }));
    }
    const doc = new d.Document({
      creator: "TechNova AI Hub", title,
      numbering: { config: [{ reference: "numbers", levels: [{ level: 0, format: d.LevelFormat.DECIMAL, text: "%1.", alignment: d.AlignmentType.START }] }] },
      styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
      sections: [{ headers: { default: new d.Header({ children: [new d.Paragraph({ children: [new d.TextRun({ text: "TECHNOVA AI HUB", bold: true, color: "888888", size: 16 })] })] }) }, children }],
    });
    return save(await d.Packer.toBlob(doc), fileName(title, "docx"));
  }

  if (format === "pptx") {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "TechNova AI Hub"; pptx.title = title;
    const cover = pptx.addSlide();
    cover.background = { color: "0B0B0F" };
    cover.addText("TECHNOVA AI HUB", { x: 0.6, y: 0.5, w: 8, h: 0.4, fontSize: 12, bold: true, color: "A9D3F5", charSpacing: 4 });
    cover.addText(title, { x: 0.6, y: 2.4, w: 12, h: 1.6, fontSize: 40, bold: true, color: "FFFFFF" });
    cover.addText(new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US"), { x: 0.6, y: 4.2, w: 6, h: 0.4, fontSize: 14, color: "9A9AA5" });
    // One slide per heading section: its bullets (paragraphs and list items) and its first table.
    type Section = { heading: string; bullets: string[]; table?: Table };
    const sections: Section[] = [];
    let cur: Section | null = null;
    for (const t of tokens) {
      if (t.type === "heading") { cur = { heading: plain(t.text), bullets: [] }; sections.push(cur); continue; }
      if (!cur) { cur = { heading: title, bullets: [] }; sections.push(cur); }
      if (t.type === "paragraph") cur.bullets.push(plain(t.text));
      else if (t.type === "list") (t as Tokens.List).items.forEach((it) => cur!.bullets.push(plain(it.text.split("\n")[0] ?? "")));
      else if (t.type === "table" && !cur.table) { const first = tablesOf([t])[0]; if (first) cur.table = first; }
    }
    for (const sec of sections) {
      if (!sec.bullets.length && !sec.table) continue;
      const s = pptx.addSlide();
      s.addText(sec.heading, { x: 0.6, y: 0.4, w: 12, h: 0.8, fontSize: 28, bold: true, color: "111111" });
      if (sec.table) {
        const rows = [sec.table.header.map((h) => ({ text: h, options: { bold: true, fill: { color: "EDEDF2" } } })), ...sec.table.rows.slice(0, 12).map((r) => r.map((c) => ({ text: c })))];
        s.addTable(rows, { x: 0.6, y: sec.bullets.length ? 3.4 : 1.5, w: 12, fontSize: 12, border: { type: "solid", pt: 0.5, color: "CCCCCC" } });
      }
      if (sec.bullets.length) s.addText(sec.bullets.slice(0, 8).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.4, w: 12, h: sec.table ? 1.9 : 5.4, fontSize: 18, color: "333333", valign: "top" });
    }
    const blob = (await pptx.write({ outputType: "blob" })) as Blob;
    return save(blob, fileName(title, "pptx"));
  }
}
