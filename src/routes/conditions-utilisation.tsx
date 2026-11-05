import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BadgeCheck, Coins, FileLock2, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { tr } from "@/lib/i18n";

// Terms of use of TechNova AI Hub. The French text is the authoritative version; it follows how the service
// actually works (prepaid credits, server-side billing, plan gates, retention) — update it when those change.
export const Route = createFileRoute("/conditions-utilisation")({
  head: () => ({ meta: [
    { title: "Conditions d'utilisation — TechNova AI Hub" },
    { name: "description", content: "Les règles d'utilisation de TechNova AI Hub : compte, crédits Technova, paiements, contenus générés, usages interdits et responsabilités." },
    { property: "og:title", content: "Conditions d'utilisation — TechNova AI Hub" },
    { property: "og:description", content: "Ce que vous pouvez attendre de TechNova AI Hub, et ce que nous attendons de vous, en langage clair." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TermsPage,
});

const UPDATED = "5 novembre 2026";
const CONTACT = "support@technovaihub.com";

const sections = [
  ["objet", "Objet et acceptation"], ["service", "Le service"], ["compte", "Votre compte"], ["credits", "Crédits Technova et forfaits"],
  ["paiements", "Paiements"], ["contenus", "Vos contenus et les contenus générés"], ["ia", "Limites de l'intelligence artificielle"],
  ["interdits", "Usages interdits"], ["publication", "Sites publiés, partages et Registry"], ["api", "API et clés API"],
  ["propriete", "Propriété intellectuelle de TechNova"], ["disponibilite", "Disponibilité et évolutions"], ["suspension", "Suspension et résiliation"],
  ["responsabilite", "Responsabilité"], ["donnees", "Données personnelles"], ["droit", "Droit applicable et litiges"], ["modifications", "Modifications et contact"],
] as const;

const essentials = [
  { icon: Coins, title: "Crédits prépayés.", text: "Pas d'abonnement ni de renouvellement automatique. Vos crédits Technova n'expirent pas et ne sont débités qu'à l'usage." },
  { icon: FileLock2, title: "Vos contenus restent à vous.", text: "Vous gardez vos droits sur ce que vous créez. TechNova n'entraîne aucun modèle avec vos conversations, fichiers ou projets." },
  { icon: Sparkles, title: "L'IA peut se tromper.", text: "Les réponses sont générées automatiquement : vérifiez toujours les informations importantes avant de les utiliser." },
  { icon: ShieldCheck, title: "Un usage responsable.", text: "Pas de contenu illégal, de fraude ni d'atteinte aux droits d'autrui. Les abus peuvent entraîner la suspension du compte." },
  { icon: BadgeCheck, title: "Échecs remboursés.", text: "Si une génération échoue, les crédits réservés pour elle vous sont restitués automatiquement." },
  { icon: Scale, title: "Des règles claires.", text: "Ces conditions s'appliquent à tous les utilisateurs, en complément de notre politique de confidentialité." },
];

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-[28px] border border-border bg-card p-6 shadow-soft md:p-8">
    <span className="font-display text-xs font-semibold text-muted-foreground">{String(n).padStart(2, "0")}</span>
    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
    <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">{children}</div>
  </section>;
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-background/60 p-4"><h3 className="font-medium text-foreground">{title}</h3><p className="mt-1 text-[15px]">{children}</p></div>;
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="bg-card p-4"><dt className="text-xs uppercase tracking-[0.12em]">{k}</dt><dd className="mt-1 font-medium text-foreground">{v}</dd></div>)}</dl>;
}

function List({ items }: { items: ReactNode[] }) {
  return <ul className="space-y-2">{items.map((it, i) => <li key={i} className="flex gap-2.5 text-[15px]"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/60" /><span>{it}</span></li>)}</ul>;
}

function TermsPage() {
  const [lang, setLang] = useSiteLang();
  const mail = (a: string) => <a href={`mailto:${a}`}>{a}</a>;
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={tr(lang, { fr: "Conditions d'utilisation", en: "Terms of use", es: "Condiciones de uso", pt: "Termos de uso" })} title="Les règles du jeu, en clair." sub="Ce que vous pouvez attendre de TechNova AI Hub, et ce que nous attendons de vous. Ces conditions encadrent l'utilisation du site, de votre espace, des crédits Technova et de l'API.">
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-5 py-2.5 text-sm font-semibold"><a href="#objet">Lire les conditions</a></Button>
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass px-5 py-2.5 text-sm"><a href="#credits">Crédits et paiements</a></Button>
      </div>
      <p className="mt-6 text-xs text-ink-foreground/55">Dernière mise à jour : {UPDATED}{lang !== "fr" && " · " + tr(lang, { fr: "", en: "These terms are written in French; the French version is authoritative.", es: "Estas condiciones están redactadas en francés; la versión francesa es la vinculante.", pt: "Estes termos estão redigidos em francês; a versão francesa é a que prevalece." })}</p>
    </PageHero>

    <section className="px-4 pt-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">L'essentiel</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Six points à retenir.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{essentials.map((c) => <div key={c.title} className="h-full rounded-[22px] border border-border bg-card p-5 shadow-soft">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-ink-foreground"><c.icon className="size-[18px]" /></span>
            <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          </div>)}</div>
        <p className="mt-4 text-xs text-muted-foreground">Ce résumé ne remplace pas les conditions ci-dessous, qui seules font foi.</p>
      </div>
    </section>

    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <nav aria-label="Sommaire" className="sticky top-24 rounded-[22px] border border-border bg-card p-4 shadow-soft">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Sommaire</p>
          {sections.map(([id, title], i) => <a key={id} href={`#${id}`} className="flex gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"><span className="w-5 shrink-0 tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>{title}</a>)}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <Section id="objet" n={1} title="Objet et acceptation">
          <p>Les présentes conditions d'utilisation (les « Conditions ») régissent l'accès et l'utilisation de TechNova AI Hub, accessible sur technovaihub.com et dans son application installable (le « Service »), édité par <b>Dolapo ECOM LLC</b>, société enregistrée au Nouveau-Mexique (États-Unis), 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA (« TechNova », « nous »).</p>
          <p>En créant un compte, en achetant des crédits ou en utilisant le Service, y compris par l'API, vous acceptez ces Conditions ainsi que notre <a href="/confidentialite">politique de confidentialité</a> et notre <a href="/cookies">politique de cookies</a>. Si vous utilisez le Service pour le compte d'une organisation, vous déclarez être autorisé à l'engager. Si vous n'acceptez pas ces Conditions, n'utilisez pas le Service.</p>
          <Facts rows={[["Éditeur", "Dolapo ECOM LLC — 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA"], ["Contact", mail(CONTACT)]]} />
        </Section>

        <Section id="service" n={2} title="Le service">
          <p>TechNova AI Hub donne accès, depuis un seul compte, à des modèles d'intelligence artificielle fournis par des tiers, et aux outils construits autour :</p>
          <List items={[
            "le chat avec plusieurs modèles, dont TechNova Smart qui choisit automatiquement un modèle adapté, la recherche web et l'analyse de fichiers ;",
            "la génération d'images, de vidéos et de musique, et la modification d'images ;",
            "TechNova Studio, qui crée des sites et applications à partir d'une description, après validation d'un plan par vous, et leur publication ;",
            "les bases de connaissances, les agents personnalisés, l'Arena et le Registry de designs ;",
            "l'API, utilisable avec des clés API personnelles ;",
            "les connexions facultatives à GitHub, Google Drive, Notion ou à votre propre projet Supabase.",
          ]} />
          <p>Les fonctionnalités disponibles dépendent de votre forfait, tel que présenté sur la page <a href="/tarifs">Tarifs</a>. La liste des modèles proposés et leur prix en crédits figurent sur la page <a href="/modeles">Modèles</a> ; elle peut évoluer selon la disponibilité des fournisseurs.</p>
        </Section>

        <Section id="compte" n={3} title="Votre compte">
          <List items={[
            "Vous devez avoir l'âge de la majorité dans votre pays, ou utiliser le Service avec l'accord et sous la responsabilité d'un parent ou tuteur légal.",
            "Les informations fournies lors de l'inscription doivent être exactes et tenues à jour.",
            "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte. Prévenez-nous sans délai à " + CONTACT + " en cas d'utilisation non autorisée.",
            "Un compte est personnel : il ne peut être ni cédé, ni revendu, ni partagé de manière à contourner les limites de forfait.",
          ]} />
          <p>Vous pouvez supprimer vos conversations, fichiers et projets à tout moment depuis votre espace, et demander la suppression de votre compte à {mail(CONTACT)}.</p>
        </Section>

        <Section id="credits" n={4} title="Crédits Technova et forfaits">
          <div className="grid gap-3">
            <Sub title="Fonctionnement">L'utilisation du Service se paie en crédits Technova. Chaque requête débite un nombre de crédits qui dépend du modèle et du volume traité (texte, image, vidéo, musique), selon les prix affichés sur la page Modèles. Le solde et le détail de chaque mouvement sont consultables dans votre espace.</Sub>
            <Sub title="Packs prépayés">Les crédits s'achètent par packs, en paiement unique : il n'y a ni abonnement ni renouvellement automatique. Les crédits achetés n'ont pas de date d'expiration tant que votre compte existe.</Sub>
            <Sub title="Forfait">Votre forfait correspond au pack le plus élevé que vous avez acheté. Il détermine les fonctionnalités accessibles et certaines limites d'usage, détaillées sur la page Tarifs. Ces règles sont vérifiées par nos serveurs à chaque action.</Sub>
            <Sub title="Réservations et échecs">Pour certaines générations, des crédits sont réservés au lancement puis ajustés au coût réel. Si une génération échoue, les crédits réservés vous sont restitués automatiquement.</Sub>
            <Sub title="Crédits offerts">Les crédits offerts (bonus de bienvenue, gestes commerciaux) n'ont pas de valeur monétaire et ne peuvent être ni remboursés ni échangés.</Sub>
          </div>
          <p>Les crédits Technova ne sont ni une monnaie ni un moyen de paiement : ils ne peuvent pas être convertis en argent, revendus ou transférés hors du Service. Sauf erreur de facturation de notre part ou disposition légale impérative contraire, les crédits achetés ne sont pas remboursables. Pour toute réclamation, écrivez à {mail(CONTACT)} en indiquant la référence du paiement.</p>
        </Section>

        <Section id="paiements" n={5} title="Paiements">
          <p>Les prix des packs sont fixés et facturés en francs CFA (FCFA). Pour votre confort, ils peuvent être affichés dans la devise de votre pays : lorsqu'une conversion n'est pas fixe, le montant affiché est indicatif (signalé par « ≈ ») et seul le montant en FCFA est facturé.</p>
          <p>Les paiements par carte bancaire et Mobile Money sont traités par nos partenaires de paiement (Feexpay et Nyole), sur leurs pages sécurisées. Nous n'avons jamais accès à votre numéro de carte ni à votre code Mobile Money. Les crédits sont ajoutés à votre compte dès que le partenaire confirme le paiement ; un paiement non confirmé, annulé ou refusé n'ajoute aucun crédit. Les éventuels frais facturés par votre banque ou votre opérateur restent à votre charge.</p>
        </Section>

        <Section id="contenus" n={6} title="Vos contenus et les contenus générés">
          <List items={[
            <><b>Vos contenus</b> (instructions, fichiers, documents, projets) restent les vôtres. Vous nous accordez seulement le droit de les traiter, de les transmettre au modèle choisi et de les stocker dans la mesure nécessaire pour fournir le Service.</>,
            <><b>Les contenus générés</b> pour vous (textes, codes, images, vidéos, musiques, sites) vous appartiennent, dans la limite des droits des tiers et des conditions des fournisseurs de modèles. TechNova ne revendique aucun droit sur eux.</>,
            <><b>Aucun entraînement</b> : TechNova n'utilise pas vos conversations, fichiers, codes ou projets pour entraîner des modèles d'IA.</>,
            <>Vous garantissez disposer des droits nécessaires sur les contenus que vous importez, et vous restez responsable de l'usage que vous faites des contenus générés.</>,
            <>Les images, vidéos et musiques générées sont conservées <b>14 jours</b> sur nos serveurs, puis supprimées : téléchargez celles que vous souhaitez garder. Les liens d'aperçu du Studio expirent après 30 jours.</>,
          ]} />
        </Section>

        <Section id="ia" n={7} title="Limites de l'intelligence artificielle">
          <p>Les réponses et contenus sont produits automatiquement par des modèles d'IA. Ils peuvent être inexacts, incomplets, datés, biaisés ou ressembler à des contenus existants. Ils ne constituent pas un conseil professionnel, notamment médical, juridique, financier ou de sécurité.</p>
          <p>Vérifiez les informations importantes avant de les utiliser, relisez et testez le code et les sites générés avant de les mettre en production, et ne prenez pas de décision ayant des effets importants pour une personne sur la seule base d'un contenu généré. Le code SQL proposé par le Studio est fourni pour relecture : il n'est jamais exécuté automatiquement sur votre base de données.</p>
        </Section>

        <Section id="interdits" n={8} title="Usages interdits">
          <p>Vous vous engagez à ne pas utiliser le Service, directement ou par l'API, pour :</p>
          <List items={[
            "créer, diffuser ou stocker des contenus illégaux, haineux, violents, harcelants, diffamatoires, ou exploitant ou mettant en danger des mineurs ;",
            "tromper ou frauder : hameçonnage, fausses pages de connexion ou de paiement, usurpation d'identité ou de marque, arnaques, faux documents ou faux avis ;",
            "porter atteinte à la vie privée d'autrui ou aux droits de propriété intellectuelle de tiers ;",
            "produire des contenus intimes ou trompeurs (deepfakes) représentant une personne réelle sans son consentement ;",
            "développer des logiciels malveillants, mener des attaques ou contourner des mesures de sécurité ;",
            "perturber le Service : contournement des limites de forfait ou de facturation, création de comptes en masse, extraction automatisée, surcharge volontaire ;",
            "revendre ou mettre à disposition le Service ou vos clés API à des tiers sans notre accord écrit ;",
            "enfreindre les règles d'utilisation des fournisseurs des modèles utilisés.",
          ]} />
          <p>Les fichiers importés sont analysés pour des raisons de sécurité, et nous pouvons refuser ou retirer un contenu qui enfreint ces règles.</p>
        </Section>

        <Section id="publication" n={9} title="Sites publiés, partages et Registry">
          <List items={[
            "Un site publié avec TechNova Studio est accessible publiquement à son adresse. Vous en êtes l'éditeur et le seul responsable : contenu, mentions légales éventuelles, données collectées auprès de ses visiteurs.",
            "Toute personne peut signaler un site frauduleux ou abusif ; nous pouvons dépublier un site qui enfreint ces Conditions, sans préavis en cas d'urgence.",
            "Une conversation partagée est lisible par toute personne disposant du lien, jusqu'à ce que vous désactiviez le partage.",
            "Les designs officiels du Registry sont des créations de TechNova. Selon votre forfait, vous pouvez les utiliser et les modifier dans vos propres projets ; vous ne pouvez pas les revendre ou les redistribuer en tant que tels.",
          ]} />
        </Section>

        <Section id="api" n={10} title="API et clés API">
          <p>Les clés API sont personnelles et confidentielles : elles ne sont affichées qu'une seule fois, puis conservées sous forme hachée. Toute requête effectuée avec une de vos clés est débitée de votre solde de crédits. En cas de fuite, supprimez immédiatement la clé depuis votre espace et créez-en une nouvelle. Nous pouvons appliquer des limites de débit et désactiver une clé utilisée de manière abusive.</p>
        </Section>

        <Section id="propriete" n={11} title="Propriété intellectuelle de TechNova">
          <p>Le Service, son interface, ses textes, ses visuels, ses logos, la marque TechNova et ses designs officiels sont protégés et restent la propriété de TechNova ou de ses partenaires. Ces Conditions vous accordent seulement un droit personnel, non exclusif et non transférable d'utiliser le Service. Les noms et marques des modèles d'IA appartiennent à leurs fournisseurs respectifs.</p>
        </Section>

        <Section id="disponibilite" n={12} title="Disponibilité et évolutions">
          <p>Nous faisons notre possible pour que le Service soit disponible et fiable, sans pouvoir garantir une disponibilité continue : maintenance, incidents ou indisponibilité d'un fournisseur de modèles peuvent l'interrompre temporairement. Nous pouvons faire évoluer, ajouter ou retirer des fonctionnalités et des modèles ; en cas de retrait d'un modèle, vos crédits restent utilisables sur les autres modèles proposés.</p>
        </Section>

        <Section id="suspension" n={13} title="Suspension et résiliation">
          <p>Vous pouvez cesser d'utiliser le Service à tout moment et demander la suppression de votre compte.</p>
          <p>En cas de manquement à ces Conditions, de fraude, de risque pour la sécurité ou d'obligation légale, nous pouvons limiter, suspendre ou fermer un compte, une clé API ou un site publié. Sauf urgence ou interdiction légale, nous vous en informons et vous pouvez présenter vos observations à {mail(CONTACT)}. Les crédits d'un compte fermé pour fraude ou manquement grave ne sont pas remboursés.</p>
        </Section>

        <Section id="responsabilite" n={14} title="Responsabilité">
          <p>Le Service est fourni « en l'état ». Dans les limites permises par la loi applicable, TechNova n'est pas responsable des dommages indirects (perte de données non sauvegardées, de chiffre d'affaires ou d'opportunité), ni de l'usage que vous faites des contenus générés, ni des sites et contenus publiés par les utilisateurs, ni des services tiers que vous connectez.</p>
          <p>Dans les mêmes limites, notre responsabilité totale envers vous au titre du Service est plafonnée au montant que vous nous avez payé au cours des douze mois précédant le fait générateur. Rien dans ces Conditions ne limite les droits que vous accordent les dispositions impératives de protection des consommateurs de votre pays de résidence.</p>
          <p>Vous vous engagez à garantir TechNova contre toute réclamation de tiers résultant de votre violation de ces Conditions ou des droits d'autrui.</p>
        </Section>

        <Section id="donnees" n={15} title="Données personnelles">
          <p>Le traitement de vos données personnelles est décrit dans notre <a href="/confidentialite">politique de confidentialité</a> : données traitées, finalités, prestataires, durées de conservation et exercice de vos droits. L'usage des cookies et du stockage local est détaillé dans notre <a href="/cookies">politique de cookies</a>.</p>
        </Section>

        <Section id="droit" n={16} title="Droit applicable et litiges">
          <p>Ces Conditions sont régies par le droit de l'État du Nouveau-Mexique (États-Unis), sans préjudice des dispositions impératives plus protectrices du pays où vous résidez, notamment pour les consommateurs. En cas de difficulté, écrivez-nous d'abord à {mail(CONTACT)} : nous cherchons une solution amiable dans un délai de 30 jours. À défaut, le litige pourra être porté devant les juridictions compétentes.</p>
        </Section>

        <Section id="modifications" n={17} title="Modifications et contact">
          <p>Nous pouvons modifier ces Conditions pour tenir compte de l'évolution du Service ou de la réglementation. Toute modification importante sera signalée sur cette page, avec sa date d'entrée en vigueur, et par e-mail lorsqu'elle affecte vos droits. Continuer à utiliser le Service après cette date vaut acceptation des nouvelles Conditions. Si une clause était jugée invalide, les autres resteraient applicables.</p>
          <Facts rows={[["Contact", mail(CONTACT)], ["Éditeur", "Dolapo ECOM LLC"]]} />
        </Section>

        <p className="px-2 text-xs text-muted-foreground">Dolapo ECOM LLC · 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA · Dernière mise à jour : {UPDATED}</p>
      </div>
    </div>
    <Footer lang={lang} />
  </div>;
}
