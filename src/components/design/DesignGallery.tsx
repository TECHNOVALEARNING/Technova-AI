import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadCreation } from "@/lib/creations";
import { FilePlus2, Search, Sparkles } from "lucide-react";
import { DESIGN_FORMATS, type DesignFormatId } from "@/lib/design-formats";
import { cn } from "@/lib/utils";
import { DESIGN_TEMPLATES, blankTemplate, fieldValues } from "./designs";
import { DesignPreview, FittedPreview, useDesignFonts } from "./DesignPreview";
import { DesignStudio, type SavedDesign } from "./DesignStudio";

// Templates → « Présentation et Canva »: a mini design studio. Format chips (presentations, documents, social
// posts, cards…), a blank page per format, and the original TechNova templates as live thumbnails; a click opens
// the guided creation window (DesignStudio).

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);

export function DesignGallery({ lang }: { lang: Lang }) {
  useDesignFonts();
  const [format, setFormat] = useState<DesignFormatId | "all">("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; projectId: string | null; data: SavedDesign } | null>(null);
  // Opened from Projects: /dashboard/registry?section=design&creation=ID
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("creation");
    if (!id) return;
    void loadCreation(id).then((c) => {
      if (!c || c.kind !== "design") { if (!c) toast.error(lang === "fr" ? "Ce fichier n'existe plus (supprimé après 14 jours ?)." : "This file no longer exists (deleted after 14 days?)."); return; }
      const data = c.data as unknown as SavedDesign;
      setSaved({ id: c.id, projectId: c.project_id, data }); setOpenId(data.templateId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DESIGN_TEMPLATES.filter((t) => (format === "all" || t.format === format) && (!s || `${t.fr} ${t.en} ${DESIGN_FORMATS.find((f) => f.id === t.format)?.fr}`.toLowerCase().includes(s)));
  }, [format, q]);
  const counts = useMemo(() => Object.fromEntries(DESIGN_FORMATS.map((f) => [f.id, DESIGN_TEMPLATES.filter((t) => t.format === f.id).length])), []);
  const blankFormat: DesignFormatId = format === "all" ? "presentation" : format;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="size-3.5" />TechNova Design</p>
      <h2 className="mt-1.5 font-display text-xl font-semibold">{tx(lang, "Présentations, documents, réseaux sociaux et cartes", "Presentations, documents, social posts and cards")}</h2>
      <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{tx(lang,
        `Choisissez un modèle ou partez d'une page blanche, ajoutez vos textes et photos (ou laissez l'IA les rédiger), choisissez le style, puis imprimez, enregistrez en PDF ou ouvrez dans PowerPoint, Google Slides ou Canva. Modèles, modifications et exports gratuits.`,
        `Pick a template or start from a blank page, add your text and photos (or let the AI write them), pick the style, then print, save as PDF or open in PowerPoint, Google Slides or Canva. Templates, edits and exports are free.`)}</p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(lang, "Rechercher un modèle", "Search a template")} className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-ring/20" />
      </label>
      <button type="button" onClick={() => setOpenId(`blank:${blankFormat}`)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[12.5px] font-semibold text-background">
        <FilePlus2 className="size-4" />{tx(lang, `Page blanche · ${DESIGN_FORMATS.find((f) => f.id === blankFormat)?.fr}`, `Blank page · ${DESIGN_FORMATS.find((f) => f.id === blankFormat)?.en}`)}
      </button>
    </div>

    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={tx(lang, "Formats", "Formats")}>
      {[["all", tx(lang, "Tous", "All"), DESIGN_TEMPLATES.length] as const, ...DESIGN_FORMATS.map((f) => [f.id, f[lang], counts[f.id] ?? 0] as const)].map(([id, label, n]) => <button key={id} type="button" role="tab" aria-selected={format === id} onClick={() => setFormat(id as DesignFormatId | "all")}
        className={cn("h-8 rounded-full px-3 text-[12px] font-medium transition", format === id ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground")}>
        {label} <span className="opacity-60">{n}</span>
      </button>)}
    </div>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {format !== "all" && <button type="button" onClick={() => setOpenId(`blank:${format}`)} className="group flex flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card text-left transition hover:border-foreground/40">
        <div className="grid aspect-[4/3] place-items-center bg-secondary/40"><FilePlus2 className="size-8 text-muted-foreground transition group-hover:text-foreground" /></div>
        <div className="p-3"><p className="text-[13px] font-semibold">{tx(lang, "Page blanche", "Blank page")}</p><p className="text-[11.5px] text-muted-foreground">{tx(lang, "Construisez tout vous-même", "Build everything yourself")}</p></div>
      </button>}
      {shown.map((t) => <Card key={t.id} lang={lang} id={t.id} onOpen={setOpenId} />)}
    </div>
    {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{tx(lang, "Aucun modèle ne correspond. Essayez la page blanche.", "No template matches. Try the blank page.")}</p>}

    <DesignStudio templateId={openId} open={Boolean(openId)} onOpenChange={(v) => { if (!v) { setOpenId(null); setSaved(null); } }} lang={lang} saved={saved} onDerive={(preset) => { setSaved({ id: "", projectId: null, data: preset }); setOpenId(preset.templateId); }} />
  </div>;
}

function Card({ id, lang, onOpen }: { id: string; lang: Lang; onOpen: (id: string) => void }) {
  const t = DESIGN_TEMPLATES.find((x) => x.id === id) ?? blankTemplate("presentation");
  const fmt = DESIGN_FORMATS.find((f) => f.id === t.format)!;
  const values = useMemo(() => fieldValues(t.layout.fields), [t]);
  return <button type="button" onClick={() => onOpen(t.id)} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="aspect-[4/3] overflow-hidden bg-secondary/40"><FittedPreview template={t} values={values} /></div>
    <div className="p-3">
      <p className="truncate text-[13px] font-semibold">{t[lang]}</p>
      <p className="text-[11.5px] text-muted-foreground">{fmt[lang]} · {fmt.size}</p>
    </div>
  </button>;
}
