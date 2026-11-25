import { ArrowUpRight, AudioLines, Film, Music, Palette, PenLine, Sheet } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";

// « Nouveautés » (landing #nouveautes, linked from the navbar): the coloured tools under the chat box, each with a
// short looping motion drawn in CSS (.wn-* in styles.css, still with reduced motion) that shows what it does.
type Item = { key: "design" | "sheet" | "music" | "video" | "humanize" | "audio"; t: string; d: string };
const copy: Record<SiteLang, { tag: string; title: string; sub: string; cta: string; items: Item[] }> = {
  fr: { tag: "Nouveautés", title: "Six outils prêts à l'emploi, dans le chat", sub: "Sous la zone de message, chaque bouton coloré ouvre un outil guidé : vous décrivez, TechNova crée.", cta: "Essayer",
    items: [
      { key: "design", t: "Créativité", d: "Présentations, CV, affiches, invitations et cartes : 210 modèles à personnaliser, export PDF ou PowerPoint." },
      { key: "sheet", t: "Tableur", d: "Un mini Excel dans le navigateur : formules, graphiques, 14 modèles et un assistant IA qui remplit vos tableaux." },
      { key: "music", t: "Création de musique", d: "Décrivez une ambiance ou collez vos paroles : TechNova écrit, compose et chante votre chanson." },
      { key: "video", t: "Création de vidéo", d: "Une scène, un style, une durée de 4 à 15 secondes : une vidéo prête à partager." },
      { key: "humanize", t: "Humaniser un texte", d: "Collez un texte écrit par une IA : il revient naturel, dans le ton que vous choisissez." },
      { key: "audio", t: "Résumé d'un audio", d: "Une réunion, un cours, un vocal WhatsApp : transcription et résumé clair en quelques minutes." },
    ] },
  en: { tag: "What's new", title: "Six ready-to-use tools, right in the chat", sub: "Under the message box, every coloured button opens a guided tool: you describe, TechNova creates.", cta: "Try it",
    items: [
      { key: "design", t: "Creativity", d: "Slides, CVs, posters, invitations and cards: 210 templates to customise, export to PDF or PowerPoint." },
      { key: "sheet", t: "Spreadsheet", d: "A mini Excel in your browser: formulas, charts, 14 templates and an AI assistant that fills your tables." },
      { key: "music", t: "Music creation", d: "Describe a mood or paste your lyrics: TechNova writes, composes and sings your song." },
      { key: "video", t: "Video creation", d: "A scene, a style, 4 to 15 seconds: a video ready to share." },
      { key: "humanize", t: "Humanize a text", d: "Paste an AI-written text: it comes back natural, in the tone you choose." },
      { key: "audio", t: "Audio summary", d: "A meeting, a lecture, a voice note: transcript and clear summary in minutes." },
    ] },
  es: { tag: "Novedades", title: "Seis herramientas listas, en el chat", sub: "Bajo la zona de mensaje, cada botón de color abre una herramienta guiada: usted describe, TechNova crea.", cta: "Probar",
    items: [
      { key: "design", t: "Creatividad", d: "Presentaciones, CV, carteles, invitaciones y tarjetas: 210 plantillas, exportación a PDF o PowerPoint." },
      { key: "sheet", t: "Hoja de cálculo", d: "Un mini Excel en el navegador: fórmulas, gráficos, 14 plantillas y un asistente de IA." },
      { key: "music", t: "Creación de música", d: "Describa un ambiente o pegue su letra: TechNova escribe, compone y canta su canción." },
      { key: "video", t: "Creación de vídeo", d: "Una escena, un estilo, de 4 a 15 segundos: un vídeo listo para compartir." },
      { key: "humanize", t: "Humanizar un texto", d: "Pegue un texto escrito por una IA: vuelve natural, con el tono que elija." },
      { key: "audio", t: "Resumen de un audio", d: "Una reunión, una clase, una nota de voz: transcripción y resumen claro en minutos." },
    ] },
  pt: { tag: "Novidades", title: "Seis ferramentas prontas, no chat", sub: "Abaixo da caixa de mensagem, cada botão colorido abre uma ferramenta guiada: você descreve, a TechNova cria.", cta: "Experimentar",
    items: [
      { key: "design", t: "Criatividade", d: "Apresentações, CVs, cartazes, convites e cartões: 210 modelos, exportação em PDF ou PowerPoint." },
      { key: "sheet", t: "Planilha", d: "Um mini Excel no navegador: fórmulas, gráficos, 14 modelos e um assistente de IA." },
      { key: "music", t: "Criação de música", d: "Descreva um clima ou cole sua letra: a TechNova escreve, compõe e canta sua música." },
      { key: "video", t: "Criação de vídeo", d: "Uma cena, um estilo, de 4 a 15 segundos: um vídeo pronto para compartilhar." },
      { key: "humanize", t: "Humanizar um texto", d: "Cole um texto escrito por IA: ele volta natural, no tom que você escolher." },
      { key: "audio", t: "Resumo de um áudio", d: "Uma reunião, uma aula, um áudio de WhatsApp: transcrição e resumo claro em minutos." },
    ] },
};
const icons = { design: Palette, sheet: Sheet, music: Music, video: Film, humanize: PenLine, audio: AudioLines };

/** The small looping scene of each tool (pure CSS, aria-hidden). */
function Motion({ k }: { k: Item["key"] }) {
  if (k === "design") return <div className="wn-scene wn-design"><div className="wn-slide"><span className="wn-d-bar" /><span className="wn-d-img" /><span className="wn-d-l1" /><span className="wn-d-l2" /><span className="wn-d-btn" /></div></div>;
  if (k === "sheet") return <div className="wn-scene wn-sheet"><div className="wn-grid">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}</div><div className="wn-bars">{[40, 65, 50, 85, 70].map((h, i) => <span key={i} style={{ height: `${h}%`, animationDelay: `${0.4 + i * 0.15}s` }} />)}</div></div>;
  if (k === "music") return <div className="wn-scene wn-music"><span className="wn-disc" /><div className="wn-eq">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />)}</div></div>;
  if (k === "video") return <div className="wn-scene wn-video"><div className="wn-frame"><span className="wn-sun" /><span className="wn-hill" /><span className="wn-play" /></div><div className="wn-progress"><span /></div></div>;
  if (k === "humanize") return <div className="wn-scene wn-humanize">{[0, 1, 2, 3].map((i) => <span key={i} className="wn-line" style={{ animationDelay: `${i * 0.35}s` }} />)}<span className="wn-caret" /></div>;
  return <div className="wn-scene wn-audio"><div className="wn-wave">{Array.from({ length: 22 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 7) * 0.1}s` }} />)}</div><div className="wn-notes">{[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${1 + i * 0.4}s` }} />)}</div></div>;
}

export function WhatsNew({ lang }: { lang: SiteLang }) {
  const t = copy[lang] ?? copy.fr;
  return <section id="nouveautes" className="whats-new px-4 py-6 sm:py-8">
    <div className="mx-auto max-w-6xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500" />{t.tag}</span>
      <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-5xl">{t.title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t.sub}</p>
    </div>
    <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{t.items.map((it) => {
      const Icon = icons[it.key];
      return <article key={it.key} className={`wn-card wn-${it.key}-card`}>
        <div className="wn-stage" aria-hidden="true"><Motion k={it.key} /></div>
        <div className="flex items-start gap-3 p-5">
          <span className={`wn-icon wn-icon-${it.key}`}><Icon className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold">{it.t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.d}</p>
          </div>
        </div>
        <a href="/dashboard/chat" className="mx-5 mb-5 mt-auto inline-flex items-center gap-1.5 self-start rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-foreground/40" aria-label={`${t.cta} : ${it.t}`}>{t.cta}<ArrowUpRight className="size-3.5" /></a>
      </article>;
    })}</div>
  </section>;
}
