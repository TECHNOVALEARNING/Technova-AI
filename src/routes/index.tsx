import { createFileRoute } from "@tanstack/react-router";
import { pageHead, appLd, faqLd, organizationLd, websiteLd } from "@/lib/seo";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, Check, Plus, Minus, Globe, LogIn, Menu, Zap, Boxes, WalletCards, ShieldCheck, Lock, ServerOff, UserRoundPlus, Play, X,
} from "lucide-react";
import { TechNovaMark } from "@/components/site/TechNovaMark";
import { Button } from "@/components/ui/button";
import heroOrb from "@/assets/hero-orb.jpg";
import { media } from "@/lib/media";
import irisOrb from "@/assets/iris-orb.jpg";
import serviceChat from "@/assets/service-chat-depth.png";
import serviceCreative from "@/assets/service-creative-depth.png";
import serviceCode from "@/assets/service-code-depth.png";
import serviceApi from "@/assets/service-api-depth.png";
import serviceAnalytics from "@/assets/service-analytics-depth.png";
import ecoLearning from "@/assets/eco-learning.webp";
import ecoConnect from "@/assets/eco-connect.webp";
import { content, labs, type SiteLang } from "@/lib/i18n";
import { Nav, Footer, Heading, Tag, R, ActionText, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { InstallAppPrompt } from "@/components/site/InstallAppPrompt";
import { RoutingSection } from "@/components/site/RoutingSection";

import { PricingContent } from "@/components/site/PricingContent";

export const Route = createFileRoute("/")({
  head: () => pageHead({ path: "/", title: "TechNova AI Hub — GPT, Claude, Gemini et plus en un seul hub IA", description: "Discutez, codez, créez images, vidéos et musique avec GPT, Claude, Gemini et les meilleurs modèles d'IA. Sans abonnement, crédits sans expiration, paiement Mobile Money.", ogTitle: "TechNova AI Hub | Tous les modèles d'IA en un seul hub", ogDescription: "Les meilleurs modèles d'IA, une seule API, crédits sans expiration, paiement en FCFA par Mobile Money ou carte.", jsonLd: [organizationLd, websiteLd, appLd, faqLd], preloadImage: media.heroPoster }),
  component: Index,
});


function Index() {
  const [lang, setLang] = useSiteLang();
  const t = content[lang];
  useReveal();

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav lang={lang} setLang={setLang} />
      <Hero t={t} />
      <Intro t={t} />
      <Why t={t} />
      <Services t={t} />
      <How t={t} />
      <RoutingSection lang={lang} />
      <Ecosystem t={t} />
      <Tech t={t} />
      <PricingContent lang={lang} glass />
      <Faq t={t} />
      <Contact t={t} />
      <Footer lang={lang} />
      <InstallAppPrompt lang={lang} />
    </div>
  );
}

type T = (typeof content)[SiteLang];


function Hero({ t }: { t: T }) {
  return (
    <section id="top" className="relative flex min-h-[92svh] flex-col justify-between overflow-hidden bg-ink px-5 pb-8 pt-28 text-ink-foreground md:min-h-[650px] md:px-12 md:pb-10 md:pt-36">
      <img src={media.heroPoster} alt="" className="hero-media absolute object-cover" />
      <video className="hero-media absolute object-cover" autoPlay muted loop playsInline preload="metadata" poster={media.heroPoster} aria-hidden="true">
        <source src={media.heroWebm} type="video/webm" />
        <source src={media.heroVideo} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/65 to-ink/90 md:bg-gradient-to-r md:from-ink/95 md:via-ink/60 md:to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-6xl text-center md:text-left">
        <div className="animate-fade-in"><Tag dark>{t.hero.badge}</Tag></div>
        <h1 className="mt-5 animate-fade-in font-display text-5xl font-semibold leading-[1.05] tracking-tight md:max-w-2xl md:text-7xl">
          <span className="text-hero-gradient">{t.hero.title1}</span>{" "}
          <br />
          <span className="text-hero-gradient">{t.hero.title2}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-foreground/80 md:mx-0 md:text-lg">{t.hero.sub}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>{t.hero.primary}</ActionText><ArrowRight className="h-4 w-4" /></a></Button>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass px-6 py-3 text-sm font-medium"><a href="/modeles"><ActionText>{t.hero.secondary}</ActionText></a></Button>
        </div>
        <p className="mt-4 text-xs text-ink-foreground/50">{t.hero.note}</p>
      </div>
      <div className="relative z-10 mx-auto mt-14 w-full max-w-6xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)] md:mt-16">
        <div className="animate-marquee flex w-max gap-12">
          {[...labs, ...labs].map((l, i) => (
            <span key={i} className="flex items-center gap-2 text-sm text-ink-foreground/60">
              <img src={`https://cdn.simpleicons.org/${l.s}/ffffff`} alt="" className="h-5 w-5 opacity-70" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
              {l.n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Intro({ t }: { t: T }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const words = `${t.intro.text}${t.intro.muted}`.trim().split(/\s+/);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const distance = rect.height + window.innerHeight * 0.25;
        setProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.52 - rect.top) / distance)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!videoOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVideoOpen(false);
      if (event.key === "Tab") {
        const focusables: HTMLElement[] = [];
        if (closeRef.current) focusables.push(closeRef.current);
        if (videoRef.current) focusables.push(videoRef.current);
        const current = focusables.indexOf(document.activeElement as HTMLElement);
        if (current >= 0) {
          event.preventDefault();
          focusables[(current + (event.shiftKey ? focusables.length - 1 : 1)) % focusables.length]?.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    videoRef.current?.play().catch(() => {});
    return () => {
      videoRef.current?.pause();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      playRef.current?.focus();
    };
  }, [videoOpen]);

  return (
    <>
      <section id="about" ref={sectionRef} className="relative px-4 pb-8 pt-14 sm:pb-10 sm:pt-18">
        <div className="flex items-center justify-center">
          <div className="mx-auto max-w-3xl text-center">
            <Tag>{t.intro.tag}</Tag>
            <p className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight md:text-4xl" aria-label={`${t.intro.text}${t.intro.muted}`}>
              {words.map((word, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="intro-word"
                  style={{ "--word-fill": Math.max(0, Math.min(1, progress * words.length - i)) } as CSSProperties}
                >
                  {word}{i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>
      <div className="relative isolate flex items-center justify-center overflow-hidden px-4 py-4 sm:py-6">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee flex w-max gap-14">
            {[...t.stats, ...t.stats, ...t.stats, ...t.stats].map((s, i) => (
              <span key={i} className="whitespace-nowrap font-display text-5xl font-bold text-foreground/20 sm:text-7xl lg:text-8xl">{s}</span>
            ))}
          </div>
        </div>
        <Button
          ref={playRef}
          type="button"
          variant="ghost"
          aria-label={t.intro.play}
          onClick={() => setVideoOpen(true)}
          className="group relative z-10 h-auto w-full max-w-[760px] overflow-hidden rounded-[36px] border border-border/70 bg-card p-0 shadow-lift transition-transform duration-300 hover:scale-[1.01] hover:bg-card focus-visible:ring-2 focus-visible:ring-ring sm:w-[72%] md:rounded-[68px]"
        >
          <img src={media.aboutPoster} alt="" loading="lazy" width={3840} height={2160} className="aspect-video w-full object-cover" />
          <span className="absolute inset-0 bg-ink/10 transition-colors group-hover:bg-ink/20" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-ink-foreground/60 bg-ink-foreground/85 text-ink shadow-lift backdrop-blur-sm transition-transform group-hover:scale-110 md:h-20 md:w-20"><Play className="ml-1 h-7 w-7 fill-current md:h-8 md:w-8" /></span>
        </Button>
      </div>
      {videoOpen && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVideoOpen(false); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 px-3 py-12 sm:px-8" >
          <div role="dialog" aria-modal="true" aria-label={t.intro.play} className="relative w-full max-w-6xl">
            <Button ref={closeRef} type="button" variant="ghost" size="icon" aria-label={t.intro.close} onClick={() => setVideoOpen(false)} className="absolute -top-12 right-0 h-10 w-10 rounded-full text-ink-foreground hover:bg-ink-foreground/15 hover:text-ink-foreground"><X className="h-6 w-6" /></Button>
            <video ref={videoRef} poster={media.aboutPoster} controls playsInline autoPlay preload="metadata" className="aspect-video w-full rounded-lg bg-ink object-contain shadow-lift">
              <source src={media.aboutWebm} type="video/webm" />
              <source src={media.aboutVideo} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </>
  );
}

/** Line icon that draws itself stroke by stroke when it scrolls into view (and again each time it comes back):
    every shape gets pathLength=1 so one dash covers it, then the dash offset eases from hidden to drawn. */
function DrawIcon({ icon: Icon, className, strokeWidth }: { icon: typeof Zap; className?: string; strokeWidth?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.querySelectorAll("path, rect, circle, line, polyline, polygon, ellipse").forEach((el, k) => {
      el.setAttribute("pathLength", "1");
      (el as SVGElement).style.transitionDelay = `${250 + k * 140}ms`;
    });
    setReady(true);
    const io = new IntersectionObserver(([entry]) => setDrawn(!!entry?.isIntersecting), { threshold: 0.4 });
    io.observe(svg);
    return () => io.disconnect();
  }, []);
  return <Icon ref={ref} className={`${className ?? ""} ${ready ? "draw-icon" : ""} ${drawn ? "is-drawn" : ""}`} strokeWidth={strokeWidth} />;
}

function Why({ t }: { t: T }) {
  const icons = [Zap, Boxes, WalletCards, ShieldCheck, Lock, ServerOff];
  return (
    <section id="why" className="px-4 py-6 sm:py-8">
      <Heading tag={t.why.tag} title={t.why.title} sub={t.why.sub} />
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {t.why.items.map((it, i) => {
          const Icon = icons[i] ?? Zap;
          return <R key={it.t} delay={i * 120} className="h-full">
            <article className="why-card group h-full">
              <div className="why-stage" aria-hidden="true">
                <div className="why-medallion"><DrawIcon icon={Icon} className="why-icon" strokeWidth={2.15} /></div>
                <span className="why-number">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="why-copy">
                <h3 className="font-display text-lg font-semibold">{it.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{it.d}</p>
              </div>
            </article>
          </R>
        })}
      </div>
    </section>
  );
}

function Services({ t }: { t: T }) {
  const s = t.services;
  const panels = [
    { ...s.chat, image: serviceChat, tall: true, visual: "chat", width: 1200, height: 896 },
    { ...s.image, image: serviceCreative, tall: false, visual: "creative", width: 1376, height: 768 },
    { ...s.code, image: serviceCode, tall: false, visual: "code", width: 1376, height: 768 },
    { ...s.api, image: serviceApi, tall: false, visual: "api", width: 1584, height: 672 },
    { ...s.analytics, image: serviceAnalytics, tall: false, visual: "analytics", width: 1200, height: 896 },
  ];
  return (
    <section id="services" className="px-4 py-6 sm:py-8">
      <Heading tag={s.tag} title={s.title} sub={s.sub} />
      <div className="mx-auto grid max-w-6xl gap-2 md:grid-cols-3 md:grid-rows-[repeat(2,minmax(252px,1fr))]">
        {panels.map((panel, i) => (
          <R key={panel.t} delay={(i % 3) * 100} className={panel.tall ? "md:row-span-2" : ""}>
            <article className={`service-panel service-panel-${panel.visual} ${panel.tall ? "service-panel-tall" : ""}`}>
              <div className="service-panel-copy">
                <h3 className="inline font-sans text-[13px] font-bold leading-[1.45]">{panel.t}. </h3>
                <p className="inline text-[13px] leading-[1.45] text-muted-foreground">{panel.d}</p>
              </div>
              <div className="service-panel-visual">
                <img src={panel.image} alt="" loading="lazy" width={panel.width} height={panel.height} className="service-panel-image" />
              </div>
            </article>
          </R>
        ))}
        <R className="md:col-span-3">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[40px] border border-border bg-iris p-7 md:flex-row md:items-center md:p-9">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-ink-foreground"><TechNovaMark className="h-6 w-6" /></div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-ink">{s.banner.t}</h3>
                <p className="text-sm text-ink/70">{s.banner.d}</p>
              </div>
            </div>
            <Button asChild variant="pill" size="pill" className="action-pill action-pill-dark px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>{s.banner.c}</ActionText><ArrowRight className="h-4 w-4" /></a></Button>
          </div>
        </R>
      </div>
    </section>
  );
}

function How({ t }: { t: T }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const icons = [UserRoundPlus, WalletCards, Boxes, TechNovaMark];

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const track = trackRef.current;
        if (!track) return;
        const first = track.querySelector<HTMLElement>(".process-step:first-of-type .process-node");
        const last = track.querySelector<HTMLElement>(".process-step:last-child .process-node");
        if (!first || !last) return;
        const start = first.getBoundingClientRect().top + first.offsetHeight / 2;
        const end = last.getBoundingClientRect().top + last.offsetHeight / 2;
        setProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.48 - start) / Math.max(1, end - start))));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section className="px-4 py-6 sm:py-8">
      <Heading tag={t.how.tag} title={t.how.title} sub={t.how.sub} />
      <div ref={trackRef} className="process-track mx-auto max-w-6xl" style={{ "--process-progress": progress } as CSSProperties}>
        <div className="process-spine" aria-hidden="true"><span className="process-spine-fill" /></div>
        {t.how.steps.map((st, i) => {
          const Icon = icons[i] ?? TechNovaMark;
          const stepPosition = i / (t.how.steps.length - 1);
          const fill = Math.max(0, Math.min(1, (progress - stepPosition + (i === 0 ? 0 : 0.04)) * 25));
          const active = fill > 0.02;
          return (
            <article key={st.t} className={`process-step ${i % 2 ? "process-step-reverse" : ""} ${active ? "process-step-active" : ""}`} style={{ "--step-fill": fill } as CSSProperties}>
              <div className="process-node" aria-hidden="true"><span /></div>
              <div className="process-icon" aria-hidden="true"><Icon size={22} strokeWidth={2.4} /></div>
              <span className="process-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="process-copy">
                <h3>{st.t}</h3>
                <p>{st.d}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const ECO = [
  // Square poster with text at the top and bottom: shown whole over a blurred copy of itself, never cropped.
  { img: ecoLearning, bg: "var(--eco-learning)", contain: true },
  // 16:9 poster: it already matches the picture area, so it fills it.
  { img: ecoConnect, bg: "var(--eco-connect)" },
];

/** One frosted-glass card per product: the picture (what the product does) fills three quarters, the text one quarter. */
function Ecosystem({ t }: { t: T }) {
  const items = t.eco.items;
  return (
    <section className="px-4 py-6 sm:py-8">
      <Heading tag={t.eco.tag} title={t.eco.title} sub={t.eco.sub} />
      <R className="glass-stage relative mx-auto max-w-6xl">
        <div className="relative grid gap-5 md:grid-cols-2">
          {items.map((it, j) => {
            const url = "url" in it ? it.url : undefined;
            return (
              <article key={it.n} className="eco-card group flex aspect-[4/5] flex-col rounded-[2rem] p-2.5 sm:aspect-[5/4]" style={{ animationDelay: `${j * 80}ms` }}>
                <div className="relative min-h-0 flex-[3] overflow-hidden rounded-[1.6rem]" style={{ backgroundImage: ECO[j]!.bg }}>
                  {"contain" in ECO[j]! && <img src={ECO[j]!.img} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />}
                  <img src={ECO[j]!.img} alt={it.n} width={1600} height={"contain" in ECO[j]! ? 1600 : 900} loading="lazy" className={`relative h-full w-full ${"contain" in ECO[j]! ? "object-contain" : "object-cover"} transition duration-700 ease-out group-hover:scale-[1.04]`} />
                  <span className="eco-chip absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-widest">{it.k}</span>
                </div>
                <div className="flex min-h-0 flex-1 items-center gap-4 px-3 pt-2.5 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{it.n}</h3>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground sm:text-sm">{it.d}</p>
                  </div>
                  {/* Products without a public site (e.g. Technova Connect) show no link. */}
                  {url ? (
                    <Button asChild variant="pill" size="pill" className="action-pill action-pill-dark shrink-0 px-4 py-2.5 text-sm font-medium"><a href={url} target="_blank" rel="noreferrer" aria-label={`${t.eco.visit} ${it.n}`}><ActionText>{t.eco.visit}</ActionText><ArrowUpRight className="h-4 w-4" /></a></Button>
                  ) : (
                    <span className="eco-soon shrink-0 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground">{t.eco.soon}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </R>
    </section>
  );
}

function Tech({ t }: { t: T }) {
  const row = (rev: boolean) => (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_20%,black_80%,transparent)]">
      <div className={`${rev ? "animate-marquee-rev" : "animate-marquee"} flex w-max gap-4 py-2`}>
        {[...labs, ...labs].map((l, i) => (
          <div key={i} className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm shadow-soft">
            <img src={`https://cdn.simpleicons.org/${l.s}`} alt="" className="h-4 w-4" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
            {l.n}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="py-6 sm:py-8">
      <Heading tag={t.tech.tag} title={t.tech.title} sub={t.tech.sub} />
      <R className="relative">
        <div className="space-y-3">{row(false)}{row(true)}{row(false)}</div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="grid h-36 w-36 place-items-center rounded-full bg-card/60 shadow-lift backdrop-blur-md">
            <img src={irisOrb} alt="" className="animate-slowspin h-28 w-28 rounded-full object-cover mix-blend-multiply" />
          </div>
        </div>
      </R>
    </section>
  );
}

function Faq({ t }: { t: T }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="px-4 py-6 sm:py-8">
      <Heading tag={t.faq.tag} title={t.faq.title} />
      <div className="mx-auto max-w-3xl space-y-3">
        {t.faq.items.map((f, i) => (
          <R key={f.q} delay={i * 60}>
            <Button variant="pill" size="pill" onClick={() => setOpen(open === i ? null : i)} className="block w-full rounded-2xl bg-card p-5 text-left shadow-soft transition hover:shadow-lift">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{f.q}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground">{open === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
              </div>
              <div className={`grid transition-all duration-500 ${open === i ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden text-sm text-muted-foreground">{f.a}</p>
              </div>
            </Button>
          </R>
        ))}
      </div>
    </section>
  );
}

function Contact({ t }: { t: T }) {
  const [sent, setSent] = useState(false);
  const c = t.contact;
  const ref = useRef<HTMLFormElement>(null);
  return (
    <section id="contact" className="relative overflow-hidden bg-ink px-4 py-12 text-ink-foreground sm:py-14">
      <img src={heroOrb} alt="" loading="lazy" className="animate-drift absolute inset-0 h-full w-full object-cover opacity-40" />
      <R className="relative mx-auto max-w-md">
        <form
          ref={ref}
          onSubmit={(e) => { e.preventDefault(); setSent(true); ref.current?.reset(); }}
          className="rounded-[2rem] border border-ink-foreground/15 bg-ink-foreground/10 p-8 shadow-lift backdrop-blur-xl"
        >
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight">{c.title}</h2>
          <p className="mt-2 text-center text-sm text-ink-foreground/60">{c.sub}</p>
          <div className="mt-6 space-y-3">
            <input required placeholder={c.name} className="w-full rounded-xl border border-ink-foreground/15 bg-ink/40 px-4 py-3 text-sm outline-none placeholder:text-ink-foreground/40 focus:border-ink-foreground/40" />
            <input required type="email" placeholder={c.email} className="w-full rounded-xl border border-ink-foreground/15 bg-ink/40 px-4 py-3 text-sm outline-none placeholder:text-ink-foreground/40 focus:border-ink-foreground/40" />
            <textarea required rows={3} placeholder={c.msg} className="w-full rounded-xl border border-ink-foreground/15 bg-ink/40 px-4 py-3 text-sm outline-none placeholder:text-ink-foreground/40 focus:border-ink-foreground/40" />
          </div>
          <Button variant="pill" size="pill" type="submit" className="action-pill action-pill-light mt-5 w-full py-3 text-sm font-semibold"><ActionText>{c.send}</ActionText></Button>
          {sent && <p className="mt-3 text-center text-sm text-ink-foreground/80">{c.sent}</p>}
        </form>
      </R>
    </section>
  );
}

