import { useState } from "react";
import { Clapperboard, Globe, Image as ImageIcon, MessageCircle, Music2, Sparkles } from "lucide-react";
import { chatTierCredits } from "@/lib/chat-modes";
import { mediaTiers } from "@/lib/media-models";
import { STUDIO_COST } from "@/lib/studio";
import type { SiteLang } from "@/lib/i18n";
import type { PublicPack } from "@/lib/public-pricing";

// « Que pouvez-vous faire avec ce pack ? » under the pricing cards: one pack at a time, how many of each creation
// its credits cover. Every figure is read from the real prices (chat-modes, media-models, studio), so it follows
// any price change; each figure is the maximum if the whole pack went to that one use.
const studioSite = STUDIO_COST.questions + STUDIO_COST.plan + STUDIO_COST.build;
const uses = [
  { key: "eclair", icon: MessageCircle, credits: chatTierCredits("eclair", false, 0), minTier: 0 },
  { key: "equilibre", icon: Sparkles, credits: chatTierCredits("equilibre", false, 0), minTier: 0 },
  { key: "image", icon: ImageIcon, credits: mediaTiers.image_rapide.credits, minTier: 0 },
  { key: "music", icon: Music2, credits: mediaTiers.musique.credits, minTier: 0 },
  { key: "video", icon: Clapperboard, credits: mediaTiers.video_fast.credits, minTier: 2 },
  { key: "site", icon: Globe, credits: studioSite, minTier: 1 },
] as const;
type UseKey = (typeof uses)[number]["key"];

const copy: Record<SiteLang, { title: string; note: string; from: string; labels: Record<UseKey, string> }> = {
  fr: { title: "Que pouvez-vous faire avec ce pack ?", note: "Maximum si tout le pack sert à une seule chose ; en pratique, vous combinez. Prix minimum par création, le coût réel s'applique au-delà.", from: "dès Creator",
    labels: { eclair: "messages Éclair", equilibre: "messages Équilibré", image: "images", music: "chansons", video: "vidéos de 5 s", site: "sites web (Studio)" } },
  en: { title: "What can you do with this pack?", note: "Maximum if the whole pack goes to one use; in practice you mix. Minimum price per creation, real cost applies beyond.", from: "from Creator",
    labels: { eclair: "Flash messages", equilibre: "Balanced messages", image: "images", music: "songs", video: "5-second videos", site: "websites (Studio)" } },
  es: { title: "¿Qué puede hacer con este pack?", note: "Máximo si todo el pack se usa para una sola cosa; en la práctica, combina. Precio mínimo por creación, se aplica el coste real por encima.", from: "desde Creator",
    labels: { eclair: "mensajes Rápido", equilibre: "mensajes Equilibrado", image: "imágenes", music: "canciones", video: "vídeos de 5 s", site: "sitios web (Studio)" } },
  pt: { title: "O que você pode fazer com este pacote?", note: "Máximo se todo o pacote for para um único uso; na prática, você combina. Preço mínimo por criação, o custo real vale acima disso.", from: "a partir do Creator",
    labels: { eclair: "mensagens Rápido", equilibre: "mensagens Equilibrado", image: "imagens", music: "músicas", video: "vídeos de 5 s", site: "sites (Studio)" } },
};
const locales: Record<SiteLang, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" };
/** Plan level of a pack (as account_tier): video needs Creator, websites Essential. Monthly formulas open Creator / Pro. */
const packTier: Record<string, number> = { starter: 0, essential: 1, creator: 2, pro: 3, "mensuel-plus": 2, "mensuel-pro": 3 };

export function PackCalculator({ lang, packs, glass = false }: { lang: SiteLang; packs: PublicPack[]; glass?: boolean }) {
  const t = copy[lang] ?? copy.fr; const loc = locales[lang];
  const [slug, setSlug] = useState<string | null>(null);
  const pack = packs.find((p) => p.slug === slug) ?? packs.find((p) => p.featured) ?? packs[0];
  if (!pack) return null;
  const tier = packTier[pack.slug] ?? 0;
  return <div className={`mt-6 rounded-2xl border p-5 sm:p-6 ${glass ? "glass-card" : "border-border bg-card"}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-lg font-semibold">{t.title}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.title}>{packs.map((p) => <button key={p.slug} type="button" role="radio" aria-checked={p.slug === pack.slug} onClick={() => setSlug(p.slug)}
        className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${p.slug === pack.slug ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}>{p.name} · {p.credits.toLocaleString(loc)}</button>)}</div>
    </div>
    <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{uses.map((u) => {
      const locked = tier < u.minTier;
      const Icon = u.icon;
      return <li key={u.key} className={`rounded-xl border border-border/70 bg-background/60 px-3 py-3 ${locked ? "opacity-55" : ""}`}>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">{locked ? "—" : Math.floor(pack.credits / u.credits).toLocaleString(loc)}</p>
        <p className="text-[12px] leading-snug text-muted-foreground">{t.labels[u.key]}{locked ? ` · ${u.minTier === 2 ? t.from : "Essential +"}` : ""}</p>
      </li>;
    })}</ul>
    <p className="mt-3 text-[12px] text-muted-foreground">{t.note}</p>
  </div>;
}
