import { renderToStaticMarkup } from "react-dom/server";
import { formatById } from "@/lib/design-formats";
import { FONTS_HREF, type DesignTemplate, type Palette } from "./designs";

// Exports of TechNova Design, all built in the browser (nothing is sent anywhere, no credits):
// print / PDF (the system print dialog with the exact page size), a standalone HTML file, and a native,
// editable PowerPoint file for presentations (opens in PowerPoint, Google Slides and Canva).

type V = Record<string, string>;

function pagesMarkup(t: DesignTemplate, v: V, p: Palette) {
  return Array.from({ length: t.layout.pages }, (_, i) => `<section class="sheet">${renderToStaticMarkup(<>{t.layout.render(v, p, i)}</>)}</section>`).join("");
}

function documentHtml(t: DesignTemplate, v: V, p: Palette, title: string) {
  const fmt = formatById(t.format);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="${FONTS_HREF}">
<style>
@page { size: ${fmt.print}; margin: 0; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e9e9ec; }
.sheet { width: ${fmt.w}px; height: ${fmt.h}px; margin: 24px auto; box-shadow: 0 10px 30px rgba(0,0,0,.12); overflow: hidden; page-break-after: always; break-after: page; }
@media print {
  html, body { background: none; }
  .sheet { margin: 0; box-shadow: none; zoom: var(--fit, 1); }
}
</style></head><body>${pagesMarkup(t, v, p)}</body></html>`;
}

/** Opens the print dialog (Imprimer ou Enregistrer en PDF) with the design at its real page size. */
export function printDesign(t: DesignTemplate, v: V, p: Palette, title: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const fmt = formatById(t.format);
  win.document.open();
  win.document.write(documentHtml(t, v, p, title));
  win.document.close();
  // Fit pixel designs on paper sizes (A4, A5, card): scale the sheet to the printable page width.
  const mmWidth: Record<string, number> = { A4: 210, A5: 148, "A4 landscape": 297, "85mm 55mm": 85 };
  const mm = mmWidth[fmt.print];
  if (mm) win.document.documentElement.style.setProperty("--fit", String((mm * 96) / 25.4 / fmt.w));
  const go = () => { try { win.focus(); win.print(); } catch { /* closed */ } };
  void (win.document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(go, 300));
  return true;
}

export function downloadHtml(t: DesignTemplate, v: V, p: Palette, title: string) {
  const blob = new Blob([documentHtml(t, v, p, title)], { type: "text/html;charset=utf-8" });
  save(blob, `${slug(title)}.html`);
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "design";
function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const hex = (c: string) => c.replace("#", "").toUpperCase();
const lines = (t: string) => (t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

/** Native PowerPoint file (editable text boxes in the design's colours and fonts), five slides. */
export async function downloadPptx(v: V, p: Palette, title: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in
  pptx.title = title;
  const head = p.head, body = p.body, ink = hex(p.ink), muted = hex(p.muted), accent = hex(p.accent), bg = hex(p.bg), surface = hex(p.surface), soft = hex(p.soft);
  const base = () => { const s = pptx.addSlide(); s.background = { color: bg }; return s; };

  let s = base();
  s.addText(v["date"] ?? "", { x: 0.9, y: 2.0, w: 9, h: 0.4, fontFace: body, fontSize: 13, bold: true, color: accent, charSpacing: 3 });
  s.addText(v["title"] ?? "", { x: 0.9, y: 2.45, w: 10.5, h: 1.8, fontFace: head, fontSize: 46, bold: true, color: ink, valign: "top" });
  s.addText(v["subtitle"] ?? "", { x: 0.9, y: 4.35, w: 10, h: 0.7, fontFace: body, fontSize: 20, color: muted });
  s.addText(v["author"] ?? "", { x: 0.9, y: 6.5, w: 10, h: 0.4, fontFace: body, fontSize: 14, bold: true, color: ink });

  s = base();
  s.addText("SOMMAIRE", { x: 0.9, y: 0.8, w: 6, h: 0.4, fontFace: body, fontSize: 13, bold: true, color: accent, charSpacing: 3 });
  lines(v["agenda"] ?? "").slice(0, 5).forEach((t, i) => {
    s.addShape(pptx.ShapeType.line, { x: 0.9, y: 1.7 + i * 1.0, w: 11.5, h: 0, line: { color: hex(p.line), width: 1 } });
    s.addText(String(i + 1).padStart(2, "0"), { x: 0.9, y: 1.85 + i * 1.0, w: 1, h: 0.6, fontFace: head, fontSize: 24, bold: true, color: accent });
    s.addText(t, { x: 2.0, y: 1.85 + i * 1.0, w: 10, h: 0.6, fontFace: head, fontSize: 26, color: ink });
  });

  s = base();
  s.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.0, w: 0.6, h: 0.06, fill: { color: accent }, line: { color: accent } });
  s.addText(v["contentTitle"] ?? "", { x: 0.9, y: 1.2, w: 4.2, h: 2.4, fontFace: head, fontSize: 34, bold: true, color: ink, valign: "top" });
  lines(v["bullets"] ?? "").slice(0, 5).forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 5.6, y: 1.0 + i * 1.25, w: 6.8, h: 1.05, fill: { color: surface }, line: { color: hex(p.line), width: 1 }, rectRadius: 0.12 });
    s.addText(String(i + 1), { x: 5.8, y: 1.25 + i * 1.25, w: 0.5, h: 0.5, fontFace: body, fontSize: 14, bold: true, color: accent, align: "center", fill: { color: soft } });
    s.addText(t, { x: 6.45, y: 1.05 + i * 1.25, w: 5.8, h: 0.95, fontFace: body, fontSize: 16, color: ink, valign: "middle" });
  });

  s = base();
  s.addText("CHIFFRES CLÉS", { x: 0.9, y: 0.8, w: 6, h: 0.4, fontFace: body, fontSize: 13, bold: true, color: accent, charSpacing: 3 });
  [1, 2, 3].forEach((n, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9 + i * 3.95, y: 2.4, w: 3.6, h: 2.6, fill: { color: surface }, line: { color: hex(p.line), width: 1 }, rectRadius: 0.15 });
    s.addText(v[`stat${n}`] ?? "", { x: 1.15 + i * 3.95, y: 2.65, w: 3.1, h: 1.1, fontFace: head, fontSize: 40, bold: true, color: accent });
    s.addText(v[`stat${n}Label`] ?? "", { x: 1.15 + i * 3.95, y: 3.8, w: 3.1, h: 0.9, fontFace: body, fontSize: 15, color: muted, valign: "top" });
  });

  s = pptx.addSlide();
  s.background = { color: ink };
  s.addShape(pptx.ShapeType.rect, { x: 0.9, y: 2.6, w: 0.6, h: 0.06, fill: { color: accent }, line: { color: accent } });
  s.addText(v["closing"] ?? "", { x: 0.9, y: 2.8, w: 11, h: 1.4, fontFace: head, fontSize: 44, bold: true, color: bg });
  s.addText(v["contact"] ?? "", { x: 0.9, y: 4.3, w: 11, h: 0.6, fontFace: body, fontSize: 16, color: hex(p.line) });

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  save(blob, `${slug(title)}.pptx`);
}
