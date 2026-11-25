import type { ReactNode } from "react";
import type { SiteLang } from "@/lib/i18n";

// Landing page band right after the hero: the payment methods TechNova really accepts (payment-routing.ts:
// FeexPay / Nyole Mobile Money operators and cards) scrolling by. Grey at rest; the hovered one shows its brand
// colours and a dark name. Marks are simplified drawings (no third-party logo files). Static with reduced motion.
// Only list a method once a provider route handles it (Airtel Money, M-Pesa and PayPal are not supported).

const title: Record<SiteLang, string> = { fr: "Moyens de paiement acceptés", en: "Accepted payment methods", es: "Medios de pago aceptados", pt: "Meios de pagamento aceitos" };

const box = "grid size-7 shrink-0 place-items-center overflow-hidden rounded-[8px]";
const methods: { name: string; mark: ReactNode }[] = [
  { name: "MTN MoMo", mark: <span className={`${box} bg-[#FFCC00]`}><svg viewBox="0 0 28 28" className="size-7" aria-hidden="true"><ellipse cx="14" cy="14" rx="10.5" ry="6.2" fill="none" stroke="#111" strokeWidth="1.6" /><text x="14" y="16.6" textAnchor="middle" fontSize="7.2" fontWeight="800" fontFamily="Arial, sans-serif" fill="#111">MTN</text></svg></span> },
  { name: "Wave", mark: <span className={`${box} bg-[#1DC8F2]`}><svg viewBox="0 0 28 28" className="size-6" aria-hidden="true"><ellipse cx="14" cy="15.5" rx="6.2" ry="8.2" fill="#111" /><ellipse cx="14" cy="17" rx="3.8" ry="5.6" fill="#fff" /><circle cx="12.4" cy="11" r="0.9" fill="#fff" /><circle cx="15.6" cy="11" r="0.9" fill="#fff" /><path d="M12.8 13.1h2.4l-1.2 1.4z" fill="#FFB400" /></svg></span> },
  { name: "Moov Money", mark: <span className={`${box} border border-black/10 bg-white`}><svg viewBox="0 0 28 28" className="size-5" aria-hidden="true"><path d="M14 3l4 7-4 4-4-4z" fill="#0058A8" /><path d="M25 14l-7 4-4-4 4-4z" fill="#F7941D" /><path d="M14 25l-4-7 4-4 4 4z" fill="#0058A8" /><path d="M3 14l7-4 4 4-4 4z" fill="#F7941D" /></svg></span> },
  { name: "Orange Money", mark: <span className={`${box} bg-[#FF7900]`}><svg viewBox="0 0 28 28" className="size-7" aria-hidden="true"><rect x="5" y="16.5" width="18" height="3" fill="#fff" /><text x="5.5" y="24" fontSize="4.6" fontWeight="700" fontFamily="Arial, sans-serif" fill="#fff">orange</text></svg></span> },
  { name: "Free Money", mark: <span className={`${box} bg-[#CD1E25]`}><svg viewBox="0 0 28 28" className="size-7" aria-hidden="true"><text x="14" y="17.5" textAnchor="middle" fontSize="8.4" fontWeight="800" fontStyle="italic" fontFamily="Arial, sans-serif" fill="#fff">free</text></svg></span> },
  { name: "Visa", mark: <span className={`${box} border border-black/10 bg-white`}><svg viewBox="0 0 28 28" className="size-7" aria-hidden="true"><text x="14" y="17" textAnchor="middle" fontSize="8.6" fontWeight="900" fontStyle="italic" fontFamily="Arial, sans-serif" fill="#1A1F71">VISA</text></svg></span> },
  { name: "Mastercard", mark: <span className={`${box} border border-black/10 bg-white`}><svg viewBox="0 0 28 28" className="size-6" aria-hidden="true"><circle cx="11" cy="14" r="6" fill="#EB001B" /><circle cx="17" cy="14" r="6" fill="#F79E1B" /><path d="M14 9.2a6 6 0 0 1 0 9.6a6 6 0 0 1 0-9.6z" fill="#FF5F00" /></svg></span> },
];

export function PaymentStrip({ lang }: { lang: SiteLang }) {
  // Enough copies to fill wide screens; the track moves by exactly half its width (two identical halves).
  const half = [...methods, ...methods];
  return <section aria-label={title[lang]} className="pay-strip border-y border-border/70 bg-background py-5">
    <h2 className="sr-only">{title[lang]}</h2>
    <div className="pay-mask relative overflow-hidden">
      <ul className="pay-track flex w-max items-center">
        {[...half, ...half].map((m, i) => <li key={`${m.name}-${i}`} aria-hidden={i >= methods.length} className="pay-item flex shrink-0 items-center gap-3 px-7">
          {m.mark}<span className="text-[16px] font-medium">{m.name}</span>
        </li>)}
      </ul>
    </div>
  </section>;
}
