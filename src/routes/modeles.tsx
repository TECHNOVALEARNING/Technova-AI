import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, AudioLines, Clapperboard, Image as ImageIcon, MessageSquareText, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import type { SiteLang } from "@/lib/i18n";
import { allPublicModels, mediaCatalog, textModels, type PublicModel, type TextCap } from "@/lib/public-models";

export const Route = createFileRoute("/modeles")({
  head: () => ({ meta: [
    { title: "Modèles IA disponibles et prix en crédits — TechNova AI Hub" },
    { name: "description", content: "GPT, Claude, Gemini, DeepSeek, Nano Banana, Kling, Seedance, Suno… Tous les modèles disponibles sur TechNova pour écrire, coder, créer des images, des vidéos et de la musique, avec leur prix en crédits." },
    { property: "og:title", content: "Modèles IA disponibles — TechNova AI Hub" },
    { property: "og:description", content: "Texte, images, vidéos et musique : les modèles disponibles sur TechNova et leur prix en crédits." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ModelsPage,
});

type Tab = "all" | "text" | "image" | "video" | "music";

const text = {
  fr: { tag: "Catalogue TechNova", title: "Les meilleurs modèles d'IA, prêts à l'emploi.", sub: (n: number) => `${n} modèles de texte, d'image, de vidéo et de musique, disponibles dès maintenant et payés en crédits Technova (1 crédit ≈ 1 FCFA).`, search: "Rechercher un modèle ou un fournisseur", tabs: { all: "Tous", text: "Texte & code", image: "Images", video: "Vidéos", music: "Musique" }, provider: "Tous les fournisseurs", sort: "Trier", recommended: "Recommandés", cheapest: "Prix croissant", models: "modèles", none: "Aucun modèle ne correspond à votre recherche.", perMessage: "crédits / message", perImage: "crédits / image", perVideo: (s: number) => `crédits / vidéo de ${s} s`, perSong: "crédits / chanson", perSecond: "crédits / seconde", tokens: (i: string, o: string) => `Entrée ${i} · Sortie ${o} crédits par million de tokens`, context: "Contexte", cheap: "Économique", plans: "Packs Creator et Pro", try: "Essayer", caps: { reasoning: "Raisonnement", coding: "Code", vision: "Vision", fast: "Rapide", long: "Long contexte" }, smartTitle: "TechNova Smart", smartText: "Ne choisissez pas : TechNova Smart analyse chaque demande et l'envoie au modèle adapté le moins cher.", note: "Prix indicatifs pour un message type (environ 1 000 mots lus et 700 écrits). Le coût réel dépend de la longueur ; une génération qui échoue n'est jamais facturée." },
  en: { tag: "TechNova catalog", title: "The best AI models, ready to use.", sub: (n: number) => `${n} text, image, video and music models, available now and paid with Technova credits (1 credit ≈ 1 FCFA).`, search: "Search a model or provider", tabs: { all: "All", text: "Text & code", image: "Images", video: "Videos", music: "Music" }, provider: "All providers", sort: "Sort", recommended: "Recommended", cheapest: "Lowest price", models: "models", none: "No models match your search.", perMessage: "credits / message", perImage: "credits / image", perVideo: (s: number) => `credits / ${s}s video`, perSong: "credits / song", perSecond: "credits / second", tokens: (i: string, o: string) => `Input ${i} · Output ${o} credits per million tokens`, context: "Context", cheap: "Budget", plans: "Creator and Pro packs", try: "Try it", caps: { reasoning: "Reasoning", coding: "Code", vision: "Vision", fast: "Fast", long: "Long context" }, smartTitle: "TechNova Smart", smartText: "Don't choose: TechNova Smart reads each request and sends it to the cheapest suitable model.", note: "Indicative prices for a typical message (about 1,000 words read and 700 written). The real cost depends on length; a failed generation is never charged." },
  es: { tag: "Catálogo TechNova", title: "Los mejores modelos de IA, listos para usar.", sub: (n: number) => `${n} modelos de texto, imagen, vídeo y música, disponibles ya y pagados con créditos Technova (1 crédito ≈ 1 FCFA).`, search: "Buscar un modelo o un proveedor", tabs: { all: "Todos", text: "Texto y código", image: "Imágenes", video: "Vídeos", music: "Música" }, provider: "Todos los proveedores", sort: "Ordenar", recommended: "Recomendados", cheapest: "Precio más bajo", models: "modelos", none: "Ningún modelo coincide con tu búsqueda.", perMessage: "créditos / mensaje", perImage: "créditos / imagen", perVideo: (s: number) => `créditos / vídeo de ${s} s`, perSong: "créditos / canción", perSecond: "créditos / segundo", tokens: (i: string, o: string) => `Entrada ${i} · Salida ${o} créditos por millón de tokens`, context: "Contexto", cheap: "Económico", plans: "Packs Creator y Pro", try: "Probar", caps: { reasoning: "Razonamiento", coding: "Código", vision: "Visión", fast: "Rápido", long: "Contexto largo" }, smartTitle: "TechNova Smart", smartText: "No elijas: TechNova Smart analiza cada petición y la envía al modelo adecuado más económico.", note: "Precios orientativos para un mensaje típico (unas 1.000 palabras leídas y 700 escritas). El coste real depende de la longitud; una generación fallida nunca se cobra." },
  pt: { tag: "Catálogo TechNova", title: "Os melhores modelos de IA, prontos para usar.", sub: (n: number) => `${n} modelos de texto, imagem, vídeo e música, disponíveis já e pagos com créditos Technova (1 crédito ≈ 1 FCFA).`, search: "Pesquisar um modelo ou fornecedor", tabs: { all: "Todos", text: "Texto e código", image: "Imagens", video: "Vídeos", music: "Música" }, provider: "Todos os fornecedores", sort: "Ordenar", recommended: "Recomendados", cheapest: "Menor preço", models: "modelos", none: "Nenhum modelo corresponde à sua pesquisa.", perMessage: "créditos / mensagem", perImage: "créditos / imagem", perVideo: (s: number) => `créditos / vídeo de ${s} s`, perSong: "créditos / música", perSecond: "créditos / segundo", tokens: (i: string, o: string) => `Entrada ${i} · Saída ${o} créditos por milhão de tokens`, context: "Contexto", cheap: "Econômico", plans: "Pacotes Creator e Pro", try: "Experimentar", caps: { reasoning: "Raciocínio", coding: "Código", vision: "Visão", fast: "Rápido", long: "Contexto longo" }, smartTitle: "TechNova Smart", smartText: "Não escolha: o TechNova Smart analisa cada pedido e o envia ao modelo adequado mais barato.", note: "Preços indicativos para uma mensagem típica (cerca de 1.000 palavras lidas e 700 escritas). O custo real depende do tamanho; uma geração que falha nunca é cobrada." },
} satisfies Record<SiteLang, unknown>;

const priceOf = (m: PublicModel) => (m.kind === "text" ? m.perMessage : m.credits);
const icons = { text: MessageSquareText, image: ImageIcon, video: Clapperboard, music: AudioLines } as const;
const providers = [...new Set(allPublicModels.map((m) => m.provider))].sort();
const counts: Record<Tab, number> = { all: allPublicModels.length, text: textModels.length, image: mediaCatalog.filter((m) => m.kind === "image").length, video: mediaCatalog.filter((m) => m.kind === "video").length, music: mediaCatalog.filter((m) => m.kind === "music").length };

function ModelsPage() {
  const [lang, setLang] = useSiteLang(); const t = text[lang];
  const loc = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" }[lang];
  const n = (v: number) => v.toLocaleString(loc);
  const [q, setQ] = useState(""); const [tab, setTab] = useState<Tab>("all");
  const [provider, setProvider] = useState("all"); const [sort, setSort] = useState<"recommended" | "cheapest">("recommended");
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const r = allPublicModels.filter((m) => (tab === "all" || m.kind === tab) && (provider === "all" || m.provider === provider) && (!query || `${m.name} ${m.provider}`.toLowerCase().includes(query)));
    return sort === "cheapest" ? [...r].sort((a, b) => priceOf(a) - priceOf(b)) : r;
  }, [q, tab, provider, sort]);

  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={t.tag} title={t.title} sub={t.sub(allPublicModels.length)}>
      <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-5"><Search className="size-4 shrink-0 text-ink-foreground/60" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink-foreground outline-none placeholder:text-ink-foreground/50" /></div>
    </PageHero>
    <section className="px-5 py-10"><div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-ink-foreground"><Sparkles className="size-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-display text-lg font-semibold">{t.smartTitle}</h2><p className="text-sm text-muted-foreground">{t.smartText}</p></div>
        <Button asChild className="rounded-full"><a href="/dashboard/chat">{t.try}<ArrowRight className="size-4" /></a></Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="tablist">{(Object.keys(t.tabs) as Tab[]).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm transition ${tab === k ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}>{t.tabs[k]}<span className="text-[11px] opacity-60">{counts[k]}</span></button>)}</div>
        <div className="flex max-w-full gap-2">
          <select aria-label={t.provider} value={provider} onChange={(e) => setProvider(e.target.value)} className="h-9 min-w-0 max-w-48 rounded-full border border-border bg-card px-3 text-sm"><option value="all">{t.provider}</option>{providers.map((p) => <option key={p}>{p}</option>)}</select>
          <select aria-label={t.sort} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 rounded-full border border-border bg-card px-3 text-sm"><option value="recommended">{t.recommended}</option><option value="cheapest">{t.cheapest}</option></select>
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{list.length} {t.models}</p>
      {list.length === 0 && <p className="py-16 text-center text-muted-foreground">{t.none}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((m) => {
        const Icon = icons[m.kind];
        return <article key={m.kind === "text" ? m.name : m.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/25 hover:shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary"><Icon className="size-[18px] text-muted-foreground" /></span>
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{m.provider}</p><h2 className="mt-0.5 break-words font-display text-base font-semibold">{m.name}</h2></div>
            {m.kind !== "text" && m.cheap && <span className="rounded-full bg-supabase/10 px-2 py-0.5 text-[10.5px] font-medium text-supabase">{t.cheap}</span>}
          </div>
          {m.kind === "text" && <div className="mt-3 flex flex-wrap gap-1.5">
            {m.caps.map((c: TextCap) => <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">{t.caps[c]}</span>)}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">{t.context} {m.context}</span>
          </div>}
          {m.kind === "video" && <p className="mt-3 text-[11px] text-muted-foreground">{t.plans}</p>}
          <div className="mt-auto pt-5">
            <div className="flex items-baseline gap-1.5 border-t border-border pt-4">
              <span className="font-display text-2xl font-semibold tabular-nums">{m.kind === "text" ? `≈ ${n(m.perMessage)}` : n(m.credits)}</span>
              <span className="text-xs text-muted-foreground">{m.kind === "text" ? t.perMessage : m.kind === "image" ? t.perImage : m.kind === "video" ? t.perVideo(m.seconds ?? 5) : t.perSong}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{m.kind === "text" ? t.tokens(n(m.input), n(m.output)) : m.kind === "video" && m.perSecond ? `${n(m.perSecond)} ${t.perSecond}` : " "}</p>
          </div>
        </article>;
      })}</div>
      <p className="mt-8 max-w-3xl text-xs leading-6 text-muted-foreground">{t.note}</p>
    </div></section><Footer lang={lang} />
  </div>;
}
