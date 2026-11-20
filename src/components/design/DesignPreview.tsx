import { useEffect, useRef, useState } from "react";
import { formatById } from "@/lib/design-formats";
import { FONTS_HREF, type DesignTemplate, type Palette } from "./designs";

/** Loads the design fonts once (Google Fonts), for previews and thumbnails. */
export function useDesignFonts() {
  useEffect(() => {
    if (document.querySelector("link[data-design-fonts]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONTS_HREF; link.dataset["designFonts"] = "1";
    document.head.appendChild(link);
  }, []);
}

/** A design page fitted inside its parent box (keeps its ratio, never wider or taller than the box). */
export function FittedPreview({ template, values, palette, page = 0, fill = 0.86 }: { template: DesignTemplate; values: Record<string, string>; palette?: Palette; page?: number; fill?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const fmt = formatById(template.format);
  const width = size.w && size.h ? Math.max(40, Math.min(size.w * fill, (size.h * fill * fmt.w) / fmt.h)) : 0;
  return <div ref={box} className="grid size-full place-items-center">{width > 0 && <div className="shadow-md"><DesignPreview template={template} values={values} {...(palette ? { palette } : {})} page={page} width={width} /></div>}</div>;
}

/** One page of a design, drawn at its real size and scaled to `width` CSS pixels. */
export function DesignPreview({ template, values, palette, page = 0, width, className }: {
  template: DesignTemplate; values: Record<string, string>; palette?: Palette; page?: number; width: number; className?: string;
}) {
  const fmt = formatById(template.format);
  const scale = width / fmt.w;
  return <div className={className} style={{ width, height: fmt.h * scale, overflow: "hidden", position: "relative" }}>
    <div style={{ width: fmt.w, height: fmt.h, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
      {template.layout.render(values, palette ?? template.palette, page)}
    </div>
  </div>;
}
