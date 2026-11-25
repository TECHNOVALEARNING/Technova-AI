import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { ActionText, R } from "@/components/site/SiteChrome";
import { articles } from "@/lib/blog-articles";
import { blogCats } from "@/lib/site-pages";
import type { SiteLang } from "@/lib/i18n";

// Landing page « Blog » section: TechNova's own articles put forward — one featured article and two more, then a
// link to all of them. Article texts are French (written for French-speaking Africa).
const copy: Record<SiteLang, { tag: string; title: string; sub: string; all: string; read: string; minutes: string; fr: string }> = {
  fr: { tag: "Blog", title: "Guides pour bien utiliser l'IA", sub: "Payer en FCFA, choisir son modèle, créer un site, protéger ses données : nos articles pratiques.", all: "Voir tous les articles", read: "Lire l'article", minutes: "min", fr: "" },
  en: { tag: "Blog", title: "Guides to get the most out of AI", sub: "Paying in FCFA, choosing a model, building a website, protecting your data: our practical articles.", all: "See all articles", read: "Read the article", minutes: "min", fr: "In French" },
  es: { tag: "Blog", title: "Guías para aprovechar la IA", sub: "Pagar en FCFA, elegir un modelo, crear un sitio, proteger sus datos: nuestros artículos prácticos.", all: "Ver todos los artículos", read: "Leer el artículo", minutes: "min", fr: "En francés" },
  pt: { tag: "Blog", title: "Guias para aproveitar a IA", sub: "Pagar em FCFA, escolher um modelo, criar um site, proteger seus dados: nossos artigos práticos.", all: "Ver todos os artigos", read: "Ler o artigo", minutes: "min", fr: "Em francês" },
};
const hue: Record<string, number> = { compare: 255, guides: 165, models: 300, marketing: 35, law: 205 };

export function BlogHighlights({ lang }: { lang: SiteLang }) {
  const t = copy[lang] ?? copy.fr;
  const [first, ...rest] = articles;
  if (!first) return null;
  const meta = (a: typeof first) => <span className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"><span>{blogCats[a.cat][lang]}</span><span className="inline-flex items-center gap-1 normal-case tracking-normal"><Clock className="size-3.5" />{a.minutes} {t.minutes}</span>{t.fr && <span className="normal-case tracking-normal">· {t.fr}</span>}</span>;
  return <section id="blog" className="px-4 py-6 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-sky-500" />{t.tag}</span>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">{t.sub}</p>
        </div>
        <Button asChild variant="pill" size="pill" className="action-pill action-pill-dark shrink-0 self-start px-6 py-3 text-sm font-semibold sm:self-auto"><a href="/blog"><ActionText>{t.all}</ActionText><ArrowRight className="h-4 w-4" /></a></Button>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <R>
          <a href={`/blog/${first.slug}`} className="blog-featured group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-border bg-card p-7 shadow-soft transition hover:shadow-lift md:p-9" style={{ "--hue": hue[first.cat] } as CSSProperties}>
            <div className="relative">{meta(first)}<h3 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{first.title}</h3><p className="mt-3 max-w-xl text-muted-foreground">{first.excerpt}</p></div>
            <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">{t.read}<ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
          </a>
        </R>
        <div className="grid gap-4">{rest.slice(0, 2).map((a, i) => <R key={a.slug} delay={(i + 1) * 80}>
          <a href={`/blog/${a.slug}`} className="blog-card group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-card p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift" style={{ "--hue": hue[a.cat] } as CSSProperties}>
            <div className="relative">{meta(a)}<h3 className="mt-2 font-display text-lg font-semibold leading-snug">{a.title}</h3><p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</p></div>
            <span className="relative mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold">{t.read}<ArrowUpRight className="size-4" /></span>
          </a>
        </R>)}</div>
      </div>
    </div>
  </section>;
}
