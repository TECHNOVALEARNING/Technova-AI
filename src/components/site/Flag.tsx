// Language flags drawn in SVG (emoji flags do not render on Windows, where they show as letters).
// English uses the United Kingdom flag, Portuguese the flag of Portugal.
export type FlagCode = "fr" | "en" | "es" | "pt";

export function Flag({ code, className = "h-3.5 w-5", title }: { code: FlagCode; className?: string; title?: string }) {
  const common = { viewBox: "0 0 30 20", className: `${className} shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10`, role: title ? "img" : undefined, "aria-label": title, "aria-hidden": title ? undefined : true, preserveAspectRatio: "xMidYMid slice" } as const;
  if (code === "fr") return <svg {...common}><rect width="10" height="20" fill="#002395" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ed2939" /></svg>;
  if (code === "es") return <svg {...common}><rect width="30" height="20" fill="#aa151b" /><rect y="5" width="30" height="10" fill="#f1bf00" /></svg>;
  if (code === "pt") return <svg {...common}><rect width="30" height="20" fill="#ff0000" /><rect width="12" height="20" fill="#006600" /><circle cx="12" cy="10" r="4" fill="#ffcc00" /><circle cx="12" cy="10" r="2.6" fill="#ff0000" stroke="#fff" strokeWidth=".6" /></svg>;
  return <svg {...common}><rect width="30" height="20" fill="#012169" /><path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" /><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" /><path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" /></svg>;
}
