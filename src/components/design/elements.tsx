import type { CSSProperties } from "react";

// PowerPoint-like elements of TechNova Design drawn as plain SVG / HTML, so the editor, the thumbnails, print / PDF
// and the share page all show the same thing: shape kinds, charts (bar, line, pie, doughnut) and tables.

export type ShapeKind = "rect" | "ellipse" | "triangle" | "diamond" | "star" | "arrow" | "chevron" | "hexagon" | "bubble";
export const SHAPE_KINDS: { id: ShapeKind; fr: string; en: string }[] = [
  { id: "rect", fr: "Rectangle", en: "Rectangle" }, { id: "ellipse", fr: "Cercle / ellipse", en: "Circle / ellipse" },
  { id: "triangle", fr: "Triangle", en: "Triangle" }, { id: "diamond", fr: "Losange", en: "Diamond" }, { id: "star", fr: "Étoile", en: "Star" },
  { id: "arrow", fr: "Flèche", en: "Arrow" }, { id: "chevron", fr: "Chevron", en: "Chevron" }, { id: "hexagon", fr: "Hexagone", en: "Hexagon" },
  { id: "bubble", fr: "Bulle", en: "Speech bubble" },
];

const starPoints = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 21 : 50; pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a) * 1.05 + 2).toFixed(2)}`); }
  return pts.join(" ");
})();
/** Geometry of the drawn kinds, in a 100 × 100 box stretched to the element. */
export const SHAPE_POINTS: Partial<Record<ShapeKind, string>> = {
  triangle: "50,0 100,100 0,100", diamond: "50,0 100,50 50,100 0,50", star: starPoints,
  arrow: "0,30 60,30 60,0 100,50 60,100 60,70 0,70", chevron: "0,0 70,0 100,50 70,100 0,100 30,50", hexagon: "25,0 75,0 100,50 75,100 25,100 0,50",
};
const BUBBLE = "M8,0 H92 Q100,0 100,8 V62 Q100,70 92,70 H42 L22,96 L27,70 H8 Q0,70 0,62 V8 Q0,0 8,0 Z";

export function ShapeSvg({ kind, fill, border, borderColor, opacity }: { kind: ShapeKind; fill: string; border: number; borderColor: string; opacity: number }) {
  const common = { fill: fill === "transparent" ? "none" : fill, stroke: border ? borderColor : "none", strokeWidth: border, vectorEffect: "non-scaling-stroke" as const, opacity };
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
    {kind === "bubble" ? <path d={BUBBLE} {...common} /> : <polygon points={SHAPE_POINTS[kind] ?? "0,0 100,0 100,100 0,100"} {...common} />}
  </svg>;
}

// ---------------------------------------------------------------- charts

export type ChartKind = "bar" | "line" | "pie" | "doughnut";
export const CHART_KINDS: { id: ChartKind; fr: string; en: string }[] = [
  { id: "bar", fr: "Histogramme", en: "Column" }, { id: "line", fr: "Courbe", en: "Line" }, { id: "pie", fr: "Secteurs", en: "Pie" }, { id: "doughnut", fr: "Anneau", en: "Doughnut" },
];

/** Lighter and darker shades of the accent for the slices / series of a chart (hex, so PowerPoint gets them too). */
export function shades(hex: string, n: number): string[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); const base = m ? parseInt(m[1]!, 16) : 0x2563eb;
  const rgb = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  return Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0 : (i / (n - 1)) * 1.3 - 0.35;               // from a little darker to much lighter
    const mix = rgb.map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t * 0.75));
    return `#${mix.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
  });
}

export function ChartSvg({ kind, labels, values, color, ink, font, w, h, title }: { kind: ChartKind; labels: string[]; values: number[]; color: string; ink: string; font: string; w: number; h: number; title: string }) {
  const n = Math.min(labels.length, values.length);
  const vals = values.slice(0, n).map((v) => (Number.isFinite(v) ? v : 0));
  const fs = Math.max(10, Math.min(18, h / 18));
  const top = title ? fs * 2.4 : fs;
  const text: CSSProperties = { fontFamily: font, fontSize: fs, fill: ink };
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString("fr-FR") : String(Math.round(v * 100) / 100).replace(".", ","));
  const head = title ? <text x={w / 2} y={fs * 1.3} textAnchor="middle" style={{ ...text, fontWeight: 700, fontSize: fs * 1.15 }}>{title}</text> : null;
  if (!n) return <svg width={w} height={h}>{head}</svg>;
  if (kind === "pie" || kind === "doughnut") {
    const total = vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cols = shades(color, n);
    const legendW = Math.min(w * 0.38, 220);
    const r = Math.max(10, Math.min((w - legendW) / 2, (h - top) / 2) - 8);
    const cx = (w - legendW) / 2, cy = top + (h - top) / 2;
    let a0 = -Math.PI / 2;
    const arcs = vals.map((v, i) => {
      const a1 = a0 + (Math.max(0, v) / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const d = vals.filter((x) => x > 0).length === 1 && v > 0
        ? `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`
        : `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
      a0 = a1;
      return <path key={i} d={d} fill={cols[i]} stroke="#ffffff" strokeWidth={2} />;
    });
    return <svg width={w} height={h}>{head}{arcs}{kind === "doughnut" && <circle cx={cx} cy={cy} r={r * 0.55} fill="#ffffff" />}
      {labels.slice(0, n).map((l, i) => <g key={i} transform={`translate(${w - legendW + 8},${top + 10 + i * fs * 1.6})`}>
        <rect width={fs * 0.8} height={fs * 0.8} y={-fs * 0.7} rx={2} fill={cols[i]} />
        <text x={fs * 1.2} style={text}>{l} · {Math.round((Math.max(0, vals[i]!) / total) * 100)} %</text>
      </g>)}
    </svg>;
  }
  const max = Math.max(...vals, 0) || 1, min = Math.min(0, ...vals);
  const left = fs * 0.5, bottom = fs * 2.2, plotH = h - top - bottom, plotW = w - left * 2;
  const y = (v: number) => top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const step = plotW / n;
  const axis = <line x1={left} x2={w - left} y1={y(0)} y2={y(0)} stroke={ink} strokeOpacity={0.25} />;
  const xLabels = labels.slice(0, n).map((l, i) => <text key={i} x={left + step * i + step / 2} y={h - fs * 0.6} textAnchor="middle" style={{ ...text, fillOpacity: 0.75 }}>{l.length > 12 ? `${l.slice(0, 11)}…` : l}</text>);
  if (kind === "line") {
    const pts = vals.map((v, i) => `${left + step * i + step / 2},${y(v)}`).join(" ");
    return <svg width={w} height={h}>{head}{axis}<polyline points={pts} fill="none" stroke={color} strokeWidth={Math.max(2, fs / 5)} strokeLinejoin="round" />
      {vals.map((v, i) => <g key={i}><circle cx={left + step * i + step / 2} cy={y(v)} r={fs / 3} fill={color} /><text x={left + step * i + step / 2} y={y(v) - fs * 0.7} textAnchor="middle" style={{ ...text, fontWeight: 700 }}>{fmt(v)}</text></g>)}{xLabels}</svg>;
  }
  const bw = step * 0.62;
  return <svg width={w} height={h}>{head}{axis}
    {vals.map((v, i) => { const x = left + step * i + (step - bw) / 2; const y1 = y(Math.max(0, v)), y2 = y(Math.min(0, v)); return <g key={i}>
      <rect x={x} y={y1} width={bw} height={Math.max(1, y2 - y1)} rx={Math.min(6, bw / 6)} fill={color} />
      <text x={x + bw / 2} y={y1 - fs * 0.45} textAnchor="middle" style={{ ...text, fontWeight: 700 }}>{fmt(v)}</text>
    </g>; })}{xLabels}</svg>;
}

// ---------------------------------------------------------------- tables

export function TableView({ rows, header, fill, color, font, size, border }: { rows: string[][]; header: boolean; fill: string; color: string; font: string; size: number; border: string }) {
  return <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: font, fontSize: size, color }}>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, k) => {
      const head = header && i === 0;
      return <td key={k} style={{ border: `1px solid ${border}`, padding: `${size * 0.35}px ${size * 0.6}px`, background: head ? fill : i % 2 === 0 ? "rgba(0,0,0,0.025)" : "transparent", color: head ? "#ffffff" : color, fontWeight: head ? 700 : 400, verticalAlign: "middle", overflow: "hidden", wordBreak: "break-word" }}>{c}</td>;
    })}</tr>)}</tbody>
  </table>;
}

/** A picture of a Lucide icon as PNG (crisp at 512 px), so it is an ordinary image in every export. */
export async function iconPng(svgMarkup: string, color: string, size = 512): Promise<string> {
  // The markup already has width / height (24): replace them, a duplicated attribute makes the SVG unreadable.
  const svg = svgMarkup.replace(/<svg([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s(width|height|color)="[^"]*"/g, "")} width="${size}" height="${size}">`).replace(/currentColor/g, color);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; });
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  c.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return c.toDataURL("image/png");
}
