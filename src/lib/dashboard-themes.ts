/** Dashboard appearance themes. The mode (light/dark) drives the sidebar and the shared tokens; the look only
 *  changes the content area (wallpaper, glass panels, composer). The light looks follow the dashboard mockup
 *  (Apple, Pastel, Papier, Givre, Ivoire); retired preferences open the default look of their mode. */
export type DashboardLook = "apple" | "pastel" | "papier" | "givre" | "ivoire" | "brume" | "soie" | "ardoise" | "amethyste" | "cobalt" | "reverbere";

export const dashboardLooks: { id: DashboardLook; mode: "light" | "dark"; fr: string; en: string; swatch: string }[] = [
  { id: "brume", mode: "dark", fr: "Brume", en: "Mist", swatch: "#26252a" },
  { id: "soie", mode: "dark", fr: "Soie", en: "Silk", swatch: "#374858" },
  { id: "ardoise", mode: "dark", fr: "Ardoise", en: "Slate", swatch: "#5f7488" },
  { id: "amethyste", mode: "dark", fr: "Améthyste", en: "Amethyst", swatch: "#6b5a8e" },
  { id: "cobalt", mode: "dark", fr: "Cobalt", en: "Cobalt", swatch: "#1f4f8a" },
  { id: "reverbere", mode: "dark", fr: "Réverbère", en: "Streetlight", swatch: "#3a3a3a" },
  { id: "apple", mode: "light", fr: "Apple", en: "Apple", swatch: "#f4f4f6" },
  { id: "pastel", mode: "light", fr: "Pastel", en: "Pastel", swatch: "#a9c3da" },
  { id: "papier", mode: "light", fr: "Papier", en: "Paper", swatch: "#fbfbfb" },
  { id: "givre", mode: "light", fr: "Givre", en: "Frost", swatch: "#c7cdf6" },
  { id: "ivoire", mode: "light", fr: "Ivoire", en: "Ivory", swatch: "#f1e6cf" },
];

/** Default look for each mode (the light/dark switch in Settings). */
export const defaultLook = { light: "apple", dark: "brume" } as const satisfies Record<"light" | "dark", DashboardLook>;

export function isDashboardLook(value: string | null): value is DashboardLook {
  return dashboardLooks.some((look) => look.id === value);
}

/** Stored preference → look, including retired themes (Nuit, Émeraude → Brume; Ciel, Sable → Apple). */
export function storedLook(value: string | null): DashboardLook | null {
  if (value === "dark" || value === "emeraude") return defaultLook.dark;
  if (value === "light" || value === "sable") return defaultLook.light;
  return isDashboardLook(value) ? value : null;
}

export function lookMode(look: DashboardLook) {
  return dashboardLooks.find((item) => item.id === look)?.mode ?? "light";
}
