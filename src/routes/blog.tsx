import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, R, ActionText, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { posts, blogCats, type Post } from "@/lib/site-pages";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog IA — TechNova AI Hub" },
      { name: "description", content: "Comparatifs de modèles, guides pratiques, cadre réglementaire et retours d'expérience sur l'IA, en français." },
      { property: "og:title", content: "Blog IA — TechNova AI Hub" },
      { property: "og:description", content: "Comprendre l'IA, puis l'utiliser : comparatifs, guides et réglementation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

const txt = {
  fr: { tag: "Blog", title: "Comprendre l'IA, puis l'utiliser.", sub: "Comparatifs de modèles, guides pratiques, cadre réglementaire et retours d'expérience — en français.", featured: "À la une", read: "Lire l'article", all: "Tous", list: "Tous les articles", source: "Articles publiés sur blog-ia.com, le média IA de l'écosystème Tenulysse." },
  en: { tag: "Blog", title: "Understand AI, then use it.", sub: "Model comparisons, practical guides, regulation and field notes.", featured: "Featured", read: "Read article", all: "All", list: "All articles", source: "Articles published on blog-ia.com, the AI media of the Tenulysse ecosystem (in French)." },
  es: { tag: "Blog", title: "Entender la IA, y luego usarla.", sub: "Comparativas de modelos, guías prácticas, marco regulatorio y experiencias.", featured: "Destacado", read: "Leer el artículo", all: "Todos", list: "Todos los artículos", source: "Artículos publicados en blog-ia.com, el medio de IA del ecosistema Tenulysse (en francés)." },
  pt: { tag: "Blog", title: "Entender a IA e depois usá-la.", sub: "Comparativos de modelos, guias práticos, regulamentação e experiências.", featured: "Destaque", read: "Ler o artigo", all: "Todos", list: "Todos os artigos", source: "Artigos publicados no blog-ia.com, a mídia de IA do ecossistema Tenulysse (em francês)." },
};


function BlogPage() {
  const [lang, setLang] = useSiteLang();
  const t = txt[lang];
  const [cat, setCat] = useState<Post["cat"] | "all">("all");
  useReveal();
  const featured = posts[0]!;
  const list = posts.filter((p) => cat === "all" || p.cat === cat);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav lang={lang} setLang={setLang} />
      <PageHero tag={t.tag} title={t.title} sub={t.sub} />

      <section className="px-4 pt-8 sm:pt-10">
        <R className="mx-auto max-w-6xl">
          <a href={featured.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[32px] border border-border bg-card shadow-soft transition hover:shadow-lift">
            <div className="flex flex-col justify-center p-7 md:p-10">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t.featured} · {blogCats[featured.cat][lang]}</span>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{featured.title[lang]}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{featured.excerpt[lang]}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">{t.read}<ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
            </div>
          </a>
        </R>
      </section>

      <section className="px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">{t.list}</h2>
            <div className="flex flex-wrap gap-2">
              {(["all", ...Object.keys(blogCats)] as (Post["cat"] | "all")[]).map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-sm transition ${cat === c ? "bg-ink text-ink-foreground shadow-soft" : "glass text-muted-foreground hover:text-foreground"}`}>{c === "all" ? t.all : blogCats[c][lang]}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => (
              <R key={p.url} delay={(i % 3) * 60}>
                <a href={p.url} target="_blank" rel="noreferrer" className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{blogCats[p.cat][lang]}</span>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{p.title[lang]}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.excerpt[lang]}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold">{t.read}<ArrowUpRight className="size-4" /></span>
                  </div>
                </a>
              </R>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">{t.source}</p>
          <div className="mt-4 flex justify-center"><Button asChild variant="pill" size="pill" className="action-pill action-pill-dark px-6 py-3 text-sm"><a href="https://blog-ia.com/" target="_blank" rel="noreferrer"><ActionText>blog-ia.com</ActionText><ArrowUpRight className="size-4" /></a></Button></div>
        </div>
      </section>
      <Footer lang={lang} />
    </div>
  );
}
