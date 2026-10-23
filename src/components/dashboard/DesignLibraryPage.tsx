import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Copy, Palette, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "./DashboardLayout";
import {
  DESIGN_DRAFT_KEY, defaultSections, designBrief, designFonts, designSections, designThemes, googleFontsHref, type DesignTheme,
} from "@/lib/design-library";
import { cn } from "@/lib/utils";

type Tab = "themes" | "sections" | "fonts";
const radiusPx = { sharp: 4, soft: 12, round: 22 } as const;

function ThemePreview({ theme, heading, body }: { theme: DesignTheme; heading: string; body: string }) {
  const c = theme.colors;
  const r = radiusPx[theme.radius];
  return <div className="overflow-hidden border border-black/5" style={{ background: c.background, color: c.text, borderRadius: r, fontFamily: `"${body}", sans-serif` }}>
    <div className="flex items-center justify-between px-3 py-2 text-[9px]" style={{ background: c.surface }}>
      <span style={{ fontFamily: `"${heading}", serif`, fontWeight: 700 }}>{theme.name}</span>
      <span className="flex gap-2" style={{ color: c.muted }}><span>Accueil</span><span>Offres</span><span>Contact</span></span>
    </div>
    <div className="grid grid-cols-[1.4fr_1fr] gap-3 p-3">
      <div>
        <p className="text-[15px] leading-tight" style={{ fontFamily: `"${heading}", serif`, fontWeight: 700 }}>Votre activité, en ligne.</p>
        <p className="mt-1 text-[9px] leading-snug" style={{ color: c.muted }}>Une phrase claire qui explique votre offre.</p>
        <span className="mt-2 inline-block px-2.5 py-1 text-[9px] font-semibold" style={{ background: c.primary, color: c.background, borderRadius: Math.min(r, 999) }}>Commencer</span>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.accent})`, borderRadius: r, minHeight: 64 }} />
    </div>
    <div className="grid grid-cols-3 gap-2 px-3 pb-3">
      {[0, 1, 2].map((i) => <div key={i} className="p-1.5" style={{ background: c.surface, borderRadius: r / 2 }}>
        <span className="block size-2.5 rounded-full" style={{ background: i === 1 ? c.accent : c.primary }} />
        <span className="mt-1 block h-1 w-3/4 rounded" style={{ background: c.muted, opacity: 0.4 }} />
      </div>)}
    </div>
  </div>;
}

/** Schematic wireframe of a section (grey blocks), so the shape is clear without any copied artwork. */
function SectionSketch({ id }: { id: string }) {
  const bar = (w: string, h = "h-1.5") => <span className={cn("block rounded bg-muted-foreground/25", h)} style={{ width: w }} />;
  const box = (k: number, cls = "h-8") => <span key={k} className={cn("block rounded bg-muted-foreground/15", cls)} />;
  const grid = (n: number, cls?: string) => <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>{Array.from({ length: n }, (_, i) => box(i, cls))}</div>;
  const body: Record<string, ReactNode> = {
    hero: <div className="grid grid-cols-2 gap-2"><div className="space-y-1">{bar("90%", "h-2.5")}{bar("70%")}{bar("35%", "h-3")}</div>{box(0, "h-12")}</div>,
    features: grid(3, "h-9"), steps: <div className="flex items-center gap-1">{[1, 2, 3].map((n) => <span key={n} className="grid size-5 flex-1 place-items-center rounded bg-muted-foreground/15 text-[8px]">{n}</span>)}</div>,
    products: grid(4, "h-10"), menu: <div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className="flex justify-between">{bar("55%")}{bar("12%")}</div>)}</div>,
    gallery: <div className="grid grid-cols-3 gap-1">{box(0, "row-span-2 h-full")}{box(1, "h-6")}{box(2, "h-6")}{box(3, "h-6")}{box(4, "h-6")}</div>,
    pricing: <div className="grid grid-cols-3 items-end gap-1">{box(0, "h-10")}{box(1, "h-12 ring-1 ring-chat-glow")}{box(2, "h-10")}</div>,
    stats: <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-muted-foreground"><span>12</span><span>3k</span><span>98%</span><span>24h</span></div>,
    team: <div className="flex justify-between">{[0, 1, 2, 3].map((i) => <span key={i} className="size-6 rounded-full bg-muted-foreground/15" />)}</div>,
    reviews: grid(2, "h-8"), faq: <div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className="flex justify-between rounded bg-muted-foreground/10 px-1 py-0.5">{bar("60%")}<span className="text-[8px]">+</span></div>)}</div>,
    cta: <div className="flex items-center justify-between rounded bg-chat-glow/20 px-2 py-2">{bar("50%")}{bar("18%", "h-3")}</div>,
    contact: <div className="grid grid-cols-2 gap-2"><div className="space-y-1">{box(0, "h-2.5")}{box(1, "h-2.5")}{box(2, "h-5")}</div><div className="space-y-1">{bar("80%")}{bar("60%")}{bar("40%", "h-3")}</div></div>,
    footer: <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="space-y-0.5">{bar("80%")}{bar("60%", "h-1")}{bar("50%", "h-1")}</div>)}</div>,
  };
  return <div className="h-16 overflow-hidden rounded-lg border border-border bg-background p-2">{body[id]}</div>;
}

/** Rendered as the "Design Library" tab of the Registry. */
export function DesignLibraryPage() {
  const { lang } = useDashboard();
  const fr = lang !== "en";
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("themes");
  const [themeId, setThemeId] = useState(designThemes[0]!.id);
  const [sections, setSections] = useState<string[]>(defaultSections);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const theme = designThemes.find((t) => t.id === themeId)!;
  const headingFont = heading || theme.heading;
  const bodyFont = body || theme.body;

  // Previews use the real fonts, loaded once from Google Fonts.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsHref(designFonts.map((f) => f.name));
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  const brief = useMemo(() => designBrief(theme, sections, { heading: headingFont, body: bodyFont }), [theme, sections, headingFont, bodyFont]);
  const toggleSection = (id: string) => setSections((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));
  const move = (id: string, dir: -1 | 1) => setSections((cur) => {
    const i = cur.indexOf(id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return cur;
    const next = [...cur]; [next[i], next[j]] = [next[j]!, next[i]!]; return next;
  });

  function sendToStudio() {
    const intro = fr ? "Crée un site pour [décrivez votre activité, votre public et vos objectifs]." : "Create a website for [describe your business, audience and goals].";
    try { sessionStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify({ mode: "create", text: `${intro}\n\n${brief}` })); } catch { /* storage blocked */ }
    void navigate({ to: "/dashboard/chat" });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "themes", label: fr ? `Thèmes (${designThemes.length})` : `Themes (${designThemes.length})` },
    { id: "sections", label: fr ? `Sections (${designSections.length})` : `Sections (${designSections.length})` },
    { id: "fonts", label: fr ? `Polices (${designFonts.length})` : `Fonts (${designFonts.length})` },
  ];

  return <div className="space-y-5">
    <header>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Palette className="size-4" />Design Library</h2>
      <p className="mt-1 text-sm text-muted-foreground">{fr
        ? "Choisissez un thème, vos sections et vos polices, puis lancez le Studio : votre site sera généré avec ce design. Contenus originaux TechNova et polices Google Fonts libres (licence OFL), utilisables commercialement."
        : "Pick a theme, sections and fonts, then launch the Studio: your site is generated with this design. Original TechNova content and free Google Fonts (OFL), usable commercially."}</p>
    </header>

    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map((t) => <Button key={t.id} role="tab" aria-selected={tab === t.id} size="sm" variant={tab === t.id ? "default" : "outline"} className="rounded-full" onClick={() => setTab(t.id)}>{t.label}</Button>)}
    </div>

    {tab === "themes" && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {designThemes.map((t) => <button key={t.id} type="button" onClick={() => { setThemeId(t.id); setHeading(""); setBody(""); }} aria-pressed={t.id === themeId}
        className={cn("rounded-2xl border bg-card/90 p-3 text-left transition", t.id === themeId ? "border-chat-glow ring-1 ring-chat-glow/40" : "border-border hover:border-foreground/30")}>
        <ThemePreview theme={t} heading={t.heading} body={t.body} />
        <div className="mt-3 flex items-center justify-between gap-2"><p className="font-medium">{t.name}</p>{t.id === themeId && <Check className="size-4 text-chat-glow" />}</div>
        <p className="text-xs text-muted-foreground">{fr ? t.mood.fr : t.mood.en}</p>
        <div className="mt-2 flex gap-1">{Object.values(t.colors).map((c, i) => <span key={i} title={c} className="size-4 rounded-full border border-black/10" style={{ background: c }} />)}</div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t.heading} · {t.body}</p>
      </button>)}
    </div>}

    {tab === "sections" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {designSections.map((s) => {
        const pos = sections.indexOf(s.id);
        return <div key={s.id} className={cn("rounded-2xl border bg-card/90 p-3", pos >= 0 ? "border-chat-glow ring-1 ring-chat-glow/30" : "border-border")}>
          <SectionSketch id={s.id} />
          <div className="mt-2 flex items-start justify-between gap-2">
            <div><p className="text-sm font-medium">{fr ? s.name.fr : s.name.en}</p><p className="text-xs text-muted-foreground">{fr ? s.summary.fr : s.summary.en}</p></div>
            <Button size="sm" variant={pos >= 0 ? "default" : "outline"} onClick={() => toggleSection(s.id)} aria-pressed={pos >= 0}>{pos >= 0 ? `#${pos + 1}` : fr ? "Ajouter" : "Add"}</Button>
          </div>
        </div>;
      })}
    </div>}

    {tab === "fonts" && <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{fr ? "Remplacez les polices du thème (facultatif)." : "Override the theme fonts (optional)."}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {designFonts.map((f) => <div key={f.name} className="rounded-2xl border border-border bg-card/90 p-3">
          <p className="truncate text-2xl" style={{ fontFamily: `"${f.name}", sans-serif` }}>Aa Bb 123</p>
          <p className="mt-1 text-sm font-medium">{f.name}</p>
          <p className="text-xs text-muted-foreground">{fr ? f.note.fr : f.note.en}</p>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" variant={headingFont === f.name ? "default" : "outline"} onClick={() => setHeading(f.name)}>{fr ? "Titres" : "Headings"}</Button>
            <Button size="sm" variant={bodyFont === f.name ? "default" : "outline"} onClick={() => setBody(f.name)}>{fr ? "Texte" : "Body"}</Button>
          </div>
        </div>)}
      </div>
    </div>}

    <div className="sticky bottom-3 z-20 rounded-2xl border border-border bg-background/95 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-medium">{theme.name} · {headingFont} / {bodyFont}</p>
          <p className="flex flex-wrap items-center gap-1 text-muted-foreground">
            {sections.length === 0 ? (fr ? "Aucune section : le Studio choisira." : "No sections: the Studio will choose.") : sections.map((id, i) => {
              const s = designSections.find((x) => x.id === id)!;
              return <span key={id} className="inline-flex items-center gap-0.5 rounded-full border border-border px-1.5 py-0.5">
                {i + 1}. {fr ? s.name.fr : s.name.en}
                <button type="button" aria-label={fr ? "Monter" : "Move up"} onClick={() => move(id, -1)} disabled={i === 0} className="disabled:opacity-30"><ArrowUp className="size-3" /></button>
                <button type="button" aria-label={fr ? "Descendre" : "Move down"} onClick={() => move(id, 1)} disabled={i === sections.length - 1} className="disabled:opacity-30"><ArrowDown className="size-3" /></button>
                <button type="button" aria-label={fr ? "Retirer" : "Remove"} onClick={() => toggleSection(id)}><X className="size-3" /></button>
              </span>;
            })}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(brief).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{fr ? "Copier le brief" : "Copy brief"}
        </Button>
        <Button size="sm" onClick={sendToStudio}><Sparkles className="size-4" />{fr ? "Créer un site avec ce design" : "Build a site with this design"}</Button>
      </div>
    </div>
  </div>;
}
