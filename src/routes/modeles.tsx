import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import catalog from "@/lib/openrouter-catalog.json";

export const Route = createFileRoute("/modeles")({
  head: () => ({ meta: [
    { title: "Catalogue OpenRouter : Claude, GPT Astra et Gemini — TechNova AI Hub" },
    { name: "description", content: "Explorez le catalogue officiel OpenRouter : Claude Opus, GPT Astra, ChatGPT, Gemini, DeepSeek et tous les modèles référencés." },
    { property: "og:title", content: "Tous les modèles OpenRouter — TechNova AI Hub" },
    { property: "og:description", content: "Recherchez les modèles IA par fournisseur, capacités, contexte et prix officiels." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ModelsPage,
});

const text = {
  fr: { title: "Les modèles IA. Tous les horizons.", sub: "Claude Opus, GPT Astra, ChatGPT, Gemini, DeepSeek et tous les modèles du catalogue officiel OpenRouter.", search: "Rechercher un modèle ou un fournisseur", all: "Tous", provider: "Tous les fournisseurs", newest: "Plus récents", context: "Contexte", price: "Prix d’entrée", input: "Entrée", output: "Sortie", source: "Catalogue OpenRouter", date: "Mis à jour le", results: "modèles", free: "Tarif fournisseur gratuit", details: "Voir sur OpenRouter", note: "Référencés chez OpenRouter ; leur présence ici ne garantit pas leur activation dans le chat TechNova. Prix fournisseur en USD par million de tokens, hors crédits Technova.", none: "Aucun modèle ne correspond à votre recherche.", prev: "Page précédente", next: "Page suivante", caps: { chat: "Chat", reasoning: "Raisonnement", coding: "Code", vision: "Vision", image: "Image" } },
  en: { title: "AI models. Every possibility.", sub: "Claude Opus, GPT Astra, ChatGPT, Gemini, DeepSeek and every model in the official OpenRouter catalog.", search: "Search a model or provider", all: "All", provider: "All providers", newest: "Newest", context: "Context", price: "Input price", input: "Input", output: "Output", source: "OpenRouter catalog", date: "Updated", results: "models", free: "Free provider rate", details: "View on OpenRouter", note: "Listed by OpenRouter; inclusion here does not guarantee availability in TechNova chat. Provider prices in USD per million tokens, excluding Technova credits.", none: "No models match your search.", prev: "Previous page", next: "Next page", caps: { chat: "Chat", reasoning: "Reasoning", coding: "Coding", vision: "Vision", image: "Image" } },
};
type Cap = keyof typeof text.fr.caps;
const providers = [...new Set(catalog.models.map((m) => m.provider))].sort();
const pageSize = 24;

function ModelsPage() {
  const [lang, setLang] = useSiteLang(); const t = text[lang];
  const [q, setQ] = useState(""); const [cap, setCap] = useState<Cap | "all">("all");
  const [provider, setProvider] = useState("all"); const [sort, setSort] = useState("newest"); const [page, setPage] = useState(1);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const r = catalog.models.filter((m) => (cap === "all" || m.caps.includes(cap)) && (provider === "all" || m.provider === provider) && (!query || `${m.name} ${m.id} ${m.provider}`.toLowerCase().includes(query)));
    if (sort === "context") r.sort((a, b) => b.contextLength - a.contextLength);
    if (sort === "price") r.sort((a, b) => a.inputPrice - b.inputPrice);
    return r;
  }, [q, cap, provider, sort]);
  const pages = Math.max(1, Math.ceil(list.length / pageSize)); const current = Math.min(page, pages);
  const price = (n: number) => `$${n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 4 })}`;
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={t.source} title={t.title} sub={t.sub}>
      <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-5"><Search className="size-4 shrink-0 text-ink-foreground/60" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-foreground/50" /></div>
    </PageHero>
    <section className="px-5 py-10"><div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2">{(["all", "chat", "reasoning", "coding", "vision", "image"] as const).map((c) => <Button key={c} variant={cap === c ? "default" : "outline"} size="sm" aria-pressed={cap === c} onClick={() => { setCap(c); setPage(1); }} className="rounded-full">{c === "all" ? t.all : t.caps[c]}</Button>)}</div>
        <div className="flex max-w-full gap-2"><select aria-label={t.provider} value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="min-w-0 max-w-48 rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="all">{t.provider}</option>{providers.map((p) => <option key={p}>{p}</option>)}</select><select aria-label={lang === "fr" ? "Trier les modèles" : "Sort models"} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="newest">{t.newest}</option><option value="context">{t.context}</option><option value="price">{t.price}</option></select></div>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{list.length} {t.results}</span><span>{t.date} {new Date(catalog.updatedAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { timeZone: "UTC" })}</span></div>
      <p className="mt-3 max-w-4xl text-xs leading-6 text-muted-foreground">{t.note}</p>
      {list.length === 0 && <p className="py-16 text-center text-muted-foreground">{t.none}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.slice((current - 1) * pageSize, current * pageSize).map((m) => <article key={m.id} className="flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary font-display text-xs font-semibold">{m.provider.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{m.provider}</p><h2 className="mt-1 break-words font-display text-base font-semibold">{m.name}</h2></div></div>
        <code className="mt-4 break-all text-[11px] text-muted-foreground">{m.id}</code>
        <div className="mt-3 flex flex-wrap gap-1.5">{m.caps.filter((c): c is Cap => c in t.caps).map((c) => <span key={c} className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">{t.caps[c]}</span>)}</div>
        <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><Layers className="size-3.5" />{t.context}<span className="ml-auto font-semibold text-foreground">{m.context}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted-foreground">{t.input}</p><p className="mt-1 font-semibold">{price(m.inputPrice)}</p></div><div><p className="text-muted-foreground">{t.output}</p><p className="mt-1 font-semibold">{price(m.outputPrice)}</p></div></div>
        {m.free && <p className="mt-2 text-xs text-supabase">{t.free}</p>}
        <div className="mt-auto pt-5"><Button asChild variant="outline" size="sm" className="w-full"><a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noreferrer">{t.details}<ArrowUpRight className="size-3.5" /></a></Button></div>
      </article>)}</div>
      {list.length > pageSize && <div className="mt-8 flex items-center justify-center gap-5"><Button size="icon" variant="outline" aria-label={t.prev} disabled={current === 1} onClick={() => { setPage(current - 1); window.scrollTo({ top: 300, behavior: "smooth" }); }}><ChevronLeft className="size-4" /></Button><span className="text-sm tabular-nums">{current} / {pages}</span><Button size="icon" variant="outline" aria-label={t.next} disabled={current === pages} onClick={() => { setPage(current + 1); window.scrollTo({ top: 300, behavior: "smooth" }); }}><ChevronRight className="size-4" /></Button></div>}
    </div></section><Footer lang={lang} />
  </div>;
}