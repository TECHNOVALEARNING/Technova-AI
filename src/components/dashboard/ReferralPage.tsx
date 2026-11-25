import { useEffect, useState } from "react";
import { Check, Copy, Gift, Link2, MailCheck, Share2, ShieldCheck, Ticket, Users } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REFERRAL_CREDITS, REFERRAL_MONTHLY_CAP, promoCodeLabel, redeemPromoCode, referralLink, type PromoResult } from "@/lib/referral";
import { notifyCreditsChanged } from "./TopActions";
import { useDashboard } from "./DashboardLayout";

// Parrainage: the account's referral link, ready to copy or send on WhatsApp, with what each side receives and
// the figures so far. Rewards are written by the server (claim_referral, migration 0049).

export function ReferralPage() {
  const { lang } = useDashboard();
  const fr = lang !== "en";
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ referred: number; this_month: number; credits: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const promoText: Record<PromoResult, [string, string]> = {
    ok: [`Code accepté : ${REFERRAL_CREDITS} crédits ajoutés à votre compte et à celui de votre parrain.`, `Code accepted: ${REFERRAL_CREDITS} credits added to your account and your referrer's.`],
    pending: ["Code enregistré : confirmez d'abord votre adresse e-mail, les crédits arriveront à votre prochaine visite.", "Code saved: confirm your e-mail first, the credits will arrive on your next visit."],
    invalid: ["Ce code n'existe pas. Vérifiez-le et réessayez.", "This code does not exist. Check it and try again."],
    self: ["Vous ne pouvez pas utiliser votre propre code.", "You cannot use your own code."],
    already: ["Votre compte a déjà utilisé un code promo ou un lien de parrainage.", "Your account has already used a promo code or referral link."],
    too_old: ["Les codes promo sont réservés aux comptes créés il y a moins de 7 jours.", "Promo codes are for accounts created less than 7 days ago."],
    limit: ["Ce code a atteint sa limite ce mois-ci. Réessayez le mois prochain.", "This code has reached its limit this month. Try again next month."],
  };
  async function applyPromo(e: React.FormEvent) {
    e.preventDefault(); if (!promo.trim()) return;
    setPromoBusy(true);
    const r = await redeemPromoCode(promo).catch((): PromoResult => "invalid");
    setPromoBusy(false);
    setPromoMsg({ ok: r === "ok" || r === "pending", text: promoText[r][fr ? 0 : 1] });
    if (r === "ok") { setPromo(""); notifyCreditsChanged(); }
  }
  const copyCode = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(promoCodeLabel(code)); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1800); } catch { toast.error(fr ? "Copie impossible : sélectionnez le code." : "Copy failed: select the code."); }
  };
  useEffect(() => {
    void supabase.rpc("my_referral_code").then(({ data }) => setCode(data ?? null));
    void supabase.rpc("my_referral_stats").then(({ data }) => setStats(data?.[0] ?? { referred: 0, this_month: 0, credits: 0 }));
  }, []);
  const link = code ? referralLink(code) : "";
  const message = fr
    ? `Je t'invite sur TechNova AI Hub : chat IA, images, vidéos, sites web, présentations et tableaux. Inscris-toi avec mon lien (ou le code promo ${code ? promoCodeLabel(code) : ""}) et on reçoit chacun ${REFERRAL_CREDITS} crédits offerts : ${link}`
    : `Join me on TechNova AI Hub: AI chat, pictures, videos, websites, presentations and spreadsheets. Sign up with my link (or the promo code ${code ? promoCodeLabel(code) : ""}) and we each get ${REFERRAL_CREDITS} free credits: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { toast.error(fr ? "Copie impossible : sélectionnez le lien." : "Copy failed: select the link."); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "TechNova AI Hub", text: message, url: link }); return; } catch { /* cancelled */ } }
    void copy();
  };
  const steps = fr
    ? [[Share2, "Partagez votre lien", "Par WhatsApp, e-mail ou sur vos réseaux."], [MailCheck, "Votre ami s'inscrit", "Avec votre lien, puis il confirme son adresse e-mail."], [Gift, `${REFERRAL_CREDITS} crédits chacun`, "Ils arrivent sur les deux comptes dès sa première visite du tableau de bord."]] as const
    : [[Share2, "Share your link", "On WhatsApp, by e-mail or on social media."], [MailCheck, "Your friend signs up", "With your link, then confirms their e-mail address."], [Gift, `${REFERRAL_CREDITS} credits each`, "They reach both accounts on their first visit to the dashboard."]] as const;
  return <div className="mx-auto max-w-[980px] space-y-4">
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="bg-gradient-to-br from-[#0b1430] via-[#13234f] to-[#1e3a8a] px-6 py-8 text-white">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80"><Gift className="size-3.5" />{fr ? "Parrainage" : "Referrals"}</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight">{fr ? `Invitez vos amis : ${REFERRAL_CREDITS} crédits pour vous, ${REFERRAL_CREDITS} pour eux` : `Invite your friends: ${REFERRAL_CREDITS} credits for you, ${REFERRAL_CREDITS} for them`}</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] opacity-90">{fr ? "Chaque ami qui crée son compte avec votre lien ou votre code promo et confirme son e-mail vous rapporte des crédits, et lui en offre autant." : "Every friend who creates an account with your link and confirms their e-mail earns you credits, and gets the same."}</p>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Votre lien de parrainage" : "Your referral link"}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5"><Link2 className="size-4 shrink-0 text-muted-foreground" /><span className="truncate font-mono text-[13px]">{link || (fr ? "Préparation du lien…" : "Preparing your link…")}</span></div>
          <button type="button" disabled={!link} onClick={() => void copy()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-[13px] font-semibold hover:bg-secondary disabled:opacity-50">{copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}{copied ? (fr ? "Copié" : "Copied") : (fr ? "Copier" : "Copy")}</button>
          <a href={link ? `https://wa.me/?text=${encodeURIComponent(message)}` : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!link} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#15803d] px-5 text-[13px] font-semibold text-white transition hover:bg-[#166534]"><FontAwesomeIcon icon={faWhatsapp} className="size-4" />WhatsApp</a>
          <button type="button" disabled={!link} onClick={() => void share()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-[13px] font-semibold hover:bg-secondary disabled:opacity-50"><Share2 className="size-4" />{fr ? "Partager" : "Share"}</button>
        </div>
        {/* Promo code: the same code as the link, easy to dictate or type at sign-up (« Code promo » field). */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Votre code promo" : "Your promo code"}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-dashed border-[#1e3a8a]/50 bg-[#1e3a8a]/[0.05] px-4"><Ticket className="size-4 shrink-0 text-[#1e3a8a] dark:text-blue-300" /><span className="truncate font-mono text-[15px] font-bold tracking-[0.2em]">{code ? promoCodeLabel(code) : "…"}</span></span>
              <button type="button" disabled={!code} onClick={() => void copyCode()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-[13px] font-semibold hover:bg-secondary disabled:opacity-50">{codeCopied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}{codeCopied ? (fr ? "Copié" : "Copied") : (fr ? "Copier" : "Copy")}</button>
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">{fr ? "Votre ami le saisit à l'inscription : même récompense qu'avec le lien." : "Your friend types it at sign-up: same reward as with the link."}</p>
          </div>
          <form onSubmit={(e) => void applyPromo(e)}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Vous avez reçu un code ?" : "Got a code?"}</p>
            <div className="mt-2 flex items-center gap-2">
              <input value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoMsg(null); }} maxLength={16} placeholder={fr ? "Ex. : 3F9A12BC" : "e.g. 3F9A12BC"} aria-label={fr ? "Code promo reçu" : "Promo code received"} className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 font-mono text-[14px] tracking-[0.15em] outline-none focus:border-foreground/40" />
              <button type="submit" disabled={promoBusy || !promo.trim()} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-[13px] font-semibold text-background disabled:opacity-50">{fr ? "Utiliser" : "Apply"}</button>
            </div>
            {promoMsg ? <p className={`mt-1.5 text-[12px] ${promoMsg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{promoMsg.text}</p>
              : <p className="mt-1.5 text-[12px] text-muted-foreground">{fr ? "Pour les comptes créés il y a moins de 7 jours, une seule fois." : "For accounts created less than 7 days ago, once."}</p>}
          </form>
        </div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      {([[Users, fr ? "Amis parrainés" : "Friends referred", stats?.referred], [Gift, fr ? "Crédits gagnés" : "Credits earned", stats?.credits], [ShieldCheck, fr ? "Ce mois-ci" : "This month", stats ? `${stats.this_month} / ${REFERRAL_MONTHLY_CAP}` : undefined]] as [typeof Users, string, string | number | undefined][]).map(([I, label, value], i) =>
        <div key={i} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-[12px] text-muted-foreground"><span className="grid size-7 place-items-center rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] dark:text-blue-300"><I className="size-3.5" /></span>{label}</div><p className="mt-2 font-display text-[26px] font-semibold tabular-nums">{value ?? "—"}</p></div>)}
    </div>

    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="font-display text-[15px] font-semibold">{fr ? "Comment ça marche" : "How it works"}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">{steps.map(([I, t, d], i) => <li key={t} className="rounded-xl bg-secondary/60 p-4">
        <span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#13234f] text-[12px] font-bold text-white">{i + 1}</span><I className="size-4 text-muted-foreground" /></span>
        <p className="mt-2 text-[13.5px] font-semibold">{t}</p><p className="mt-0.5 text-[12px] text-muted-foreground">{d}</p>
      </li>)}</ol>
      <ul className="mt-4 space-y-1.5 text-[12px] text-muted-foreground">
        <li>• {fr ? `Le filleul doit être un nouveau compte (moins de 7 jours) avec une adresse e-mail confirmée ; un compte ne peut être parrainé qu'une fois.` : `The friend must be a new account (less than 7 days old) with a confirmed e-mail; an account can be referred only once.`}</li>
        <li>• {fr ? `Jusqu'à ${REFERRAL_MONTHLY_CAP} filleuls récompensés par mois et par compte. Se parrainer soi-même ou créer de faux comptes est interdit et peut entraîner la suspension.` : `Up to ${REFERRAL_MONTHLY_CAP} rewarded referrals per month per account. Referring yourself or creating fake accounts is forbidden and may lead to suspension.`}</li>
        <li>• {fr ? "Les crédits de parrainage s'utilisent comme les autres et n'expirent pas." : "Referral credits work like any other credits and do not expire."}</li>
      </ul>
    </div>
  </div>;
}
