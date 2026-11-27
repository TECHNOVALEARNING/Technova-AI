import type { CSSProperties, ReactNode } from "react";
import type { DesignField, DesignFormatId, FieldKind } from "@/lib/design-formats";
import type { Palette } from "./designs";

// Drawing helpers shared by every TechNova Design layout (designs.tsx, deck-layouts.tsx). Layouts use solid colours,
// borders and data-design-image slots only, so templateToDoc can turn them into editable elements.

export type V = Record<string, string>;
export type Layout = { id: string; format: DesignFormatId; fr: string; en: string; pages: number; fields: DesignField[]; render: (v: V, p: Palette, page: number) => ReactNode };

export const f = (key: string, label: string, value: string, kind: FieldKind = "text", max = kind === "long" ? 600 : 120): DesignField => ({ key, label, kind, value, max });
export const font = (name: string) => `'${name}', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;
export const lines = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);

/** A page at its design size; everything inside is positioned in design pixels. */
export function Page({ w, h, p, children, style }: { w: number; h: number; p: Palette; children: ReactNode; style?: CSSProperties }) {
  return <div data-design-page style={{ width: w, height: h, position: "relative", overflow: "hidden", background: p.bg, color: p.ink, fontFamily: font(p.body), boxSizing: "border-box", ...style }}>{children}</div>;
}
export const H = (p: Palette, size: number, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: font(p.head), fontSize: size, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, ...extra });
export const B = (p: Palette, size: number, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: font(p.body), fontSize: size, lineHeight: 1.55, margin: 0, color: p.muted, ...extra });
export const Eyebrow = ({ p, children, size = 14, color }: { p: Palette; children: ReactNode; size?: number; color?: string }) => <p style={{ fontFamily: font(p.body), fontSize: size, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: color ?? p.accent, margin: 0 }}>{children}</p>;
// data-design-image marks a picture slot: the editor turns it into an image element (empty = « Image » placeholder).
export const Img = ({ src, p, style, label = "Photo" }: { src: string; p: Palette; style: CSSProperties; label?: string }) => src
  ? <div data-design-image={src} style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center", ...style }} />
  : <div data-design-image="" style={{ background: p.soft, display: "flex", alignItems: "center", justifyContent: "center", color: p.muted, fontFamily: font(p.body), fontSize: 14, ...style }}>{label}</div>;
export const Bar = ({ p, w = 56, h = 4 }: { p: Palette; w?: number; h?: number }) => <div style={{ width: w, height: h, background: p.accent, borderRadius: h }} />;
