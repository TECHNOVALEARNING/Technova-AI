import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, R, ActionText, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { articles, findArticle, type Block } from "@/lib/blog-articles";
import { blogCats } from "@/lib/site-pages";
import { pageHead, SITE_URL } from "@/lib/seo";

// One TechNova blog article (French): readable layout, FAQ, call to action, related articles, and Article / FAQ /
// breadcrumb structured data for search engines.
export const Route = createFileRoute("/blog_/$slug")({
  loader: ({ params }) => { const a = findArticle(params.slug); if (!a) throw notFound(); return a; },
  head: ({ loaderData: a }) => !a ? {} : pageHead({
    path: `/blog/${a.slug}`, title: `${a.title} — TechNova AI Hub`, description: a.description, ogTitle: a.title,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "BlogPosting", headline: a.title, description: a.description, datePublished: a.date, dateModified: a.date, inLanguage: "fr", keywords: a.keyword,
        mainEntityOfPage: `${SITE_URL}/blog/${a.slug}`, author: { "@type": "Organization", name: "TechNova AI Hub", url: SITE_URL }, publisher: { "@type": "Organization", name: "TechNova AI Hub", logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png` } } },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: a.title, item: `${SITE_URL}/blog/${a.slug}` },
      ] },
    ],
  }),
  component: ArticlePage,
});

/** **bold** inside a sentence. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong> : part);
}

function BlockView({ b }: { b: Block }) {
  if ("h2" in b) return <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">{b.h2}</h2>;
  if ("p" in b) return <p className="mt-4 leading-8 text-foreground/80">{rich(b.p)}</p>;
  if ("ul" in b) return <ul className="mt-4 space-y-2.5">{b.ul.map((li) => <li key={li} className="flex gap-3 leading-7 text-foreground/80"><span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-foreground/60" /><span>{rich(li)}</span></li>)}</ul>;
  if ("ol" in b) return <ol className="mt-4 space-y-3">{b.ol.map((li, i) => <li key={li} className="flex gap-3 leading-7 text-foreground/80"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-bold text-background">{i + 1}</span><span className="pt-0.5">{rich(li)}</span></li>)}</ol>;
  return <div className="mt-8 rounded-2xl border-l-4 border-emerald-600 bg-emerald-500/[0.06] p-5"><p className="font-medium leading-7">{rich(b.cta)}</p></div>;
}

function ArticlePage() {
  const a = Route.useLoaderData();
  const [lang, setLang] = useSiteLang();
  useReveal();
  const date = new Date(`${a.date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const related = articles.filter((x) => x.slug !== a.slug && (x.cat === a.cat)).concat(articles.filter((x) => x.slug !== a.slug && x.cat !== a.cat)).slice(0, 3);
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground" lang="fr">
      <Nav lang={lang} setLang={setLang} />
      <header className="relative overflow-hidden bg-ink px-5 pb-12 pt-32 text-ink-foreground md:px-12 md:pb-16 md:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--iris-2)_14%,transparent),transparent)]" />
        <div className="relative mx-auto max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-ink-foreground/70 hover:text-ink-foreground"><ArrowLeft className="size-4" />Blog</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/60">{blogCats[a.cat].fr}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{a.title}</h1>
          <p className="mt-4 text-lg text-ink-foreground/75">{a.excerpt}</p>
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-foreground/60"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{date}</span><span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{a.minutes} min de lecture</span><span>TechNova AI Hub</span></p>
        </div>
      </header>

      <article className="px-5 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-3xl text-[17px]">
          {lang !== "fr" && <p className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{lang === "en" ? "This article is written in French." : lang === "es" ? "Este artículo está escrito en francés." : "Este artigo está escrito em francês."}</p>}
          {a.blocks.map((b, i) => <BlockView key={i} b={b} />)}

          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Questions fréquentes</h2>
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">{a.faq.map((f) => <details key={f.q} className="group p-5"><summary className="cursor-pointer list-none font-semibold">{f.q}</summary><p className="mt-2 leading-7 text-muted-foreground">{f.a}</p></details>)}</div>
          </section>

          <R className="mt-12">
            <div className="tn-black flex flex-col items-start gap-5 rounded-[28px] p-7 md:flex-row md:items-center md:p-9">
              <div className="min-w-0 flex-1"><p className="font-display text-2xl font-semibold">Essayez TechNova AI Hub gratuitement</p><p className="mt-1 text-white/70">50 crédits offerts à l'inscription, paiement en FCFA par Mobile Money ou carte, sans abonnement obligatoire.</p></div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>Créer mon compte</ActionText><ArrowRight className="h-4 w-4" /></a></Button>
                <a href="/tarifs" className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">Voir les tarifs</a>
              </div>
            </div>
          </R>

          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold">À lire aussi</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{related.map((r) => <Link key={r.slug} to="/blog/$slug" params={{ slug: r.slug }} className="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-soft"><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{blogCats[r.cat].fr}</p><p className="mt-1.5 font-semibold leading-snug">{r.title}</p></Link>)}</div>
          </section>
        </div>
      </article>
      <Footer lang={lang} />
    </div>
  );
}
