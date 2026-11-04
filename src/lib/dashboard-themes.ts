/** Dashboard appearance themes. The mode (light/dark) drives the sidebar and the shared tokens; the look only
 *  changes the content area (wallpaper, glass panels, composer). "light" and "dark" are the original themes
 *  and keep their stored values, so existing preferences stay valid. */
export type DashboardLook = "light" | "apple" | "pastel" | "sable" | "dark" | "brume" | "soie" | "emeraude";

export const dashboardLooks: { id: DashboardLook; mode: "light" | "dark"; fr: string; en: string; swatch: string }[] = [
  { id: "brume", mode: "dark", fr: "Brume", en: "Mist", swatch: "#26252a" },
  { id: "soie", mode: "dark", fr: "Soie", en: "Silk", swatch: "#374858" },
  { id: "dark", mode: "dark", fr: "Nuit", en: "Night", swatch: "#1c2a4a" },
  { id: "emeraude", mode: "dark", fr: "Émeraude", en: "Emerald", swatch: "#0f3b32" },
  { id: "apple", mode: "light", fr: "Apple", en: "Apple", swatch: "#f4f4f6" },
  { id: "pastel", mode: "light", fr: "Pastel", en: "Pastel", swatch: "#a9c3da" },
  { id: "light", mode: "light", fr: "Ciel", en: "Sky", swatch: "#7fa9e8" },
  { id: "sable", mode: "light", fr: "Sable", en: "Sand", swatch: "#ead9c4" },
];

export function isDashboardLook(value: string | null): value is DashboardLook {
  return dashboardLooks.some((look) => look.id === value);
}

export function lookMode(look: DashboardLook) {
  return dashboardLooks.find((item) => item.id === look)?.mode ?? "light";
}
