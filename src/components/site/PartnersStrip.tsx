import "@/lib/fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClaude, faGithub, faOpenai } from "@fortawesome/free-brands-svg-icons";
import type { SiteLang } from "@/lib/i18n";

// Landing page: a discreet grey band where the technologies TechNova is built on scroll by, logo first.
// Monochrome on purpose (the brands' colours would compete with the page). Static when reduced motion is asked.

const title: Record<SiteLang, string> = {
  fr: "Nos partenaires technologiques",
  en: "Our technology partners",
  es: "Nuestros socios tecnológicos",
  pt: "Os nossos parceiros tecnológicos",
};

function SupabaseMark() {
  return <svg viewBox="0 0 109 113" className="h-5 w-5" aria-hidden="true"><path d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3L54 40h45.7c8.3 0 12.9 9.6 7.7 16z" fill="#249361" /><path d="M45.3 2.1c2.9-3.6 8.7-1.6 8.8 3l.4 67.3H9.4c-8.3 0-12.9-9.6-7.7-16z" fill="#3ECF8E" /></svg>;
}
/** Google's four-colour "G". */
function GoogleMark() {
  return <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>;
}
function OpenRouterMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4c3 0 4-6 7-6h6" /><path d="M3 12h4c3 0 4 6 7 6h6" /><path d="m17 3 3 3-3 3" /><path d="m17 15 3 3-3 3" /></svg>;
}

// Each logo keeps its real colours; the band shows them in grey and a hovered one in its brand colours
// (logo and name). `dark` replaces a black brand colour in dark mode.
const partners: { name: string; brand: string; dark?: string; icon: React.ReactNode }[] = [
  { name: "Supabase", brand: "#3ECF8E", icon: <SupabaseMark /> },
  { name: "OpenAI", brand: "#000000", dark: "#ffffff", icon: <FontAwesomeIcon icon={faOpenai} className="h-5 w-5" /> },
  { name: "Google", brand: "#4285F4", icon: <GoogleMark /> },
  { name: "GitHub", brand: "#181717", dark: "#ffffff", icon: <FontAwesomeIcon icon={faGithub} className="h-5 w-5" /> },
  { name: "OpenRouter", brand: "#6467F2", icon: <OpenRouterMark /> },
  { name: "Claude", brand: "#D97757", icon: <FontAwesomeIcon icon={faClaude} className="h-5 w-5" /> },
];

export function PartnersStrip({ lang }: { lang: SiteLang }) {
  const row = [...partners, ...partners, ...partners];
  return <section aria-label={title[lang]} className="partners-strip border-y border-border/70 bg-neutral-100/80 py-5 dark:bg-white/[0.03]">
    <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title[lang]}</p>
    <div className="partners-mask relative overflow-hidden">
      <ul className="partners-track flex w-max items-center gap-12 pr-12">
        {[...row, ...row].map((p, i) => <li key={`${p.name}-${i}`} aria-hidden={i >= partners.length} className="partner-item flex shrink-0 items-center gap-2.5" style={{ ["--brand" as string]: p.brand, ["--brand-dark" as string]: p.dark ?? p.brand }}>
          {p.icon}<span className="font-display text-[15px] font-semibold tracking-tight">{p.name}</span>
        </li>)}
      </ul>
    </div>
  </section>;
}
