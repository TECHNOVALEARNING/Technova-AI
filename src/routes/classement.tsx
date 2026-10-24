import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { getPublicRanking } from "@/lib/leaderboard.functions";
import type { SiteLang } from "@/lib/i18n";

export const Route = createFileRoute("/classement")({
  loader: () => getPublicRanking(),
  head: () => ({ meta: [
    { title: "Classement des modèles d'IA — TechNova Arena" },
    { name: "description", content: "Quel modèle d'IA répond le mieux ? Le classement TechNova Arena repose sur les votes à l'aveugle de nos utilisateurs : GPT, Claude, Gemini, DeepSeek, Llama, Mistral…" },
    { property: "og:title", content: "Classement des modèles d'IA — TechNova Arena" },
    { property: "og:description", content: "Le classement des modèles d'IA établi par les votes à l'aveugle de la communauté TechNova." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RankingPage,
});

const text = {
  fr: { tag: "TechNova Arena", title: "Le classement des modèles d'IA.", sub: "Deux modèles anonymes répondent à la même question ; nos utilisateurs votent pour la meilleure réponse, sans savoir qui l'a écrite.", votes: "votes à l'aveugle", models: "modèles classés", rank: "Rang", model: "Modèle", winRate: "Taux de victoire", battles: "Duels", wins: "Victoires", ties: "Égalités", empty: "Le classement s'affichera dès les premiers votes. Lancez un duel pour y contribuer !", provisional: "Classement provisoire : moins de 30 duels pour ce modèle.", how: "Comment c'est calculé ?", howText: "Seuls les duels à l'aveugle comptent : les noms ne sont révélés qu'après le vote. Une victoire vaut 1 point, une égalité 0,5 ; le taux de victoire est la moyenne de ces points.", cta: "Lancer un duel", ctaText: "Posez votre question à deux modèles mystères et votez." },
  en: { tag: "TechNova Arena", title: "The AI model leaderboard.", sub: "Two anonymous models answer the same question; our users vote for the better answer without knowing who wrote it.", votes: "blind votes", models: "ranked models", rank: "Rank", model: "Model", winRate: "Win rate", battles: "Battles", wins: "Wins", ties: "Ties", empty: "The leaderboard appears with the first votes. Start a battle to contribute!", provisional: "Provisional: fewer than 30 battles for this model.", how: "How is it calculated?", howText: "Only blind battles count: names are revealed after the vote. A win is worth 1 point, a tie 0.5; the win rate is the average of these points.", cta: "Start a battle", ctaText: "Ask two mystery models your question and vote." },
  es: { tag: "TechNova Arena", title: "La clasificación de los modelos de IA.", sub: "Dos modelos anónimos responden a la misma pregunta; nuestros usuarios votan la mejor respuesta sin saber quién la escribió.", votes: "votos a ciegas", models: "modelos clasificados", rank: "Puesto", model: "Modelo", winRate: "Tasa de victoria", battles: "Duelos", wins: "Victorias", ties: "Empates", empty: "La clasificación aparecerá con los primeros votos. ¡Lanza un duelo para contribuir!", provisional: "Provisional: menos de 30 duelos para este modelo.", how: "¿Cómo se calcula?", howText: "Solo cuentan los duelos a ciegas: los nombres se revelan tras el voto. Una victoria vale 1 punto y un empate 0,5; la tasa de victoria es la media de esos puntos.", cta: "Lanzar un duelo", ctaText: "Haz tu pregunta a dos modelos misteriosos y vota." },
  pt: { tag: "TechNova Arena", title: "O ranking dos modelos de IA.", sub: "Dois modelos anônimos respondem à mesma pergunta; nossos usuários votam na melhor resposta sem saber quem a escreveu.", votes: "votos às cegas", models: "modelos classificados", rank: "Posição", model: "Modelo", winRate: "Taxa de vitória", battles: "Duelos", wins: "Vitórias", ties: "Empates", empty: "O ranking aparecerá com os primeiros votos. Inicie um duelo para contribuir!", provisional: "Provisório: menos de 30 duelos para este modelo.", how: "Como é calculado?", howText: "Só contam os duelos às cegas: os nomes são revelados após o voto. Uma vitória vale 1 ponto e um empate 0,5; a taxa de vitória é a média desses pontos.", cta: "Iniciar um duelo", ctaText: "Faça sua pergunta a dois modelos misteriosos e vote." },
} satisfies Record<SiteLang, unknown>;

const MIN_BATTLES = 30;
const medal = ["🥇", "🥈", "🥉"];

function RankingPage() {
  const { rows, votes } = Route.useLoaderData();
  const [lang, setLang] = useSiteLang(); const t = text[lang];
  const loc = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" }[lang];
  useReveal();
  const best = rows[0]?.score ?? 100;
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <Nav lang={lang} setLang={setLang} />
    <PageHero tag={t.tag} title={t.title} sub={t.sub}>
      <div className="mt-8 flex justify-center gap-10 text-ink-foreground">
        <div><p className="font-display text-3xl font-semibold tabular-nums">{votes.toLocaleString(loc)}</p><p className="text-xs text-ink-foreground/60">{t.votes}</p></div>
        <div><p className="font-display text-3xl font-semibold tabular-nums">{rows.length}</p><p className="text-xs text-ink-foreground/60">{t.models}</p></div>
      </div>
    </PageHero>
    <section className="px-5 py-10"><div className="mx-auto max-w-4xl">
      {rows.length === 0
        ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><Trophy className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{t.empty}</p></div>
        : <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[56px_1fr_120px] gap-3 border-b border-border px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[56px_1fr_220px_72px_72px_72px]">
            <span>{t.rank}</span><span>{t.model}</span><span>{t.winRate}</span><span className="hidden text-right sm:block">{t.battles}</span><span className="hidden text-right sm:block">{t.wins}</span><span className="hidden text-right sm:block">{t.ties}</span>
          </div>
          <ol>{rows.map((r, i) => <li key={r.model} className="grid grid-cols-[56px_1fr_120px] items-center gap-3 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[56px_1fr_220px_72px_72px_72px]">
            <span className="font-display text-lg font-semibold tabular-nums">{medal[i] ?? i + 1}</span>
            <span className="min-w-0"><span className="block truncate font-medium">{r.model}</span><span className="block text-xs text-muted-foreground">{r.provider}{r.battles < MIN_BATTLES && <span title={t.provisional}> · {t.provisional.split(":")[0]}</span>}</span></span>
            <span className="flex items-center gap-3"><span className="hidden h-2 flex-1 overflow-hidden rounded-full bg-secondary sm:block"><span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, (r.score / Math.max(best, 1)) * 100)}%` }} /></span><span className="w-14 text-right font-semibold tabular-nums">{r.score.toLocaleString(loc)} %</span></span>
            <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{r.battles}</span>
            <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{r.wins}</span>
            <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{r.ties}</span>
          </li>)}</ol>
        </div>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-display text-lg font-semibold">{t.how}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.howText}</p></div>
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-ink p-6 text-ink-foreground"><div><h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Swords className="size-5" />{t.cta}</h2><p className="mt-2 text-sm text-ink-foreground/70">{t.ctaText}</p></div><Button asChild variant="pill" size="pill" className="action-pill action-pill-light self-start px-5 py-2.5 text-sm font-semibold"><a href="/dashboard/arena">{t.cta}<ArrowRight className="size-4" /></a></Button></div>
      </div>
    </div></section>
    <Footer lang={lang} />
  </div>;
}
