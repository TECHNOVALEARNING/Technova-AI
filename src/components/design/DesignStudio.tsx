import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Coins, Download, ExternalLink, FileCode2, ImagePlus, Loader2, Palette as PaletteIcon, PenLine, Presentation, Printer, Sparkles, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { designAiCredits, formatById } from "@/lib/design-formats";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";
import { cn } from "@/lib/utils";
import { PALETTES, fieldValues, templateById, type Palette } from "./designs";
import { DesignPreview, useDesignFonts } from "./DesignPreview";
import { downloadHtml, downloadPptx, printDesign } from "./design-export";

// TechNova Design: the creation window opened from Registry → « Présentation et Canva ». A guided journey —
// 1 Contenu (own text, photos, or « Rédiger avec l'IA »), 2 Style (palette and accent colour), 3 Aperçu (every
// page), 4 Exporter (print, PDF, PowerPoint, HTML, then Google Slides / Canva / PowerPoint online). Templates,
// editing and exports are free; only the AI writing help costs credits (designAiCredits).

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-ring/20";

/** Reads a picture and keeps it light (1600 px max, JPEG) so previews and prints stay fast. */
async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.86);
  } finally { URL.revokeObjectURL(url); }
}

export function DesignStudio({ templateId, open, onOpenChange, lang }: { templateId: string | null; open: boolean; onOpenChange: (v: boolean) => void; lang: Lang }) {
  useDesignFonts();
  const template = useMemo(() => (templateId ? templateById(templateId) : undefined), [templateId]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState<Palette | null>(null);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);
  const [brief, setBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const previewBox = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(560);
  useEffect(() => {
    if (!template) return;
    setValues(fieldValues(template.layout.fields)); setPalette(template.palette); setStep(0); setPage(0); setBrief("");
  }, [template]);
  useEffect(() => {
    const el = previewBox.current; if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth)); ro.observe(el); setBoxWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [open, template]);
  if (!template || !palette) return null;
  const fmt = formatById(template.format);
  const steps = [tx(lang, "Contenu", "Content"), tx(lang, "Style", "Style"), tx(lang, "Aperçu", "Preview"), tx(lang, "Exporter", "Export")];
  const price = designAiCredits(template.format);
  const title = values["title"] || values["name"] || template[lang];
  // Fit the page inside the preview column (portrait formats are limited by height).
  const maxH = typeof window === "undefined" ? 640 : Math.max(320, window.innerHeight * 0.62);
  const previewWidth = Math.max(160, Math.min(boxWidth - 48, (maxH * fmt.w) / fmt.h));
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }));
  const textFields = template.layout.fields.filter((x) => x.kind !== "image");

  async function writeWithAi() {
    if (brief.trim().length < 5 || aiBusy) return;
    setAiBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/design-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ format: template!.format, design: template!.layout.fr, brief, lang, fields: textFields.map((x) => ({ key: x.key, label: x.label, max: x.max ?? 200, current: values[x.key] ?? x.value })) }),
      });
      if (!res.ok) { toast.error((await res.text()) || tx(lang, "La rédaction a échoué.", "Writing failed.")); return; }
      const json = (await res.json()) as { fields: Record<string, string>; credits: number };
      setValues((x) => ({ ...x, ...json.fields }));
      notifyCreditsChanged();
      toast.success(tx(lang, `Textes rédigés · ${json.credits} crédits`, `Text written · ${json.credits} credits`));
    } catch { toast.error(tx(lang, "Connexion interrompue. Réessayez.", "Connection lost. Try again.")); }
    finally { setAiBusy(false); }
  }
  async function pickImage(key: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(tx(lang, "Choisissez une image (JPG, PNG, WebP).", "Choose an image (JPG, PNG, WebP).")); return; }
    try { set(key, await readImage(file)); } catch { toast.error(tx(lang, "Image illisible.", "Unreadable image.")); }
  }
  const openTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const isPres = template.format === "presentation";

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border py-3 pl-5 pr-14">
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate font-display text-[17px] font-semibold">{template[lang]}</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">{fmt[lang]} · {fmt.size}{template.layout.pages > 1 ? ` · ${template.layout.pages} ${tx(lang, "pages", "pages")}` : ""}</DialogDescription>
        </div>
        <ol className="flex items-center gap-1" aria-label={tx(lang, "Étapes", "Steps")}>{steps.map((s, i) => <li key={s}>
          <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
            className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition", step === i ? "bg-foreground text-background" : i < step ? "text-foreground hover:bg-secondary" : "text-muted-foreground hover:bg-secondary")}>
            <span className={cn("grid size-5 place-items-center rounded-full text-[10.5px]", step === i ? "bg-background/20" : "bg-secondary")}>{i < step ? <Check className="size-3" /> : i + 1}</span>{s}
          </button>
        </li>)}</ol>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-b border-border p-5 md:border-b-0 md:border-r">
          {step === 0 && <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/40 p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-[#6d5bd0]" />{tx(lang, "Rédiger avec l'IA", "Write with AI")}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">{tx(lang, "Décrivez votre projet en une ou deux phrases : l'IA remplit tous les textes du modèle. Vous pourrez tout modifier ensuite.", "Describe your project in a sentence or two: the AI fills every text of the template. You can edit everything afterwards.")}</p>
              <textarea className={cn(field, "mt-2 min-h-[72px] resize-y")} value={brief} maxLength={2000} onChange={(e) => setBrief(e.target.value)}
                placeholder={tx(lang, "Ex. : présentation de ma boutique de pagnes à Cotonou pour des investisseurs, 3 points forts et nos chiffres 2026", "E.g. a pitch for my fabric shop for investors, 3 strengths and our 2026 figures")} />
              <button type="button" disabled={aiBusy || brief.trim().length < 5} onClick={() => void writeWithAi()}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[12.5px] font-semibold text-background disabled:opacity-50">
                {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}{tx(lang, `Rédiger · ${price} crédits`, `Write · ${price} credits`)}
              </button>
            </div>
            {template.layout.fields.map((x) => <label key={x.key} className="block space-y-1">
              <span className="text-[12px] font-medium text-foreground/80">{x.label}</span>
              {x.kind === "image" ? <div className="flex items-center gap-2">
                {values[x.key] ? <img src={values[x.key]} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-secondary"><ImagePlus className="size-4 text-muted-foreground" /></span>}
                <span className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border px-3 text-[12.5px] hover:bg-secondary">{tx(lang, "Choisir une image", "Choose an image")}<input type="file" accept="image/*" className="sr-only" onChange={(e) => void pickImage(x.key, e.target.files?.[0])} /></span>
                {values[x.key] && <button type="button" aria-label={tx(lang, "Retirer l'image", "Remove image")} onClick={() => set(x.key, "")} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><Trash2 className="size-3.5" /></button>}
              </div>
                : x.kind === "long" ? <textarea className={cn(field, "min-h-[84px] resize-y")} value={values[x.key] ?? ""} maxLength={x.max} onChange={(e) => set(x.key, e.target.value)} />
                : <input className={field} value={values[x.key] ?? ""} maxLength={x.max} onChange={(e) => set(x.key, e.target.value)} />}
            </label>)}
          </div>}

          {step === 1 && <div className="space-y-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold"><PaletteIcon className="size-4" />{tx(lang, "Palette", "Palette")}</p>
            <div className="grid grid-cols-2 gap-2">{Object.values(PALETTES).map((pal) => <button key={pal.id} type="button" aria-pressed={palette.id === pal.id} onClick={() => setPalette({ ...pal })}
              className={cn("rounded-xl border p-2.5 text-left transition", palette.id === pal.id ? "border-foreground" : "border-border hover:border-foreground/30")}>
              <span className="flex gap-1">{[pal.bg, pal.ink, pal.accent, pal.soft].map((c, i) => <span key={i} className="size-5 rounded-full border border-black/10" style={{ background: c }} />)}</span>
              <span className="mt-1.5 block text-[12.5px] font-semibold">{pal[lang]}</span>
              <span className="block text-[11px] text-muted-foreground">{pal.head}</span>
            </button>)}</div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <span className="text-[12.5px] font-medium">{tx(lang, "Couleur d'accent", "Accent colour")}</span>
              <input type="color" value={palette.accent} onChange={(e) => setPalette({ ...palette, accent: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent" />
            </label>
            <p className="text-[11.5px] text-muted-foreground">{tx(lang, "Le style reste sobre et professionnel : une couleur d'accent, beaucoup d'espace, une typographie soignée.", "The style stays clean and professional: one accent colour, plenty of space, careful typography.")}</p>
          </div>}

          {step === 2 && <div className="space-y-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold"><Eye className="size-4" />{tx(lang, "Toutes les pages", "All pages")}</p>
            <div className="grid grid-cols-2 gap-2">{Array.from({ length: template.layout.pages }, (_, i) => <button key={i} type="button" onClick={() => setPage(i)}
              className={cn("overflow-hidden rounded-lg border-2 transition", page === i ? "border-foreground" : "border-transparent hover:border-border")}>
              <DesignPreview template={template} values={values} palette={palette} page={i} width={160} />
            </button>)}</div>
            <p className="text-[11.5px] text-muted-foreground">{tx(lang, "Revenez à « Contenu » pour corriger un texte : l'aperçu se met à jour aussitôt.", "Go back to « Content » to fix a text: the preview updates at once.")}</p>
          </div>}

          {step === 3 && <div className="space-y-3">
            <p className="text-[13px] font-semibold">{tx(lang, "Télécharger ou imprimer", "Download or print")}</p>
            <button type="button" onClick={() => { if (!printDesign(template, values, palette, title)) toast.error(tx(lang, "Autorisez les fenêtres pop-up pour imprimer.", "Allow pop-ups to print.")); }} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <Printer className="size-5" /><span><span className="block text-[13px] font-semibold">{tx(lang, "Imprimer ou enregistrer en PDF", "Print or save as PDF")}</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, `Format exact : ${fmt.size}. Choisissez votre imprimante ou « Enregistrer au format PDF ».`, `Exact size: ${fmt.size}. Pick your printer or « Save as PDF ».`)}</span></span>
            </button>
            {isPres && <button type="button" onClick={() => void downloadPptx(values, palette, title)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <Presentation className="size-5" /><span><span className="block text-[13px] font-semibold">PowerPoint (.pptx)</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, "Textes modifiables, aux couleurs du modèle.", "Editable text in the template's colours.")}</span></span>
            </button>}
            <button type="button" onClick={() => downloadHtml(template, values, palette, title)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <FileCode2 className="size-5" /><span><span className="block text-[13px] font-semibold">HTML</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, "Une page web autonome (utile pour l'e-mail).", "A standalone web page (handy for e-mail).")}</span></span>
            </button>

            <p className="pt-2 text-[13px] font-semibold">{tx(lang, "Continuer dans un autre logiciel", "Continue in another app")}</p>
            {isPres && <button type="button" onClick={() => { void downloadPptx(values, palette, title); openTab("https://docs.google.com/presentation/u/0/"); toast.info(tx(lang, "Dans Google Slides : Fichier → Importer des diapositives → choisissez le fichier .pptx téléchargé.", "In Google Slides: File → Import slides → pick the downloaded .pptx.")); }} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <ExternalLink className="size-5" /><span><span className="block text-[13px] font-semibold">Google Slides</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, "Télécharge le .pptx puis ouvre Google Slides pour l'importer.", "Downloads the .pptx and opens Google Slides to import it.")}</span></span>
            </button>}
            {isPres && <button type="button" onClick={() => { void downloadPptx(values, palette, title); openTab("https://www.office.com/launch/powerpoint"); }} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <ExternalLink className="size-5" /><span><span className="block text-[13px] font-semibold">PowerPoint en ligne</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, "Télécharge le .pptx puis ouvre PowerPoint pour le charger.", "Downloads the .pptx and opens PowerPoint to upload it.")}</span></span>
            </button>}
            <button type="button" onClick={() => { if (isPres) void downloadPptx(values, palette, title); else printDesign(template, values, palette, title); openTab("https://www.canva.com/"); toast.info(tx(lang, isPres ? "Dans Canva : Créer un design → Importer → choisissez le fichier .pptx téléchargé." : "Enregistrez d'abord en PDF, puis dans Canva : Créer un design → Importer le PDF.", isPres ? "In Canva: Create a design → Import → pick the downloaded .pptx." : "First save as PDF, then in Canva: Create a design → Import the PDF.")); }} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary/60">
              <ExternalLink className="size-5" /><span><span className="block text-[13px] font-semibold">Canva</span><span className="block text-[11.5px] text-muted-foreground">{tx(lang, "Prépare le fichier puis ouvre Canva pour l'importer et le retoucher.", "Prepares the file and opens Canva to import and retouch it.")}</span></span>
            </button>
            <p className="rounded-xl bg-secondary/50 p-3 text-[11.5px] text-muted-foreground">{tx(lang, "Connexion directe à Canva, Google Slides, PowerPoint et aux réseaux sociaux (Instagram, Facebook, TikTok, YouTube) : bientôt, dans Plugins → connecteurs à venir.", "Direct connection to Canva, Google Slides, PowerPoint and social networks (Instagram, Facebook, TikTok, YouTube): coming soon, in Plugins → upcoming connectors.")}</p>
          </div>}

          <p className="mt-5 flex gap-2 rounded-xl border border-border p-3 text-[11.5px] text-muted-foreground"><Coins className="mt-0.5 size-3.5 shrink-0" />{tx(lang, `Modèles, modifications et exports gratuits. Seule la rédaction par l'IA coûte ${price} crédits, prélevés quand le texte arrive. Votre création reste dans cette fenêtre : téléchargez-la avant de la fermer.`, `Templates, edits and exports are free. Only AI writing costs ${price} credits, charged when the text arrives. Your design lives in this window: download it before closing.`)}</p>
        </div>

        <div className="flex min-h-0 flex-col bg-secondary/40">
          <div ref={previewBox} className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
            <div className="shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]"><DesignPreview template={template} values={values} palette={palette} page={page} width={previewWidth} /></div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-4 py-2.5">
            {template.layout.pages > 1 ? <div className="flex items-center gap-1">
              <button type="button" aria-label={tx(lang, "Page précédente", "Previous page")} disabled={page === 0} onClick={() => setPage(page - 1)} className="grid size-8 place-items-center rounded-full hover:bg-secondary disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span className="text-[12px] tabular-nums">{page + 1} / {template.layout.pages}</span>
              <button type="button" aria-label={tx(lang, "Page suivante", "Next page")} disabled={page >= template.layout.pages - 1} onClick={() => setPage(page + 1)} className="grid size-8 place-items-center rounded-full hover:bg-secondary disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div> : <span />}
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{tx(lang, "Retour", "Back")}</button>}
              {step < 3 ? <button type="button" onClick={() => setStep(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background">{tx(lang, "Continuer", "Continue")}<ArrowRight className="size-4" /></button>
                : <button type="button" onClick={() => { if (!printDesign(template, values, palette, title)) toast.error(tx(lang, "Autorisez les fenêtres pop-up pour imprimer.", "Allow pop-ups to print.")); }} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background"><Download className="size-4" />{tx(lang, "Imprimer / PDF", "Print / PDF")}</button>}
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
