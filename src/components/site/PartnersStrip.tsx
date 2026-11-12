import "@/lib/fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClaude, faGithub, faGoogle, faOpenai } from "@fortawesome/free-brands-svg-icons";
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
  return <svg viewBox="0 0 109 113" className="h-5 w-5" aria-hidden="true"><path d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3L54 40h45.7c8.3 0 12.9 9.6 7.7 16z" fill="currentColor" opacity=".75" /><path d="M45.3 2.1c2.9-3.6 8.7-1.6 8.8 3l.4 67.3H9.4c-8.3 0-12.9-9.6-7.7-16z" fill="currentColor" /></svg>;
}
function OpenRouterMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4c3 0 4-6 7-6h6" /><path d="M3 12h4c3 0 4 6 7 6h6" /><path d="m17 3 3 3-3 3" /><path d="m17 15 3 3-3 3" /></svg>;
}

const partners: { name: string; icon: React.ReactNode }[] = [
  { name: "Supabase", icon: <SupabaseMark /> },
  { name: "OpenAI", icon: <FontAwesomeIcon icon={faOpenai} className="h-5 w-5" /> },
  { name: "Google", icon: <FontAwesomeIcon icon={faGoogle} className="h-5 w-5" /> },
  { name: "GitHub", icon: <FontAwesomeIcon icon={faGithub} className="h-5 w-5" /> },
  { name: "OpenRouter", icon: <OpenRouterMark /> },
  { name: "Claude", icon: <FontAwesomeIcon icon={faClaude} className="h-5 w-5" /> },
];

export function PartnersStrip({ lang }: { lang: SiteLang }) {
  const row = [...partners, ...partners, ...partners];
  return <section aria-label={title[lang]} className="partners-strip border-y border-border/70 bg-neutral-100/80 py-5 dark:bg-white/[0.03]">
    <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title[lang]}</p>
    <div className="partners-mask relative overflow-hidden">
      <ul className="partners-track flex w-max items-center gap-12 pr-12">
        {[...row, ...row].map((p, i) => <li key={`${p.name}-${i}`} aria-hidden={i >= partners.length} className="flex shrink-0 items-center gap-2.5 text-neutral-500 transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">
          {p.icon}<span className="font-display text-[15px] font-semibold tracking-tight">{p.name}</span>
        </li>)}
      </ul>
    </div>
  </section>;
}
