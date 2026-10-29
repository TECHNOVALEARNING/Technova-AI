import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SiteLang } from "@/lib/i18n";
import { fallbackPacks, type PublicPack } from "@/lib/public-pricing";

// Feature comparison table under the packs on /tarifs. Columns follow the packs on sale (prices from credit_packs).

type Cell = "y" | "p" | "n" | [("y" | "p"), NoteKey];
type NoteKey = "partial" | "all" | "quota" | "included" | "oneSite" | "unlimited" | "linkOnly" | "oneClick" | "limitedQuota" | "higherQuota" | "underQuota" | "standard" | "enhanced" | "envLimits" | "generous" | "tbd";
type L = Record<SiteLang, string>;

const notes: Record<NoteKey, L> = {
  partial: { fr: "Partiel", en: "Partial", es: "Parcial", pt: "Parcial" },
  all: { fr: "Tous", en: "All", es: "Todos", pt: "Todos" },
  quota: { fr: "Quota", en: "Quota", es: "Cuota", pt: "Cota" },
  included: { fr: "Inclus", en: "Included", es: "Incluido", pt: "Incluído" },
  oneSite: { fr: "1 site", en: "1 site", es: "1 sitio", pt: "1 site" },
  unlimited: { fr: "Illimité", en: "Unlimited", es: "Ilimitado", pt: "Ilimitado" },
  linkOnly: { fr: "Lien seul", en: "Link only", es: "Solo enlace", pt: "Só link" },
  oneClick: { fr: "1 clic", en: "1 click", es: "1 clic", pt: "1 clique" },
  limitedQuota: { fr: "Quota limité", en: "Limited quota", es: "Cuota limitada", pt: "Cota limitada" },
  higherQuota: { fr: "Quota supérieur", en: "Higher quota", es: "Cuota superior", pt: "Cota superior" },
  underQuota: { fr: "Sous quota", en: "Within quota", es: "Con cuota", pt: "Com cota" },
  standard: { fr: "Standard", en: "Standard", es: "Estándar", pt: "Padrão" },
  enhanced: { fr: "Renforcées", en: "Enhanced", es: "Reforzados", pt: "Reforçados" },
  envLimits: { fr: "Limites env.", en: "Env. limits", es: "Límites del entorno", pt: "Limites do ambiente" },
  generous: { fr: "Généreuses", en: "Generous", es: "Generosos", pt: "Generosos" },
  tbd: { fr: "À définir", en: "To be defined", es: "Por definir", pt: "A definir" },
};

type Group = { title: L; soon?: boolean; rows: { label: L; cells: [Cell, Cell, Cell, Cell] }[] };

const groups: Group[] = [
  { title: { fr: "Chat & intelligence", en: "Chat & intelligence", es: "Chat e inteligencia", pt: "Chat e inteligência" }, rows: [
    { label: { fr: "Chat multi-modèles GPT, Claude, Gemini, DeepSeek", en: "Multi-model chat: GPT, Claude, Gemini, DeepSeek", es: "Chat multimodelo GPT, Claude, Gemini, DeepSeek", pt: "Chat multimodelo GPT, Claude, Gemini, DeepSeek" }, cells: [["p", "partial"], ["y", "all"], ["y", "all"], ["y", "all"]] },
    { label: { fr: "TechNova Smart (modèle le moins cher auto)", en: "TechNova Smart (cheapest model, automatically)", es: "TechNova Smart (modelo más económico automático)", pt: "TechNova Smart (modelo mais barato automático)" }, cells: ["y", "y", "y", "y"] },
    { label: { fr: "Analyse de fichiers : images, PDF, audio", en: "File analysis: images, PDF, audio", es: "Análisis de archivos: imágenes, PDF, audio", pt: "Análise de arquivos: imagens, PDF, áudio" }, cells: ["y", "y", "y", "y"] },
  ] },
  { title: { fr: "Création visuelle & sites", en: "Visual creation & websites", es: "Creación visual y sitios", pt: "Criação visual e sites" }, rows: [
    { label: { fr: "Génération d'images IA", en: "AI image generation", es: "Generación de imágenes con IA", pt: "Geração de imagens com IA" }, cells: [["p", "quota"], ["y", "included"], ["y", "included"], ["y", "included"]] },
    { label: { fr: "Génération de vidéos IA", en: "AI video generation", es: "Generación de vídeos con IA", pt: "Geração de vídeos com IA" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "TechNova Studio : site complet depuis une idée", en: "TechNova Studio: a full website from one idea", es: "TechNova Studio: sitio completo a partir de una idea", pt: "TechNova Studio: site completo a partir de uma ideia" }, cells: ["n", ["y", "oneSite"], ["y", "unlimited"], ["y", "unlimited"]] },
    { label: { fr: "Publication en 1 clic + partage par lien", en: "One-click publishing + link sharing", es: "Publicación en 1 clic + compartir por enlace", pt: "Publicação em 1 clique + compartilhamento por link" }, cells: ["n", ["p", "linkOnly"], ["y", "oneClick"], ["y", "oneClick"]] },
  ] },
  { title: { fr: "Développement & code", en: "Development & code", es: "Desarrollo y código", pt: "Desenvolvimento e código" }, soon: true, rows: [
    { label: { fr: "Accès au terminal cloud", en: "Cloud terminal access", es: "Acceso al terminal en la nube", pt: "Acesso ao terminal na nuvem" }, cells: ["n", "n", ["p", "limitedQuota"], ["y", "higherQuota"]] },
    { label: { fr: "Assistant IA pour coder", en: "AI coding assistant", es: "Asistente de IA para programar", pt: "Assistente de IA para programar" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "Génération de code", en: "Code generation", es: "Generación de código", pt: "Geração de código" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "Modification de fichiers par l'IA", en: "File editing by AI", es: "Modificación de archivos por la IA", pt: "Edição de arquivos pela IA" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "Exécution de commandes", en: "Command execution", es: "Ejecución de comandos", pt: "Execução de comandos" }, cells: ["n", "n", ["p", "underQuota"], ["y", "higherQuota"]] },
    { label: { fr: "Prévisualisation des applications", en: "App preview", es: "Vista previa de aplicaciones", pt: "Pré-visualização de aplicativos" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "Gestion de projets", en: "Project management", es: "Gestión de proyectos", pt: "Gestão de projetos" }, cells: ["n", "n", ["p", "limitedQuota"], ["y", "higherQuota"]] },
    { label: { fr: "Ressources CPU / RAM", en: "CPU / RAM resources", es: "Recursos de CPU / RAM", pt: "Recursos de CPU / RAM" }, cells: ["n", "n", ["p", "standard"], ["y", "enhanced"]] },
    { label: { fr: "Développement d'applications complètes", en: "Full application development", es: "Desarrollo de aplicaciones completas", pt: "Desenvolvimento de aplicativos completos" }, cells: ["n", ["p", "envLimits"], ["p", "envLimits"], ["y", "generous"]] },
    { label: { fr: "Déploiement en production", en: "Production deployment", es: "Despliegue en producción", pt: "Implantação em produção" }, cells: ["n", "n", ["p", "tbd"], ["p", "tbd"]] },
  ] },
  { title: { fr: "Agents & pro", en: "Agents & pro", es: "Agentes y pro", pt: "Agentes e pro" }, rows: [
    { label: { fr: "Agents IA personnalisés (web, lecture de pages)", en: "Custom AI agents (web, page reading)", es: "Agentes de IA personalizados (web, lectura de páginas)", pt: "Agentes de IA personalizados (web, leitura de páginas)" }, cells: ["n", "n", "y", "y"] },
    { label: { fr: "Agents avec budget maîtrisé par réponse", en: "Agents with a per-reply budget", es: "Agentes con presupuesto controlado por respuesta", pt: "Agentes com orçamento controlado por resposta" }, cells: ["n", "n", "n", "y"] },
    { label: { fr: "Clés API : tous les modèles via 1 API", en: "API keys: every model through one API", es: "Claves API: todos los modelos con 1 API", pt: "Chaves de API: todos os modelos por 1 API" }, cells: ["n", "n", "n", "y"] },
    { label: { fr: "Envoi vers GitHub + connexion Supabase perso", en: "Push to GitHub + your own Supabase", es: "Envío a GitHub + conexión a tu Supabase", pt: "Envio para o GitHub + conexão ao seu Supabase" }, cells: ["n", "n", "n", "y"] },
    { label: { fr: "Suivi détaillé de la consommation", en: "Detailed usage tracking", es: "Seguimiento detallado del consumo", pt: "Acompanhamento detalhado do consumo" }, cells: ["n", "n", "n", "y"] },
    { label: { fr: "Crédits sans date d'expiration", en: "Credits that never expire", es: "Créditos sin fecha de caducidad", pt: "Créditos sem data de expiração" }, cells: ["y", "y", "y", "y"] },
  ] },
];

const text = {
  fr: { title: "Comparatif des fonctionnalités par formule", sub: "Paiement unique • crédits prépayés • aucun renouvellement automatique", included: "Inclus", limited: "Accès limité", none: "Non inclus", feature: "Fonctionnalité", credits: "crédits", recommended: "Recommandé", popular: "Le plus populaire", soon: "Bientôt disponible", foot: "Disponibilité des fonctionnalités par formule. Paiement unique • crédits prépayés." },
  en: { title: "Feature comparison by plan", sub: "One-time payment • prepaid credits • no automatic renewal", included: "Included", limited: "Limited access", none: "Not included", feature: "Feature", credits: "credits", recommended: "Recommended", popular: "Most popular", soon: "Coming soon", foot: "Feature availability by plan. One-time payment • prepaid credits." },
  es: { title: "Comparativa de funciones por plan", sub: "Pago único • créditos prepagados • sin renovación automática", included: "Incluido", limited: "Acceso limitado", none: "No incluido", feature: "Función", credits: "créditos", recommended: "Recomendado", popular: "El más popular", soon: "Muy pronto", foot: "Disponibilidad de funciones por plan. Pago único • créditos prepagados." },
  pt: { title: "Comparativo de recursos por plano", sub: "Pagamento único • créditos pré-pagos • sem renovação automática", included: "Incluído", limited: "Acesso limitado", none: "Não incluído", feature: "Recurso", credits: "créditos", recommended: "Recomendado", popular: "O mais popular", soon: "Em breve", foot: "Disponibilidade de recursos por plano. Pagamento único • créditos pré-pagos." },
} satisfies Record<SiteLang, unknown>;

const ORDER = ["starter", "essential", "creator", "pro"];

function Mark({ cell, lang, t }: { cell: Cell; lang: SiteLang; t: (typeof text)["fr"] }) {
  const [kind, note] = Array.isArray(cell) ? cell : [cell, null];
  return <div className="flex flex-col items-center gap-1">
    {kind === "y" ? <span className="grid size-6 place-items-center rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" aria-label={t.included}><Check className="size-3.5" strokeWidth={3} /></span>
      : kind === "p" ? <span className="grid size-6 place-items-center rounded-md bg-secondary" aria-label={t.limited}><span className="size-2 rounded-full bg-foreground/60" /></span>
      : <span aria-label={t.none} className="grid size-6 place-items-center text-muted-foreground/50"><Minus className="size-3.5" /></span>}
    {note && <span className="text-center text-[11px] leading-tight text-muted-foreground">{notes[note][lang]}</span>}
  </div>;
}

export function PlanComparison({ lang }: { lang: SiteLang }) {
  const t = text[lang]; const loc = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" }[lang];
  const [packs, setPacks] = useState<PublicPack[]>(fallbackPacks);
  useEffect(() => {
    void supabase.from("credit_packs").select("slug,name,price_xof,credits,featured").eq("active", true).then(({ data }) => {
      const sold = (data ?? []).filter((p) => ORDER.includes(p.slug));
      if (sold.length === 4) setPacks(ORDER.map((s) => sold.find((p) => p.slug === s)!));
    });
  }, []);
  const proIdx = 3, recoIdx = 2;
  const col = (i: number) => (i === proIdx ? "bg-supabase/[0.06]" : "");
  return <section className="px-5 pb-16">
    <div className="mx-auto max-w-7xl">
      <h2 className="font-display text-2xl font-semibold md:text-3xl">{t.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t.sub}</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2"><Mark cell="y" lang={lang} t={t} />{t.included}</span>
        <span className="flex items-center gap-2"><Mark cell="p" lang={lang} t={t} />{t.limited}</span>
        <span className="flex items-center gap-2"><Mark cell="n" lang={lang} t={t} />{t.none}</span>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-[38%] bg-secondary/95 p-4 text-left font-display text-base font-semibold">{t.feature}</th>
              {packs.map((p, i) => <th key={p.slug} scope="col" className={`border-l border-border p-4 text-left align-top font-normal ${col(i)}`}>
                {i === recoIdx && <span className="mb-1.5 inline-block rounded-full bg-supabase px-2 py-0.5 text-[10px] font-semibold text-white">{t.recommended}</span>}
                {i === proIdx && <span className="mb-1.5 inline-block rounded-full bg-supabase px-2 py-0.5 text-[10px] font-semibold uppercase text-white">{t.popular}</span>}
                <span className="block font-display text-base font-semibold">{p.name}</span>
                <span className="block text-[13px] font-medium">{p.price_xof.toLocaleString(loc)} FCFA</span>
                <span className="block text-[11px] text-muted-foreground">{p.credits.toLocaleString(loc)} {t.credits}</span>
              </th>)}
            </tr>
          </thead>
          {groups.map((g) => <tbody key={g.title.fr}>
            <tr><th colSpan={5} scope="colgroup" className="bg-secondary/40 px-4 py-2.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {g.title[lang]}{g.soon && <span className="ml-2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] normal-case tracking-normal">{t.soon}</span>}
            </th></tr>
            {g.rows.map((r) => <tr key={r.label.fr} className="border-t border-border">
              <th scope="row" className="sticky left-0 bg-card p-4 text-left font-normal">{r.label[lang]}</th>
              {r.cells.map((c, i) => <td key={i} className={`border-l border-border p-3 ${col(i)}`}><Mark cell={c} lang={lang} t={t} /></td>)}
            </tr>)}
          </tbody>)}
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t.foot}</p>
    </div>
  </section>;
}
