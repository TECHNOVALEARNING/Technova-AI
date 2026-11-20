import type { ReactNode } from "react";
import { Building2, Check, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";
import { orgFeatureGroups, orgPlans } from "@/lib/org-features";

// Feature guides, part 7 (documentation 1.8): the company plans TechNova Team and TechNova Entreprise
// (administrator, sub-accounts, shared credits, allowed features, dashboard). Prices, credits and seats are read
// from org-features.ts; update with OrganizationPage, organization.functions.ts and migration 0057.

type G7 = { title: string; intro: string; head: [string, string, string, string]; steps: string[]; features: string; dash: string; credits: string };
const n = (v: number, l: SiteLang) => v.toLocaleString(l === "en" ? "en-US" : l === "pt" ? "pt-BR" : l === "es" ? "es-ES" : "fr-FR");

const g7 = (l: SiteLang): G7 => (({
  fr: {
    title: "Forfaits entreprise : Team et Entreprise", intro: "Pour une équipe, une école ou une entreprise : un seul paiement mensuel, un compte administrateur et des sous-comptes qui partagent les mêmes crédits. Sur la page Tarifs, le bouton « Détails » de l'encadré Entreprise présente les deux forfaits.",
    head: ["Forfait", "Prix par mois", "Crédits partagés", "Comptes"],
    steps: ["Achetez TechNova Team ou TechNova Entreprise depuis Tarifs et crédits : votre compte devient l'administrateur de l'entreprise.", "Ouvrez « Entreprise » dans le menu, puis ajoutez vos collaborateurs par adresse e-mail : un compte TechNova existant reçoit une invitation dans son tableau de bord, une nouvelle adresse reçoit un e-mail pour créer son mot de passe.", "Chaque membre utilise les crédits de l'entreprise et toutes les fonctions du forfait Pro, sauf celles que vous décochez.", "Retirez un membre à tout moment : son compte et ses créations restent les siens."],
    features: "Fonctions autorisées : tout est coché au départ. L'administrateur décoche ce dont l'entreprise n'a pas besoin ; les membres ne le voient plus et le serveur le refuse. Le chat reste toujours disponible et l'administrateur garde tout.",
    dash: "Le tableau de bord de l'entreprise affiche les crédits disponibles, ceux utilisés ce mois, les comptes occupés, les jours restants, la consommation jour par jour (7, 30 ou 90 jours), la répartition par fonction, la consommation et la dernière activité de chaque membre, et le journal des actions (ajouts, retraits, réglages).",
    credits: "Comme les formules mensuelles, sans engagement : rien n'est prélevé automatiquement, et les crédits du mois repartent à zéro au bout de 30 jours ou au renouvellement. Sans renouvellement, les membres repassent sur leur propre solde.",
  },
  en: {
    title: "Company plans: Team and Entreprise", intro: "For a team, a school or a company: one monthly payment, an administrator account and sub-accounts sharing the same credits. On the Pricing page, the « Details » button of the Company box presents both plans.",
    head: ["Plan", "Price per month", "Shared credits", "Accounts"],
    steps: ["Buy TechNova Team or TechNova Entreprise from Pricing & credits: your account becomes the company administrator.", "Open « Company » in the menu, then add your colleagues by e-mail: an existing TechNova account gets an invitation in its dashboard, a new address gets an e-mail to set its password.", "Every member uses the company's credits and every Pro feature, except those you untick.", "Remove a member at any time: their account and creations stay theirs."],
    features: "Allowed features: everything is ticked at first. The administrator unticks what the company does not need; members no longer see it and the server refuses it. The chat always stays available and the administrator keeps everything.",
    dash: "The company dashboard shows the credits available, those used this month, the seats taken, the days left, day-by-day usage (7, 30 or 90 days), the split by feature, each member's usage and last activity, and the action log (additions, removals, settings).",
    credits: "Like the monthly plans, no commitment: nothing is charged automatically, and the month's credits go back to zero after 30 days or on renewal. Without a renewal, members go back to their own balance.",
  },
  es: {
    title: "Planes para empresas: Team y Entreprise", intro: "Para un equipo, una escuela o una empresa: un solo pago mensual, una cuenta de administrador y subcuentas que comparten los mismos créditos. En la página de Precios, el botón « Detalles » del recuadro Empresa presenta los dos planes.",
    head: ["Plan", "Precio al mes", "Créditos compartidos", "Cuentas"],
    steps: ["Compre TechNova Team o TechNova Entreprise desde Precios y créditos: su cuenta pasa a ser la administradora.", "Abra « Empresa » en el menú y añada a sus colaboradores por e-mail: una cuenta existente recibe una invitación en su panel, una dirección nueva recibe un e-mail para crear su contraseña.", "Cada miembro usa los créditos de la empresa y todas las funciones del plan Pro, salvo las que usted desmarque.", "Quite a un miembro cuando quiera: su cuenta y sus creaciones siguen siendo suyas."],
    features: "Funciones permitidas: todo viene marcado. El administrador desmarca lo que la empresa no necesita; los miembros dejan de verlo y el servidor lo rechaza. El chat siempre está disponible y el administrador lo conserva todo.",
    dash: "El panel de la empresa muestra los créditos disponibles, los usados este mes, las cuentas ocupadas, los días restantes, el consumo diario (7, 30 o 90 días), el reparto por función, el consumo y la última actividad de cada miembro, y el registro de acciones.",
    credits: "Como las fórmulas mensuales, sin compromiso: no hay cobro automático y los créditos del mes vuelven a cero a los 30 días o al renovar. Sin renovación, los miembros vuelven a su propio saldo.",
  },
  pt: {
    title: "Planos para empresas: Team e Entreprise", intro: "Para uma equipe, uma escola ou uma empresa: um único pagamento mensal, uma conta de administrador e subcontas que compartilham os mesmos créditos. Na página de Preços, o botão « Detalhes » do quadro Empresa apresenta os dois planos.",
    head: ["Plano", "Preço por mês", "Créditos compartilhados", "Contas"],
    steps: ["Compre o TechNova Team ou o TechNova Entreprise em Preços e créditos: sua conta passa a ser a administradora.", "Abra « Empresa » no menu e adicione seus colegas por e-mail: uma conta existente recebe um convite no painel, um endereço novo recebe um e-mail para criar a senha.", "Cada membro usa os créditos da empresa e todas as funções do plano Pro, exceto as que você desmarcar.", "Remova um membro quando quiser: a conta e as criações continuam sendo dele."],
    features: "Funções permitidas: tudo vem marcado. O administrador desmarca o que a empresa não precisa; os membros deixam de ver e o servidor recusa. O chat continua sempre disponível e o administrador mantém tudo.",
    dash: "O painel da empresa mostra os créditos disponíveis, os usados no mês, as contas ocupadas, os dias restantes, o consumo diário (7, 30 ou 90 dias), a divisão por função, o consumo e a última atividade de cada membro e o registro de ações.",
    credits: "Como os planos mensais, sem compromisso: nada é cobrado automaticamente e os créditos do mês voltam a zero após 30 dias ou na renovação. Sem renovação, os membros voltam ao próprio saldo.",
  },
}) satisfies Record<SiteLang, G7>)[l];

const p = "mt-3 leading-relaxed text-muted-foreground";

export function featureGuideBlocks7(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const g = g7(lang);
  const en = lang === "en";
  return [{ id: "entreprise", title: g.title, body: <>
    <p className={p}>{g.intro}</p>
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground"><tr>{g.head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
      <tbody>{orgPlans.map((o) => <tr key={o.slug} className="border-t border-border"><td className="px-3 py-2 font-semibold">{o.name}</td><td className="px-3 py-2 tabular-nums">{n(o.price, lang)} FCFA</td><td className="px-3 py-2 tabular-nums">{n(o.credits, lang)}</td><td className="px-3 py-2 tabular-nums">{o.seats}</td></tr>)}</tbody></table></div>
    <ol className="mt-4 space-y-2">{g.steps.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#12306f] text-[11px] font-semibold text-white">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>
    <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1d4ed8]" /><span>{g.features}</span></p>
    <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-hidden="true">{orgFeatureGroups.map((grp) => <div key={grp.fr} className="rounded-2xl border border-border bg-card p-3"><p className="text-xs font-semibold">{en ? grp.en : grp.fr}</p><ul className="mt-2 space-y-1">{grp.items.map((i) => <li key={i.key} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><Check className="size-3 text-[#1d4ed8]" />{en ? i.en : i.fr}</li>)}</ul></div>)}</div>
    <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><LayoutDashboard className="mt-0.5 size-4 shrink-0 text-[#1d4ed8]" /><span>{g.dash}</span></p>
    <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><Users className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>{g.credits}</span></p>
    <span className="sr-only"><Building2 /></span>
  </> }];
}
