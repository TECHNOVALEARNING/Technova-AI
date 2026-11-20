import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Coins, ExternalLink, FileCode2, ImagePlus, Loader2, Palette as PaletteIcon, PenLine, Presentation, Printer, Rocket, Save, Share2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirmDialog } from "@/components/ConfirmHost";
import { supabase } from "@/integrations/supabase/client";
import { formatById } from "@/lib/design-formats";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";
import { PublishDialog } from "@/components/dashboard/PublishDialog";
import { cn } from "@/lib/utils";
import { PALETTES, fieldValues, templateById, type Palette } from "./designs";
import { DesignPreview, useDesignFonts } from "./DesignPreview";
import { DesignEditor, readImage } from "./DesignEditor";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { confirmAiCredits } from "@/lib/ai-credit-notice";
import { saveCreation, saveErrorText } from "@/lib/creations";
import { DocPage, resizeDoc, templateToDoc, uid, type DesignDoc } from "./doc";
import { downloadDocHtml, downloadDocPptx, printDoc, shareHtml } from "./design-export";

// TechNova Design: the creation window opened from Templates → « Présentation et Canva ». A guided journey —
// 1 Contenu (texts, photos, « Rédiger avec l'IA »), 2 Style (palette, accent), 3 Mise en forme (free editor: move,
// resize, fonts, bold, italic, underline, highlight, colours, alignment, bullets, emojis, images, shapes, pages),
// 4 Exporter et partager (share link + WhatsApp, Netlify, Vercel, GitHub; print / PDF, PowerPoint, HTML; Google
// Slides, PowerPoint online, Canva). Templates, editing and exports are free; only the AI writing costs credits.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-ring/20";

/** What a saved design keeps (user_creations.data, kind "design"). */
export type SavedDesign = { templateId: string; values: Record<string, string>; palette: Palette; doc: DesignDoc | null };

export function DesignStudio({ templateId, open, onOpenChange, lang, saved, onDerive }: { templateId: string | null; open: boolean; onOpenChange: (v: boolean) => void; lang: Lang; saved?: { id: string; projectId: string | null; data: SavedDesign } | null; onDerive?: (preset: SavedDesign) => void }) {
  useDesignFonts();
  const template = useMemo(() => (templateId ? templateById(templateId) : undefined), [templateId]);
  const blank = Boolean(templateId?.startsWith("blank:"));
  const [values, setValues] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState<Palette | null>(null);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const builtFrom = useRef("");
  const [building, setBuilding] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // Preview box measured with a callback ref (the dialog mounts its content after opening): the page is fitted to
  // both its width and its height, so it never overflows on a phone.
  const [box, setBox] = useState({ w: 560, h: 480 });
  const roRef = useRef<ResizeObserver | null>(null);
  const previewBox = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect(); roRef.current = null;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure); ro.observe(el); measure(); roRef.current = ro;
  }, []);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedRef, setSavedRef] = useState<{ id: string; projectId: string | null } | null>(null);

  useEffect(() => {
    if (!template) return;
    setValues(fieldValues(template.layout.fields)); setPalette(template.palette); setBrief(""); builtFrom.current = "";
    const fmt = formatById(template.format);
    // A blank page goes straight to the free editor with an empty page.
    if (saved && saved.data.templateId === templateId) {
      // Reopened from Projects: texts, style and the free layout as they were saved.
      setValues(saved.data.values); setPalette(saved.data.palette); setDoc(saved.data.doc);
      builtFrom.current = saved.data.doc ? (blank ? "blank" : JSON.stringify([saved.data.values, saved.data.palette])) : "";
      setStep(saved.data.doc ? 2 : 0); setSavedRef(saved.id ? { id: saved.id, projectId: saved.projectId } : null);
    } else if (blank) { setDoc({ w: fmt.w, h: fmt.h, pages: [{ id: uid(), bg: "#ffffff", elements: [] }] }); setStep(2); builtFrom.current = "blank"; setSavedRef(null); }
    else { setDoc(null); setStep(0); setSavedRef(null); }
  }, [template, blank, saved, templateId]);
  if (!template || !palette) return null;
  const fmt = formatById(template.format);
  const steps = [tx(lang, "Contenu", "Content"), tx(lang, "Style", "Style"), tx(lang, "Mise en forme", "Layout"), tx(lang, "Exporter et partager", "Export & share")];
  const title = (values["title"] || values["name"] || template[lang]).replace(/\n/g, " ");
  const previewWidth = Math.max(80, Math.min(box.w - 32, ((box.h - 32) * fmt.w) / fmt.h));
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }));
  const textFields = template.layout.fields.filter((x) => x.kind !== "image");
  const signature = JSON.stringify([values, palette]);

  /** Builds (or rebuilds) the editable document from the texts and the style. */
  async function ensureDoc(): Promise<DesignDoc | null> {
    if (doc && (blank || builtFrom.current === signature)) return doc;
    if (doc && builtFrom.current && builtFrom.current !== signature) {
      const rebuild = await confirmDialog({ title: tx(lang, "Mettre à jour la mise en forme ?", "Update the layout?"), description: tx(lang, "Vous avez changé les textes ou le style. La mise en forme va être recréée à partir d'eux : vos déplacements et ajouts manuels seront remplacés.", "You changed the texts or the style. The layout will be rebuilt from them: your manual moves and additions will be replaced."), confirmLabel: tx(lang, "Mettre à jour", "Update"), cancelLabel: tx(lang, "Garder ma mise en forme", "Keep my layout") });
      if (!rebuild) { builtFrom.current = signature; return doc; }
    }
    setBuilding(true);
    try {
      const next = await templateToDoc((i) => template!.layout.render(values, palette!, i), template!.layout.pages, fmt.w, fmt.h);
      setDoc(next); builtFrom.current = signature; return next;
    } catch { toast.error(tx(lang, "La mise en forme n'a pas pu être préparée.", "The layout could not be prepared.")); return null; }
    finally { setBuilding(false); }
  }
  async function go(to: number) {
    if (to >= 2 && !(await ensureDoc())) return;
    setStep(to);
  }

  /** Saves texts, style and layout in the account (Projects), deleted 14 days after it was first saved. */
  async function saveTo(name: string, projectId: string | null) {
    const row = await saveCreation({ id: savedRef?.id ?? null, kind: "design", title: name, subtitle: `${fmt[lang]} · ${template![lang]}`, data: { templateId: templateId!, values, palette: palette!, doc } satisfies SavedDesign, projectId });
    setSavedRef({ id: row.id, projectId: row.project_id });
    toast.success(tx(lang, `Enregistré dans vos projets · gardé jusqu'au ${new Date(row.expires_at).toLocaleDateString("fr-FR")}`, `Saved to your projects · kept until ${new Date(row.expires_at).toLocaleDateString("en-GB")}`));
  }
  const quickSave = () => { if (savedRef) void saveTo(title, savedRef.projectId).catch((e) => toast.error(saveErrorText(e instanceof Error ? e.message : "", lang === "fr"))); else setSaveOpen(true); };

  async function writeWithAi() {
    if (brief.trim().length < 5 || aiBusy) return;
    if (!(await confirmAiCredits("design", lang))) return;
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
  const invite = template.format === "invitation";
  const exportRow = (Icon: typeof Printer, label: string, text: string, onClick: () => void, primary = false) => <button type="button" onClick={onClick}
    className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", primary ? "border-foreground bg-foreground text-background hover:opacity-90" : "border-border hover:bg-secondary/60")}>
    <Icon className="size-5 shrink-0" /><span><span className="block text-[13px] font-semibold">{label}</span><span className={cn("block text-[11.5px]", primary ? "text-background/75" : "text-muted-foreground")}>{text}</span></span>
  </button>;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[100svh] max-h-[100svh] w-screen max-w-[1480px] flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[96vh] sm:max-h-[96vh] sm:w-[98vw] sm:rounded-2xl">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-2.5 pl-4 pr-12 sm:py-3 sm:pl-5 sm:pr-14">
        <div className="min-w-0 flex-1 max-sm:basis-full">
          <DialogTitle className="truncate font-display text-[17px] font-semibold">{template[lang]}</DialogTitle>
          <DialogDescription className="truncate text-[12px] text-muted-foreground">{fmt[lang]} · {fmt.size}{doc ? ` · ${doc.pages.length} ${tx(lang, "page(s)", "page(s)")}` : ""}</DialogDescription>
        </div>
        <ol className="flex flex-wrap items-center gap-1" aria-label={tx(lang, "Étapes", "Steps")}>{steps.map((s, i) => <li key={s}>
          <button type="button" disabled={(blank && i < 2) || building} onClick={() => void go(i)} aria-current={step === i ? "step" : undefined}
            className={cn("flex h-8 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium transition disabled:opacity-40 sm:px-3", step === i ? "bg-foreground text-background" : i < step ? "text-foreground hover:bg-secondary" : "text-muted-foreground hover:bg-secondary")}>
            <span className={cn("grid size-5 place-items-center rounded-full text-[10.5px]", step === i ? "bg-background/20" : "bg-secondary")}>{i < step ? <Check className="size-3" /> : i + 1}</span><span className={step === i ? "" : "max-sm:hidden"}>{s}</span>
          </button>
        </li>)}</ol>
      </div>

      <div className="min-h-0 flex-1">
        {step === 2 && doc ? <DesignEditor doc={doc} onChange={setDoc} lang={lang} accent={palette.accent} ink={palette.ink} font={palette.body} format={template.format}
          onDerive={(f) => { const target = formatById(f); onDerive?.({ templateId: `blank:${f}`, values: {}, palette, doc: resizeDoc(doc, target.w, target.h) }); toast.success(tx(lang, `Copie au format ${target[lang]} ouverte. Pensez à enregistrer le design d'origine.`, `${target[lang]} copy opened. Remember to save the original design.`)); }} />
          : <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[32svh_minmax(0,1fr)] md:grid-cols-[380px_minmax(0,1fr)] md:grid-rows-1">
            <div className="order-last min-h-0 overflow-y-auto border-t border-border p-4 sm:p-5 md:order-none md:border-r md:border-t-0">
              {step === 0 && <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-secondary/40 p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-[#6d5bd0]" />{tx(lang, "Rédiger avec l'IA", "Write with AI")}</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">{tx(lang, "Décrivez votre projet en une ou deux phrases : l'IA remplit tous les textes du modèle. Vous pourrez tout modifier ensuite.", "Describe your project in a sentence or two: the AI fills every text of the template. You can edit everything afterwards.")}</p>
                  <textarea className={cn(field, "mt-2 min-h-[72px] resize-y")} value={brief} maxLength={2000} onChange={(e) => setBrief(e.target.value)}
                    placeholder={tx(lang, "Ex. : invitation au mariage de Fifamè et Jonas le 20 juin à Porto-Novo, cérémonie à 15 h puis dîner", "E.g. wedding invitation for Fifamè and Jonas on 20 June, ceremony at 3 pm then dinner")} />
                  <button type="button" disabled={aiBusy || brief.trim().length < 5} onClick={() => void writeWithAi()}
                    className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[12.5px] font-semibold text-background disabled:opacity-50">
                    {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}{tx(lang, "Rédiger", "Write")}
                  </button>
                </div>
                {template.layout.fields.map((x) => <label key={x.key} className="block space-y-1">
                  <span className="text-[12px] font-medium text-foreground/80">{x.label}</span>
                  {x.kind === "image" ? <div className="flex items-center gap-2">
                    {values[x.key] ? <img src={values[x.key]} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-secondary"><ImagePlus className="size-4 text-muted-foreground" /></span>}
                    <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3 text-[12.5px] font-semibold text-background"><ImagePlus className="size-4" />{tx(lang, "Importer une image", "Import an image")}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickImage(x.key, e.target.files?.[0]); e.target.value = ""; }} /></span>
                    {values[x.key] && <button type="button" aria-label={tx(lang, "Retirer l'image", "Remove image")} onClick={() => set(x.key, "")} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><Trash2 className="size-3.5" /></button>}
                  </div>
                    : x.kind === "long" ? <textarea className={cn(field, "min-h-[84px] resize-y")} value={values[x.key] ?? ""} maxLength={x.max} onChange={(e) => set(x.key, e.target.value)} />
                    : <input className={field} value={values[x.key] ?? ""} maxLength={x.max} onChange={(e) => set(x.key, e.target.value)} />}
                </label>)}
                <p className="text-[11.5px] text-muted-foreground">{tx(lang, "D'autres images, textes, emojis ou pages ? Tout s'ajoute à l'étape « Mise en forme ».", "More images, texts, emojis or pages? Add them all in the « Layout » step.")}</p>
              </div>}
              {step === 1 && <div className="space-y-4">
                <p className="flex items-center gap-2 text-[13px] font-semibold"><PaletteIcon className="size-4" />{tx(lang, "Palette", "Palette")}</p>
                <div className="grid grid-cols-2 gap-2">{Object.values(PALETTES).map((pal) => <button key={pal.id} type="button" aria-pressed={palette.id === pal.id} onClick={() => setPalette({ ...pal })}
                  className={cn("rounded-xl border p-2.5 text-left transition", palette.id === pal.id ? "border-foreground" : "border-border hover:border-foreground/30")}>
                  <span className="flex gap-1">{[pal.bg, pal.ink, pal.accent, pal.soft].map((c, i) => <span key={i} className="size-5 rounded-full border border-black/10" style={{ background: c }} />)}</span>
                  <span className="mt-1.5 block text-[12.5px] font-semibold">{pal[lang]}</span>
                  <span className="block text-[11px] text-muted-foreground">{pal.head} · {pal.body}</span>
                </button>)}</div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <span className="text-[12.5px] font-medium">{tx(lang, "Couleur d'accent", "Accent colour")}</span>
                  <input type="color" value={palette.accent} onChange={(e) => setPalette({ ...palette, accent: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent" />
                </label>
                <p className="text-[11.5px] text-muted-foreground">{tx(lang, "Polices, tailles, gras, couleurs de chaque texte : à l'étape suivante, en cliquant sur le texte.", "Fonts, sizes, bold, colours of each text: in the next step, by clicking the text.")}</p>
              </div>}
              {step === 3 && doc && <div className="space-y-3">
                <p className="text-[13px] font-semibold">{tx(lang, "Partager par un lien", "Share by link")}</p>
                {exportRow(Rocket, tx(lang, "Publier et obtenir un lien", "Publish and get a link"), invite ? tx(lang, "Une page en ligne avec compte à rebours, réponse par WhatsApp, itinéraire et ajout au calendrier. Lien TechNova, Netlify, Vercel ou GitHub, puis partage WhatsApp.", "An online page with countdown, WhatsApp RSVP, directions and calendar. TechNova link, Netlify, Vercel or GitHub, then WhatsApp sharing.") : tx(lang, "Une page en ligne à envoyer : lien TechNova, Netlify, Vercel ou GitHub, puis partage WhatsApp.", "An online page to send: TechNova link, Netlify, Vercel or GitHub, then WhatsApp sharing."), () => setPublishOpen(true), true)}
                <p className="pt-2 text-[13px] font-semibold">{tx(lang, "Télécharger ou imprimer", "Download or print")}</p>
                {exportRow(Printer, tx(lang, "Imprimer ou enregistrer en PDF", "Print or save as PDF"), tx(lang, `Format exact : ${fmt.size}. Choisissez votre imprimante ou « Enregistrer au format PDF ».`, `Exact size: ${fmt.size}. Pick your printer or « Save as PDF ».`), () => { if (!printDoc(doc, template.format, title)) toast.error(tx(lang, "Autorisez les fenêtres pop-up pour imprimer.", "Allow pop-ups to print.")); })}
                {exportRow(Presentation, "PowerPoint (.pptx)", tx(lang, "Textes, formes et images modifiables, toutes les pages.", "Editable text, shapes and images, every page."), () => void downloadDocPptx(doc, title))}
                {exportRow(FileCode2, "HTML", tx(lang, "La page web autonome (pour un e-mail ou votre propre site).", "The standalone web page (for e-mail or your own site)."), () => downloadDocHtml(doc, template.format, title, values))}
                <p className="pt-2 text-[13px] font-semibold">{tx(lang, "Continuer dans un autre logiciel", "Continue in another app")}</p>
                {exportRow(ExternalLink, "Google Slides", tx(lang, "Télécharge le .pptx puis ouvre Google Slides : Fichier → Importer des diapositives.", "Downloads the .pptx and opens Google Slides: File → Import slides."), () => { void downloadDocPptx(doc, title); openTab("https://docs.google.com/presentation/u/0/"); })}
                {exportRow(ExternalLink, tx(lang, "PowerPoint en ligne", "PowerPoint online"), tx(lang, "Télécharge le .pptx puis ouvre PowerPoint pour le charger.", "Downloads the .pptx and opens PowerPoint to upload it."), () => { void downloadDocPptx(doc, title); openTab("https://www.office.com/launch/powerpoint"); })}
                {exportRow(ExternalLink, "Canva", tx(lang, "Télécharge le .pptx puis ouvre Canva : Créer un design → Importer.", "Downloads the .pptx and opens Canva: Create a design → Import."), () => { void downloadDocPptx(doc, title); openTab("https://www.canva.com/"); })}
                <p className="rounded-xl bg-secondary/50 p-3 text-[11.5px] text-muted-foreground">{tx(lang, "Connexion directe à Canva, Google Slides, PowerPoint et aux réseaux sociaux (Instagram, Facebook, TikTok, YouTube) : bientôt, dans Plugins → connecteurs à venir.", "Direct connection to Canva, Google Slides, PowerPoint and social networks: coming soon, in Plugins → upcoming connectors.")}</p>
              </div>}
              <p className="mt-5 flex gap-2 rounded-xl border border-border p-3 text-[11.5px] text-muted-foreground"><Coins className="mt-0.5 size-3.5 shrink-0" />{tx(lang, `Modèles, mise en forme et exports gratuits (la publication en ligne suit votre forfait). Seule la rédaction par l'IA consomme quelques crédits. Enregistrez-la dans un projet (supprimée 14 jours après sa création), téléchargez-la ou publiez-la.`, `Templates, layout and exports are free (publishing follows your plan). Only AI writing uses a few credits. Save it to a project (deleted 14 days after it was created), download or publish it.`)}</p>
            </div>
            <div className="order-first flex min-h-0 flex-col bg-secondary/40 md:order-none">
              <div ref={previewBox} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
                {step === 3 && doc
                  ? <div className="shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]" style={{ width: previewWidth, height: previewWidth * doc.h / doc.w, overflow: "hidden" }}><div style={{ transform: `scale(${previewWidth / doc.w})`, transformOrigin: "top left" }}><DocPage doc={doc} page={0} /></div></div>
                  : <div className="shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]"><DesignPreview template={template} values={values} palette={palette} width={previewWidth} /></div>}
              </div>
            </div>
          </div>}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="text-[11.5px] text-muted-foreground max-md:hidden">{building ? <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />{tx(lang, "Préparation de la mise en forme…", "Preparing the layout…")}</span> : step === 2 ? tx(lang, "Astuce : double-cliquez sur un texte pour l'écrire ; Ctrl+Z annule.", "Tip: double-click a text to type; Ctrl+Z undoes.") : ""}</span>
        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          <button type="button" onClick={quickSave} aria-label={tx(lang, "Enregistrer dans un projet", "Save to a project")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-medium hover:bg-secondary"><Save className="size-4" /><span className="max-sm:hidden">{savedRef ? tx(lang, "Enregistrer", "Save") : tx(lang, "Enregistrer dans un projet", "Save to a project")}</span></button>
          {step > (blank ? 2 : 0) && <button type="button" onClick={() => setStep(step - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /><span className="max-sm:hidden">{tx(lang, "Retour", "Back")}</span></button>}
          {step < 3 ? <button type="button" disabled={building} onClick={() => void go(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-60">{step === 1 && <Wand2 className="size-4" />}{step === 1 ? tx(lang, "Mettre en forme", "Lay out") : tx(lang, "Continuer", "Continue")}<ArrowRight className="size-4" /></button>
            : <button type="button" onClick={() => setPublishOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background"><Share2 className="size-4" />{tx(lang, "Publier et partager", "Publish & share")}</button>}
        </div>
      </div>
      <SaveToProject open={saveOpen} onOpenChange={setSaveOpen} lang={lang} defaultTitle={title} projectId={savedRef?.projectId ?? null} onSave={saveTo} />
      {doc && <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} title={title} lang={lang} files={[{ path: "index.html", content: publishOpen ? shareHtml(doc, template.format, title, values) : "", done: true }]}
        shareText={invite ? tx(lang, `Vous êtes invité(e) : ${title}`, `You are invited: ${title}`) : title} />}
    </DialogContent>
  </Dialog>;
}
