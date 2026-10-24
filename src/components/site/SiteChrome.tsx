import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Globe, LogIn, Menu, X, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { content, isSiteLang, siteLangs, tr, type SiteLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { footerGroups } from "@/lib/footer-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StoreBadges, TrustBadges } from "@/components/site/Badges";

const LANG_KEY = "technova-site-lang";

export function useSiteLang(): [SiteLang, (l: SiteLang) => void] {
  const [lang, setLangState] = useState<SiteLang>("fr");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(LANG_KEY); } catch { /* storage blocked */ }
    if (isSiteLang(saved)) setLangState(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: SiteLang) => { setLangState(l); try { window.localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ } };
  return [lang, setLang];
}

/** Desktop language picker: a compact globe button opening the four site languages. */
function LangMenu({ lang, setLang, label }: { lang: SiteLang; setLang: (l: SiteLang) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (e.target instanceof Node && !ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const short = siteLangs.find((l) => l.code === lang)?.short ?? "FR";
  return (
    <div ref={ref} className="relative ml-2 hidden lg:block">
      <Button variant="pill" size="pill" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-ink-foreground/80 transition hover:bg-ink-foreground/10">
        <Globe className="h-3.5 w-3.5" /> {short}
      </Button>
      {open && <ul role="listbox" aria-label={label} className="absolute right-0 top-[calc(100%+10px)] w-40 overflow-hidden rounded-2xl border border-ink-foreground/15 bg-ink/95 p-1.5 shadow-lift backdrop-blur-xl">
        {siteLangs.map((l) => <li key={l.code} role="option" aria-selected={l.code === lang}>
          <button type="button" onClick={() => { setLang(l.code); setOpen(false); }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-ink-foreground/10 ${l.code === lang ? "text-ink-foreground" : "text-ink-foreground/70"}`}>
            {l.label}<span className="text-[10px] font-semibold tracking-wider text-ink-foreground/40">{l.short}</span>
          </button>
        </li>)}
      </ul>}
    </div>
  );
}

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

export function R({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.22em] ${className}`}>
      TECH<span className="opacity-60">NOVA</span>
    </span>
  );
}

export function Tag({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${dark ? "border border-ink-foreground/20 bg-ink-foreground/10 text-ink-foreground" : "glass text-muted-foreground shadow-soft"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-iris" />
      {children}
    </span>
  );
}

export function Heading({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <R className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
      <Tag>{tag}</Tag>
      <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </R>
  );
}

export function ActionText({ children }: { children: string }) {
  return <span className="action-pill-label"><span>{children}</span><span aria-hidden="true">{children}</span></span>;
}

type NavPath = "/modeles" | "/blog" | "/tarifs" | "/documentation" | "/developpeurs";

export function Nav({ lang, setLang }: { lang: SiteLang; setLang: (l: SiteLang) => void }) {
  const t = content[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const links: [NavPath, string][] = [["/modeles", t.nav.models], ["/blog", t.nav.blog], ["/tarifs", t.nav.pricing], ["/documentation", t.nav.docs], ["/developpeurs", t.nav.developers]];

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => { if (alive) setSignedIn(!!data.user); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session?.user));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); triggerRef.current?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 1024) setMenuOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4 sm:px-4">
      <nav ref={navRef} aria-label={t.nav.menu} className="relative w-full max-w-lg text-ink-foreground lg:w-auto lg:max-w-none">
        <div className="flex min-h-14 w-full items-center gap-2 rounded-full border border-ink-foreground/10 bg-ink/90 p-1.5 pl-4 shadow-lift backdrop-blur-xl sm:pl-5 lg:w-auto">
          <Link to="/" aria-label="TechNova" onClick={() => setMenuOpen(false)} className="min-w-0 shrink-0 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-iris-2"><Logo className="text-[13px] sm:text-sm" /></Link>
          <div className="ml-4 hidden items-center gap-1 text-sm lg:flex">
            {links.map(([h, l]) => (
              <Link key={h} to={h} className="rounded-full px-3 py-1.5 text-ink-foreground/70 transition hover:bg-ink-foreground/10 hover:text-ink-foreground" activeProps={{ className: "bg-ink-foreground/10 text-ink-foreground" }}>{l}</Link>
            ))}
          </div>
          <div className="flex-1 lg:hidden" />
          <Button ref={triggerRef} type="button" variant="pill" size="pill" aria-label={menuOpen ? t.nav.close : t.nav.menu} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="grid size-10 shrink-0 place-items-center rounded-full border border-ink-foreground/25 bg-ink-foreground/10 text-ink-foreground hover:bg-ink-foreground/20 focus-visible:ring-2 focus-visible:ring-iris-2 lg:hidden">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <LangMenu lang={lang} setLang={setLang} label={t.nav.language} />
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass hidden shrink-0 px-3 lg:inline-flex" title={signedIn ? t.nav.account : t.nav.login}><a href={signedIn ? "/dashboard" : "/connexion"} aria-label={signedIn ? t.nav.account : t.nav.login}><LogIn className="size-4" /><span className="text-xs">{signedIn ? t.nav.account : t.nav.login}</span></a></Button>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light shrink-0 px-3 py-2 text-xs sm:px-5 sm:text-sm"><a href={signedIn ? "/dashboard" : "/inscription"}><ActionText>{t.nav.cta}</ActionText></a></Button>
        </div>
        {menuOpen && <div id="mobile-navigation" className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[calc(100svh-96px)] overflow-y-auto rounded-[20px] border border-ink-foreground/15 bg-ink/95 p-3 shadow-lift backdrop-blur-xl lg:hidden">
          <div className="grid gap-1">
            {links.map(([h, l]) => (
              <Link key={h} to={h} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center justify-between rounded-[12px] px-4 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10 focus-visible:bg-ink-foreground/10 focus-visible:outline-none">{l}<ArrowUpRight className="size-4 text-ink-foreground/50" /></Link>
            ))}
          </div>
          <div className="mt-2 border-t border-ink-foreground/15 pt-3">
            <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass w-full min-w-0 px-3 text-xs sm:text-sm"><a href={signedIn ? "/dashboard" : "/connexion"} onClick={() => setMenuOpen(false)}><LogIn className="size-4" />{signedIn ? t.nav.account : t.nav.login}</a></Button>
            <div role="group" aria-label={t.nav.language} className="mt-2 grid grid-cols-4 gap-1.5">
              {siteLangs.map((l) => <button key={l.code} type="button" aria-pressed={l.code === lang} aria-label={l.label} onClick={() => { setLang(l.code); setMenuOpen(false); }}
                className={`flex min-h-10 items-center justify-center gap-1 rounded-full text-xs font-semibold transition ${l.code === lang ? "bg-ink-foreground text-ink" : "bg-ink-foreground/10 text-ink-foreground/80 hover:bg-ink-foreground/20"}`}>
                {l.code === lang && <Globe className="size-3.5" />}{l.short}
              </button>)}
            </div>
          </div>
        </div>}
      </nav>
    </header>
  );
}

/** TikTok mark (Simple Icons, CC0): lucide has no TikTok icon. */
function TikTokIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
}

export function Footer({ lang }: { lang: SiteLang }) {
  const t = content[lang];
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const soon = tr(lang, { fr: "Lien à confirmer", en: "Link to be confirmed", es: "Enlace por confirmar", pt: "Link a confirmar" });
  const social = [
    ["Facebook", Facebook, "https://www.facebook.com/share/18GYGMg9o8/"],
    ["Instagram", Instagram, "https://www.instagram.com/technova.learning"],
    ["LinkedIn", Linkedin, "https://www.linkedin.com/company/130533963"],
    ["YouTube", Youtube, "https://www.youtube.com/@Technova_learning"],
    ["TikTok", TikTokIcon, "https://www.tiktok.com/@technova.learning"],
  ] as const;
  return (
    <footer className="border-t border-border bg-background px-5 pb-8 pt-14 text-foreground sm:pt-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_2.4fr]">
        <div><Logo className="text-xl" /><p className="mt-1 text-xs text-chat-glow">AI HUB</p><p className="mt-3 text-[10px] uppercase text-muted-foreground">By Tenulysse</p>
          <p className="mt-6 max-w-xs text-sm leading-7 text-muted-foreground">{tr(lang, { fr: "L’infrastructure IA unifiée pour les créateurs, développeurs et entreprises.", en: "Unified AI infrastructure for creators, developers and businesses.", es: "La infraestructura de IA unificada para creadores, desarrolladores y empresas.", pt: "A infraestrutura de IA unificada para criadores, desenvolvedores e empresas." })}</p>
          <StoreBadges lang={lang} className="mt-6" />
          <div className="mt-6 flex gap-2">{social.map(([name, Icon, href]) => <Button key={name} asChild variant="outline" size="icon" className="size-9 rounded-full transition-colors hover:border-foreground/30 hover:bg-foreground hover:text-background"><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`TechNova · ${name}`} title={name}><Icon className="size-4" /></a></Button>)}</div>
        </div>
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-3">{footerGroups.map((group) => <div key={group.en}><h3 className="mb-5 text-xs font-semibold uppercase">{group[lang]}</h3><ul className="space-y-3.5 text-sm text-muted-foreground">{group.links.map((link) => <li key={link.en}>{"href" in link ? <a href={link.href} className="break-words transition-colors hover:text-foreground" {...(link.href.startsWith("https:") ? { target: "_blank", rel: "noreferrer" } : {})}>{link[lang]}</a> : <span title={soon} aria-label={`${link[lang]} · ${soon}`} className="opacity-60">{link[lang]}</span>}</li>)}</ul></div>)}</div>
      </div>
      <div className="mx-auto mt-14 max-w-6xl"><TrustBadges lang={lang} /></div>
      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} TechNova AI Hub by Tenulysse. {t.footer.rights}</span>
        <Button variant="ghost" size="sm" onClick={() => setCookiesOpen(true)} className="text-xs text-muted-foreground">{tr(lang, { fr: "Préférences cookies", en: "Cookie preferences", es: "Preferencias de cookies", pt: "Preferências de cookies" })}</Button>
      </div>
      <Dialog open={cookiesOpen} onOpenChange={setCookiesOpen}><DialogContent><DialogHeader><DialogTitle>{tr(lang, { fr: "Préférences cookies", en: "Cookie preferences", es: "Preferencias de cookies", pt: "Preferências de cookies" })}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{tr(lang, { fr: "Le site utilise le stockage nécessaire à votre connexion, votre langue et vos préférences. Aucun cookie publicitaire optionnel n’est activé par ce réglage.", en: "The site uses storage necessary for sign-in, language and preferences. This setting does not enable optional advertising cookies.", es: "El sitio usa el almacenamiento necesario para tu sesión, tu idioma y tus preferencias. Este ajuste no activa cookies publicitarias opcionales.", pt: "O site usa o armazenamento necessário para o seu login, idioma e preferências. Esta configuração não ativa cookies publicitários opcionais." })}</p><Button onClick={() => setCookiesOpen(false)}>{tr(lang, { fr: "Fermer", en: "Close", es: "Cerrar", pt: "Fechar" })}</Button></DialogContent></Dialog>
    </footer>
  );
}

/** Dark hero band shared by the content pages. */
export function PageHero({ tag, title, sub, children }: { tag: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink px-5 pb-14 pt-32 text-center text-ink-foreground md:px-12 md:pb-20 md:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--iris-2)_14%,transparent),transparent)]" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="flex animate-fade-in justify-center"><Tag dark>{tag}</Tag></div>
        <h1 className="mx-auto mt-5 max-w-3xl animate-fade-in font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"><span className="text-hero-gradient">{title}</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-foreground/75 md:text-lg">{sub}</p>
        {children}
      </div>
    </section>
  );
}
