import { BadgeCheck, CalendarClock, RotateCcw, Unlock } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";

// « Sans engagement » notice of the monthly formulas (public pricing, Tarifs et crédits, company plans):
// no automatic charge, stop any time, and this month's credits reset to zero at the end of the month.
const copy: Record<SiteLang, { title: string; points: string[]; short: string }> = {
  fr: {
    title: "Sans engagement",
    points: [
      "Aucun abonnement ni prélèvement automatique : vous payez un mois quand vous le décidez, par Mobile Money ou carte.",
      "Arrêtez quand vous voulez : sans renouvellement, la formule s'arrête simplement au bout de 30 jours, sans frais ni démarche.",
      "Les crédits du mois s'utilisent pendant ce mois : à la fin des 30 jours, ou dès que vous renouvelez, ceux qui restent repartent à zéro. Les packs à paiement unique, eux, n'expirent jamais.",
      "Un rappel vous prévient 5 jours avant la fin du mois.",
    ],
    short: "Sans engagement : aucun prélèvement automatique, vous renouvelez seulement si vous le souhaitez. Les crédits du mois repartent à zéro à la fin des 30 jours (ou au renouvellement) ; un rappel vous prévient 5 jours avant.",
  },
  en: {
    title: "No commitment",
    points: [
      "No subscription and no automatic charge: you pay for a month when you decide, by Mobile Money or card.",
      "Stop whenever you like: without a renewal, the plan simply ends after 30 days, with no fee and nothing to cancel.",
      "A month's credits are used during that month: after 30 days, or as soon as you renew, what is left goes back to zero. One-time packs never expire.",
      "A reminder comes 5 days before the month ends.",
    ],
    short: "No commitment: nothing is charged automatically, you renew only if you want to. A month's credits go back to zero after 30 days (or when you renew); a reminder comes 5 days before.",
  },
  es: {
    title: "Sin compromiso",
    points: [
      "Sin suscripción ni cobro automático: paga un mes cuando lo decida, por Mobile Money o tarjeta.",
      "Pare cuando quiera: sin renovación, la fórmula termina simplemente a los 30 días, sin gastos ni trámites.",
      "Los créditos del mes se usan durante ese mes: al cabo de 30 días, o en cuanto renueva, los que quedan vuelven a cero. Los packs de pago único no caducan nunca.",
      "Un aviso le llega 5 días antes del final del mes.",
    ],
    short: "Sin compromiso: ningún cobro automático, renueva solo si lo desea. Los créditos del mes vuelven a cero a los 30 días (o al renovar); un aviso le llega 5 días antes.",
  },
  pt: {
    title: "Sem compromisso",
    points: [
      "Sem assinatura nem cobrança automática: você paga um mês quando decidir, por Mobile Money ou cartão.",
      "Pare quando quiser: sem renovação, o plano simplesmente termina após 30 dias, sem taxas nem procedimentos.",
      "Os créditos do mês são usados durante esse mês: após 30 dias, ou assim que você renovar, o que sobrar volta a zero. Os pacotes de pagamento único nunca expiram.",
      "Um lembrete avisa 5 dias antes do fim do mês.",
    ],
    short: "Sem compromisso: nenhuma cobrança automática, você renova só se quiser. Os créditos do mês voltam a zero após 30 dias (ou ao renovar); um lembrete avisa 5 dias antes.",
  },
};

const icons = [Unlock, BadgeCheck, RotateCcw, CalendarClock];

export function NoCommitment({ lang, compact = false }: { lang: SiteLang; compact?: boolean }) {
  const t = copy[lang] ?? copy.fr;
  if (compact) return <p className="flex items-start gap-2 rounded-xl border border-emerald-600/25 bg-emerald-500/[0.06] px-3 py-2 text-[12px] leading-relaxed text-foreground/85"><Unlock className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{t.short}</p>;
  return <div className="no-commitment rounded-2xl border border-emerald-600/25 bg-emerald-500/[0.06] p-5 sm:p-6">
    <p className="flex items-center gap-2 font-display text-lg font-semibold"><span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-white"><Unlock className="size-4" /></span>{t.title}</p>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">{t.points.map((p, i) => { const Icon = icons[i] ?? BadgeCheck; return <li key={p} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-foreground/85"><Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />{p}</li>; })}</ul>
  </div>;
}
