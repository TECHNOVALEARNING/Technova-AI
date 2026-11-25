import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Layers, Loader2, Pause, Play, RotateCcw, Timer, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
import { splitReply, type CardsData, type QuizData, type TimerData } from "@/lib/learn";
import { addDeck, deckSaved, recordQuiz } from "@/lib/learn-store";
import { cn } from "@/lib/utils";

// Interactive blocks the « Apprendre » tools ask the model for (src/lib/learn.ts): ```technova-quiz```,
// ```technova-flashcards``` and ```technova-timer```. Everything else in the reply stays Markdown.

type Lang = "fr" | "en";
const box = "my-3 w-full max-w-[620px] rounded-2xl border border-border bg-card p-4 sm:p-5";

export function hasLearnBlocks(text: string) { return text.includes("```technova-"); }

/** A reply with its interactive learning blocks. */
export function LearnReply({ text, lang }: { text: string; lang: Lang }) {
  const segments = useMemo(() => splitReply(text), [text]);
  return <>{segments.map((s, i) => s.kind === "text" ? (s.text.trim() ? <MessageResponse key={i}>{s.text}</MessageResponse> : null)
    : s.data === null ? <p key={i} className={cn(box, "flex items-center gap-2 text-[13px] text-muted-foreground")}><Loader2 className="size-4 animate-spin" />{lang === "fr" ? (s.kind === "quiz" ? "Préparation du quiz…" : s.kind === "flashcards" ? "Préparation des cartes…" : "Préparation du sujet…") : "Preparing…"}</p>
    : s.kind === "quiz" ? <QuizBlock key={i} data={s.data} lang={lang} />
    : s.kind === "flashcards" ? <FlashcardsBlock key={i} data={s.data} lang={lang} />
    : <TimerBlock key={i} data={s.data} lang={lang} />)}</>;
}

function QuizBlock({ data, lang }: { data: QuizData; lang: Lang }) {
  const fr = lang === "fr";
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const total = data.questions.length;
  const score = data.questions.reduce((n, q, k) => n + (picked[k] === q.answer ? 1 : 0), 0);
  const q = data.questions[i]!;
  const mine = picked[i];
  function finish() { setDone(true); recordQuiz(data.title, score, total); }
  function restart() { setPicked({}); setI(0); setDone(false); }
  if (done) {
    const missed = data.questions.map((x, k) => ({ x, k })).filter(({ x, k }) => picked[k] !== x.answer);
    const pct = Math.round((score / total) * 100);
    return <div className={box}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{data.title}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{score} / {total}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{pct >= 80 ? (fr ? "Excellent, vous maîtrisez ce sujet." : "Excellent, you master this topic.") : pct >= 50 ? (fr ? "Bien. Revoyez les questions manquées." : "Good. Review the questions you missed.") : (fr ? "Pas encore : relisez la leçon puis réessayez." : "Not yet: reread the lesson, then try again.")}</p>
      {missed.length > 0 && <div className="mt-4 space-y-3">
        <p className="text-[13px] font-semibold">{fr ? "À revoir" : "To review"}</p>
        {missed.map(({ x, k }) => <div key={k} className="rounded-xl bg-secondary/70 p-3 text-[13px]">
          <p className="font-medium">{k + 1}. {x.q}</p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-300">{fr ? "Bonne réponse : " : "Correct answer: "}{x.choices[x.answer]}</p>
          {x.explanation && <p className="mt-1 text-muted-foreground">{x.explanation}</p>}
        </div>)}
      </div>}
      <button type="button" onClick={restart} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium hover:bg-secondary"><RotateCcw className="size-4" />{fr ? "Recommencer" : "Try again"}</button>
    </div>;
  }
  return <div className={box}>
    <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
      <span className="truncate font-medium uppercase tracking-[0.14em]">{data.title}</span>
      <span className="shrink-0 tabular-nums">{i + 1} / {total}</span>
    </div>
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${((i + (mine !== undefined ? 1 : 0)) / total) * 100}%` }} /></div>
    <p className="mt-4 text-[15px] font-semibold leading-snug">{q.q}</p>
    <div className="mt-3 grid gap-2">
      {q.choices.map((c, k) => {
        const answered = mine !== undefined;
        const right = k === q.answer;
        return <button key={k} type="button" disabled={answered} onClick={() => setPicked((p) => ({ ...p, [i]: k }))}
          className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition",
            !answered && "border-border hover:border-foreground/40 hover:bg-secondary/60",
            answered && right && "border-emerald-500/60 bg-emerald-500/10",
            answered && !right && mine === k && "border-rose-500/60 bg-rose-500/10",
            answered && !right && mine !== k && "border-border opacity-60")}>
          <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-current/30 text-[11px] font-semibold">{answered && right ? <Check className="size-3.5 text-emerald-600" /> : answered && mine === k ? <X className="size-3.5 text-rose-600" /> : String.fromCharCode(65 + k)}</span>
          <span>{c}</span>
        </button>;
      })}
    </div>
    {mine !== undefined && <div className={cn("mt-3 rounded-xl px-3.5 py-2.5 text-[13px]", mine === q.answer ? "bg-emerald-500/10" : "bg-rose-500/10")}>
      <p className="flex items-center gap-1.5 font-semibold">{mine === q.answer ? <><CheckCircle2 className="size-4 text-emerald-600" />{fr ? "Bonne réponse" : "Correct"}</> : <><XCircle className="size-4 text-rose-600" />{fr ? "Pas tout à fait" : "Not quite"}</>}</p>
      {q.explanation && <p className="mt-1 text-foreground/80">{q.explanation}</p>}
    </div>}
    <div className="mt-4 flex items-center justify-between">
      <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"><ArrowLeft className="size-4" />{fr ? "Précédente" : "Previous"}</button>
      {i < total - 1
        ? <button type="button" disabled={mine === undefined} onClick={() => setI(i + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-40">{fr ? "Suivante" : "Next"}<ArrowRight className="size-4" /></button>
        : <button type="button" disabled={Object.keys(picked).length < total} onClick={finish} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-40">{fr ? "Voir mon score" : "See my score"}</button>}
    </div>
  </div>;
}

function FlashcardsBlock({ data, lang }: { data: CardsData; lang: Lang }) {
  const fr = lang === "fr";
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(deckSaved(data.title, data.cards[0]?.front)); }, [data]);
  const card = data.cards[i]!;
  const go = (n: number) => { setFlipped(false); setI((n + data.cards.length) % data.cards.length); };
  return <div className={box}>
    <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
      <span className="truncate font-medium uppercase tracking-[0.14em]">{data.title}</span>
      <span className="shrink-0 tabular-nums">{i + 1} / {data.cards.length}</span>
    </div>
    <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={fr ? "Retourner la carte" : "Flip the card"}
      className={cn("mt-3 flex min-h-[150px] w-full flex-col items-center justify-center rounded-2xl border px-5 py-6 text-center transition", flipped ? "border-foreground/20 bg-secondary/70" : "border-border bg-background hover:border-foreground/30")}>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{flipped ? (fr ? "Réponse" : "Answer") : (fr ? "Question" : "Question")}</span>
      <span className={cn("mt-2 leading-snug", flipped ? "text-[14px]" : "text-[17px] font-semibold")}>{flipped ? card.back : card.front}</span>
      {!flipped && <span className="mt-3 text-[11.5px] text-muted-foreground">{fr ? "Touchez pour voir la réponse" : "Tap to see the answer"}</span>}
    </button>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1">
        <button type="button" onClick={() => go(i - 1)} className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label={fr ? "Carte précédente" : "Previous card"}><ArrowLeft className="size-4" /></button>
        <button type="button" onClick={() => go(i + 1)} className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label={fr ? "Carte suivante" : "Next card"}><ArrowRight className="size-4" /></button>
      </div>
      <button type="button" disabled={saved} onClick={() => { const ok = addDeck(data.title, data.cards); setSaved(true); toast.success(ok ? (fr ? `${data.cards.length} cartes ajoutées à Mes révisions.` : `${data.cards.length} cards added to My reviews.`) : (fr ? "Ces cartes sont déjà dans Mes révisions." : "These cards are already in My reviews.")); }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:bg-secondary disabled:text-muted-foreground">
        {saved ? <><Check className="size-4" />{fr ? "Dans Mes révisions" : "In My reviews"}</> : <><Layers className="size-4" />{fr ? "Ajouter à Mes révisions" : "Add to My reviews"}</>}
      </button>
    </div>
  </div>;
}

function TimerBlock({ data, lang }: { data: TimerData; lang: Lang }) {
  const fr = lang === "fr";
  const [left, setLeft] = useState(data.minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLeft((s) => { if (s <= 1) { setRunning(false); return 0; } return s - 1; }), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const clock = `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return <div className={cn(box, "flex flex-wrap items-center gap-3")}>
    <span className="flex size-10 items-center justify-center rounded-full bg-secondary"><Timer className="size-5" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-[12px] text-muted-foreground">{data.label || (fr ? "Durée de l'épreuve" : "Time allowed")} · {data.minutes} min</p>
      <p className={cn("font-display text-2xl font-semibold tabular-nums", left === 0 && "text-rose-600")}>{left === 0 ? (fr ? "Temps écoulé" : "Time is up") : clock}</p>
    </div>
    <div className="flex gap-1.5">
      <button type="button" onClick={() => setRunning((r) => !r)} disabled={left === 0} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-40">{running ? <><Pause className="size-4" />{fr ? "Pause" : "Pause"}</> : <><Play className="size-4" />{left < data.minutes * 60 ? (fr ? "Reprendre" : "Resume") : (fr ? "Démarrer" : "Start")}</>}</button>
      <button type="button" onClick={() => { setRunning(false); setLeft(data.minutes * 60); }} className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label={fr ? "Remettre à zéro" : "Reset"}><RotateCcw className="size-4" /></button>
    </div>
  </div>;
}
