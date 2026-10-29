import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AudioLines, Clapperboard } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";
import { textModels } from "@/lib/public-models";
import { R } from "@/components/site/SiteChrome";

// Animated "TechNova Smart" diagram: a request is typed, travels to the router, and the model that
// TechNova Smart would really pick for it (same rules as /api/chat) lights up. Static when motion is reduced.

type Row = { name: string; logo?: string; icon?: typeof AudioLines; tone?: string };
const rows: Row[] = [
  { name: "GPT-4o Mini", logo: "openai" },
  { name: "Claude Sonnet 5", logo: "anthropic" },
  { name: "Gemini 2.5 Pro", logo: "googlegemini" },
  { name: "DeepSeek V3", logo: "deepseek" },
  { name: "Llama 3.3 70B", logo: "meta" },
  { name: "Mistral Large", logo: "mistralai" },
  { name: "images", icon: Clapperboard, tone: "bg-violet-500" },
  { name: "music", icon: AudioLines, tone: "bg-pink-500" },
];

const copy: Record<SiteLang, { tag: string; title: string; sub: string; app: string; hub: string; status: string; foot: string; images: string; music: string; credits: string; examples: [string, string][] }> = {
  fr: { tag: "TechNova Smart", title: "Une demande, le bon modèle.", sub: "TechNova Smart lit chaque demande et l'envoie au modèle le plus adapté et le moins cher. Vous ne payez que ce qui est utilisé.", app: "Votre demande", hub: "TechNova Smart", status: "Routage intelligent · Journalisé", foot: "Meilleur modèle · Coût optimisé · Facturation à l'usage", images: "Images & vidéos", music: "Musique", credits: "crédits",
    examples: [["Corrige ce bug dans mon code React", "DeepSeek V3"], ["Crée une landing page pour mon restaurant", "Claude Sonnet 5"], ["Conçois l'architecture complète d'une plateforme SaaS", "Gemini 2.5 Pro"], ["Résume cet article en 5 points clés", "GPT-4o Mini"]] },
  en: { tag: "TechNova Smart", title: "One request, the right model.", sub: "TechNova Smart reads every request and sends it to the most suitable, cheapest model. You only pay for what is used.", app: "Your request", hub: "TechNova Smart", status: "Smart routing · Logged", foot: "Best model · Optimized cost · Pay per use", images: "Images & video", music: "Music", credits: "credits",
    examples: [["Fix this bug in my React code", "DeepSeek V3"], ["Build a landing page for my restaurant", "Claude Sonnet 5"], ["Design the full architecture of a SaaS platform", "Gemini 2.5 Pro"], ["Summarize this article in 5 key points", "GPT-4o Mini"]] },
  es: { tag: "TechNova Smart", title: "Una petición, el modelo adecuado.", sub: "TechNova Smart lee cada petición y la envía al modelo más adecuado y económico. Solo pagas lo que se usa.", app: "Tu petición", hub: "TechNova Smart", status: "Enrutamiento inteligente · Registrado", foot: "Mejor modelo · Coste optimizado · Pago por uso", images: "Imágenes y vídeo", music: "Música", credits: "créditos",
    examples: [["Corrige este bug en mi código React", "DeepSeek V3"], ["Crea una landing page para mi restaurante", "Claude Sonnet 5"], ["Diseña la arquitectura completa de una plataforma SaaS", "Gemini 2.5 Pro"], ["Resume este artículo en 5 puntos clave", "GPT-4o Mini"]] },
  pt: { tag: "TechNova Smart", title: "Um pedido, o modelo certo.", sub: "O TechNova Smart lê cada pedido e o envia ao modelo mais adequado e mais barato. Você só paga o que é usado.", app: "Seu pedido", hub: "TechNova Smart", status: "Roteamento inteligente · Registrado", foot: "Melhor modelo · Custo otimizado · Pagamento por uso", images: "Imagens e vídeo", music: "Música", credits: "créditos",
    examples: [["Corrija este bug no meu código React", "DeepSeek V3"], ["Crie uma landing page para o meu restaurante", "Claude Sonnet 5"], ["Projete a arquitetura completa de uma plataforma SaaS", "Gemini 2.5 Pro"], ["Resuma este artigo em 5 pontos-chave", "GPT-4o Mini"]] },
};

const cost = (name: string) => textModels.find((m) => m.name === name)?.perMessage;

type Geometry = { w: number; h: number; inX: number; inY: number; hubL: number; hubR: number; hubY: number; rows: { x: number; y: number }[] } | null;

export function RoutingSection({ lang }: { lang: SiteLang }) {
  const t = copy[lang];
  const box = useRef<HTMLDivElement>(null), app = useRef<HTMLDivElement>(null), hub = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [geo, setGeo] = useState<Geometry>(null);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "sending" | "routed">("typing");
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);

  const [prompt, target] = t.examples[step % t.examples.length]!;
  const active = phase === "routed" ? rows.findIndex((r) => r.name === target) : -1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);

  // Measure the cards so the connectors start and end exactly on them.
  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current?.getBoundingClientRect(), a = app.current?.getBoundingClientRect(), h = hub.current?.getBoundingClientRect();
      if (!b || !a || !h || window.innerWidth < 1024) { setGeo(null); return; }
      setGeo({
        w: b.width, h: b.height, inX: a.right - b.left, inY: a.top + a.height / 2 - b.top,
        hubL: h.left - b.left, hubR: h.right - b.left, hubY: h.top + h.height / 2 - b.top,
        rows: rowRefs.current.map((r) => { const rr = r!.getBoundingClientRect(); return { x: rr.left - b.left, y: rr.top + rr.height / 2 - b.top }; }),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  // Cycle: type the request → send it to the router → light up the chosen model → next example.
  useEffect(() => {
    if (reduced) { setTyped(prompt); setPhase("routed"); return; }
    if (!visible) return;
    let i = 0; setTyped(""); setPhase("typing");
    const timers: number[] = [];
    const type = window.setInterval(() => {
      i++; setTyped(prompt.slice(0, i));
      if (i >= prompt.length) {
        window.clearInterval(type);
        timers.push(window.setTimeout(() => setPhase("sending"), 300));
        timers.push(window.setTimeout(() => setPhase("routed"), 1300));
        timers.push(window.setTimeout(() => setStep((s) => s + 1), 4200));
      }
    }, 34);
    return () => { window.clearInterval(type); timers.forEach(window.clearTimeout); };
  }, [prompt, reduced, visible]);

  const label = (r: Row) => (r.name === "images" ? t.images : r.name === "music" ? t.music : r.name);
  const curve = (x0: number, y0: number, x1: number, y1: number) => { const mx = (x0 + x1) / 2; return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`; };

  return <section className="px-4 py-6 sm:py-8">
    <R className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
      <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft"><span className="h-1.5 w-1.5 rounded-full bg-iris" />{t.tag}</span>
      <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{t.title}</h2>
      <p className="mt-3 text-muted-foreground">{t.sub}</p>
    </R>
    <R className="mx-auto max-w-6xl">
      <div ref={box} className="relative overflow-hidden rounded-[2rem] bg-ink p-5 text-ink-foreground shadow-lift sm:p-8 md:rounded-[2.5rem]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,oklch(1_0_0/0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-foreground/50">TechNova AI Hub</p>

        {geo && <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={geo.w} height={geo.h}>
          <defs>
            <linearGradient id="route-grad" x1="0" x2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
          </defs>
          <path d={`M${geo.inX},${geo.inY} L${geo.hubL},${geo.hubY}`} stroke="oklch(1 0 0 / 0.22)" strokeWidth="1.2" strokeDasharray="2 5" fill="none" />
          {phase === "sending" && !reduced && <circle r="4" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 6px #22d3ee)" }}>
            <animateMotion dur="0.9s" fill="freeze" path={`M${geo.inX},${geo.inY} L${geo.hubL},${geo.hubY}`} />
          </circle>}
          {geo.rows.map((r, i) => <path key={i} d={curve(geo.hubR, geo.hubY, r.x, r.y)} stroke="oklch(1 0 0 / 0.16)" strokeWidth="1" strokeDasharray="2 5" fill="none" />)}
          {active >= 0 && geo.rows[active] && <path key={`${step}-${active}`} className="route-draw" d={curve(geo.hubR, geo.hubY, geo.rows[active]!.x, geo.rows[active]!.y)} stroke="url(#route-grad)" strokeWidth="2.4" fill="none" strokeLinecap="round" pathLength={1} style={{ filter: "drop-shadow(0 0 6px rgb(139 92 246 / 0.7))" }} />}
        </svg>}

        <div className="relative mt-6 grid items-center gap-8 lg:mt-10 lg:grid-cols-[1fr_1fr_1.15fr] lg:gap-6">
          <div ref={app} className="rounded-2xl border border-ink-foreground/12 bg-ink-foreground/[0.04] p-5 backdrop-blur">
            <div className="flex items-center justify-between"><span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-foreground/60">{t.app}</span><span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">Smart</span></div>
            <div className="mt-4 min-h-[76px] rounded-xl bg-ink-foreground/[0.06] px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-foreground/90">
              {typed}<span className={`ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-ink-foreground/70 ${phase === "typing" && !reduced ? "animate-pulse" : "opacity-0"}`} />
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <div ref={hub} className={`relative grid size-20 place-items-center rounded-[22px] border border-ink-foreground/20 bg-black shadow-[0_0_60px_-10px_rgba(139,92,246,0.55)] transition-transform duration-500 ${phase === "sending" ? "scale-110" : ""}`}>
              <span aria-hidden="true" className={`absolute -inset-6 rounded-full bg-violet-500/20 blur-2xl transition-opacity duration-500 ${phase === "typing" ? "opacity-40" : "opacity-100"}`} />
              <span className="relative font-display text-4xl font-bold text-white">T<span className="text-lime-300">.</span></span>
            </div>
            <p className="mt-4 font-display text-lg font-semibold">{t.hub}</p>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-foreground/75"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60 motion-reduce:animate-none" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span>{t.status}</p>
            <p className="mt-2 text-[12px] text-ink-foreground/45">{t.foot}</p>
          </div>

          <ul className="space-y-2.5">{rows.map((r, i) => {
            const on = i === active; const credits = cost(r.name); const Icon = r.icon;
            return <li key={r.name} ref={(el) => { rowRefs.current[i] = el; }}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${on ? "border-violet-400/70 bg-violet-500/15 shadow-[0_0_30px_-8px_rgba(139,92,246,0.8)]" : "border-ink-foreground/10 bg-ink-foreground/[0.03]"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${Icon ? `${r.tone} text-white` : "bg-white"}`}>
                {Icon ? <Icon className="size-4" /> : <img src={`https://cdn.simpleicons.org/${r.logo}`} alt="" width={16} height={16} className="size-4" loading="lazy" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("span"), { textContent: r.name[0], className: "text-xs font-bold text-black" })); }} />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[14px] ${on ? "font-semibold text-white" : "text-ink-foreground/75"}`}>{label(r)}</span>
              {on && credits !== undefined && <span className="shrink-0 font-mono text-[11.5px] font-semibold text-emerald-300 animate-fade-in">≈ {credits} {t.credits}</span>}
            </li>;
          })}</ul>
        </div>
      </div>
    </R>
  </section>;
}
