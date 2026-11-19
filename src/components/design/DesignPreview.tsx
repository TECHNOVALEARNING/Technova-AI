import { useEffect } from "react";
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
