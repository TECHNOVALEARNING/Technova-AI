import { createFileRoute } from "@tanstack/react-router";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, AudioLines, Brain, ChevronLeft, ChevronRight, Clapperboard, Code2, Eye, Image as ImageIcon, MessageSquareText, ScrollText, Search, Zap } from "lucide-react";
import { Nav, Footer, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { GENERIC_MOTIFS, ModelArt, type ArtMotif } from "@/components/site/ModelArt";
import type { SiteLang } from "@/lib/i18n";
import { allPublicModels, mediaCatalog, textModels, type PublicModel, type TextCap } from "@/lib/public-models";

export const Route = createFileRoute("/modeles")({
  head: () => pageHead({ path: "/modeles", title: "Modèles IA disponibles et prix en crédits — TechNova AI Hub", description: "GPT, Claude, Gemini, Qwen et plus : les modèles d'IA de TechNova pour écrire, coder et analyser, avec images, vidéos et musique à prix fixe, en crédits Technova.", ogTitle: "Modèles IA disponibles — TechNova AI Hub", ogDescription: "Texte, code, images, vidéos et musique : les modèles disponibles sur TechNova et leur prix en crédits.", jsonLd: [breadcrumbLd("Modèles IA", "/modeles")] }),
  component: ModelsPage,
});

const text = {
  fr: { tag: "Catalogue TechNova", title: "Les meilleurs modèles d'IA, prêts à l'emploi.", sub: (n: number) => `${n} modèles de texte, d'image, de vidéo et de musique, disponibles dès maintenant et payés en crédits Technova (1 crédit ≈ 1 FCFA).`, search: "Rechercher un modèle ou un fournisseur", tabs: { all: "Tous", text: "Texte & code", image: "Images", video: "Vidéos", music: "Musique" }, provider: "Tous les fournisseurs", sort: "Trier", recommended: "Recommandés", cheapest: "Prix croissant", models: "modèles", none: "Aucun modèle ne correspond à votre recherche.", perMessage: "crédits / message", perImage: "crédits / image", perVideo: (s: number) => `crédits / vidéo de ${s} s`, perSong: "crédits / chanson", perSecond: "crédits / seconde", tokens: (i: string, o: string) => `Entrée ${i} · Sortie ${o} crédits par million de tokens`, context: "Contexte", cheap: "Économique", soon: "Bientôt disponible", plans: "Packs Creator et Pro", try: "Essayer", caps: { reasoning: "Raisonnement", coding: "Code", vision: "Vision", fast: "Rapide", long: "Long contexte" }, smartTitle: "TechNova Smart", smartText: "Ne choisissez pas : TechNova Smart analyse chaque demande et choisit le mode le moins cher qui convient (Éclair, Équilibré ou Expert).", note: "Les modèles marqués d'un mode sont facturés au prix fixe de ce mode dans le chat ; seul un échange très long peut coûter davantage. Pour les autres, prix indicatifs pour un message type (environ 1 000 mots lus et 700 écrits). Une génération qui échoue n'est jamais facturée." },
  en: { tag: "TechNova catalog", title: "The best AI models, ready to use.", sub: (n: number) => `${n} text, image, video and music models, available now and paid with Technova credits (1 credit ≈ 1 FCFA).`, search: "Search a model or provider", tabs: { all: "All", text: "Text & code", image: "Images", video: "Videos", music: "Music" }, provider: "All providers", sort: "Sort", recommended: "Recommended", cheapest: "Lowest price", models: "models", none: "No models match your search.", perMessage: "credits / message", perImage: "credits / image", perVideo: (s: number) => `credits / ${s}s video`, perSong: "credits / song", perSecond: "credits / second", tokens: (i: string, o: string) => `Input ${i} · Output ${o} credits per million tokens`, context: "Context", cheap: "Budget", soon: "Coming soon", plans: "Creator and Pro packs", try: "Try it", caps: { reasoning: "Reasoning", coding: "Code", vision: "Vision", fast: "Fast", long: "Long context" }, smartTitle: "TechNova Smart", smartText: "Don't choose: TechNova Smart reads each request and picks the cheapest suitable mode (Flash, Balanced or Expert).", note: "Models tagged with a mode are charged that mode's fixed price in the chat; only a very long exchange can cost more. For the others, indicative prices for a typical message (about 1,000 words read and 700 written). A failed generation is never charged." },
  es: { tag: "Catálogo TechNova", title: "Los mejores modelos de IA, listos para usar.", sub: (n: number) => `${n} modelos de texto, imagen, vídeo y música, disponibles ya y pagados con créditos Technova (1 crédito ≈ 1 FCFA).`, search: "Buscar un modelo o un proveedor", tabs: { all: "Todos", text: "Texto y código", image: "Imágenes", video: "Vídeos", music: "Música" }, provider: "Todos los proveedores", sort: "Ordenar", recommended: "Recomendados", cheapest: "Precio más bajo", models: "modelos", none: "Ningún modelo coincide con tu búsqueda.", perMessage: "créditos / mensaje", perImage: "créditos / imagen", perVideo: (s: number) => `créditos / vídeo de ${s} s`, perSong: "créditos / canción", perSecond: "créditos / segundo", tokens: (i: string, o: string) => `Entrada ${i} · Salida ${o} créditos por millón de tokens`, context: "Contexto", cheap: "Económico", soon: "Próximamente", plans: "Packs Creator y Pro", try: "Probar", caps: { reasoning: "Razonamiento", coding: "Código", vision: "Visión", fast: "Rápido", long: "Contexto largo" }, smartTitle: "TechNova Smart", smartText: "No elijas: TechNova Smart analiza cada petición y la envía al modelo adecuado más económico.", note: "Precios orientativos para un mensaje típico (unas 1.000 palabras leídas y 700 escritas). El coste real depende de la longitud; una generación fallida nunca se cobra." },
  pt: { tag: "Catálogo TechNova", title: "Os melhores modelos de IA, prontos para usar.", sub: (n: number) => `${n} modelos de texto, imagem, vídeo e música, disponíveis já e pagos com créditos Technova (1 crédito ≈ 1 FCFA).`, search: "Pesquisar um modelo ou fornecedor", tabs: { all: "Todos", text: "Texto e código", image: "Imagens", video: "Vídeos", music: "Música" }, provider: "Todos os fornecedores", sort: "Ordenar", recommended: "Recomendados", cheapest: "Menor preço", models: "modelos", none: "Nenhum modelo corresponde à sua pesquisa.", perMessage: "créditos / mensagem", perImage: "créditos / imagem", perVideo: (s: number) => `créditos / vídeo de ${s} s`, perSong: "créditos / música", perSecond: "créditos / segundo", tokens: (i: string, o: string) => `Entrada ${i} · Saída ${o} créditos por milhão de tokens`, context: "Contexto", cheap: "Econômico", soon: "Em breve", plans: "Pacotes Creator e Pro", try: "Experimentar", caps: { reasoning: "Raciocínio", coding: "Código", vision: "Visão", fast: "Rápido", long: "Contexto longo" }, smartTitle: "TechNova Smart", smartText: "Não escolha: o TechNova Smart analisa cada pedido e o envia ao modelo adequado mais barato.", note: "Preços indicativos para uma mensagem típica (cerca de 1.000 palavras lidas e 700 escritas). O custo real depende do tamanho; uma geração que falha nunca é cobrada." },
} satisfies Record<SiteLang, unknown>;

// Catalogue layout: a featured carousel, then provider and task filters above a grid of cover cards.
const ui = {
  fr: { all: "Tous les modèles", available: "modèles disponibles", providers: "Fournisseurs", tasks: "Tâches", more: "Afficher plus de modèles", featured: "À la une", prev: "Précédent", next: "Suivant", clear: "Tout afficher", chat: "Chat" },
  en: { all: "All models", available: "models available", providers: "Providers", tasks: "Tasks", more: "Show more models", featured: "Featured", prev: "Previous", next: "Next", clear: "Show all", chat: "Chat" },
  es: { all: "Todos los modelos", available: "modelos disponibles", providers: "Proveedores", tasks: "Tareas", more: "Mostrar más modelos", featured: "Destacados", prev: "Anterior", next: "Siguiente", clear: "Mostrar todo", chat: "Chat" },
  pt: { all: "Todos os modelos", available: "modelos disponíveis", providers: "Fornecedores", tasks: "Tarefas", more: "Mostrar mais modelos", featured: "Em destaque", prev: "Anterior", next: "Seguinte", clear: "Mostrar tudo", chat: "Chat" },
} satisfies Record<SiteLang, unknown>;

type Task = "all" | "text" | "image" | "video" | "music" | TextCap;
const priceOf = (m: PublicModel) => (m.kind === "text" ? m.perMessage : m.credits);
const keyOf = (m: PublicModel) => (m.kind === "text" ? m.name : m.id);
const kindIcons = { text: MessageSquareText, image: ImageIcon, video: Clapperboard, music: AudioLines } as const;
const capIcons = { reasoning: Brain, coding: Code2, vision: Eye, fast: Zap, long: ScrollText } as const;
const caps: TextCap[] = ["reasoning", "coding", "vision", "fast", "long"];
const kinds = ["text", "image", "video", "music"] as const;

// Providers by number of models; each gets a stable colour (dot, card cover) from its name.
const providerCount = new Map<string, number>();
for (const m of allPublicModels) providerCount.set(m.provider, (providerCount.get(m.provider) ?? 0) + 1);
const providers = [...providerCount.keys()].sort((x, y) => providerCount.get(y)! - providerCount.get(x)! || x.localeCompare(y));
const fixedHue: Record<string, number> = { TechNova: 255, OpenAI: 165, Anthropic: 45, Google: 250, "Mistral AI": 60, Alibaba: 300, DeepSeek: 265, Meta: 235, xAI: 20, "Zhipu AI": 200, "Moonshot AI": 320, NVIDIA: 135, Cohere: 350, Amazon: 75, Microsoft: 215 };
const hueOf = (name: string) => fixedHue[name] ?? [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const dot = (name: string): CSSProperties => ({ background: `oklch(.72 .16 ${hueOf(name)})` });
/** Provider colour shown while a card picture loads (and if it ever fails). */
const cover = (name: string): CSSProperties => {
  const h = hueOf(name);
  return { background: `radial-gradient(70% 90% at 85% 0%, oklch(.62 .17 ${h} / .55), transparent 70%), radial-gradient(60% 80% at 0% 100%, oklch(.5 .14 ${(h + 50) % 360} / .45), transparent 70%), linear-gradient(140deg, oklch(.24 .04 ${h}), oklch(.14 .02 ${(h + 30) % 360}))` };
};

// Pictures (public/media/models, 640×400 cards and 1600×686 banners): a model's own cover when it has one and
// a fixed picture per media creation; every other model gets its own drawn cover (ModelArt), never a repeat.
const ownCovers: Record<string, string> = {
  "Claude Sonnet 5": "claude-sonnet-5", "Claude Opus 5": "claude-opus-5", "Claude Haiku 5.5": "claude-haiku-5-5", "Claude Fable 5": "claude-fable-5",
  "Grok 4.6": "grok-4-6", "GPT-5.2": "gpt-5-2", "Gemini 4 Argon": "gemini-4-argon", "Kimi K3.1 Pro": "kimi-k3-1-pro",
  "Gemini 3 Flash Preview": "gemini-3", "Gemini 3.1 Pro Preview": "gemini-3",
};
const mediaCovers: Record<string, string> = { "seedream/5-flash-text-to-image": "vase", "nano-banana-2": "hummingbird", "bytedance/seedance-2-fast": "cinema", "kling-3.0-omni/text-to-video": "lake", "ai-music-api/generate": "headphones" };
const pictureOf = (m: PublicModel) => { const slug = m.kind === "text" ? ownCovers[m.name] : mediaCovers[m.id]; return slug ? `/media/models/${slug}.webp` : null; };
/** Colour of a drawn cover: the provider family, shifted per model so a large family is not one flat colour. */
const artHue = (m: PublicModel) => (hueOf(m.provider) + ([...m.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) % 140) - 70 + 360) % 360;
/** Drawn cover motif: one of the model's strengths or a generic one, chosen from its name so it stays stable. */
const motifOf = (m: PublicModel): ArtMotif => {
  const seed = [...m.name].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5);
  const options: ArtMotif[] = [...(m.kind === "text" ? m.caps : []), GENERIC_MOTIFS[seed % GENERIC_MOTIFS.length]!, GENERIC_MOTIFS[(seed >>> 3) % GENERIC_MOTIFS.length]!];
  return options[(seed >>> 6) % options.length]!;
};

const taskMatch = (m: PublicModel, task: Task) => task === "all" || m.kind === task || (m.kind === "text" && m.caps.includes(task as TextCap));
// Featured banners after TechNova Smart: flagship text models, then one creation of each kind.
const featured: { model: PublicModel; banner: string }[] = [
  ["Claude Fable 5", "claude-fable-5"], ["Grok 4.6", "grok-4-6"], ["Claude Sonnet 5", "claude-sonnet-5"],
  ["nano-banana-2", "hummingbird"], ["kling-3.0-omni/text-to-video", "lake"], ["ai-music-api/generate", "headphones"],
].flatMap(([key, banner]) => { const model = allPublicModels.find((m) => keyOf(m) === key); return model ? [{ model, banner: `/media/models/${banner}-wide.webp` }] : []; });
const SLIDE_MS = 6500;
const PAGE = 24;

function ModelsPage() {
  const [lang, setLang] = useSiteLang(); const t = text[lang]; const u = ui[lang];
  const loc = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" }[lang];
  const n = (v: number) => v.toLocaleString(loc);
  const [q, setQ] = useState(""); const [task, setTask] = useState<Task>("all");
  const [provider, setProvider] = useState("all"); const [sort, setSort] = useState<"recommended" | "cheapest">("recommended");
  const [shown, setShown] = useState(PAGE); const [slide, setSlide] = useState(0); const [paused, setPaused] = useState(false);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const r = allPublicModels.filter((m) => taskMatch(m, task) && (provider === "all" || m.provider === provider) && (!query || `${m.name} ${m.provider}`.toLowerCase().includes(query)));
    return sort === "cheapest" ? [...r].sort((x, y) => priceOf(x) - priceOf(y)) : r;
  }, [q, task, provider, sort]);
  useEffect(() => { setShown(PAGE); }, [q, task, provider, sort]);

  const unit = (m: PublicModel) => (m.kind === "text" ? t.perMessage : m.kind === "image" ? t.perImage : m.kind === "video" ? t.perVideo(m.seconds ?? 5) : t.perSong);
  const price = (m: PublicModel) => (m.kind === "text" ? (m.mode ? n(m.perMessage) : `≈ ${n(m.perMessage)}`) : n(m.credits));
  const tags = (m: PublicModel) => (m.kind === "text" ? [u.chat, ...m.caps.map((c) => t.caps[c])] : [t.tabs[m.kind]]);
  const chip = (active: boolean) => `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition ${active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`;
  // Slide 1 presents TechNova Smart; the others the featured models with their price.
  const slides = [
    { key: "smart", provider: "TechNova", name: t.smartTitle, tags: [u.chat, ...kinds.slice(1).map((k) => t.tabs[k])], desc: t.smartText },
    ...featured.map(({ model: m }) => ({ key: keyOf(m), provider: m.provider, name: m.name, tags: tags(m), desc: `${m.kind === "text" && m.mode ? `${m.mode[lang]} · ` : ""}${price(m)} ${unit(m)}${m.kind === "text" ? ` · ${t.context} ${m.context}` : ""}` })),
  ];
  const banners = ["/media/models/swirl-wide.webp", ...featured.map((x) => x.banner)];
  const f = slides[slide] ?? slides[0]!;
  const go = (step: number) => setSlide((i) => (i + step + slides.length) % slides.length);
  // Slides change on their own, like a showcase, except while hovered or focused or for reduced motion.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setSlide((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [slide, paused, slides.length]);

  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={t.tag} title={t.title} sub={t.sub(allPublicModels.length)} />
    <section className="px-4 py-10 sm:px-5"><div className="mx-auto max-w-6xl">

      {/* Featured carousel: wide banner pictures that cross-fade, text on a dark gradient at the left. */}
      <div className="relative overflow-hidden rounded-[28px] bg-ink text-ink-foreground shadow-lift" aria-roledescription="carousel" aria-label={u.featured}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {banners.map((src, i) => <img key={src} src={src} alt="" aria-hidden="true" loading={i === 0 ? "eager" : "lazy"} decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${i === slide ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`} />)}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/.88)_0%,rgb(0_0_0/.62)_38%,rgb(0_0_0/.12)_70%,transparent_100%)] max-md:bg-[linear-gradient(0deg,rgb(0_0_0/.9)_0%,rgb(0_0_0/.55)_55%,rgb(0_0_0/.2)_100%)]" />
        <span className="pointer-events-none absolute -top-3 left-6 select-none font-display text-[110px] font-bold leading-none text-white/10 sm:left-14 sm:text-[150px]" aria-hidden="true">{String(slide + 1).padStart(2, "0")}</span>
        <div key={f.key} className="models-slide relative flex min-h-[320px] flex-col justify-center gap-4 px-14 py-10 sm:px-20 md:min-h-[380px] md:max-w-[58%]" aria-live="polite">
          <div className="flex flex-wrap gap-1.5">{f.tags.map((x) => <span key={x} className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10.5px] font-medium backdrop-blur">{x}</span>)}</div>
          <div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">{f.provider}</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">{f.name}</h2></div>
          <p className="max-w-md text-sm leading-relaxed text-white/75">{f.desc}</p>
          <a href="/dashboard/chat" className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:opacity-90">{t.try}<ArrowRight className="size-4" /></a>
        </div>
        <button type="button" onClick={() => go(-1)} aria-label={u.prev} className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur transition hover:bg-black/70"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => go(1)} aria-label={u.next} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur transition hover:bg-black/70"><ChevronRight className="size-4" /></button>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">{slides.map((m, i) => <button key={m.key} type="button" onClick={() => setSlide(i)} aria-label={m.name} aria-current={i === slide} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-white" : "w-1.5 bg-white/35"}`} />)}</div>
      </div>

      {/* Title, count, search */}
      <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{u.all}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{list.length} {u.available}</span>
        <div className="ml-auto flex w-full max-w-full items-center gap-2 sm:w-auto">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 sm:w-80"><Search className="size-4 shrink-0 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
          <select aria-label={t.sort} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 shrink-0 rounded-full border border-border bg-card px-3 text-sm"><option value="recommended">{t.recommended}</option><option value="cheapest">{t.cheapest}</option></select>
        </div>
      </div>

      {/* Filters: providers, then tasks */}
      <div className="mt-6 grid gap-4 md:grid-cols-[130px_1fr] md:gap-y-5">
        <p className="pt-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">{u.providers} <span className="opacity-60">({providers.length})</span></p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <button type="button" onClick={() => setProvider("all")} aria-pressed={provider === "all"} className={chip(provider === "all")}>{u.clear}</button>
          {providers.map((p) => <button key={p} type="button" onClick={() => setProvider(provider === p ? "all" : p)} aria-pressed={provider === p} className={chip(provider === p)}><span className="size-2 rounded-full" style={dot(p)} />{p}</button>)}
        </div>
        <p className="pt-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">{u.tasks} <span className="opacity-60">({kinds.length + caps.length})</span></p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <button type="button" onClick={() => setTask("all")} aria-pressed={task === "all"} className={chip(task === "all")}>{u.clear}</button>
          {kinds.map((k) => { const I = kindIcons[k]; return <button key={k} type="button" onClick={() => setTask(task === k ? "all" : k)} aria-pressed={task === k} className={chip(task === k)}><I className="size-3.5" />{t.tabs[k]}</button>; })}
          {caps.map((c) => { const I = capIcons[c]; return <button key={c} type="button" onClick={() => setTask(task === c ? "all" : c)} aria-pressed={task === c} className={chip(task === c)}><I className="size-3.5" />{t.caps[c]}</button>; })}
        </div>
      </div>

      {list.length === 0 && <p className="py-16 text-center text-muted-foreground">{t.none}</p>}

      {/* Cover cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.slice(0, shown).map((m) => {
        return <article key={keyOf(m)} className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lift">
          <div className="relative flex h-40 flex-col justify-end overflow-hidden p-4 text-white" style={cover(m.provider)}>
            {(() => { const pic = pictureOf(m); return pic
              ? <img src={pic} alt="" loading="lazy" decoding="async" width={640} height={400} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              : <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"><ModelArt name={m.name} hue={artHue(m)} motif={motifOf(m)} /></div>; })()}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
            <span className="absolute right-3 top-3 z-10 inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] backdrop-blur"><span className="size-1.5 shrink-0 rounded-full" style={dot(m.provider)} /><span className="truncate">{m.provider}</span></span>
            {m.kind === "text" && m.soon && <span className="absolute left-3 top-3 z-10 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur">{t.soon}</span>}
            {m.kind === "text" && m.mode && <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black">{m.mode[lang]}</span>}
            {m.kind !== "text" && m.cheap && <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black">{t.cheap}</span>}
            <p className="relative font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/70">{m.provider}</p>
            <h3 className="relative mt-0.5 line-clamp-2 break-words font-display text-[17px] font-semibold leading-tight">{m.name}</h3>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex flex-wrap gap-1.5">
              {tags(m).map((x) => <span key={x} className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{x}</span>)}
              {m.kind === "text" && <span className="rounded-md border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{t.context} {m.context}</span>}
              {m.kind === "video" && <span className="rounded-md border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{t.plans}</span>}
            </div>
            <div className="mt-auto pt-4">
              <div className="flex items-baseline gap-1.5"><span className="font-display text-xl font-semibold tabular-nums">{price(m)}</span><span className="text-[11px] text-muted-foreground">{unit(m)}</span></div>
              <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{m.kind === "text" ? t.tokens(n(m.input), n(m.output)) : m.kind === "video" && m.perSecond ? `${n(m.perSecond)} ${t.perSecond}` : " "}</p>
            </div>
          </div>
        </article>;
      })}</div>
      {list.length > shown && <div className="mt-8 flex justify-center"><button type="button" onClick={() => setShown(shown + PAGE * 2)} className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-medium transition hover:border-foreground/30">{u.more}<span className="text-muted-foreground">({list.length - shown})</span></button></div>}
      <p className="mt-10 max-w-3xl text-xs leading-6 text-muted-foreground">{t.note}</p>
    </div></section><Footer lang={lang} />
  </div>;
}
