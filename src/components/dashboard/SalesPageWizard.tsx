import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Hammer, Link2, MessageCircle, Package, Palette, Rocket, Smartphone, Sparkles, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { STUDIO_COST } from "@/lib/studio";
import { featureMinTier, packNames } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import { cn } from "@/lib/utils";

// "Page de vente pro" journey: Offer → Style → Payment → Build (Studio) → Publish (/s/slug).
// The wizard only collects facts the visitor gives (nothing invented: no fake reviews or fake stock),
// then hands Studio one complete brief whose buy buttons are wired to the payment methods entered here.
// The server still decides access and bills each Studio stage; the estimate shown is STUDIO_COST.

type Lang = "fr" | "en";
type PayKey = "momo" | "whatsapp" | "link" | "cod";
export type SalesForm = {
  product: string; kind: "physical" | "digital" | "service" | "course"; description: string; audience: string;
  price: string; currency: string; oldPrice: string; benefits: string; bonus: string; guarantee: string; testimonials: string;
  tone: "premium" | "warm" | "energetic" | "sober"; color: string; faq: boolean;
  pay: Record<PayKey, boolean>; momoNumber: string; momoOperator: string; momoName: string; whatsapp: string; payLink: string; codZones: string;
};

const empty: SalesForm = {
  product: "", kind: "physical", description: "", audience: "", price: "", currency: "FCFA", oldPrice: "", benefits: "", bonus: "", guarantee: "", testimonials: "",
  tone: "premium", color: "#2563eb", faq: true,
  pay: { momo: false, whatsapp: true, link: false, cod: false }, momoNumber: "", momoOperator: "MTN MoMo", momoName: "", whatsapp: "", payLink: "", codZones: "",
};

const currencies = ["FCFA", "XAF", "EUR", "USD", "NGN", "GHS", "MAD", "GNF", "CDF"];
const operators = ["MTN MoMo", "Moov Money", "Orange Money", "Wave", "Airtel Money", "Free Money", "Celtiis Cash", "M-Pesa"];
const swatches = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#16a34a", "#0f766e", "#111827"];

const L = {
  fr: {
    title: "Page de vente pro", sub: "Quatre étapes et TechNova Studio construit une page qui vend, reliée à vos moyens de paiement.",
    steps: ["Offre", "Style", "Paiement", "Construction", "Publication"],
    product: "Nom du produit ou de l'offre", productPh: "Ex. : Crème karité bio 250 ml", kind: "Type d'offre",
    kinds: { physical: "Produit physique", digital: "Produit numérique", service: "Service", course: "Formation" },
    description: "Ce que c'est, en quelques phrases", descriptionPh: "Ce que le client reçoit, comment il l'utilise, ce qui le rend unique…",
    audience: "Pour qui ?", audiencePh: "Ex. : femmes actives de 25 à 45 ans à Cotonou", price: "Prix", oldPrice: "Ancien prix (si réel)",
    benefits: "Bénéfices clés (un par ligne)", benefitsPh: "Peau hydratée 24 h\nIngrédients 100 % naturels\nLivraison en 48 h",
    bonus: "Bonus offert (facultatif)", guarantee: "Garantie (facultatif)", guaranteePh: "Ex. : satisfait ou remboursé 7 jours",
    testimonials: "Vrais témoignages clients (facultatif, un par ligne)", testimonialsPh: "« Ma peau n'a jamais été aussi douce » — Awa, Cotonou",
    noFake: "Laissez vide si vous n'en avez pas : TechNova n'invente jamais d'avis.",
    tone: "Ton de la page", tones: { premium: "Premium", warm: "Chaleureux", energetic: "Énergique", sober: "Sobre" }, color: "Couleur principale", faq: "Ajouter une FAQ (livraison, paiement, garantie)",
    payIntro: "Comment vos clients vous paient-ils ? Choisissez au moins un moyen : chaque bouton « Acheter » y mènera.",
    pay: { momo: "Mobile Money", whatsapp: "Commande WhatsApp", link: "Lien de paiement", cod: "Paiement à la livraison" },
    payHint: { momo: "Le client envoie l'argent à votre numéro, puis vous envoie la preuve.", whatsapp: "Le client vous écrit avec un message de commande déjà rempli.", link: "FeexPay, Stripe, PayPal, Wave, Chariow… (adresse https)", cod: "Le client paie en espèces à la réception." },
    momoNumber: "Numéro Mobile Money", momoOperator: "Opérateur", momoName: "Nom affiché sur le compte", whatsapp: "Numéro WhatsApp (avec indicatif)", payLink: "Adresse du lien de paiement", codZones: "Zones livrées",
    recap: "Récapitulatif", cost: "Coût estimé", costDetail: (q: number, p: number, b: number) => `questions ${q} + plan ${p} + construction ${b} crédits, prélevés étape par étape`,
    planNote: (s: string, p: string) => `La construction demande au moins le forfait ${s} ; la mise en ligne en 1 clic (adresse /s/…), le forfait ${p}.`,
    after: "Ensuite : Studio vous pose 2 ou 3 questions s'il manque un détail, vous montre le plan à valider, puis construit la page. Vous la publiez avec le bouton « Publier » du panneau.",
    back: "Retour", next: "Continuer", build: "Construire ma page de vente",
    errors: { product: "Indiquez le nom du produit.", description: "Décrivez l'offre en une ou deux phrases.", price: "Indiquez un prix (chiffres).", pay: "Choisissez au moins un moyen de paiement.", phone: "Numéro invalide : 8 à 15 chiffres, indicatif compris.", link: "Le lien doit commencer par https://", cod: "Indiquez les zones livrées." },
  },
  en: {
    title: "Pro sales page", sub: "Four steps and TechNova Studio builds a page that sells, wired to your payment methods.",
    steps: ["Offer", "Style", "Payment", "Build", "Publish"],
    product: "Product or offer name", productPh: "E.g. Organic shea cream 250 ml", kind: "Offer type",
    kinds: { physical: "Physical product", digital: "Digital product", service: "Service", course: "Course" },
    description: "What it is, in a few sentences", descriptionPh: "What the customer gets, how they use it, what makes it unique…",
    audience: "Who is it for?", audiencePh: "E.g. working women aged 25–45 in Lagos", price: "Price", oldPrice: "Former price (if real)",
    benefits: "Key benefits (one per line)", benefitsPh: "24-hour hydration\n100% natural ingredients\nDelivered in 48 h",
    bonus: "Free bonus (optional)", guarantee: "Guarantee (optional)", guaranteePh: "E.g. 7-day money-back guarantee",
    testimonials: "Real customer testimonials (optional, one per line)", testimonialsPh: "“My skin has never felt so soft” — Awa, Cotonou",
    noFake: "Leave empty if you have none: TechNova never invents reviews.",
    tone: "Page tone", tones: { premium: "Premium", warm: "Warm", energetic: "Energetic", sober: "Sober" }, color: "Main colour", faq: "Add an FAQ (delivery, payment, guarantee)",
    payIntro: "How do your customers pay you? Pick at least one: every “Buy” button will lead there.",
    pay: { momo: "Mobile Money", whatsapp: "WhatsApp order", link: "Payment link", cod: "Cash on delivery" },
    payHint: { momo: "The customer sends money to your number, then sends you the proof.", whatsapp: "The customer messages you with a prefilled order.", link: "FeexPay, Stripe, PayPal, Wave, Chariow… (https address)", cod: "The customer pays cash on delivery." },
    momoNumber: "Mobile Money number", momoOperator: "Operator", momoName: "Name on the account", whatsapp: "WhatsApp number (with country code)", payLink: "Payment link address", codZones: "Delivery areas",
    recap: "Summary", cost: "Estimated cost", costDetail: (q: number, p: number, b: number) => `questions ${q} + plan ${p} + build ${b} credits, charged stage by stage`,
    planNote: (s: string, p: string) => `Building needs at least the ${s} pack; one-click publishing (/s/… address) needs ${p}.`,
    after: "Next: Studio asks 2 or 3 questions if a detail is missing, shows the plan for approval, then builds the page. Publish it with the panel's “Publish” button.",
    back: "Back", next: "Continue", build: "Build my sales page",
    errors: { product: "Enter the product name.", description: "Describe the offer in a sentence or two.", price: "Enter a price (digits).", pay: "Pick at least one payment method.", phone: "Invalid number: 8 to 15 digits, country code included.", link: "The link must start with https://", cod: "Enter the delivery areas." },
  },
} as const;

const digits = (v: string) => v.replace(/[^\d]/g, "");
const phoneOk = (v: string) => { const d = digits(v); return d.length >= 8 && d.length <= 15; };
const linkOk = (v: string) => { try { const u = new URL(v.trim()); return u.protocol === "https:"; } catch { return false; } };

/** Errors of one step (empty when it can move on). */
function stepErrors(f: SalesForm, step: number, lang: Lang): string[] {
  const e = L[lang].errors, out: string[] = [];
  if (step === 0) {
    if (!f.product.trim()) out.push(e.product);
    if (f.description.trim().length < 10) out.push(e.description);
    if (!/\d/.test(f.price)) out.push(e.price);
  }
  if (step === 2) {
    if (!Object.values(f.pay).some(Boolean)) out.push(e.pay);
    if (f.pay.momo && !phoneOk(f.momoNumber)) out.push(`${L[lang].pay.momo} : ${e.phone}`);
    if (f.pay.whatsapp && !phoneOk(f.whatsapp)) out.push(`${L[lang].pay.whatsapp} : ${e.phone}`);
    if (f.pay.link && !linkOk(f.payLink)) out.push(e.link);
    if (f.pay.cod && !f.codZones.trim()) out.push(e.cod);
  }
  return out;
}

/** The complete Studio brief: facts from the form plus the build and payment-wiring rules. */
export function salesBrief(f: SalesForm, lang: Lang): string {
  const fr = lang === "fr";
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  const price = `${f.price.trim()} ${f.currency}`;
  const wa = digits(f.whatsapp);
  const order = encodeURIComponent(fr ? `Bonjour, je souhaite commander : ${f.product.trim()} (${price}).` : `Hello, I would like to order: ${f.product.trim()} (${price}).`);
  const pay: string[] = [];
  if (f.pay.whatsapp) pay.push(fr ? `Commande WhatsApp : bouton vers https://wa.me/${wa}?text=${order} (message de commande prérempli).` : `WhatsApp order: button to https://wa.me/${wa}?text=${order} (prefilled order message).`);
  if (f.pay.momo) pay.push(fr ? `Mobile Money (${f.momoOperator}) : afficher le numéro +${digits(f.momoNumber)}${f.momoName.trim() ? ` au nom de ${f.momoName.trim()}` : ""} avec un bouton « Copier le numéro », les étapes « 1. Envoyez ${price} 2. Gardez la référence 3. Envoyez la preuve »${wa ? ` et un bouton pour envoyer la preuve sur WhatsApp (https://wa.me/${wa})` : ""}.` : `Mobile Money (${f.momoOperator}): show the number +${digits(f.momoNumber)}${f.momoName.trim() ? ` in the name of ${f.momoName.trim()}` : ""} with a “Copy number” button, the steps “1. Send ${price} 2. Keep the reference 3. Send the proof”${wa ? ` and a button to send the proof on WhatsApp (https://wa.me/${wa})` : ""}.`);
  if (f.pay.link) pay.push(fr ? `Paiement en ligne : bouton « Payer maintenant » vers ${f.payLink.trim()} (nouvel onglet, rel="noopener").` : `Online payment: “Pay now” button to ${f.payLink.trim()} (new tab, rel="noopener").`);
  if (f.pay.cod) pay.push(fr ? `Paiement à la livraison : préciser « Payez à la réception » et les zones livrées : ${f.codZones.trim()}.` : `Cash on delivery: state “Pay on delivery” and the delivery areas: ${f.codZones.trim()}.`);
  const t = L[lang];
  const facts = [
    `${fr ? "Produit" : "Product"} : ${f.product.trim()} (${t.kinds[f.kind]})`,
    `${fr ? "Description" : "Description"} : ${f.description.trim()}`,
    f.audience.trim() && `${fr ? "Public visé" : "Audience"} : ${f.audience.trim()}`,
    `${fr ? "Prix" : "Price"} : ${price}${f.oldPrice.trim() ? ` (${fr ? "ancien prix réel" : "real former price"} ${f.oldPrice.trim()} ${f.currency})` : ""}`,
    lines(f.benefits).length && `${fr ? "Bénéfices" : "Benefits"} : ${lines(f.benefits).join(" ; ")}`,
    f.bonus.trim() && `${fr ? "Bonus" : "Bonus"} : ${f.bonus.trim()}`,
    f.guarantee.trim() && `${fr ? "Garantie" : "Guarantee"} : ${f.guarantee.trim()}`,
    lines(f.testimonials).length ? `${fr ? "Témoignages réels à citer tels quels" : "Real testimonials to quote as given"} : ${lines(f.testimonials).join(" | ")}` : (fr ? "Témoignages : aucun fourni — ne pas en inventer, pas de section avis." : "Testimonials: none given — do not invent any, no review section."),
    `${fr ? "Ton" : "Tone"} : ${t.tones[f.tone]} ; ${fr ? "couleur principale" : "main colour"} ${f.color}`,
  ].filter(Boolean).join("\n- ");
  return fr
    ? `Crée une page de vente professionnelle à forte conversion, en un seul fichier responsive (mobile d'abord, rapide à charger).\n\nOffre :\n- ${facts}\n\nStructure : héros avec promesse claire, prix et bouton d'achat visible ; problème → solution ; bénéfices ; détails du produit ; ${f.bonus.trim() || f.guarantee.trim() ? "bonus et garantie ; " : ""}${lines(f.testimonials).length ? "témoignages ; " : ""}offre et prix ; ${f.faq ? "FAQ (livraison, paiement, garantie) ; " : ""}appel à l'action final. Barre d'achat collante sur mobile.\n\nPaiement — chaque bouton « Acheter » ouvre ces choix :\n- ${pay.join("\n- ")}\n\nRègles : aucun faux avis, faux compteur ni faux stock ; textes en français ; aucune base de données nécessaire.`
    : `Build a high-converting professional sales page as one responsive file (mobile first, fast to load).\n\nOffer:\n- ${facts}\n\nStructure: hero with a clear promise, price and a visible buy button; problem → solution; benefits; product details; ${f.bonus.trim() || f.guarantee.trim() ? "bonus and guarantee; " : ""}${lines(f.testimonials).length ? "testimonials; " : ""}offer and price; ${f.faq ? "FAQ (delivery, payment, guarantee); " : ""}final call to action. Sticky buy bar on mobile.\n\nPayment — every “Buy” button opens these choices:\n- ${pay.join("\n- ")}\n\nRules: no fake reviews, fake countdown or fake stock; copy in English; no database needed.`;
}

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-ring/20";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block space-y-1"><span className="text-[12px] font-medium text-foreground/80">{label}</span>{children}{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}</label>;
}

export function SalesPageWizard({ open, onOpenChange, lang, onBuild }: { open: boolean; onOpenChange: (open: boolean) => void; lang: Lang; onBuild: (brief: string, product: string) => void }) {
  const t = L[lang];
  const tier = usePlanTier();
  const [f, setF] = useState<SalesForm>(empty);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof SalesForm>(k: K, v: SalesForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const total = STUDIO_COST.questions + STUDIO_COST.plan + STUDIO_COST.build;
  const siteTier = featureMinTier.site, publishTier = featureMinTier.publish;
  const packName = (n: number) => packNames[n] ?? "";
  const brief = useMemo(() => (step === 3 ? salesBrief(f, lang) : ""), [f, lang, step]);

  function go(next: number) {
    if (next > step) { const e = stepErrors(f, step, lang); setErrors(e); if (e.length) return; }
    setErrors([]); setStep(next);
  }
  function build() {
    for (const s of [0, 2]) { const e = stepErrors(f, s, lang); if (e.length) { setErrors(e); setStep(s); return; } }
    onBuild(salesBrief(f, lang), f.product.trim());
    onOpenChange(false);
    setStep(0); setF(empty);
  }

  const payIcons: Record<PayKey, typeof Smartphone> = { momo: Smartphone, whatsapp: MessageCircle, link: Link2, cod: Truck };
  const stepIcons = [Package, Palette, CreditCard, Hammer, Rocket];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sales-wizard max-w-[620px] gap-0 rounded-2xl p-0 sm:rounded-2xl">
      <div className="border-b border-border px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold"><Sparkles className="size-4 text-primary" />{t.title}</DialogTitle>
        <DialogDescription className="mt-1 text-[12.5px]">{t.sub}</DialogDescription>
        <ol className="mt-4 flex items-center gap-1" aria-label={t.title}>
          {t.steps.map((label, i) => {
            const Icon = stepIcons[i]!;
            const reachable = i <= 3, done = i < step, current = i === step;
            return <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
              <button type="button" disabled={!reachable || i > step} onClick={() => go(i)} aria-current={current ? "step" : undefined}
                className={cn("flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-medium transition", current ? "text-foreground" : done ? "text-foreground/70 hover:text-foreground" : "text-muted-foreground")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", current ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/40 bg-primary/10 text-primary" : "border-border")}>{done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </button>
              {i < t.steps.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-primary/50" : "bg-border")} />}
            </li>;
          })}
        </ol>
      </div>

      <div className="space-y-3.5 px-5 py-5 sm:px-6">
        {step === 0 && <>
          <Field label={t.product}><input className={field} value={f.product} maxLength={120} placeholder={t.productPh} onChange={(e) => set("product", e.target.value)} /></Field>
          <div>
            <span className="text-[12px] font-medium text-foreground/80">{t.kind}</span>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">{(Object.keys(t.kinds) as SalesForm["kind"][]).map((k) => <button key={k} type="button" onClick={() => set("kind", k)} aria-pressed={f.kind === k} className={cn("rounded-xl border px-2 py-2 text-[12px] transition", f.kind === k ? "border-primary bg-primary/10 font-semibold text-foreground" : "border-border hover:border-foreground/30")}>{t.kinds[k]}</button>)}</div>
          </div>
          <Field label={t.description}><textarea className={cn(field, "min-h-[76px] resize-y")} value={f.description} maxLength={1200} placeholder={t.descriptionPh} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label={t.audience}><input className={field} value={f.audience} maxLength={200} placeholder={t.audiencePh} onChange={(e) => set("audience", e.target.value)} /></Field>
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <Field label={t.price}><input className={field} inputMode="decimal" value={f.price} maxLength={20} placeholder="15000" onChange={(e) => set("price", e.target.value)} /></Field>
            <Field label=" "><select className={field} value={f.currency} onChange={(e) => set("currency", e.target.value)} aria-label="Devise">{currencies.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <div className="col-span-2 sm:col-span-1"><Field label={t.oldPrice}><input className={field} inputMode="decimal" value={f.oldPrice} maxLength={20} onChange={(e) => set("oldPrice", e.target.value)} /></Field></div>
          </div>
          <Field label={t.benefits}><textarea className={cn(field, "min-h-[76px] resize-y")} value={f.benefits} maxLength={800} placeholder={t.benefitsPh} onChange={(e) => set("benefits", e.target.value)} /></Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t.bonus}><input className={field} value={f.bonus} maxLength={200} onChange={(e) => set("bonus", e.target.value)} /></Field>
            <Field label={t.guarantee}><input className={field} value={f.guarantee} maxLength={200} placeholder={t.guaranteePh} onChange={(e) => set("guarantee", e.target.value)} /></Field>
          </div>
          <Field label={t.testimonials} hint={t.noFake}><textarea className={cn(field, "min-h-[64px] resize-y")} value={f.testimonials} maxLength={1200} placeholder={t.testimonialsPh} onChange={(e) => set("testimonials", e.target.value)} /></Field>
        </>}

        {step === 1 && <>
          <div>
            <span className="text-[12px] font-medium text-foreground/80">{t.tone}</span>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">{(Object.keys(t.tones) as SalesForm["tone"][]).map((k) => <button key={k} type="button" onClick={() => set("tone", k)} aria-pressed={f.tone === k} className={cn("rounded-xl border px-2 py-2.5 text-[12.5px] transition", f.tone === k ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-foreground/30")}>{t.tones[k]}</button>)}</div>
          </div>
          <div>
            <span className="text-[12px] font-medium text-foreground/80">{t.color}</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {swatches.map((c) => <button key={c} type="button" onClick={() => set("color", c)} aria-label={c} aria-pressed={f.color === c} className={cn("size-8 rounded-full border-2 transition", f.color === c ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} />)}
              <input type="color" value={f.color} onChange={(e) => set("color", e.target.value)} aria-label={t.color} className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-transparent" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.faq} onChange={(e) => set("faq", e.target.checked)} className="size-4 accent-[var(--primary)]" />{t.faq}</label>
          <div className="rounded-2xl border border-border p-4" style={{ background: `linear-gradient(135deg, ${f.color}22, transparent 60%)` }} aria-hidden="true">
            <p className="text-[15px] font-semibold">{f.product || t.productPh}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t.tones[f.tone]} · {f.price || "15000"} {f.currency}</p>
            <span className="mt-3 inline-flex h-8 items-center rounded-full px-4 text-[12px] font-semibold text-white" style={{ background: f.color }}>{lang === "fr" ? "Acheter maintenant" : "Buy now"}</span>
          </div>
        </>}

        {step === 2 && <>
          <p className="text-[12.5px] text-muted-foreground">{t.payIntro}</p>
          {(Object.keys(t.pay) as PayKey[]).map((k) => {
            const Icon = payIcons[k], on = f.pay[k];
            return <div key={k} className={cn("rounded-2xl border transition", on ? "border-primary/60 bg-primary/[0.04]" : "border-border")}>
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
                <input type="checkbox" checked={on} onChange={(e) => set("pay", { ...f.pay, [k]: e.target.checked })} className="size-4 accent-[var(--primary)]" />
                <Icon className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{t.pay[k]}</span><span className="block text-[11.5px] text-muted-foreground">{t.payHint[k]}</span></span>
              </label>
              {on && <div className="grid gap-2 px-3.5 pb-3.5 sm:grid-cols-2">
                {k === "momo" && <>
                  <Field label={t.momoOperator}><select className={field} value={f.momoOperator} onChange={(e) => set("momoOperator", e.target.value)}>{operators.map((o) => <option key={o}>{o}</option>)}</select></Field>
                  <Field label={t.momoNumber}><input className={field} type="tel" inputMode="tel" value={f.momoNumber} maxLength={20} placeholder="+229 01 00 00 00 00" onChange={(e) => set("momoNumber", e.target.value)} /></Field>
                  <div className="sm:col-span-2"><Field label={t.momoName}><input className={field} value={f.momoName} maxLength={80} onChange={(e) => set("momoName", e.target.value)} /></Field></div>
                </>}
                {k === "whatsapp" && <div className="sm:col-span-2"><Field label={t.whatsapp}><input className={field} type="tel" inputMode="tel" value={f.whatsapp} maxLength={20} placeholder="+229 01 00 00 00 00" onChange={(e) => set("whatsapp", e.target.value)} /></Field></div>}
                {k === "link" && <div className="sm:col-span-2"><Field label={t.payLink}><input className={field} type="url" inputMode="url" value={f.payLink} maxLength={300} placeholder="https://" onChange={(e) => set("payLink", e.target.value)} /></Field></div>}
                {k === "cod" && <div className="sm:col-span-2"><Field label={t.codZones}><input className={field} value={f.codZones} maxLength={200} placeholder={lang === "fr" ? "Ex. : Cotonou, Abomey-Calavi, Porto-Novo" : "E.g. Lagos, Abuja"} onChange={(e) => set("codZones", e.target.value)} /></Field></div>}
              </div>}
            </div>;
          })}
        </>}

        {step === 3 && <>
          <p className="text-[13px] font-semibold">{t.recap}</p>
          <ul className="space-y-1.5 rounded-2xl border border-border p-3.5 text-[12.5px]">
            <li className="flex gap-2"><Package className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><b>{f.product}</b> — {f.price} {f.currency} · {t.kinds[f.kind]}</span></li>
            <li className="flex gap-2"><Palette className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="inline-flex items-center gap-1.5">{t.tones[f.tone]} <span className="inline-block size-3 rounded-full" style={{ background: f.color }} /></span></li>
            <li className="flex gap-2"><Banknote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span>{(Object.keys(f.pay) as PayKey[]).filter((k) => f.pay[k]).map((k) => t.pay[k]).join(" · ")}</span></li>
          </ul>
          <div className="rounded-2xl bg-secondary/70 p-3.5 text-[12.5px]">
            <p className="flex items-baseline justify-between gap-2"><span className="font-semibold">{t.cost}</span><span className="text-[15px] font-semibold tabular-nums">≈ {total} {lang === "fr" ? "crédits" : "credits"}</span></p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t.costDetail(STUDIO_COST.questions, STUDIO_COST.plan, STUDIO_COST.build)}</p>
            {(tier === null || tier < publishTier) && <p className="mt-2 text-[11.5px] text-muted-foreground">{t.planNote(packName(siteTier), packName(publishTier))}</p>}
          </div>
          <p className="text-[12px] text-muted-foreground">{t.after}</p>
          <details className="text-[11.5px] text-muted-foreground"><summary className="cursor-pointer select-none">{lang === "fr" ? "Voir le brief envoyé à Studio" : "See the brief sent to Studio"}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-secondary/60 p-3 font-sans">{brief}</pre></details>
        </>}

        {errors.length > 0 && <ul role="alert" className="space-y-0.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3.5 sm:px-6">
        <button type="button" onClick={() => (step ? go(step - 1) : onOpenChange(false))} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" />{t.back}</button>
        {step < 3
          ? <button type="button" onClick={() => go(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90">{t.next}<ArrowRight className="size-4" /></button>
          : <button type="button" onClick={build} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition hover:opacity-90"><Hammer className="size-4" />{t.build}</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
