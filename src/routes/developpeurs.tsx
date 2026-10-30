import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Boxes, Route as RouteIcon, BarChart3, ShieldCheck, Check, MessageCircle, FileText, Code2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, Heading, R, ActionText, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { CodeBlock } from "@/components/site/CodeBlock";
import { codeSamples, useApiBase, withApiBase } from "@/lib/site-pages";

export const Route = createFileRoute("/developpeurs")({
  head: () => ({
    meta: [
      { title: "Développeurs — API TechNova AI" },
      { name: "description", content: "Une seule clé API TechNova : OpenRouter pour le texte, KIE.ai pour les images et vidéos. Exemples JavaScript, Python, PHP et cURL." },
      { property: "og:title", content: "Développeurs — API TechNova AI" },
      { property: "og:description", content: "Une API unifiée pour des centaines de modèles d'IA, conçue pour intégrer l'IA dans vos produits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevPage,
});

const txt = {
  fr: {
    tag: "Développeurs", title: "Une API. Des possibilités infinies.", sub: "Une seule clé TechNova pour intégrer GPT, Claude, Gemini, DeepSeek et les meilleurs modèles de texte et de code à vos produits, facturés en crédits.", docs: "Lire la documentation", models: "Voir les modèles",
    stats: ["Une seule clé API", "15 modèles de texte", "Facturation au token", "Clés hachées et révocables"],
    exTag: "Exemples", exTitle: "Votre première requête.",
    feTag: "Expérience développeur", feTitle: "Pensée pour les développeurs.",
    features: [["Une seule API", "Le même format de requête pour tous les modèles de texte."], ["Coût transparent", "Chaque réponse indique les crédits exacts débités."], ["Suivi d'usage", "Requêtes, tokens et crédits par modèle dans votre tableau de bord."], ["Clés protégées", "Clés stockées sous forme hachée, révocables à tout moment."]],
    reTag: "Cas d'usage", reTitle: "Recettes prêtes à copier.",
    recipes: [["Assistant client WhatsApp", "Branchez votre webhook WhatsApp sur /api/ai/chat et gardez l'historique côté serveur."], ["Résumé de documents", "Découpez le texte en blocs de 4 000 jetons, résumez chaque bloc puis fusionnez les résumés."], ["Génération de code", "Utilisez un modèle spécialisé avec temperature 0.2 pour des sorties déterministes."], ["Traduction locale", "Français, anglais, fon, yoruba, wolof : précisez la langue cible dans le message système."]],
    bpTitle: "À vérifier avant la mise en production.",
    bp: ["Appelez l'API depuis votre serveur, jamais depuis le navigateur.", "Envoyez une idempotency_key par requête pour ne jamais payer deux fois.", "Gérez INSUFFICIENT_CREDITS en proposant un rechargement Mobile Money.", "Prévoyez un repli sur un modèle plus léger en cas d'indisponibilité.", "Surveillez votre consommation depuis le tableau de bord."],
    stTitle: "Limites de l'API.", status: [["Requêtes", "60 par minute"], ["Messages par requête", "60 maximum"], ["Longueur de réponse", "4 096 tokens maximum"]],
    ctaT: "Construisez le futur avec l'IA.", ctaS: "Un compte. Des centaines de modèles. Une API puissante.", cta: "Commencer gratuitement",
  },
  en: {
    tag: "Developers", title: "One API. Infinite possibilities.", sub: "One TechNova key to bring GPT, Claude, Gemini, DeepSeek and the best text and code models into your products, billed in credits.", docs: "Read the docs", models: "Explore models",
    stats: ["One API key", "15 text models", "Per-token billing", "Hashed, revocable keys"],
    exTag: "Examples", exTitle: "Your first request.",
    feTag: "Developer experience", feTitle: "Built for developers.",
    features: [["One API", "The same request format for every text model."], ["Transparent cost", "Every response states the exact credits charged."], ["Usage tracking", "Requests, tokens and credits per model in your dashboard."], ["Protected keys", "Keys stored hashed, revocable at any time."]],
    reTag: "Use cases", reTitle: "Copy-ready recipes.",
    recipes: [["WhatsApp support assistant", "Connect your WhatsApp webhook to /api/ai/chat and keep history server-side."], ["Document summaries", "Split text into 4,000-token chunks, summarise each, then merge the summaries."], ["Code generation", "Use a specialised model with temperature 0.2 for deterministic output."], ["Local translation", "French, English, Fon, Yoruba, Wolof: set the target language in the system message."]],
    bpTitle: "Check before going to production.",
    bp: ["Call the API from your server, never from the browser.", "Send one idempotency_key per request so you never pay twice.", "Handle INSUFFICIENT_CREDITS by offering a Mobile Money top-up.", "Plan a fallback to a lighter model during outages.", "Monitor usage from the dashboard."],
    stTitle: "API limits.", status: [["Requests", "60 per minute"], ["Messages per request", "60 max"], ["Response length", "4,096 tokens max"]],
    ctaT: "Build the future with AI.", ctaS: "One account. Hundreds of models. One powerful API.", cta: "Start for free",
  },
  es: {
    tag: "Desarrolladores", title: "Una API. Posibilidades infinitas.", sub: "Una sola clave TechNova para integrar GPT, Claude, Gemini, DeepSeek y los mejores modelos de texto y código en tus productos, facturados en créditos.", docs: "Leer la documentación", models: "Ver los modelos",
    stats: ["Una sola clave API", "15 modelos de texto", "Facturación por token", "Claves cifradas y revocables"],
    exTag: "Ejemplos", exTitle: "Tu primera solicitud.",
    feTag: "Experiencia del desarrollador", feTitle: "Pensada para desarrolladores.",
    features: [["Una sola API", "El mismo formato de petición para todos los modelos de texto."], ["Coste transparente", "Cada respuesta indica los créditos exactos cobrados."], ["Seguimiento de uso", "Peticiones, tokens y créditos por modelo en tu panel."], ["Claves protegidas", "Claves guardadas cifradas, revocables en cualquier momento."]],
    reTag: "Casos de uso", reTitle: "Recetas listas para copiar.",
    recipes: [["Asistente de clientes en WhatsApp", "Conecta tu webhook de WhatsApp a /api/ai/chat y guarda el historial en el servidor."], ["Resumen de documentos", "Divide el texto en bloques de 4.000 tokens, resume cada bloque y luego fusiona los resúmenes."], ["Generación de código", "Usa un modelo especializado con temperature 0.2 para obtener salidas deterministas."], ["Traducción local", "Francés, inglés, fon, yoruba, wolof: indica el idioma de destino en el mensaje de sistema."]],
    bpTitle: "Revisa esto antes de pasar a producción.",
    bp: ["Llama a la API desde tu servidor, nunca desde el navegador.", "Envía una idempotency_key por solicitud para no pagar nunca dos veces.", "Gestiona INSUFFICIENT_CREDITS proponiendo una recarga con Mobile Money.", "Prevé un modelo más ligero de respaldo en caso de indisponibilidad.", "Supervisa tu consumo desde el panel."],
    stTitle: "Límites de la API.", status: [["Peticiones", "60 por minuto"], ["Mensajes por petición", "60 como máximo"], ["Longitud de respuesta", "4.096 tokens como máximo"]],
    ctaT: "Construye el futuro con IA.", ctaS: "Una cuenta. Cientos de modelos. Una API potente.", cta: "Empezar gratis",
  },
  pt: {
    tag: "Desenvolvedores", title: "Uma API. Possibilidades infinitas.", sub: "Uma única chave TechNova para integrar GPT, Claude, Gemini, DeepSeek e os melhores modelos de texto e código aos seus produtos, cobrados em créditos.", docs: "Ler a documentação", models: "Ver os modelos",
    stats: ["Uma única chave de API", "15 modelos de texto", "Cobrança por token", "Chaves protegidas e revogáveis"],
    exTag: "Exemplos", exTitle: "Sua primeira solicitação.",
    feTag: "Experiência do desenvolvedor", feTitle: "Pensada para desenvolvedores.",
    features: [["Uma única API", "O mesmo formato de requisição para todos os modelos de texto."], ["Custo transparente", "Cada resposta indica os créditos exatos cobrados."], ["Acompanhamento de uso", "Requisições, tokens e créditos por modelo no seu painel."], ["Chaves protegidas", "Chaves guardadas de forma protegida, revogáveis a qualquer momento."]],
    reTag: "Casos de uso", reTitle: "Receitas prontas para copiar.",
    recipes: [["Assistente de clientes no WhatsApp", "Ligue o seu webhook do WhatsApp a /api/ai/chat e mantenha o histórico no servidor."], ["Resumo de documentos", "Divida o texto em blocos de 4.000 tokens, resuma cada bloco e depois junte os resumos."], ["Geração de código", "Use um modelo especializado com temperature 0.2 para saídas determinísticas."], ["Tradução local", "Francês, inglês, fon, iorubá, wolof: indique o idioma de destino na mensagem de sistema."]],
    bpTitle: "Verifique antes de ir para produção.",
    bp: ["Chame a API a partir do seu servidor, nunca do navegador.", "Envie uma idempotency_key por solicitação para nunca pagar duas vezes.", "Trate INSUFFICIENT_CREDITS propondo uma recarga com Mobile Money.", "Preveja um modelo mais leve como alternativa em caso de indisponibilidade.", "Acompanhe o seu consumo no painel."],
    stTitle: "Limites da API.", status: [["Requisições", "60 por minuto"], ["Mensagens por requisição", "60 no máximo"], ["Tamanho da resposta", "4.096 tokens no máximo"]],
    ctaT: "Construa o futuro com IA.", ctaS: "Uma conta. Centenas de modelos. Uma API poderosa.", cta: "Começar grátis",
  },
};

const featureIcons = [Boxes, RouteIcon, BarChart3, ShieldCheck];
const recipeIcons = [MessageCircle, FileText, Code2, Languages];

function DevPage() {
  const [lang, setLang] = useSiteLang();
  const t = txt[lang];
  const apiBase = useApiBase();
  const [tab, setTab] = useState(0);
  useReveal();
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav lang={lang} setLang={setLang} />
      <PageHero tag={t.tag} title={t.title} sub={t.sub}>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-6 py-3 text-sm font-semibold"><Link to="/documentation"><ActionText>{t.docs}</ActionText><ArrowRight className="size-4" /></Link></Button>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass px-6 py-3 text-sm"><Link to="/modeles"><ActionText>{t.models}</ActionText></Link></Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">{t.stats.map((s) => <span key={s} className="rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-3 py-1 text-xs text-ink-foreground/75">{s}</span>)}</div>
      </PageHero>

      <section className="px-4 py-10">
        <Heading tag={t.exTag} title={t.exTitle} />
        <R className="mx-auto max-w-3xl">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {codeSamples.map((c, i) => <button key={c.label} type="button" onClick={() => setTab(i)} className={`rounded-full px-4 py-2 text-sm transition ${tab === i ? "bg-ink text-ink-foreground shadow-soft" : "glass text-muted-foreground hover:text-foreground"}`}>{c.label}</button>)}
          </div>
          <CodeBlock code={withApiBase(codeSamples[tab]!.code, apiBase)} label={`POST /api/ai/chat · ${codeSamples[tab]!.label}`} />
        </R>
      </section>

      <section className="px-4 py-10">
        <Heading tag={t.feTag} title={t.feTitle} />
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.map(([h, p], i) => { const I = featureIcons[i]!; return (
            <R key={h} delay={i * 60}><div className="h-full rounded-[26px] bg-ink p-6 text-ink-foreground shadow-lift">
              <div className="grid size-11 place-items-center rounded-[14px] border border-ink-foreground/15 bg-ink-foreground/10"><I className="size-5" /></div>
              <h3 className="mt-5 font-display text-lg font-semibold">{h}</h3><p className="mt-2 text-sm text-ink-foreground/65">{p}</p>
            </div></R>
          ); })}
        </div>
      </section>

      <section className="px-4 py-10">
        <Heading tag={t.reTag} title={t.reTitle} />
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
          {t.recipes.map(([h, p], i) => { const I = recipeIcons[i]!; return (
            <R key={h} delay={(i % 2) * 60}><div className="flex h-full gap-4 rounded-[26px] border border-border bg-card p-6 shadow-soft">
              <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-secondary"><I className="size-5" /></div>
              <div><h3 className="font-display text-lg font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{p}</p></div>
            </div></R>
          ); })}
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.4fr_1fr]">
          <R><div className="h-full rounded-[28px] border border-border bg-card p-6 shadow-soft md:p-8">
            <h2 className="font-display text-2xl font-semibold">{t.bpTitle}</h2>
            <ul className="mt-5 space-y-3">{t.bp.map((b) => <li key={b} className="flex gap-3 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground"><Check className="size-3" /></span>{b}</li>)}</ul>
          </div></R>
          <R delay={80}><div className="h-full rounded-[28px] bg-ink p-6 text-ink-foreground shadow-lift md:p-8">
            <h2 className="font-display text-2xl font-semibold">{t.stTitle}</h2>
            <div className="mt-5 space-y-2">{t.status.map(([n, s]) => <div key={n} className="flex items-center justify-between rounded-[16px] bg-ink-foreground/5 px-4 py-3 text-sm"><span>{n}</span><span className="font-medium text-ink-foreground/85">{s}</span></div>)}</div>
          </div></R>
        </div>
      </section>

      <section className="px-4 pb-12">
        <R className="mx-auto max-w-6xl rounded-[32px] bg-ink px-6 py-12 text-center text-ink-foreground shadow-lift">
          <h2 className="font-display text-3xl font-semibold md:text-4xl"><span className="text-hero-gradient">{t.ctaT}</span></h2>
          <p className="mx-auto mt-3 max-w-md text-ink-foreground/70">{t.ctaS}</p>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light mt-6 px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>{t.cta}</ActionText><ArrowRight className="size-4" /></a></Button>
        </R>
      </section>
      <Footer lang={lang} />
    </div>
  );
}
