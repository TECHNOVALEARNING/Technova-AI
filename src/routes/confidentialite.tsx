import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Ban, CreditCard, EyeOff, FileLock2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { tr } from "@/lib/i18n";

// Privacy policy of TechNova AI Hub. The French text is the authoritative version.
export const Route = createFileRoute("/confidentialite")({
  head: () => ({ meta: [
    { title: "Politique de confidentialité — TechNova AI Hub" },
    { name: "description", content: "Quelles données TechNova AI Hub traite, pourquoi, avec qui, combien de temps, et comment exercer vos droits." },
    { property: "og:title", content: "Politique de confidentialité — TechNova AI Hub" },
    { property: "og:description", content: "Nous collectons le minimum et protégeons le maximum : la politique de confidentialité de TechNova AI Hub, en langage clair." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PrivacyPage,
});

const UPDATED = "29 octobre 2026";
// Single contact address for privacy questions and data-protection requests.
const CONTACT = "support@technovaihub.com";

const sections = [
  ["responsable", "Responsable du traitement"], ["donnees", "Données que nous traitons"], ["finalites", "Finalités du traitement"],
  ["bases", "Bases légales"], ["prestataires", "Hébergement et prestataires"], ["conservation", "Durées de conservation"],
  ["droits", "Vos droits"], ["cookies", "Cookies et stockage local"], ["securite", "Sécurité"], ["ia", "Intelligence artificielle"],
  ["public", "Contenus que vous rendez publics"], ["transferts", "Transferts internationaux"], ["modifications", "Modifications et contact"],
] as const;

const commitments = [
  { icon: Lock, title: "Chiffré, toujours.", text: "Vos données sont chiffrées en transit et au repos. Les mots de passe et les clés API sont hachés : personne dans l'équipe ne peut les lire." },
  { icon: Ban, title: "Jamais vendues.", text: "Nous ne vendons pas vos données, à personne. Seuls les prestataires strictement nécessaires au service y accèdent." },
  { icon: EyeOff, title: "Pas de publicité.", text: "Aucune publicité tierce, aucun profilage publicitaire. Vos échanges avec l'IA ne servent pas à vous suivre." },
  { icon: FileLock2, title: "Vos contenus restent les vôtres.", text: "TechNova n'entraîne aucun modèle d'IA avec vos conversations, fichiers, codes ou projets." },
  { icon: CreditCard, title: "Paiements chez nos partenaires.", text: "Les paiements passent par Nyole / Feexpay. Nous ne voyons ni votre numéro de carte, ni votre code Mobile Money." },
  { icon: Send, title: "Le strict nécessaire.", text: "Seul le contenu utile à votre demande est transmis au modèle que vous utilisez, et rien d'autre." },
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

function PrivacyPage() {
  const [lang, setLang] = useSiteLang();
  const mail = (a: string) => <a href={`mailto:${a}`}>{a}</a>;
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={tr(lang, { fr: "Confidentialité", en: "Privacy", es: "Privacidad", pt: "Privacidade" })} title="Votre vie privée, protégée." sub="Nous collectons le minimum et protégeons le maximum. Cette page explique, en langage clair, quelles données nous traitons, pourquoi, avec qui, et quels sont vos droits.">
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-5 py-2.5 text-sm font-semibold"><a href="#responsable">Lire la politique</a></Button>
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass px-5 py-2.5 text-sm"><a href="#droits">Exercer vos droits</a></Button>
      </div>
      <p className="mt-6 text-xs text-ink-foreground/55">Dernière mise à jour : {UPDATED}{lang !== "fr" && " · " + tr(lang, { fr: "", en: "This policy is written in French; the French version is authoritative.", es: "Esta política está redactada en francés; la versión francesa es la vinculante.", pt: "Esta política está redigida em francês; a versão francesa é a que prevalece." })}</p>
    </PageHero>

    <section className="px-4 pt-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Nos engagements</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Des promesses simples, et tenues.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{commitments.map((c) => <div key={c.title} className="h-full rounded-[22px] border border-border bg-card p-5 shadow-soft">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-ink-foreground"><c.icon className="size-[18px]" /></span>
            <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          </div>)}</div>
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
        <Section id="responsable" n={1} title="Responsable du traitement">
          <p>Le responsable du traitement des données personnelles collectées via TechNova AI Hub est <b>Dolapo ECOM LLC</b>, société enregistrée au Nouveau-Mexique (États-Unis), dont le siège social est situé au 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA. À ce titre, nous déterminons les finalités et les moyens des traitements décrits ici. Cette politique s'applique notamment, pour nos utilisateurs au Bénin, dans le cadre de la loi n° 2017-20 portant Code du numérique et, pour les personnes situées dans l'Union européenne, du Règlement général sur la protection des données (RGPD).</p>
          <Facts rows={[["Responsable", "Dolapo ECOM LLC — 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA"], ["Service", "TechNova AI Hub — plateforme d'accès aux modèles d'IA : chat, création de sites, images, vidéos, musique et API"], ["Contact vie privée", mail(CONTACT)], ["Délégué à la protection des données", "Cédric Toudonou"]]} />
          <p>Pour toute question sur cette politique ou pour exercer vos droits, écrivez en priorité à notre délégué à la protection des données. Nous répondons sous 30 jours au plus.</p>
        </Section>

        <Section id="donnees" n={2} title="Données que nous traitons">
          <p>Nous appliquons un principe strict de minimisation : nous ne traitons que les données nécessaires au fonctionnement du service, à la sécurité des comptes et au respect de nos obligations légales.</p>
          <div className="grid gap-3">
            <Sub title="Données de compte">Nom, adresse e-mail, mot de passe (haché par notre prestataire d'authentification, jamais lisible), langue et préférences d'affichage. Si vous vous connectez avec Google : les nom, e-mail et photo de profil transmis par Google. Les réponses facultatives au questionnaire d'accueil : type de compte, organisation, domaine d'activité et manière dont vous nous avez connus.</Sub>
            <Sub title="Vos contenus">Conversations et instructions envoyées aux modèles ; fichiers joints et documents ajoutés à vos bases de connaissances (avec le texte qui en est extrait et ses représentations numériques servant à la recherche) ; sites et projets créés avec le Studio ; images, vidéos et musiques générées ; agents personnalisés et ressources enregistrées dans le Registry.</Sub>
            <Sub title="Utilisation et facturation">Solde et mouvements de crédits Technova, journal d'utilisation (modèle utilisé, volume de texte traité, crédits débités, date), clés API (conservées sous forme hachée et affichées une seule fois lors de leur création).</Sub>
            <Sub title="Services connectés (facultatif)">Si vous reliez GitHub, Google Drive, Notion ou votre propre projet Supabase, nous conservons les jetons d'accès de manière chiffrée et ne les utilisons que pour les actions que vous déclenchez.</Sub>
            <Sub title="Données techniques">Adresse IP, type de navigateur et de système, journaux de sécurité et compteurs anti-abus. Le pays déduit de votre adresse IP sert uniquement à afficher les prix dans votre devise ; il n'est pas conservé.</Sub>
            <Sub title="Données de paiement">Les paiements sont traités exclusivement par Nyole / Feexpay. Nous ne collectons ni ne stockons jamais votre numéro de carte bancaire ni votre code Mobile Money. Nous recevons seulement la référence de la transaction, son montant, sa devise, son statut et le moyen de paiement utilisé, sans coordonnées complètes.</Sub>
          </div>
        </Section>

        <Section id="finalites" n={3} title="Finalités du traitement">
          <p>Vos données servent uniquement à :</p>
          <List items={[
            "fournir le service : réponses des modèles, génération d'images, de vidéos et de musique, création et publication de sites, bases de connaissances, agents et API ;",
            "créer et gérer votre compte, vos crédits et votre facturation ;",
            "traiter vos paiements via Nyole / Feexpay ;",
            "vous envoyer les e-mails nécessaires au service (confirmation de compte, réinitialisation du mot de passe, sécurité) ;",
            "assurer la sécurité : prévention de la fraude et des abus, limites d'usage, analyse des fichiers importés, signalement des sites frauduleux ;",
            "améliorer le service à partir de statistiques agrégées, qui ne permettent pas de vous identifier ;",
            "respecter nos obligations légales et comptables ;",
            "avec votre accord seulement, vous envoyer des actualités.",
          ]} />
          <p>Nous ne vendons jamais vos données personnelles et ne les utilisons pas pour de la publicité ciblée, pour notre compte ou pour celui de tiers.</p>
        </Section>

        <Section id="bases" n={4} title="Bases légales">
          <p>Chaque traitement repose sur une base légale identifiée :</p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-[0.1em]"><tr><th className="px-4 py-3 font-medium">Traitement</th><th className="px-4 py-3 font-medium">Base légale</th><th className="px-4 py-3 font-medium">Exemples</th></tr></thead>
              <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:font-medium [&_td:first-child]:text-foreground">
                <tr><td>Fourniture du service</td><td>Contrat</td><td>Compte, chat, génération, Studio, API, assistance</td></tr>
                <tr><td>Paiement</td><td>Contrat et obligation légale</td><td>Transaction Nyole / Feexpay, facturation</td></tr>
                <tr><td>Sécurité</td><td>Intérêt légitime</td><td>Journaux, anti-fraude, anti-abus, analyse des fichiers</td></tr>
                <tr><td>Amélioration du service</td><td>Intérêt légitime</td><td>Statistiques agrégées, qualité</td></tr>
                <tr><td>Obligations légales</td><td>Obligation légale</td><td>Comptabilité, réponses aux autorités</td></tr>
                <tr><td>Actualités</td><td>Consentement</td><td>Lettre d'information</td></tr>
              </tbody>
            </table>
          </div>
          <p>Lorsqu'un traitement repose sur votre consentement, vous pouvez le retirer à tout moment, sans effet sur ce qui a déjà été fait.</p>
        </Section>

        <Section id="prestataires" n={5} title="Hébergement et prestataires">
          <p>Nous travaillons avec un nombre limité de prestataires, choisis pour leurs garanties de sécurité. Ils agissent uniquement sur nos instructions et pour les finalités décrites ici.</p>
          <Facts rows={[
            ["Hébergement de l'application", "Vercel"],
            ["Base de données, authentification et fichiers", "Supabase"],
            ["Modèles d'IA", "Les fournisseurs des modèles que vous utilisez (par exemple OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Alibaba), via notre infrastructure d'accès ; ils reçoivent uniquement le contenu nécessaire à chaque demande"],
            ["Paiement", "Nyole / Feexpay — aucun numéro de carte n'est stocké par Technova"],
          ]} />
          <p>La liste détaillée et à jour de nos prestataires est disponible sur simple demande à {mail(CONTACT)}.</p>
        </Section>

        <Section id="conservation" n={6} title="Durées de conservation">
          <List items={[
            <><b>Compte</b> : pendant toute la relation, puis 3 ans au plus après votre dernière activité.</>,
            <><b>Conversations, fichiers, bases de connaissances, projets et agents</b> : jusqu'à ce que vous les supprimiez, ou jusqu'à la suppression de votre compte.</>,
            <><b>Images, vidéos et musiques générées</b> : conservées 14 jours sur nos serveurs, puis supprimées. Pensez à les télécharger.</>,
            <><b>Liens d'aperçu du Studio</b> : expirent après 30 jours.</>,
            <><b>Fichiers refusés lors de l'analyse de sécurité</b> : supprimés immédiatement.</>,
            <><b>Journaux de sécurité</b> : 12 mois. <b>Compteurs anti-abus</b> : 24 heures.</>,
            <><b>Facturation</b> : pendant la durée légale applicable en matière comptable.</>,
          ]} />
          <p>Au-delà, les données sont supprimées ou anonymisées de manière irréversible.</p>
        </Section>

        <Section id="droits" n={7} title="Vos droits">
          <p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement. Vous pouvez aussi définir des directives sur le sort de vos données après votre décès, lorsque la loi le prévoit.</p>
          <p>Vous pouvez supprimer vous-même à tout moment vos conversations, fichiers, bases de connaissances et projets depuis votre espace. Pour toute autre demande, dont la suppression de votre compte, écrivez à {mail(CONTACT)}. Une vérification d'identité proportionnée pourra vous être demandée. Nous répondons sous 30 jours.</p>
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l'<b>Autorité de Protection des Données à caractère Personnel (APDP)</b> du Bénin ou, si vous résidez dans l'Union européenne, l'autorité de protection des données de votre pays.</p>
          <div className="pt-1"><Button asChild className="rounded-full"><a href={`mailto:${CONTACT}?subject=${encodeURIComponent("Exercice de mes droits")}`}>Écrire au délégué à la protection des données</a></Button></div>
        </Section>

        <Section id="cookies" n={8} title="Cookies et stockage local">
          <p>TechNova AI Hub n'utilise <b>aucun cookie publicitaire ni de mesure d'audience</b>. Nous utilisons :</p>
          <List items={["le stockage strictement nécessaire : session de connexion et sa sécurité, mémorisation de vos choix de cookies, achat ou action en cours, cache de l'application installée ;", "avec votre accord uniquement, vos préférences : langue, apparence, disposition, mode et modèles choisis dans le chat, devise, rappels d'interface."]} />
          <p>Un bandeau vous permet d'accepter, de refuser ou de personnaliser ces préférences à votre première visite ; votre choix est conservé 6 mois. Le détail de chaque élément, sa finalité et sa durée figurent dans notre <a href="/cookies">politique de cookies</a>, d'où vous pouvez aussi modifier vos choix.</p>
        </Section>

        <Section id="securite" n={9} title="Sécurité">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles adaptées :</p>
          <List items={[
            "chiffrement des échanges (HTTPS/TLS) et des données stockées ;",
            "mots de passe et clés API hachés, jetons des services connectés chiffrés ;",
            "cloisonnement des données : chaque compte n'accède qu'à ses propres données ;",
            "limites d'usage, journal de sécurité et principe du moindre privilège pour l'équipe ;",
            "analyse des fichiers importés et isolation des sites publiés ;",
            "sauvegardes régulières.",
          ]} />
          <p>En cas d'incident affectant vos données, nous appliquerons nos procédures de notification, conformément à la réglementation applicable.</p>
        </Section>

        <Section id="ia" n={10} title="Intelligence artificielle">
          <p>TechNova AI Hub vous donne accès à des modèles d'intelligence artificielle fournis par des tiers. <b>TechNova n'entraîne aucun modèle avec vos conversations, fichiers, codes ou projets.</b> Ces contenus sont transmis au fournisseur du modèle choisi uniquement pour produire la réponse demandée. Nous privilégions les fournisseurs qui s'engagent à ne pas utiliser les données reçues par leur API pour entraîner leurs modèles.</p>
          <p>Si une option d'amélioration de l'IA à partir de vos données devait exister un jour, elle serait désactivée par défaut, activable uniquement par vous et révocable à tout moment.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Sub title="Minimiser">Seul le contenu nécessaire à la réponse est envoyé au modèle.</Sub>
            <Sub title="Encadrer">Les outils des agents sont désactivés par défaut et chaque réponse respecte un budget défini.</Sub>
            <Sub title="Informer">Les réponses sont générées automatiquement et peuvent contenir des erreurs : vérifiez les informations importantes.</Sub>
          </div>
          <p>Vous pouvez demander une intervention humaine, exprimer votre point de vue et contester une décision prise avec l'aide d'un système d'IA en écrivant à {mail(CONTACT)}.</p>
        </Section>

        <Section id="public" n={11} title="Contenus que vous rendez publics">
          <p>Certaines fonctionnalités rendent un contenu accessible à d'autres personnes, uniquement à votre demande :</p>
          <List items={[
            "une conversation partagée est lisible par toute personne disposant du lien, jusqu'à ce que vous désactiviez le partage ;",
            "un site publié est accessible publiquement à son adresse ;",
            "une ressource du Registry rendue publique est visible des autres utilisateurs ;",
            "les votes de l'Arena sont comptabilisés de façon agrégée et anonyme dans le classement public.",
          ]} />
        </Section>

        <Section id="transferts" n={12} title="Transferts internationaux">
          <p>Certains de nos prestataires (hébergement, base de données, modèles d'IA, paiement) peuvent traiter des données hors de votre pays, notamment aux États-Unis, où est établie la société responsable du traitement, et dans l'Union européenne. Nous veillons à ce que ces transferts soient encadrés par des garanties appropriées : engagements contractuels, mesures de sécurité et limitation stricte aux finalités décrites ici. Aucun transfert n'a lieu pour revendre des données.</p>
        </Section>

        <Section id="modifications" n={13} title="Modifications et contact">
          <p>Nous pouvons mettre à jour cette politique pour tenir compte de l'évolution du service ou de la réglementation. Toute modification importante sera signalée sur cette page avec sa date d'entrée en vigueur. La version applicable est celle publiée ici.</p>
          <Facts rows={[["Contact", mail(CONTACT)], ["Délégué à la protection des données", "Cédric Toudonou"]]} />
        </Section>

        <p className="px-2 text-xs text-muted-foreground">Dolapo ECOM LLC · 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA · Dernière mise à jour : {UPDATED}</p>
      </div>
    </div>
    <Footer lang={lang} />
  </div>;
}
