import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen, CalendarDays, ClipboardCheck, Flame, GraduationCap, Layers, Lightbulb, ListChecks, Loader2, MessageCircleQuestion,
  NotebookPen, Paperclip, SlidersHorizontal, SpellCheck, Table2, Timer, Trash2, Trophy, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { confirmDialog } from "@/components/ConfirmHost";
import type { Json } from "@/integrations/supabase/types";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Chips, CostNote, field, label, optional, Shell } from "@/components/dashboard/MediaWizards";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { INDEXED_FILE_TYPE, indexedFileUrl, isDirectAttachment, persistableParts, toFilePart, type ChatFilePart } from "@/lib/chat-attachments";
import { checkFile } from "@/lib/file-types";
import { fileErrorText, uploadAndIndex } from "@/lib/file-upload";
import {
  assessmentKinds, learnCounts, learnCountries, learnExams, learnHours, learnLevels, learnMessage, learnTools,
  type LearnAudience, type LearnInput, type LearnRequest, type LearnTool, type LearnToolId,
} from "@/lib/learn";
import { deleteDeck, dueCards, loadLearn, reviewCard, streak } from "@/lib/learn-store";
import { savePref } from "@/lib/consent";
import { cn } from "@/lib/utils";

// « Apprendre » (/dashboard/apprendre): one page, two audiences. Each tool opens a short form, then starts a
// conversation whose first message carries a "data-learn-request" part; /api/chat adds the tool's rules to every
// reply of that conversation (src/lib/learn.ts). Quizzes, flashcards and exam timers come back interactive.

type Lang = "fr" | "en";
const icons: Record<LearnToolId, typeof BookOpen> = {
  tutor: Lightbulb, course: BookOpen, quiz: ListChecks, flashcards: Layers, plan: CalendarDays, explain: MessageCircleQuestion, exam: Timer,
  lesson: NotebookPen, assessment: ClipboardCheck, rubric: Table2, feedback: SpellCheck, adapt: SlidersHorizontal,
};
const AUDIENCE_KEY = "technova-learn-audience" as const;

export function LearnPage() {
  const { lang: appLang } = useDashboard();
  const lang: Lang = appLang === "en" ? "en" : "fr";
  const fr = lang === "fr";
  const [audience, setAudience] = useState<LearnAudience>("student");
  const [tool, setTool] = useState<LearnTool | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [stats, setStats] = useState({ due: 0, streak: 0, quizzes: 0, average: 0, decks: 0 });
  useEffect(() => { try { if (localStorage.getItem(AUDIENCE_KEY) === "teacher") setAudience("teacher"); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const read = () => {
      const s = loadLearn();
      const pct = s.quizzes.length ? Math.round(s.quizzes.reduce((n, q) => n + q.score / Math.max(1, q.total), 0) / s.quizzes.length * 100) : 0;
      setStats({ due: dueCards(s).length, streak: streak(s), quizzes: s.quizzes.length, average: pct, decks: s.decks.length });
    };
    read();
    window.addEventListener("technova-learn", read); window.addEventListener("focus", read);
    return () => { window.removeEventListener("technova-learn", read); window.removeEventListener("focus", read); };
  }, []);
  function pickAudience(a: LearnAudience) { setAudience(a); savePref(AUDIENCE_KEY, a); }
  const tools = learnTools.filter((t) => t.audience === audience);

  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background"><GraduationCap className="size-5" /></span>{fr ? "Apprendre" : "Learn"}</h1>
        <p className="mt-1.5 max-w-xl text-[13.5px] text-muted-foreground">{audience === "student"
          ? (fr ? "Comprendre, réviser et s'entraîner avec un tuteur qui vous fait réfléchir, à votre niveau." : "Understand, revise and practise with a tutor that makes you think, at your level.")
          : (fr ? "Préparez vos cours, vos évaluations et vos corrections en quelques minutes." : "Prepare lessons, assessments and marking in minutes.")}</p>
      </div>
      <div role="tablist" className="inline-flex rounded-full border border-border bg-card p-1">
        {(["student", "teacher"] as const).map((a) => <button key={a} role="tab" type="button" aria-selected={audience === a} onClick={() => pickAudience(a)}
          className={cn("h-8 rounded-full px-4 text-[13px] font-medium transition", audience === a ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
          {a === "student" ? (fr ? "Élève / étudiant" : "Student") : (fr ? "Enseignant" : "Teacher")}</button>)}
      </div>
    </div>

    {audience === "student" && <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border bg-card p-3.5">
        <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><Flame className="size-3.5 text-orange-500" />{fr ? "Série" : "Streak"}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular-nums">{stats.streak} <span className="text-[12px] font-normal text-muted-foreground">{fr ? (stats.streak > 1 ? "jours" : "jour") : (stats.streak === 1 ? "day" : "days")}</span></p>
      </div>
      <button type="button" onClick={() => setReviewOpen(true)} className="rounded-2xl border border-border bg-card p-3.5 text-left transition hover:border-foreground/30">
        <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><Layers className="size-3.5 text-fuchsia-600" />{fr ? "À réviser" : "To review"}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular-nums">{stats.due} <span className="text-[12px] font-normal text-muted-foreground">{fr ? "cartes" : "cards"}</span></p>
        <p className="mt-0.5 text-[11.5px] font-medium">{stats.due ? (fr ? "Réviser maintenant →" : "Review now →") : stats.decks ? (fr ? "Voir mes paquets →" : "See my decks →") : (fr ? "Créez des flashcards" : "Create flashcards")}</p>
      </button>
      <div className="rounded-2xl border border-border bg-card p-3.5">
        <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><Trophy className="size-3.5 text-amber-500" />{fr ? "Quiz" : "Quizzes"}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular-nums">{stats.quizzes} <span className="text-[12px] font-normal text-muted-foreground">{stats.quizzes ? `· ${stats.average} %` : ""}</span></p>
      </div>
    </div>}

    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", tools.length > 6 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {tools.map((t) => {
        const Icon = icons[t.id];
        return <button key={t.id} type="button" onClick={() => setTool(t)} className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${t.hue} 14%, transparent)`, color: t.hue }}><Icon className="size-5" strokeWidth={1.8} /></span>
          <span className="min-w-0"><span className="block text-[14px] font-semibold">{t.title[lang]}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{t.hint[lang]}</span></span>
        </button>;
      })}
    </div>
    <p className="text-[12px] text-muted-foreground">{fr
      ? "Chaque réponse coûte le prix d'un message Équilibré (3 crédits, 4 avec un document), ou Expert si vous l'avez choisi. Chaque réponse se télécharge en Word, PDF ou PowerPoint. Vérifiez toujours les informations importantes avec votre cours ou votre professeur."
      : "Each reply costs one Équilibré message (3 credits, 4 with a document), or Expert if you chose it. Every reply downloads as Word, PDF or PowerPoint. Always check important facts against your course or teacher."}</p>

    {tool && <LearnWizard tool={tool} lang={lang} onClose={() => setTool(null)} />}
    <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} lang={lang} />
  </div>;
}

type Doc = { key: string; name: string; part: ChatFilePart | null; busy: boolean; error: string };

function LearnWizard({ tool, lang, onClose }: { tool: LearnTool; lang: Lang; onClose: () => void }) {
  const fr = lang === "fr";
  const { reload } = useDashboard();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<LearnInput>({ subject: "", level: "lycee", count: "10", exam: "bac", country: "Bénin", hours: tool.id === "lesson" ? "2" : "2", kind: "exercises" });
  const [paste, setPaste] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof LearnInput, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const has = (f: string) => tool.fields.includes(f as never);
  const tone = "border-foreground/60 bg-foreground/[.06]";
  const Icon = icons[tool.id];

  async function addFiles(list: FileList | null) {
    for (const file of Array.from(list ?? []).slice(0, 4 - docs.length)) {
      const key = crypto.randomUUID();
      if (isDirectAttachment(file)) {
        setDocs((d) => [...d, { key, name: file.name, part: null, busy: true, error: "" }]);
        try { const part = await toFilePart(file); setDocs((d) => d.map((x) => x.key === key ? { ...x, part, busy: false } : x)); }
        catch { setDocs((d) => d.map((x) => x.key === key ? { ...x, busy: false, error: fr ? "Format non pris en charge" : "Unsupported format" } : x)); }
        continue;
      }
      const check = checkFile(file.name, file.size);
      if (!check.ok) { setDocs((d) => [...d, { key, name: file.name, part: null, busy: false, error: fileErrorText(`file_${check.reason}`, lang) }]); continue; }
      setDocs((d) => [...d, { key, name: file.name, part: null, busy: true, error: "" }]);
      void uploadAndIndex(file, "chat", () => {}).then((r) => setDocs((d) => d.map((x) => x.key !== key ? x : r.status === "ready" && r.fileId
        ? { ...x, busy: false, part: { type: "file", mediaType: INDEXED_FILE_TYPE, filename: file.name, url: indexedFileUrl(r.fileId) } }
        : { ...x, busy: false, error: fileErrorText(r.error ?? "upload_failed", lang) })));
    }
    if (input.current) input.current.value = "";
  }

  async function start() {
    const parts = docs.flatMap((d) => (d.part ? [d.part] : []));
    if (form.subject.trim().length < 2) { setError(fr ? `Indiquez : ${tool.subject.fr.toLowerCase()}.` : `Please fill in: ${tool.subject.en.toLowerCase()}.`); return; }
    if (tool.needsSource && !parts.length && paste.trim().length < 40) { setError(fr ? "Joignez votre cours (PDF, photo, Word…) ou collez son texte." : "Attach your course (PDF, photo, Word…) or paste its text."); return; }
    if (tool.text?.required && (form.text ?? "").trim().length < 40) { setError(fr ? "Collez le texte (quelques phrases au moins)." : "Paste the text (a few sentences at least)."); return; }
    if (tool.id === "feedback" && !parts.length && (form.text ?? "").trim().length < 20) { setError(fr ? "Collez la copie de l'élève ou joignez-en une photo." : "Paste the pupil's paper or attach a photo."); return; }
    if (tool.id === "plan" && !form.date) { setError(fr ? "Choisissez la date de l'examen." : "Choose the exam date."); return; }
    setBusy(true); setError("");
    // Only the fields this tool asks for reach the message (the form keeps defaults for the others).
    const clean: LearnInput = { subject: form.subject, ...Object.fromEntries(tool.fields.filter((f) => f !== "subject" && f !== "source").map((f) => [f, form[f as keyof LearnInput]]).filter(([, v]) => v)) };
    const built = learnMessage(tool, clean, lang, parts.length > 0);
    const message = (built.message + (paste.trim() ? `\n\n${fr ? "Cours" : "Course"} :\n${paste.trim()}` : "")).slice(0, 38_000);
    const request: LearnRequest = { tool: tool.id, ...(form.level && has("level") ? { level: form.level } : {}) };
    const { data, error: insertError } = await supabase.from("chat_threads").insert({ title: built.title.slice(0, 65) }).select("id").single();
    if (insertError || !data) { setBusy(false); setError(fr ? "Impossible de créer la conversation. Réessayez." : "Could not start the conversation. Try again."); return; }
    const sdkId = crypto.randomUUID();
    const { error: msgError } = await supabase.from("chat_messages").insert({
      thread_id: data.id, sdk_id: sdkId, role: "user",
      parts: [...(persistableParts(sdkId, [{ type: "text", text: message }, ...parts]) as Json[]), { type: "data-learn-request", data: request } as unknown as Json] as Json,
    });
    if (msgError) { await supabase.from("chat_threads").delete().eq("id", data.id); setBusy(false); setError(fr ? "Impossible de créer la conversation. Réessayez." : "Could not start the conversation. Try again."); return; }
    await reload();
    void navigate({ to: "/dashboard/chat/$threadId", params: { threadId: data.id } });
  }

  const today = new Date().toLocaleDateString("en-CA");
  const uploading = docs.some((d) => d.busy);
  return <Shell open onOpenChange={(o) => { if (!o) onClose(); }} accent={`color-mix(in oklab, ${tool.hue} 16%, transparent)`} icon={<Icon className="size-4" style={{ color: tool.hue }} />}
    title={tool.title[lang]} sub={tool.hint[lang]}
    footer={<>
      <button type="button" onClick={onClose} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">{fr ? "Annuler" : "Cancel"}</button>
      <button type="button" disabled={busy || uploading} onClick={() => void start()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-50">
        {busy || uploading ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}{uploading ? (fr ? "Lecture du document…" : "Reading the document…") : (fr ? "Commencer" : "Start")}</button>
    </>}>
    <label className="block space-y-1"><span className={label}>{tool.subject[lang]}</span>
      {tool.id === "tutor"
        ? <textarea className={cn(field, "min-h-[80px] resize-y")} value={form.subject} maxLength={4000} placeholder={fr ? tool.subject.phFr : tool.subject.phEn} onChange={(e) => set("subject", e.target.value)} />
        : <input className={field} value={form.subject} maxLength={200} placeholder={fr ? tool.subject.phFr : tool.subject.phEn} onChange={(e) => set("subject", e.target.value)} />}
    </label>
    {has("level") && <div><span className={label}>{fr ? "Niveau" : "Level"}</span><Chips items={learnLevels.map((l) => [l.id, l[lang]] as [string, string])} value={[form.level ?? ""]} onChange={(v) => set("level", v[0] ?? "lycee")} tone={tone} /></div>}
    {has("kind") && <div><span className={label}>{fr ? "Type" : "Type"}</span><Chips items={assessmentKinds.map((k) => [k.id, k[lang]] as [string, string])} value={[form.kind ?? ""]} onChange={(v) => set("kind", v[0] ?? "exercises")} tone={tone} /></div>}
    {has("count") && <div><span className={label}>{tool.id === "flashcards" ? (fr ? "Nombre de cartes" : "Number of cards") : (fr ? "Nombre de questions" : "Number of questions")}</span><Chips items={learnCounts.map((c) => [c, c] as [string, string])} value={[form.count ?? ""]} onChange={(v) => set("count", v[0] ?? "10")} tone={tone} /></div>}
    {has("exam") && <div><span className={label}>{fr ? "Examen" : "Exam"}</span><Chips items={learnExams.map((e) => [e.id, e[lang]] as [string, string])} value={[form.exam ?? ""]} onChange={(v) => set("exam", v[0] ?? "bac")} tone={tone} /></div>}
    {has("country") && <div><span className={label}>{fr ? "Pays" : "Country"}</span><Chips items={learnCountries.map((c) => [c, c === "Autre" && !fr ? "Other" : c] as [string, string])} value={[form.country ?? ""]} onChange={(v) => set("country", v[0] ?? "Autre")} tone={tone} /></div>}
    {(has("date") || has("hours")) && <div className="grid gap-3 sm:grid-cols-2">
      {has("date") && <label className="block space-y-1"><span className={label}>{fr ? "Date de l'examen" : "Exam date"}</span><input type="date" min={today} className={field} value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} /></label>}
      {has("hours") && <div><span className={label}>{tool.id === "lesson" ? (fr ? "Nombre de séances" : "Number of sessions") : (fr ? "Heures par jour" : "Hours per day")}</span><Chips items={learnHours.map((h) => [h, tool.id === "lesson" ? h : `${h} h`] as [string, string])} value={[form.hours ?? ""]} onChange={(v) => set("hours", v[0] ?? "2")} tone={tone} /></div>}
    </div>}
    {tool.text && <label className="block space-y-1"><span className={label}>{tool.text[lang]}{!tool.text.required && tool.id !== "feedback" && optional(fr)}</span>
      <textarea className={cn(field, "min-h-[110px] resize-y")} value={form.text ?? ""} maxLength={30_000} placeholder={fr ? tool.text.phFr : tool.text.phEn} onChange={(e) => set("text", e.target.value)} /></label>}
    {has("source") && <div className="space-y-2">
      <span className={label}>{tool.id === "feedback" ? (fr ? "Photo ou fichier de la copie" : "Photo or file of the paper") : (fr ? "Votre cours" : "Your course")}{!tool.needsSource && optional(fr)}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={docs.length >= 4} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-50"><Paperclip className="size-4" />{fr ? "Joindre un PDF, une photo, un Word…" : "Attach a PDF, photo, Word file…"}</button>
        <input ref={input} type="file" multiple hidden accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.odt" onChange={(e) => void addFiles(e.target.files)} />
        {docs.map((d) => <span key={d.key} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", d.error ? "border-destructive/50 text-destructive" : "border-border")}>
          {d.busy && <Loader2 className="size-3.5 animate-spin" />}<span className="max-w-[180px] truncate">{d.name}</span>{d.error && <span>· {d.error}</span>}
          <button type="button" aria-label={fr ? "Retirer" : "Remove"} onClick={() => setDocs((all) => all.filter((x) => x.key !== d.key))}><X className="size-3.5" /></button></span>)}
      </div>
      {tool.id !== "feedback" && <textarea className={cn(field, "min-h-[70px] resize-y")} value={paste} maxLength={30_000} placeholder={fr ? "…ou collez ici le texte du cours" : "…or paste the course text here"} onChange={(e) => setPaste(e.target.value)} />}
    </div>}
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">{error}</p>}
    <CostNote>{fr
      ? `Prix d'un message Équilibré : 3 crédits, 4 avec un document (ou Expert si vous l'avez choisi dans le chat). ${tool.id === "tutor" ? "Le tuteur ne donne pas la réponse tout de suite : il vous guide." : tool.id === "quiz" || tool.id === "flashcards" ? "Le résultat s'affiche de façon interactive dans la conversation." : "Vous pourrez poser d'autres questions dans la même conversation."}`
      : `One Équilibré message: 3 credits, 4 with a document (or Expert if you chose it in the chat). ${tool.id === "tutor" ? "The tutor does not give the answer straight away: it guides you." : "You can keep asking in the same conversation."}`}</CostNote>
  </Shell>;
}

function ReviewDialog({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang }) {
  const fr = lang === "fr";
  const [, refresh] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => { const r = () => refresh((n) => n + 1); window.addEventListener("technova-learn", r); return () => window.removeEventListener("technova-learn", r); }, []);
  const state = open ? loadLearn() : null;
  const due = state ? dueCards(state) : [];
  const next = due[0];
  function answer(knew: boolean) { if (!next) return; reviewCard(next.deck.id, next.card.id, knew); setShown(false); }
  return <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setShown(false); }}>
    <DialogContent className="max-w-[520px] rounded-2xl">
      <DialogTitle className="flex items-center gap-2 text-[17px]"><Layers className="size-4" />{fr ? "Mes révisions" : "My reviews"}</DialogTitle>
      <DialogDescription className="text-[12.5px]">{fr ? "Les cartes reviennent au bon moment : de plus en plus espacées quand vous les savez (1, 3, 7, 14 jours…), quelques minutes plus tard quand vous les ratez. Gardées sur cet appareil." : "Cards come back at the right time: further apart when you know them (1, 3, 7, 14 days…), a few minutes later when you miss them. Kept on this device."}</DialogDescription>
      {next ? <div className="mt-2">
        <p className="text-[11.5px] text-muted-foreground">{next.deck.title} · {due.length} {fr ? "à réviser" : "left"}</p>
        <div className="mt-2 flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-border bg-secondary/40 px-5 py-6 text-center">
          <p className="text-[17px] font-semibold leading-snug">{next.card.front}</p>
          {shown && <p className="mt-3 border-t border-border pt-3 text-[14px] text-foreground/85">{next.card.back}</p>}
        </div>
        {shown
          ? <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => answer(false)} className="h-10 rounded-full border border-rose-500/40 text-[13px] font-semibold text-rose-700 hover:bg-rose-500/10 dark:text-rose-300">{fr ? "À revoir" : "Again"}</button>
              <button type="button" onClick={() => answer(true)} className="h-10 rounded-full bg-foreground text-[13px] font-semibold text-background">{fr ? "Je savais" : "I knew it"}</button>
            </div>
          : <button type="button" onClick={() => setShown(true)} className="mt-3 h-10 w-full rounded-full bg-foreground text-[13px] font-semibold text-background">{fr ? "Voir la réponse" : "Show the answer"}</button>}
      </div> : <p className="mt-2 rounded-xl bg-secondary/60 px-3 py-3 text-[13px]">{state?.decks.length ? (fr ? "Rien à réviser pour le moment. Revenez demain !" : "Nothing to review right now. Come back tomorrow!") : (fr ? "Aucune carte pour l'instant : utilisez « Flashcards », puis « Ajouter à Mes révisions »." : "No cards yet: use « Flashcards », then « Add to My reviews ».")}</p>}
      {!!state?.decks.length && <div className="mt-3 border-t border-border pt-3">
        <p className="text-[12px] font-semibold">{fr ? "Mes paquets" : "My decks"}</p>
        <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">{state.decks.map((d) => <li key={d.id} className="flex items-center gap-2 text-[12.5px]">
          <span className="min-w-0 flex-1 truncate">{d.title}</span><span className="shrink-0 text-muted-foreground">{d.cards.length} {fr ? "cartes" : "cards"}</span>
          <button type="button" onClick={() => void confirmDialog({ title: fr ? "Supprimer ce paquet ?" : "Delete this deck?", description: fr ? `« ${d.title} » et ses ${d.cards.length} cartes seront retirés de cet appareil.` : `« ${d.title} » and its ${d.cards.length} cards will be removed from this device.`, confirmLabel: fr ? "Supprimer" : "Delete", cancelLabel: fr ? "Annuler" : "Cancel", tone: "danger" }).then((ok) => { if (ok) deleteDeck(d.id); })} aria-label={fr ? "Supprimer le paquet" : "Delete deck"} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
        </li>)}</ul>
      </div>}
    </DialogContent>
  </Dialog>;
}
