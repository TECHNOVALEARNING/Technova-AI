import { ArrowUpRight } from "lucide-react";
import type { SiteLang as Lang } from "@/lib/i18n";

// Footer trust marks (official EU data-protection pages) and "coming soon" store badges.

const EU_DATA_PROTECTION = "https://commission.europa.eu/law/law-topic/data-protection_en";
const EDPB_RIGHTS = "https://www.edpb.europa.eu/topics/key-gdpr-concepts/data-subject-rights_en";

const copy: Record<Lang, { eu: [string, string]; rgpd: [string, string]; soon: string; storeLabel: string }> = {
  fr: { eu: ["UE · Protection des données", "Informations RGPD officielles"], rgpd: ["Droits RGPD", "Accès · rectification · suppression"], soon: "Bientôt disponible sur", storeLabel: "Applications mobiles bientôt disponibles" },
  en: { eu: ["EU · Data protection", "Official GDPR information"], rgpd: ["GDPR rights", "Access · rectification · erasure"], soon: "Coming soon on", storeLabel: "Mobile apps coming soon" },
  es: { eu: ["UE · Protección de datos", "Información oficial del RGPD"], rgpd: ["Derechos RGPD", "Acceso · rectificación · supresión"], soon: "Muy pronto en", storeLabel: "Aplicaciones móviles muy pronto" },
  pt: { eu: ["UE · Proteção de dados", "Informações oficiais do RGPD"], rgpd: ["Direitos RGPD", "Acesso · retificação · apagamento"], soon: "Em breve", storeLabel: "Aplicações móveis em breve" },
};

function EuFlag() {
  // 12 five-pointed stars on a circle, per the official EU emblem geometry.
  const star = "M0,-1 L0.2245,-0.309 L0.951,-0.309 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.951,-0.309 L-0.2245,-0.309Z";
  return (
    <svg viewBox="0 0 30 20" className="h-6 w-9 shrink-0 rounded-[3px] shadow-sm" aria-hidden="true">
      <rect width="30" height="20" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <path key={i} d={star} fill="#FFCC00" transform={`translate(${15 + 6 * Math.sin(a)} ${10 - 6 * Math.cos(a)}) scale(1.1)`} />;
      })}
    </svg>
  );
}

function TrustCard({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft transition hover:-translate-y-0.5 hover:border-foreground/20">
      {icon}
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-foreground">{title}<ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-60" /></span>
        <span className="block truncate text-[11.5px] text-muted-foreground">{sub}</span>
      </span>
    </a>
  );
}

export function TrustBadges({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <div className="flex flex-wrap gap-3">
      <TrustCard href={EU_DATA_PROTECTION} icon={<EuFlag />} title={t.eu[0]} sub={t.eu[1]} />
      <TrustCard href={EDPB_RIGHTS} icon={<img src="/badges/rgpd-seal.webp" alt="" width={36} height={36} className="size-9 shrink-0 rounded-full" />} title={t.rgpd[0]} sub={t.rgpd[1]} />
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px] shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px] shrink-0" aria-hidden="true">
      <path d="M3.6 2.2 13.2 12l-9.6 9.8a1.6 1.6 0 0 1-.5-1.2V3.4c0-.5.2-.9.5-1.2Z" fill="#00A0FF" />
      <path d="M3.6 2.2c.5-.4 1.2-.5 1.9-.1l11 6.3-3.3 3.6Z" fill="#00E676" />
      <path d="M13.2 12l3.3 3.6-11 6.3c-.7.4-1.4.3-1.9-.1Z" fill="#FF3A44" />
      <path d="M16.5 8.4 20 10.4c1.2.7 1.2 2.5 0 3.2l-3.5 2L13.2 12Z" fill="#FFC107" />
    </svg>
  );
}

function StoreBadge({ logo, top, name }: { logo: React.ReactNode; top: string; name: string }) {
  return (
    <span className="inline-flex h-[46px] items-center gap-2.5 rounded-[12px] border border-white/15 bg-black px-3.5 text-white shadow-soft">
      {logo}
      <span className="leading-none">
        <span className="block text-[9.5px] font-medium tracking-wide text-white/75">{top}</span>
        <span className="mt-0.5 block text-[17px] font-semibold tracking-tight">{name}</span>
      </span>
    </span>
  );
}

/** Not links yet: the native apps are not published. */
export function StoreBadges({ lang, className = "" }: { lang: Lang; className?: string }) {
  const t = copy[lang];
  return (
    <div role="group" aria-label={t.storeLabel} className={`flex flex-wrap gap-2.5 ${className}`}>
      <StoreBadge logo={<AppleLogo />} top={t.soon} name="App Store" />
      <StoreBadge logo={<PlayLogo />} top={t.soon} name="Google Play" />
    </div>
  );
}
