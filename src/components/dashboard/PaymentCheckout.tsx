import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, Lock, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkPayment, startCheckout } from "@/lib/payments.functions";
import { FEEXPAY_COUNTRIES, OTHER, type PayMethod } from "@/lib/payment-routing";

type Pack = { slug: string; name: string; price_xof: number; credits: number };
const CARD_COUNTRIES = [...FEEXPAY_COUNTRIES.map((c) => [c.code, c.fr, c.en] as const), ["CM", "Cameroun", "Cameroon"], ["GA", "Gabon", "Gabon"], ["ML", "Mali", "Mali"], ["NE", "Niger", "Niger"], ["GN", "Guinée", "Guinea"], ["FR", "France", "France"], ["BE", "Belgique", "Belgium"], ["CA", "Canada", "Canada"], ["US", "États-Unis", "United States"]] as const;

/**
 * Checkout for one pack: card or Mobile Money (country, operator, number). The server picks the provider
 * (FeexPay first, Nyole otherwise) and returns a page to open or a payment to confirm on the phone.
 */
export function PaymentCheckout({ pack, lang, country, onClose, onPaid }: { pack: Pack | null; lang: "fr" | "en"; country: string | null; onClose: () => void; onPaid: (r: { pack: string | null; credits: number | null }) => void }) {
  const fr = lang === "fr";
  const start = useServerFn(startCheckout); const check = useServerFn(checkPayment);
  const known = FEEXPAY_COUNTRIES.some((c) => c.code === country);
  const [method, setMethod] = useState<PayMethod>("momo");
  const [cc, setCc] = useState<string>(known && country ? country : FEEXPAY_COUNTRIES[0]!.code);
  const [net, setNet] = useState<string>("");
  const [phone, setPhone] = useState(""); const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [waiting, setWaiting] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const countryInfo = FEEXPAY_COUNTRIES.find((c) => c.code === cc);
  const networks = countryInfo?.networks ?? [];
  useEffect(() => { setNet(networks[0]?.id ?? OTHER); }, [cc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { if (!pack) { setWaiting(null); setError(""); setBusy(false); } }, [pack]);

  const viaHosted = method === "momo" && (cc === OTHER || net === OTHER);
  const needsPhone = !viaHosted;
  const ready = !busy && (!needsPhone || phone.replace(/\D/g, "").length >= 8) && (method !== "card" || city.trim().length > 1);
  const price = useMemo(() => pack ? `${pack.price_xof.toLocaleString("fr-FR")} FCFA` : "", [pack]);

  function poll(id: string, tries = 0) {
    timer.current = window.setTimeout(async () => {
      try {
        const r = await check({ data: { id } });
        if (r.status === "success") { setWaiting(null); onPaid({ pack: r.pack, credits: r.credits }); return; }
        if (r.status === "failed") { setWaiting(null); setBusy(false); setError(fr ? "Le paiement a été refusé ou annulé sur le téléphone. Vous pouvez réessayer." : "The payment was declined or cancelled on the phone. You can try again."); return; }
      } catch { /* keep waiting */ }
      if (tries < 80) poll(id, tries + 1);
      else { setWaiting(null); setBusy(false); setError(fr ? "Toujours en attente. Si vous avez validé, vos crédits arriveront dans quelques minutes." : "Still pending. If you approved it, your credits will arrive within minutes."); }
    }, 3000);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault(); if (!pack || !ready) return;
    setBusy(true); setError("");
    // Card pages have no return link: open them in a new tab (opened now, on the click) and wait here.
    const cardTab = method === "card" ? window.open("about:blank", "_blank") : null;
    try {
      const r = await start({ data: method === "card"
        ? { slug: pack.slug, method, country: cc === OTHER ? "BJ" : cc, phone, city }
        : viaHosted ? { slug: pack.slug, method } : { slug: pack.slug, method, country: cc, network: net, phone } });
      if ("url" in r) {
        if (cardTab) { cardTab.location.href = r.url; setWaiting(r.paymentId); poll(r.paymentId); return; }
        window.location.href = r.url; return;
      }
      setWaiting(r.pendingId); poll(r.pendingId);
    } catch {
      cardTab?.close();
      setBusy(false);
      setError(fr ? "Le paiement n'a pas pu démarrer. Réessayez dans un instant." : "The payment could not start. Try again shortly.");
    }
  }

  const tab = (on: boolean) => `flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-colors ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
  const sel = "h-10 w-full rounded-xl border border-input bg-background px-3 text-[13px]";
  return <Dialog open={!!pack} onOpenChange={(o) => { if (!o && !waiting) onClose(); }}>
    <DialogContent className="max-w-[440px] rounded-[24px] p-6 sm:rounded-[24px]">
      <DialogHeader>
        <DialogTitle className="font-display text-lg">{waiting ? (method === "card" ? (fr ? "Finalisez le paiement par carte" : "Complete the card payment") : (fr ? "Confirmez sur votre téléphone" : "Confirm on your phone")) : (fr ? `Pack ${pack?.name ?? ""}` : `${pack?.name ?? ""} pack`)}</DialogTitle>
        <DialogDescription>{waiting ? (method === "card" ? (fr ? "La page de paiement sécurisée s'est ouverte dans un nouvel onglet. Saisissez-y votre carte, puis revenez ici." : "The secure payment page opened in a new tab. Enter your card there, then come back here.") : (fr ? "Une demande de paiement a été envoyée. Validez-la avec votre code secret Mobile Money." : "A payment request was sent. Approve it with your Mobile Money PIN.")) : `${price} · ${pack?.credits.toLocaleString(fr ? "fr-FR" : "en-US")} ${fr ? "crédits Technova" : "Technova credits"}`}</DialogDescription>
      </DialogHeader>

      {waiting ? <div className="grid place-items-center gap-3 py-6 text-center">
        <span className="relative grid size-16 place-items-center rounded-full bg-secondary">{method === "card" ? <CreditCard className="size-7" /> : <Smartphone className="size-7" />}<Loader2 className="absolute -right-1 -top-1 size-6 animate-spin text-primary" /></span>
        <p className="text-sm text-muted-foreground">{fr ? "Gardez cette fenêtre ouverte : elle se met à jour dès la confirmation." : "Keep this window open: it updates as soon as you confirm."}</p>
      </div> : <form onSubmit={pay} className="grid gap-4">
        <div className="flex gap-1 rounded-full bg-secondary p-1" role="tablist">
          <button type="button" role="tab" aria-selected={method === "momo"} className={tab(method === "momo")} onClick={() => setMethod("momo")}><Smartphone className="size-4" />Mobile Money</button>
          <button type="button" role="tab" aria-selected={method === "card"} className={tab(method === "card")} onClick={() => setMethod("card")}><CreditCard className="size-4" />{fr ? "Carte bancaire" : "Card"}</button>
        </div>

        {method === "momo" ? <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[12px] font-medium">{fr ? "Pays" : "Country"}
              <select className={sel} value={cc} onChange={(e) => setCc(e.target.value)}>
                {FEEXPAY_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{fr ? c.fr : c.en}</option>)}
                <option value={OTHER}>{fr ? "Autre pays" : "Other country"}</option>
              </select></label>
            <label className="grid gap-1 text-[12px] font-medium">{fr ? "Opérateur" : "Operator"}
              <select className={sel} value={net} disabled={cc === OTHER} onChange={(e) => setNet(e.target.value)}>
                {networks.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                <option value={OTHER}>{fr ? "Autre opérateur" : "Other operator"}</option>
              </select></label>
          </div>
          {needsPhone ? <label className="grid gap-1 text-[12px] font-medium">{fr ? "Numéro Mobile Money" : "Mobile Money number"}
            <div className="flex items-center gap-2"><span className="grid h-10 shrink-0 place-items-center rounded-xl border border-input bg-secondary px-3 text-[13px]">+{countryInfo?.dial}</span>
              <Input inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={cc === "BJ" ? "01 97 00 00 00" : "07 00 00 00 00"} className="h-10 rounded-xl" /></div></label>
            : <p className="rounded-xl bg-secondary px-3 py-2.5 text-[12.5px] text-muted-foreground">{fr ? "Vous choisirez votre opérateur sur la page de paiement sécurisée." : "You will pick your operator on the secure payment page."}</p>}
        </> : <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[12px] font-medium">{fr ? "Pays" : "Country"}
              <select className={sel} value={cc === OTHER ? "BJ" : cc} onChange={(e) => setCc(e.target.value)}>
                {CARD_COUNTRIES.map(([code, f, en]) => <option key={code} value={code}>{fr ? f : en}</option>)}
              </select></label>
            <label className="grid gap-1 text-[12px] font-medium">{fr ? "Ville" : "City"}<Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" className="h-10 rounded-xl" /></label>
          </div>
          <label className="grid gap-1 text-[12px] font-medium">{fr ? "Téléphone" : "Phone"}<Input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 01 97 00 00 00" className="h-10 rounded-xl" /></label>
          <p className="rounded-xl bg-secondary px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            <span className="mb-1.5 flex items-center gap-1.5"><span className="rounded-md bg-[#1a1f71] px-1.5 py-0.5 text-[10px] font-bold italic text-white">VISA</span><span className="flex items-center rounded-md bg-background px-1.5 py-0.5"><i className="size-3 rounded-full bg-[#eb001b]" /><i className="-ml-1.5 size-3 rounded-full bg-[#f79e1b]/90" /></span></span>
            {fr ? "Le numéro, la date et le code de votre carte se saisissent à l'étape suivante, sur la page sécurisée de notre partenaire (3-D Secure). TechNova ne les voit jamais. Le téléphone et la ville sont demandés par la banque pour vérifier le paiement." : "Your card number, expiry and code are entered at the next step, on our partner's secure page (3-D Secure). TechNova never sees them. Phone and city are required by the bank to verify the payment."}
          </p>
        </>}

        {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
        <Button type="submit" disabled={!ready} className="h-11 rounded-full">{busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}{method === "card" ? (fr ? `Continuer vers le paiement · ${price}` : `Continue to payment · ${price}`) : (fr ? `Payer ${price}` : `Pay ${price}`)}</Button>
        <p className="text-center text-[11px] text-muted-foreground">{fr ? "Paiement sécurisé · Technova PAY. Nous ne voyons ni votre carte ni votre code." : "Secure payment · Technova PAY. We never see your card or PIN."}</p>
      </form>}
    </DialogContent>
  </Dialog>;
}
