/** Dashboard appearance themes. The mode (light/dark) drives the sidebar and the shared tokens; the look only
 *  changes the content area (wallpaper, glass panels, composer). The light looks follow the dashboard mockup
 *  (Apple, Pastel, Papier, Givre) plus the original Ciel ("light"); retired preferences open a look of their mode. */
export type DashboardLook = "apple" | "pastel" | "papier" | "givre" | "light" | "brume" | "soie" | "graphite" | "obsidienne" | "reverbere";

export const dashboardLooks: { id: DashboardLook; mode: "light" | "dark"; fr: string; en: string; swatch: string }[] = [
  { id: "brume", mode: "dark", fr: "Brume", en: "Mist", swatch: "#26252a" },
  { id: "soie", mode: "dark", fr: "Soie", en: "Silk", swatch: "#374858" },
  { id: "graphite", mode: "dark", fr: "Graphite", en: "Graphite", swatch: "#232327" },
  { id: "obsidienne", mode: "dark", fr: "Obsidienne", en: "Obsidian", swatch: "#0f2a22" },
  { id: "reverbere", mode: "dark", fr: "Réverbère", en: "Streetlight", swatch: "#3a3a3a" },
  { id: "apple", mode: "light", fr: "Apple", en: "Apple", swatch: "#f4f4f6" },
  { id: "pastel", mode: "light", fr: "Pastel", en: "Pastel", swatch: "#a9c3da" },
  { id: "papier", mode: "light", fr: "Papier", en: "Paper", swatch: "#fbfbfb" },
  { id: "givre", mode: "light", fr: "Givre", en: "Frost", swatch: "#c7cdf6" },
  { id: "light", mode: "light", fr: "Ciel", en: "Sky", swatch: "#7fa9e8" },
];

/** Default look for each mode (the light/dark switch in Settings). */
export const defaultLook = { light: "apple", dark: "brume" } as const satisfies Record<"light" | "dark", DashboardLook>;

export function isDashboardLook(value: string | null): value is DashboardLook {
  return dashboardLooks.some((look) => look.id === value);
}

/** Stored preference → look, including retired themes (Nuit, Émeraude, Ardoise, Améthyste, Cobalt → Brume; Sable → Apple; Ivoire → Ciel). */
export function storedLook(value: string | null): DashboardLook | null {
  if (value === "dark" || value === "emeraude" || value === "ardoise" || value === "amethyste" || value === "cobalt") return defaultLook.dark;
  if (value === "sable") return defaultLook.light;
  if (value === "ivoire") return "light";
  return isDashboardLook(value) ? value : null;
}

export function lookMode(look: DashboardLook) {
  return dashboardLooks.find((item) => item.id === look)?.mode ?? "light";
}
