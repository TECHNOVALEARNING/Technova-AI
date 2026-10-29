import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Ban, Cookie, EyeOff, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { openCookieSettings } from "@/lib/consent";

// Cookie policy of TechNova AI Hub. The French text is the authoritative version, like the privacy policy.
// Keep the tables in sync with src/lib/consent.ts (PREFERENCE_KEYS) and the storage the app really writes.
export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [
    { title: "Politique de cookies — TechNova AI Hub" },
    { name: "description", content: "Quels cookies et quel stockage local TechNova AI Hub utilise, à quoi ils servent, combien de temps ils sont conservés et comment changer vos choix." },
    { property: "og:title", content: "Politique de cookies — TechNova AI Hub" },
    { property: "og:description", content: "Aucun cookie publicitaire ni de mesure d'audience : le détail du stockage utilisé par TechNova AI Hub." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CookiePolicyPage,
});

const UPDATED = "29 octobre 2026";
const CONTACT = "support@technovaihub.com";

type Row = [name: string, purpose: string, duration: string];

const necessary: Row[] = [
  ["sb-…-auth-token", "Garder votre session de connexion ouverte et la sécuriser (jetons Supabase Auth).", "Jusqu'à la déconnexion"],
  ["technova-consent", "Mémoriser vos choix en matière de cookies, pour ne pas vous les redemander à chaque page.", "6 mois"],
  ["tn-pending-pack", "Retenir le pack choisi avant la connexion, pour reprendre l'achat ensuite.", "Jusqu'au paiement"],
  ["technova-supabase-oauth-state", "Protéger la connexion à votre propre projet Supabase contre la falsification de requête.", "Quelques minutes"],
  ["technova-active-agent", "Ouvrir le chat avec l'agent que vous venez de choisir.", "Jusqu'au prochain choix"],
  ["technova-research, brouillon de design", "Garder une action en cours pendant la visite (recherche approfondie, modèle du Registry ouvert dans le chat).", "Fin de l'onglet"],
  ["Cache de l'application", "Afficher l'application installée et une page hors connexion (service worker).", "Jusqu'à la mise à jour suivante"],
];

const preferences: Row[] = [
  ["technova-site-lang, technova-dashboard-lang", "Langue du site et du tableau de bord.", "6 mois maximum"],
  ["technova-dashboard-theme", "Thème clair ou sombre.", "6 mois maximum"],
  ["technova-sidebar-collapsed, tn-artifact-width", "Menu réduit et largeur du panneau des fichiers générés.", "6 mois maximum"],
  ["technova-workspace-mode, technova-workspace-model", "Mode et modèle d'IA choisis dans le chat.", "6 mois maximum"],
  ["technova-image-model, technova-video-model", "Modèles d'image et de vidéo choisis.", "6 mois maximum"],
  ["technova-chat-kbs", "Bases de connaissances sélectionnées dans le chat.", "6 mois maximum"],
  ["technova-currency", "Devise d'affichage des prix.", "6 mois maximum"],
  ["technova-install-dismissed", "Ne plus afficher la carte d'installation de l'application pendant 14 jours.", "14 jours"],
];

const thirdParties: [string, string][] = [
  ["Google Fonts", "Les polices du site sont chargées depuis les serveurs de Google, qui reçoivent votre adresse IP. Aucun cookie n'est déposé par ce service."],
  ["Connexion avec Google", "Si vous choisissez de vous connecter avec Google, la page de connexion de Google applique ses propres cookies, selon la politique de Google."],
  ["Paiement (Nyole / Feexpay)", "La page de paiement de nos partenaires peut utiliser ses propres cookies, nécessaires à la sécurité de la transaction."],
  ["Comptes connectés (GitHub, Google Drive, Notion, Supabase)", "Lorsque vous reliez un compte, la fenêtre d'autorisation du service concerné applique ses propres cookies."],
];

const highlights = [
  { icon: Ban, title: "Aucune publicité.", text: "Pas de cookie publicitaire, pas de pixel de suivi, pas de profilage." },
  { icon: EyeOff, title: "Aucune mesure d'audience.", text: "Nous n'utilisons aucun outil de statistiques de fréquentation." },
  { icon: SlidersHorizontal, title: "Vous décidez.", text: "Vos préférences ne sont mémorisées qu'avec votre accord, modifiable à tout moment." },
];

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-[28px] border border-border bg-card p-6 shadow-soft md:p-8">
    <span className="font-display text-xs font-semibold text-muted-foreground">{String(n).padStart(2, "0")}</span>
    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
    <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">{children}</div>
  </section>;
}

function Table({ rows }: { rows: Row[] }) {
  return <div className="overflow-x-auto rounded-2xl border border-border">
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead className="bg-secondary/60 text-xs uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="p-3 font-medium">Nom</th><th className="p-3 font-medium">Finalité</th><th className="p-3 font-medium">Durée</th></tr></thead>
      <tbody>{rows.map(([name, purpose, duration]) => <tr key={name} className="border-t border-border align-top">
        <td className="p-3 font-mono text-[12px] text-foreground">{name}</td><td className="p-3">{purpose}</td><td className="whitespace-nowrap p-3">{duration}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function CookiePolicyPage() {
  const [lang, setLang] = useSiteLang();
  const manage = (light?: boolean) => <Button className={`rounded-full ${light ? "bg-ink-foreground text-ink hover:bg-ink-foreground/90" : ""}`} onClick={openCookieSettings}><Cookie className="size-4" />Gérer mes préférences</Button>;
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag="Politique de cookies" title="Le strict nécessaire, et vos choix respectés." sub="Ce que TechNova AI Hub conserve dans votre navigateur, à quoi cela sert, combien de temps, et comment changer d'avis.">
      <div className="mt-7 flex justify-center">{manage(true)}</div>
    </PageHero>
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
      <div className="grid gap-4 md:grid-cols-3">{highlights.map(({ icon: I, title, text }) => <div key={title} className="rounded-[24px] border border-border bg-card p-5 shadow-soft">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary"><I className="size-[18px]" /></span>
        <p className="mt-4 font-display font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>)}</div>

      <Section id="definition" n={1} title="Qu'est-ce qu'un cookie ?">
        <p>Un cookie est un petit fichier déposé dans votre navigateur par un site que vous visitez. Le <b>stockage local</b> (localStorage, sessionStorage, cache de l'application) fonctionne de la même façon : il permet au site de retrouver une information d'une page ou d'une visite à l'autre.</p>
        <p>Cette politique couvre ces deux techniques, que nous appelons ensemble « cookies ». TechNova AI Hub utilise surtout le stockage local, qui reste dans votre navigateur et n'est pas envoyé automatiquement à nos serveurs.</p>
      </Section>

      <Section id="usages" n={2} title="À quoi servent nos cookies">
        <p>Ils servent uniquement à faire fonctionner le service et à retenir vos réglages : rester connecté, sécuriser vos actions, reprendre un achat, retrouver votre langue, votre thème et vos modèles préférés.</p>
        <p>Ils ne servent <b>ni à la publicité, ni à la mesure d'audience, ni à vous suivre sur d'autres sites</b>. Ils ne sont jamais vendus.</p>
      </Section>

      <Section id="necessaires" n={3} title="Cookies strictement nécessaires">
        <p>Ils sont indispensables au fonctionnement du site et à sa sécurité. Ils sont exemptés de consentement : ils ne peuvent pas être désactivés depuis nos réglages, mais vous pouvez les effacer depuis votre navigateur, ce qui vous déconnectera.</p>
        <Table rows={necessary} />
      </Section>

      <Section id="preferences" n={4} title="Cookies de préférences">
        <p>Ils retiennent vos choix d'interface. Ils ne sont enregistrés <b>qu'avec votre accord</b>. Si vous les refusez, le site fonctionne normalement mais oublie vos réglages à la fin de la visite, et ceux déjà enregistrés sont effacés.</p>
        <Table rows={preferences} />
      </Section>

      <Section id="mesure" n={5} title="Mesure d'audience et publicité">
        <p>TechNova AI Hub n'utilise <b>aucun cookie de mesure d'audience ni de publicité</b>. Si nous en ajoutions un jour, ils resteraient désactivés tant que vous ne les auriez pas expressément acceptés, et cette page serait mise à jour avant leur mise en place.</p>
      </Section>

      <Section id="tiers" n={6} title="Services tiers">
        <p>Certains services que vous utilisez depuis TechNova appliquent leurs propres règles, sur leurs propres pages :</p>
        <div className="grid gap-3">{thirdParties.map(([name, text]) => <div key={name} className="rounded-2xl border border-border bg-background/60 p-4"><h3 className="font-medium text-foreground">{name}</h3><p className="mt-1 text-[15px]">{text}</p></div>)}</div>
      </Section>

      <Section id="choix" n={7} title="Gérer vos choix">
        <p>À votre première visite, un bandeau vous propose de <b>tout accepter</b>, de <b>tout refuser</b> ou de <b>personnaliser</b> vos choix, avec la même facilité. Votre choix est conservé 6 mois, puis vous est redemandé.</p>
        <p>Vous pouvez le modifier à tout moment avec le bouton ci-dessous ou le lien « Préférences cookies » en bas de chaque page. Vous pouvez aussi effacer les cookies et le stockage du site depuis les réglages de votre navigateur.</p>
        <div className="pt-1">{manage()}</div>
      </Section>

      <Section id="contact" n={8} title="Contact et mises à jour">
        <p>Pour toute question sur les cookies ou vos données, écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Pour en savoir plus sur le traitement de vos données, consultez notre <a href="/confidentialite">politique de confidentialité</a>.</p>
        <p>Nous mettrons cette politique à jour si notre usage des cookies change ; la date ci-dessous indique la dernière version.</p>
      </Section>

      <p className="px-2 text-xs text-muted-foreground">Dolapo ECOM LLC · 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA · Dernière mise à jour : {UPDATED}</p>
    </div>
    <Footer lang={lang} />
  </div>;
}
