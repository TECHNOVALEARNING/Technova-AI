import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

// TechNova Design documents: free elements (text boxes, images, shapes) on pages, like Canva or Word text boxes.
// A template is drawn by its layout (designs.tsx) once, then measured in the browser and turned into elements
// the user can move, resize and format; everything after that (editor, print, HTML, PowerPoint, share link)
// reads this document.

export type TextAlign = "left" | "center" | "right" | "justify";
export type TextEl = {
  id: string; type: "text"; x: number; y: number; w: number; h: number; text: string;
  font: string; size: number; bold: boolean; italic: boolean; underline: boolean; color: string; highlight: string;
  align: TextAlign; lineHeight: number; spacing: number; upper: boolean; list: "none" | "bullet" | "number";
};
export type ImageEl = { id: string; type: "image"; x: number; y: number; w: number; h: number; src: string; radius: number };
export type ShapeEl = { id: string; type: "shape"; x: number; y: number; w: number; h: number; fill: string; radius: number; border: number; borderColor: string; opacity: number };
export type DesignEl = TextEl | ImageEl | ShapeEl;
export type DesignPageDoc = { id: string; bg: string; elements: DesignEl[] };
export type DesignDoc = { w: number; h: number; pages: DesignPageDoc[] };

export const uid = () => Math.random().toString(36).slice(2, 10);
export const fontStack = (name: string) => `'${name}', 'Noto Color Emoji', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;

const transparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);
const px = (s: string) => parseFloat(s) || 0;
const firstFont = (family: string) => family.split(",")[0]!.replace(/["']/g, "").trim();
function toHex(c: string) {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : c;
}

/** Turns one rendered template page into elements by measuring its DOM (positions, colours, fonts). */
function extractPage(root: HTMLElement): DesignPageDoc {
  const base = root.getBoundingClientRect();
  const els: DesignEl[] = [];
  const rel = (r: DOMRect) => ({ x: Math.round(r.left - base.left), y: Math.round(r.top - base.top), w: Math.max(4, Math.round(r.width)), h: Math.max(4, Math.round(r.height)) });
  const walk = (node: HTMLElement, isRoot: boolean) => {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const imageSrc = node.dataset["designImage"];
    if (imageSrc !== undefined) {
      els.push({ id: uid(), type: "image", ...rel(r), src: imageSrc, radius: px(cs.borderTopLeftRadius) });
      return;
    }
    if (!isRoot) {
      const sides = { top: px(cs.borderTopWidth), right: px(cs.borderRightWidth), bottom: px(cs.borderBottomWidth), left: px(cs.borderLeftWidth) };
      const full = sides.top > 0 && sides.top === sides.right && sides.top === sides.bottom && sides.top === sides.left;
      const opacity = Number(cs.opacity) || 1;
      if (!transparent(cs.backgroundColor) || full) {
        els.push({ id: uid(), type: "shape", ...rel(r), fill: transparent(cs.backgroundColor) ? "transparent" : toHex(cs.backgroundColor), radius: px(cs.borderTopLeftRadius),
          border: full ? sides.top : 0, borderColor: toHex(cs.borderTopColor), opacity });
      }
      // A border on some sides only (a rule under a title, a bar beside an experience) is drawn as thin filled lines.
      if (!full) {
        const b = rel(r);
        const line = (x: number, y: number, w: number, h: number, color: string) => els.push({ id: uid(), type: "shape", x, y, w, h, fill: toHex(color), radius: 0, border: 0, borderColor: "#000000", opacity });
        if (sides.top > 0) line(b.x, b.y, b.w, sides.top, cs.borderTopColor);
        if (sides.bottom > 0) line(b.x, b.y + b.h - sides.bottom, b.w, sides.bottom, cs.borderBottomColor);
        if (sides.left > 0) line(b.x, b.y, sides.left, b.h, cs.borderLeftColor);
        if (sides.right > 0) line(b.x + b.w - sides.right, b.y, sides.right, b.h, cs.borderRightColor);
      }
    }
    const hasText = [...node.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? "").trim());
    if (hasText && !isRoot) {
      // Where the text really sits (flex-centred stat cards, padded pills): the text range, not the box. Left-aligned
      // text keeps the range width; centred, right or justified text keeps the content-box width so it aligns the same.
      const range = document.createRange(); range.selectNodeContents(node);
      const tr = range.getBoundingClientRect();
      const align = (["center", "right", "justify"].includes(cs.textAlign) ? cs.textAlign : "left") as TextAlign;
      const cl = r.left + px(cs.paddingLeft) + px(cs.borderLeftWidth), cw = r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
      const raw = align === "left" ? { left: tr.left, width: tr.width } : { left: cl, width: cw };
      // A little slack so the same words never wrap one line earlier when drawn again (sub-pixel rounding, shrink-wrapped
      // boxes); the extra room goes where the alignment keeps the text in place.
      const extra = Math.ceil(raw.width * 0.06) + 8;
      const grow = align === "center" || align === "justify" ? extra / 2 : align === "right" ? extra : 0;
      const left = Math.max(base.left, raw.left - grow);
      const box = { left, width: Math.min(base.right - left, raw.width + extra) };
      els.push({
        id: uid(), type: "text", x: Math.round(box.left - base.left), y: Math.round(tr.top - base.top), w: Math.max(20, Math.round(box.width)), h: Math.max(10, Math.round(tr.height)), text: node.innerText.replace(/ /g, " "),
        font: firstFont(cs.fontFamily), size: Math.round(px(cs.fontSize) * 10) / 10, bold: Number(cs.fontWeight) >= 600, italic: cs.fontStyle === "italic",
        underline: cs.textDecorationLine.includes("underline"), color: toHex(cs.color), highlight: "", align,
        lineHeight: cs.lineHeight === "normal" ? 1.3 : Math.round((px(cs.lineHeight) / px(cs.fontSize)) * 100) / 100, spacing: cs.letterSpacing === "normal" ? 0 : px(cs.letterSpacing),
        upper: cs.textTransform === "uppercase", list: "none",
      });
      return;
    }
    for (const c of node.children) walk(c as HTMLElement, false);
  };
  walk(root, true);
  return { id: uid(), bg: toHex(getComputedStyle(root).backgroundColor), elements: els };
}

/** Draws the template pages off-screen (fonts loaded), measures them and returns the editable document. */
export async function templateToDoc(render: (page: number) => React.ReactNode, pages: number, w: number, h: number): Promise<DesignDoc> {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;pointer-events:none;opacity:0;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const out: DesignPageDoc[] = [];
    for (let i = 0; i < pages; i++) {
      flushSync(() => root.render(<>{render(i)}</>));
      await document.fonts?.ready;
      const page = host.querySelector<HTMLElement>("[data-design-page]");
      if (page) out.push(extractPage(page));
    }
    return { w, h, pages: out };
  } finally { root.unmount(); host.remove(); }
}

export const textStyle = (t: TextEl): CSSProperties => ({
  fontFamily: fontStack(t.font), fontSize: t.size, fontWeight: t.bold ? 700 : 400, fontStyle: t.italic ? "italic" : "normal",
  textDecoration: t.underline ? "underline" : "none", color: t.color, textAlign: t.align, lineHeight: t.lineHeight, letterSpacing: t.spacing,
  textTransform: t.upper ? "uppercase" : "none", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
});

/** The text as shown: list markers added per line. */
export function textLines(t: TextEl) {
  if (t.list === "none") return t.text;
  return t.text.split("\n").map((l, i) => (l.trim() ? `${t.list === "bullet" ? "•" : `${i + 1}.`} ${l.replace(/^(•|\d+\.)\s*/, "")}` : l)).join("\n");
}

/** One page of a document, at its design size (used by the editor, thumbnails, print and the share page). */
export function DocPage({ doc, page, selected, editing, onPointerDown, onDoubleClick, renderEditing }: {
  doc: DesignDoc; page: number; selected?: string | null; editing?: string | null;
  onPointerDown?: (e: React.PointerEvent, el: DesignEl) => void; onDoubleClick?: (el: DesignEl) => void; renderEditing?: (el: TextEl) => React.ReactNode;
}) {
  const p = doc.pages[page];
  if (!p) return null;
  return <div data-doc-page style={{ position: "relative", width: doc.w, height: doc.h, background: p.bg, overflow: "hidden" }}>
    {p.elements.map((el) => {
      const box: CSSProperties = { position: "absolute", left: el.x, top: el.y, width: el.w, ...(el.type === "text" ? { minHeight: el.h } : { height: el.h }) };
      const handlers = onPointerDown ? { onPointerDown: (e: React.PointerEvent) => onPointerDown(e, el), onDoubleClick: () => onDoubleClick?.(el) } : {};
      // In the editor, a finger drags the element instead of scrolling the page.
      const touch: CSSProperties = onPointerDown ? { touchAction: "none" } : {};
      const outline = { ...touch, ...(selected === el.id ? { outline: "2px solid #6d5bd0", outlineOffset: 2 } : {}) };
      if (el.type === "shape") return <div key={el.id} {...handlers} style={{ ...box, ...outline, background: el.fill, borderRadius: el.radius, border: el.border ? `${el.border}px solid ${el.borderColor}` : undefined, opacity: el.opacity, boxSizing: "border-box" }} />;
      if (el.type === "image") return <div key={el.id} {...handlers} style={{ ...box, ...outline, borderRadius: el.radius, overflow: "hidden", background: el.src ? undefined : "repeating-linear-gradient(45deg,#ececf1,#ececf1 10px,#f6f6f9 10px,#f6f6f9 20px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {el.src ? <img src={el.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ fontFamily: "system-ui", fontSize: Math.max(12, Math.min(28, el.w / 10)), color: "#8b8b98" }}>Image</span>}
      </div>;
      if (editing === el.id && renderEditing) return <div key={el.id} style={box}>{renderEditing(el)}</div>;
      return <div key={el.id} {...handlers} style={{ ...box, ...outline, ...textStyle(el) }}>
        <span style={el.highlight ? { background: el.highlight, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "0 0.15em" } : undefined}>{textLines(el)}</span>
      </div>;
    })}
  </div>;
}

/** « Décliner » (Créativité Pro): the same design on another page size. Positions follow the page proportionally,
 *  sizes (text, pictures, shapes) scale by the smaller ratio so nothing is stretched, then stay inside the page. */
export function resizeDoc(doc: DesignDoc, w: number, h: number): DesignDoc {
  const sx = w / doc.w, sy = h / doc.h, k = Math.min(sx, sy);
  return {
    w, h,
    pages: doc.pages.map((p) => ({ ...p, id: uid(), elements: p.elements.map((e) => {
      const cx = (e.x + e.w / 2) * sx, cy = (e.y + e.h / 2) * sy;
      const nw = Math.round(e.w * k), nh = Math.round(e.h * k);
      const base = { ...e, id: uid(), w: Math.min(w, nw), h: Math.min(h, nh), x: Math.round(Math.max(0, Math.min(w - nw, cx - nw / 2))), y: Math.round(Math.max(0, Math.min(h - nh, cy - nh / 2))) };
      if (e.type === "text") return { ...base, size: Math.max(6, Math.round(e.size * k * 10) / 10), spacing: e.spacing * k } as DesignEl;
      if (e.type === "shape") return { ...base, radius: e.radius * k, border: e.border * k } as DesignEl;
      return { ...base, radius: (e as ImageEl).radius * k } as DesignEl;
    }) })),
  };
}
