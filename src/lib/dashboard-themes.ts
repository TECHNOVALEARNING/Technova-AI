/** Dashboard appearance themes. The mode (light/dark) drives the sidebar and the shared tokens; the look only
 *  changes the content area (wallpaper, glass panels, composer). "light" (Ciel) is the original light theme and
 *  keeps its stored value; the retired "dark" (Nuit) and "emeraude" preferences now open Brume. */
export type DashboardLook = "light" | "apple" | "pastel" | "sable" | "brume" | "soie" | "ardoise" | "amethyste" | "cobalt" | "reverbere";

export const dashboardLooks: { id: DashboardLook; mode: "light" | "dark"; fr: string; en: string; swatch: string }[] = [
  { id: "brume", mode: "dark", fr: "Brume", en: "Mist", swatch: "#26252a" },
  { id: "soie", mode: "dark", fr: "Soie", en: "Silk", swatch: "#374858" },
  { id: "ardoise", mode: "dark", fr: "Ardoise", en: "Slate", swatch: "#5f7488" },
  { id: "amethyste", mode: "dark", fr: "Améthyste", en: "Amethyst", swatch: "#6b5a8e" },
  { id: "cobalt", mode: "dark", fr: "Cobalt", en: "Cobalt", swatch: "#1f4f8a" },
  { id: "reverbere", mode: "dark", fr: "Réverbère", en: "Streetlight", swatch: "#3a3a3a" },
  { id: "apple", mode: "light", fr: "Apple", en: "Apple", swatch: "#f4f4f6" },
  { id: "pastel", mode: "light", fr: "Pastel", en: "Pastel", swatch: "#a9c3da" },
  { id: "light", mode: "light", fr: "Ciel", en: "Sky", swatch: "#7fa9e8" },
  { id: "sable", mode: "light", fr: "Sable", en: "Sand", swatch: "#ead9c4" },
];

/** Default look for each mode (the light/dark switch in Settings). */
export const defaultLook = { light: "light", dark: "brume" } as const satisfies Record<"light" | "dark", DashboardLook>;

export function isDashboardLook(value: string | null): value is DashboardLook {
  return dashboardLooks.some((look) => look.id === value);
}

/** Stored preference → look, including the retired dark themes. */
export function storedLook(value: string | null): DashboardLook | null {
  if (value === "dark" || value === "emeraude") return defaultLook.dark;
  return isDashboardLook(value) ? value : null;
}

export function lookMode(look: DashboardLook) {
  return dashboardLooks.find((item) => item.id === look)?.mode ?? "light";
}
