import { useEffect, useState } from "react";
import { Crown, Eraser, Loader2, Lock, Palette, QrCode, Scaling, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import qrcode from "qrcode-generator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier } from "@/lib/plan-client";
import { DESIGN_FORMATS, type DesignFormatId } from "@/lib/design-formats";
import { confirmAiCredits } from "@/lib/ai-credit-notice";
import { DESIGN_FONTS } from "@/lib/design-fonts";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";
import type { DesignDoc, ImageEl } from "./doc";

// Créativité Pro (Pro plan or Mensuel Pro): remove a picture's background (kie.ai, a few credits at real cost), adapt the
// design to another format in one click, a brand kit (colours, fonts, logo; saved in brand_kits) applied to the
// whole design, and QR codes (link, WhatsApp, phone, Mobile Money, text) drawn in the browser. The server
// re-checks the plan (design_pro) for the paid action and the brand kit.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
export type BrandKit = { name: string; colors: string[]; font_head: string; font_body: string; logo: string | null };

/** A QR code as an SVG data URL (dark modules on a white square). */
export function qrDataUrl(text: string, dark = "#111111") {
  const qr = qrcode(0, "M"); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), m = 2;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${path}" fill="${dark}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function ProPanel({ lang, doc, image, onImage, onAddImage, onBrand, onDerive, current }: {
  lang: Lang; doc: DesignDoc; image: ImageEl | null; current: DesignFormatId | null;
  onImage: (src: string) => void; onAddImage: (src: string, w: number, h: number) => void;
  onBrand: (kit: BrandKit) => void; onDerive: (format: DesignFormatId) => void;
}) {
  const tier = usePlanTier();
  const [busy, setBusy] = useState(false);
  const [kit, setKit] = useState<BrandKit>({ name: "", colors: ["#1f2937", "#7c5cff", "#f5f3ff"], font_head: "Playfair Display", font_body: "Inter", logo: null });
  const [kitSaved, setKitSaved] = useState(false);
  const [qrKind, setQrKind] = useState<"url" | "whatsapp" | "tel" | "momo" | "text">("url");
  const [qrValue, setQrValue] = useState("");
  const [qrColor, setQrColor] = useState("#111111");
  useEffect(() => {
    if (tier !== 3) return;
    void supabase.from("brand_kits").select("name,colors,font_head,font_body,logo").maybeSingle().then(({ data }) => {
      if (data) { setKit({ name: data.name, colors: (data.colors as string[]) ?? [], font_head: data.font_head, font_body: data.font_body, logo: data.logo }); setKitSaved(true); }
    });
  }, [tier]);

  if (tier === null) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  if (tier < 3) return <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-3.5 text-[12.5px]">
    <p className="flex items-center gap-2 font-semibold"><Lock className="size-4" />{tx(lang, "Créativité Pro", "Creativity Pro")}</p>
    <p className="text-muted-foreground">{tx(lang, "Suppression d'arrière-plan, déclinaison dans d'autres formats, kit de marque et QR codes sont inclus avec le forfait Pro et la formule Mensuel Pro.", "Background removal, adapting to other formats, brand kit and QR codes come with the Pro pack and the Mensuel Pro plan.")}</p>
    <Link to="/dashboard/credits" className="inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-[12px] font-semibold text-background">{tx(lang, "Voir les offres", "See plans")}</Link>
  </div>;

  const removeBg = async () => {
    if (!image || !image.src.startsWith("data:")) { toast.error(tx(lang, "Sélectionnez d'abord une photo importée.", "First select an imported photo.")); return; }
    if (!(await confirmAiCredits("background", lang))) return;
    setBusy(true);
    try {
      const png = await toPng(image.src);
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/design-tools", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ lang, image: png }) });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { image: string; credits: number };
      onImage(json.image); notifyCreditsChanged();
      toast.success(tx(lang, `Arrière-plan supprimé · ${json.credits} crédits`, `Background removed · ${json.credits} credits`));
    } catch (e) { toast.error(e instanceof Error && e.message.length < 240 ? e.message : tx(lang, "Échec : aucun crédit prélevé.", "Failed: no credit charged.")); }
    finally { setBusy(false); }
  };
  const saveKit = async () => {
    const { error } = await supabase.from("brand_kits").upsert({ name: kit.name, colors: kit.colors, font_head: kit.font_head, font_body: kit.font_body, logo: kit.logo });
    if (error) toast.error(tx(lang, "Kit non enregistré (logo trop lourd ?).", "Kit not saved (logo too large?).")); else { setKitSaved(true); toast.success(tx(lang, "Kit de marque enregistré.", "Brand kit saved.")); }
  };
  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    const { readImage } = await import("./DesignEditor");
    const src = await readImage(f, 600);
    if (src.length > 550_000) { toast.error(tx(lang, "Logo trop lourd : utilisez une image plus petite.", "Logo too large: use a smaller picture.")); return; }
    setKit((k) => ({ ...k, logo: src }));
  };
  const qrText = () => {
    const v = qrValue.trim(); if (!v) return "";
    if (qrKind === "url") return /^https?:\/\//.test(v) ? v : `https://${v}`;
    if (qrKind === "whatsapp") return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
    if (qrKind === "tel" || qrKind === "momo") return `tel:${v.replace(/[^\d+]/g, "")}`;
    return v;
  };
  const addQr = () => { const t = qrText(); if (!t) return; const s = Math.round(Math.min(doc.w, doc.h) * 0.22); onAddImage(qrDataUrl(t, qrColor), s, s); };
  const field = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[12.5px] outline-none";
  const h = "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

  return <div className="space-y-4">
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300"><Crown className="size-3.5" />{tx(lang, "Outils Pro", "Pro tools")}</p>
    <div className="space-y-2">
      <p className={h}><Eraser className="size-3.5" />{tx(lang, "Arrière-plan", "Background")}</p>
      <button type="button" disabled={busy || !image} onClick={() => void removeBg()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-[12.5px] font-semibold text-background disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}{tx(lang, "Supprimer le fond", "Remove background")}</button>
      <p className="text-[11px] text-muted-foreground">{image ? tx(lang, "Le fond de la photo sélectionnée devient transparent.", "The selected photo's background becomes transparent.") : tx(lang, "Sélectionnez une photo sur la page.", "Select a photo on the page.")}</p>
    </div>
    <div className="space-y-2">
      <p className={h}><Scaling className="size-3.5" />{tx(lang, "Décliner dans un autre format", "Adapt to another format")}</p>
      <select className={field} value="" onChange={(e) => { if (e.target.value) onDerive(e.target.value as DesignFormatId); }}>
        <option value="">{tx(lang, "Choisir le format…", "Pick a format…")}</option>
        {DESIGN_FORMATS.filter((f) => f.id !== current).map((f) => <option key={f.id} value={f.id}>{f[lang]} · {f.size}</option>)}
      </select>
      <p className="text-[11px] text-muted-foreground">{tx(lang, "Une copie adaptée s'ouvre (post → story, flyer → affiche…) ; votre design actuel ne change pas.", "An adapted copy opens (post → story, flyer → poster…); your current design stays as is.")}</p>
    </div>
    <div className="space-y-2">
      <p className={h}><Palette className="size-3.5" />{tx(lang, "Kit de marque", "Brand kit")}</p>
      <input className={field} value={kit.name} maxLength={80} onChange={(e) => setKit({ ...kit, name: e.target.value })} placeholder={tx(lang, "Nom de la marque", "Brand name")} />
      <div className="flex gap-1.5">{[0, 1, 2].map((i) => <input key={i} type="color" aria-label={tx(lang, `Couleur ${i + 1}`, `Colour ${i + 1}`)} value={kit.colors[i] ?? "#ffffff"} onChange={(e) => { const c = [...kit.colors]; c[i] = e.target.value; setKit({ ...kit, colors: c }); }} className="h-9 flex-1 cursor-pointer rounded-lg border border-border" />)}</div>
      <p className="text-[10.5px] text-muted-foreground">{tx(lang, "Texte · accent · fond", "Text · accent · background")}</p>
      {(["font_head", "font_body"] as const).map((k) => <select key={k} className={field} value={kit[k]} onChange={(e) => setKit({ ...kit, [k]: e.target.value })} aria-label={k === "font_head" ? tx(lang, "Police des titres", "Heading font") : tx(lang, "Police du texte", "Body font")}>
        {DESIGN_FONTS.map((f) => <option key={f.name} value={f.name}>{k === "font_head" ? tx(lang, "Titres : ", "Headings: ") : tx(lang, "Texte : ", "Body: ")}{f.name}</option>)}
      </select>)}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-[12px] hover:bg-secondary">
        {kit.logo ? <img src={kit.logo} alt="" className="size-7 rounded object-contain" /> : <Upload className="size-4" />}{kit.logo ? tx(lang, "Changer le logo", "Change the logo") : tx(lang, "Ajouter votre logo", "Add your logo")}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => void saveKit()} className="h-9 rounded-lg border border-border text-[12px] hover:bg-secondary">{kitSaved ? tx(lang, "Mettre à jour", "Update") : tx(lang, "Enregistrer", "Save")}</button>
        <button type="button" onClick={() => onBrand(kit)} className="h-9 rounded-lg bg-foreground text-[12px] font-semibold text-background">{tx(lang, "Appliquer", "Apply")}</button>
      </div>
    </div>
    <div className="space-y-2">
      <p className={h}><QrCode className="size-3.5" />{tx(lang, "QR code", "QR code")}</p>
      <select className={field} value={qrKind} onChange={(e) => setQrKind(e.target.value as typeof qrKind)}>
        <option value="url">{tx(lang, "Lien (site, invitation, formulaire)", "Link (site, invitation, form)")}</option>
        <option value="whatsapp">{tx(lang, "Discussion WhatsApp", "WhatsApp chat")}</option>
        <option value="tel">{tx(lang, "Numéro de téléphone", "Phone number")}</option>
        <option value="momo">{tx(lang, "Numéro Mobile Money", "Mobile Money number")}</option>
        <option value="text">{tx(lang, "Texte libre", "Free text")}</option>
      </select>
      <input className={field} value={qrValue} maxLength={500} onChange={(e) => setQrValue(e.target.value)} placeholder={qrKind === "url" ? "https://…" : qrKind === "text" ? tx(lang, "Votre texte", "Your text") : "+229 01 00 00 00 00"} />
      <div className="flex gap-1.5"><input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} aria-label={tx(lang, "Couleur du QR code", "QR code colour")} className="h-9 w-12 cursor-pointer rounded-lg border border-border" />
        <button type="button" disabled={!qrValue.trim()} onClick={addQr} className="h-9 flex-1 rounded-lg bg-foreground text-[12px] font-semibold text-background disabled:opacity-50">{tx(lang, "Ajouter le QR code", "Add the QR code")}</button></div>
      <p className="text-[11px] text-muted-foreground">{tx(lang, "Testez-le avec l'appareil photo de votre téléphone avant d'imprimer.", "Test it with your phone's camera before printing.")}</p>
    </div>
  </div>;
}

/** Turns any picture into a PNG data URL (kie.ai reads PNG, JPEG and WebP). */
async function toPng(src: string): Promise<string> {
  if (/^data:image\/(png|jpeg|webp);/.test(src)) return src;
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}
