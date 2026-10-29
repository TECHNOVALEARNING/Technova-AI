import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Compass, Globe2, HeartHandshake, Linkedin, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionText, Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import type { SiteLang } from "@/lib/i18n";
import { allPublicModels } from "@/lib/public-models";
import registryManifest from "../../drizzle/registry/manifest.json";

export const Route = createFileRoute("/a-propos")({
  head: () => ({ meta: [
    { title: "À propos — TechNova AI Hub" },
    { name: "description", content: "La vision, la mission et l'équipe de TechNova AI Hub : les meilleurs modèles d'IA accessibles à tous, payables en FCFA par Mobile Money et carte." },
    { property: "og:title", content: "À propos — TechNova AI Hub" },
    { property: "og:description", content: "Conçu en Afrique, ouvert au monde : la vision, la mission et l'équipe de TechNova AI Hub." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AboutPage,
});

/** Founders. `linkedin` stays empty until the profile URL is provided: the button then shows as coming soon. */
const team = [
  { name: "AGONAN Isidore Abraham", photo: "/team/isidore-agonan.webp", linkedin: "" },
  { name: "TOUDONOU Cédric Ulrich", photo: "/team/cedric-toudonou.webp", linkedin: "https://www.linkedin.com/in/c%C3%A9dric-toudonou-5a5401122" },
  { name: "AYELESSO Précieux", photo: "/team/precieux-ayelesso.webp", linkedin: "https://www.linkedin.com/in/pr%C3%A9cieux-ayelesso-a09850327/" },
];

// Figures come from the product itself, so they stay true when the catalogue changes.
const stats = { models: allPublicModels.length, languages: 4, payments: 6, registry: registryManifest.length };

const text = {
  fr: {
    tag: "À propos", title: "Conçu en Afrique, ouvert au monde.", sub: "TechNova AI Hub est né d'un constat simple : les meilleurs outils d'intelligence artificielle existent, mais restent hors de portée de millions de créateurs, d'étudiants et d'entreprises, faute de moyen de paiement adapté.",
    visionTag: "Vision", visionTitle: "Une IA de premier plan entre toutes les mains.", vision: "Nous voulons que chaque créateur, développeur ou entrepreneur, où qu'il soit, puisse utiliser les modèles les plus avancés du monde pour apprendre, créer et bâtir, sans barrière de langue, de devise ou de carte bancaire.",
    missionTag: "Mission", missionTitle: "Réunir les meilleurs modèles, au juste prix.", mission: "Nous rassemblons GPT, Claude, Gemini, DeepSeek et des dizaines d'autres modèles dans un seul espace : chat, création de sites, images, vidéos, musique et API. Pas d'abonnement : des crédits sans expiration, payables en FCFA par Mobile Money ou par carte.",
    statsTag: "TechNova en chiffres", statsTitle: "Une plateforme complète, dès aujourd'hui.",
    statLabels: { models: "modèles d'IA disponibles", languages: "langues : français, anglais, espagnol, portugais", payments: "moyens de paiement, dont 4 Mobile Money", registry: "modèles et ressources prêts à l'emploi", subscription: "abonnement : vous ne payez que ce que vous utilisez" },
    valuesTag: "Nos valeurs", valuesTitle: "Ce qui guide chacune de nos décisions.",
    values: [["Accessibilité", "Des prix justes, payables localement, et une interface pensée pour être comprise dès la première minute."], ["Exigence", "Les meilleurs modèles, une qualité de finition irréprochable et des réponses fiables."], ["Confiance", "Vos données vous appartiennent : elles sont protégées, jamais vendues, et vos contenus n'entraînent aucun modèle."]],
    teamTag: "L'équipe", teamTitle: "Les fondateurs de TechNova AI Hub.", role: "Cofondateur", linkedinSoon: "Profil LinkedIn bientôt disponible", linkedinOpen: "Voir le profil LinkedIn de",
    ctaTitle: "Prêt à créer avec l'IA ?", ctaText: "Créez votre compte et recevez 50 crédits Technova offerts.", cta: "Commencer gratuitement",
  },
  en: {
    tag: "About", title: "Built in Africa, open to the world.", sub: "TechNova AI Hub started from a simple observation: the best artificial intelligence tools exist, yet they remain out of reach for millions of creators, students and businesses who lack a suitable way to pay.",
    visionTag: "Vision", visionTitle: "World-class AI in everyone's hands.", vision: "We want every creator, developer or entrepreneur, wherever they are, to use the world's most advanced models to learn, create and build, with no language, currency or bank-card barrier.",
    missionTag: "Mission", missionTitle: "The best models, at a fair price.", mission: "We bring GPT, Claude, Gemini, DeepSeek and dozens of other models together in one place: chat, website building, images, video, music and an API. No subscription: credits that never expire, payable in FCFA by Mobile Money or card.",
    statsTag: "TechNova in numbers", statsTitle: "A complete platform, today.",
    statLabels: { models: "AI models available", languages: "languages: French, English, Spanish, Portuguese", payments: "payment methods, including 4 Mobile Money", registry: "ready-to-use templates and resources", subscription: "subscription: you only pay for what you use" },
    valuesTag: "Our values", valuesTitle: "What guides every decision we make.",
    values: [["Accessibility", "Fair prices, local payment and an interface that makes sense from the first minute."], ["Excellence", "The best models, polished craftsmanship and reliable answers."], ["Trust", "Your data is yours: protected, never sold, and your content never trains any model."]],
    teamTag: "The team", teamTitle: "The founders of TechNova AI Hub.", role: "Co-founder", linkedinSoon: "LinkedIn profile coming soon", linkedinOpen: "View the LinkedIn profile of",
    ctaTitle: "Ready to build with AI?", ctaText: "Create your account and get 50 free Technova credits.", cta: "Start for free",
  },
  es: {
    tag: "Acerca de", title: "Creado en África, abierto al mundo.", sub: "TechNova AI Hub nació de una constatación sencilla: las mejores herramientas de inteligencia artificial existen, pero siguen fuera del alcance de millones de creadores, estudiantes y empresas que no tienen un medio de pago adecuado.",
    visionTag: "Visión", visionTitle: "Una IA de primer nivel en todas las manos.", vision: "Queremos que cada creador, desarrollador o emprendedor, esté donde esté, pueda usar los modelos más avanzados del mundo para aprender, crear y construir, sin barreras de idioma, de moneda ni de tarjeta bancaria.",
    missionTag: "Misión", missionTitle: "Reunir los mejores modelos, al precio justo.", mission: "Reunimos GPT, Claude, Gemini, DeepSeek y decenas de modelos más en un solo espacio: chat, creación de sitios, imágenes, vídeos, música y API. Sin suscripción: créditos que no caducan, pagaderos en FCFA con Mobile Money o tarjeta.",
    statsTag: "TechNova en cifras", statsTitle: "Una plataforma completa, desde hoy.",
    statLabels: { models: "modelos de IA disponibles", languages: "idiomas: francés, inglés, español, portugués", payments: "medios de pago, incluidos 4 Mobile Money", registry: "plantillas y recursos listos para usar", subscription: "suscripciones: solo pagas lo que usas" },
    valuesTag: "Nuestros valores", valuesTitle: "Lo que guía cada una de nuestras decisiones.",
    values: [["Accesibilidad", "Precios justos, pago local y una interfaz que se entiende desde el primer minuto."], ["Exigencia", "Los mejores modelos, un acabado impecable y respuestas fiables."], ["Confianza", "Tus datos son tuyos: protegidos, nunca vendidos, y tus contenidos no entrenan ningún modelo."]],
    teamTag: "El equipo", teamTitle: "Los fundadores de TechNova AI Hub.", role: "Cofundador", linkedinSoon: "Perfil de LinkedIn disponible pronto", linkedinOpen: "Ver el perfil de LinkedIn de",
    ctaTitle: "¿Listo para crear con IA?", ctaText: "Crea tu cuenta y recibe 50 créditos Technova de regalo.", cta: "Empezar gratis",
  },
  pt: {
    tag: "Sobre", title: "Criado na África, aberto ao mundo.", sub: "A TechNova AI Hub nasceu de uma constatação simples: as melhores ferramentas de inteligência artificial existem, mas continuam fora do alcance de milhões de criadores, estudantes e empresas sem um meio de pagamento adequado.",
    visionTag: "Visão", visionTitle: "Uma IA de ponta em todas as mãos.", vision: "Queremos que cada criador, desenvolvedor ou empreendedor, onde quer que esteja, possa usar os modelos mais avançados do mundo para aprender, criar e construir, sem barreira de idioma, de moeda ou de cartão bancário.",
    missionTag: "Missão", missionTitle: "Reunir os melhores modelos, pelo preço justo.", mission: "Reunimos GPT, Claude, Gemini, DeepSeek e dezenas de outros modelos num só espaço: chat, criação de sites, imagens, vídeos, música e API. Sem assinatura: créditos que não expiram, pagáveis em FCFA por Mobile Money ou cartão.",
    statsTag: "A TechNova em números", statsTitle: "Uma plataforma completa, desde já.",
    statLabels: { models: "modelos de IA disponíveis", languages: "idiomas: francês, inglês, espanhol, português", payments: "meios de pagamento, incluindo 4 Mobile Money", registry: "modelos e recursos prontos para usar", subscription: "assinaturas: você só paga o que usa" },
    valuesTag: "Nossos valores", valuesTitle: "O que orienta cada uma das nossas decisões.",
    values: [["Acessibilidade", "Preços justos, pagamento local e uma interface compreensível desde o primeiro minuto."], ["Excelência", "Os melhores modelos, acabamento impecável e respostas confiáveis."], ["Confiança", "Seus dados são seus: protegidos, nunca vendidos, e seus conteúdos não treinam nenhum modelo."]],
    teamTag: "A equipe", teamTitle: "Os fundadores da TechNova AI Hub.", role: "Cofundador", linkedinSoon: "Perfil do LinkedIn em breve", linkedinOpen: "Ver o perfil do LinkedIn de",
    ctaTitle: "Pronto para criar com IA?", ctaText: "Crie sua conta e receba 50 créditos Technova grátis.", cta: "Começar grátis",
  },
} satisfies Record<SiteLang, unknown>;

const valueIcons = [Globe2, Sparkles, HeartHandshake];

function AboutPage() {
  const [lang, setLang] = useSiteLang(); const t = text[lang];
  const figures: [string, string][] = [
    [`${stats.models}`, t.statLabels.models], [`${stats.languages}`, t.statLabels.languages], [`${stats.payments}`, t.statLabels.payments],
    [`${stats.registry}`, t.statLabels.registry], ["0", t.statLabels.subscription],
  ];
  const eyebrow = "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground";
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={t.tag} title={t.title} sub={t.sub} />

    <section className="px-4 pt-12">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {[[Compass, t.visionTag, t.visionTitle, t.vision], [Target, t.missionTag, t.missionTitle, t.mission]].map(([Icon, tag, title, body]) => {
          const I = Icon as typeof Compass;
          return <article key={tag as string} className="flex flex-col rounded-[28px] border border-border bg-card p-7 shadow-soft md:p-9">
            <span className="grid size-11 place-items-center rounded-2xl bg-ink text-ink-foreground"><I className="size-5" /></span>
            <p className={`mt-6 ${eyebrow}`}>{tag as string}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{title as string}</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{body as string}</p>
          </article>;
        })}
      </div>
    </section>

    <section className="px-4 pt-14">
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>{t.statsTag}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.statsTitle}</h2>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[28px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {figures.map(([value, label]) => <div key={label} className="bg-card p-6">
            <dt className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{value}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">{label}</dd>
          </div>)}
        </dl>
      </div>
    </section>

    <section className="px-4 pt-14">
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>{t.valuesTag}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.valuesTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">{t.values.map(([title, body], i) => { const I = valueIcons[i]!; return <div key={title} className="rounded-[24px] border border-border bg-card p-6 shadow-soft">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary"><I className="size-[18px]" /></span>
          <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>; })}</div>
      </div>
    </section>

    <section className="px-4 pt-14" id="equipe">
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>{t.teamTag}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.teamTitle}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{team.map((m) => <figure key={m.name} className="group">
          <div className="overflow-hidden rounded-[28px] border border-border bg-secondary">
            <img src={m.photo} alt={m.name} width={640} height={640} loading="lazy" className="aspect-square w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
          </div>
          <figcaption className="mt-4 flex items-start justify-between gap-3">
            <span className="min-w-0"><span className="block font-display text-lg font-semibold">{m.name}</span><span className="text-sm text-muted-foreground">{t.role}</span></span>
            {m.linkedin
              ? <a href={m.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${t.linkedinOpen} ${m.name}`} title="LinkedIn" className="grid size-10 shrink-0 place-items-center rounded-full border border-border transition hover:bg-foreground hover:text-background"><Linkedin className="size-4" /></a>
              : <span role="img" aria-label={t.linkedinSoon} title={t.linkedinSoon} className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground/60"><Linkedin className="size-4" /></span>}
          </figcaption>
        </figure>)}</div>
      </div>
    </section>

    <section className="px-4 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-[28px] bg-ink p-8 text-ink-foreground md:flex-row md:items-center md:p-12">
        <div><h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.ctaTitle}</h2><p className="mt-2 text-ink-foreground/70">{t.ctaText}</p></div>
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-light shrink-0 px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>{t.cta}</ActionText><ArrowRight className="size-4" /></a></Button>
      </div>
    </section>
    <Footer lang={lang} />
  </div>;
}
