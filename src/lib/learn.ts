// « Apprendre » (dashboard /dashboard/apprendre): learning tools for students and teachers. Client-safe: the tool
// list, the wizard fields, the message each tool sends and the rules the server adds to the chat system prompt.
// A learning conversation's first message carries a "data-learn-request" part ({ tool, level }); ThreadPage sends
// it as `learn` with every message of that conversation, so /api/chat keeps the same rules (the guided tutor stays
// a tutor even when asked for the answer). Learning replies use at least the Équilibré engine (accuracy first)
// and cost the normal mode price.

export type LearnAudience = "student" | "teacher";
export type LearnField = "subject" | "level" | "source" | "count" | "exam" | "country" | "date" | "hours" | "text" | "kind";
export type LearnToolId =
  | "tutor" | "course" | "quiz" | "flashcards" | "plan" | "explain" | "exam"
  | "lesson" | "assessment" | "rubric" | "feedback" | "adapt";

type L = { fr: string; en: string };
export type LearnTool = {
  id: LearnToolId; audience: LearnAudience; title: L; hint: L; fields: LearnField[];
  /** Subject field label and placeholder (what the tool is about). */
  subject: L & { phFr: string; phEn: string };
  /** Label of the long text field, when the tool has one. */
  text?: L & { phFr: string; phEn: string; required?: boolean };
  /** The document is required (summary of my course) rather than optional. */
  needsSource?: boolean;
  hue: string;
};

export const learnTools: LearnTool[] = [
  { id: "tutor", audience: "student", hue: "#4f6bd8", fields: ["subject", "level", "source"],
    title: { fr: "Tuteur guidé", en: "Guided tutor" }, hint: { fr: "Il vous fait trouver la réponse, étape par étape", en: "Helps you find the answer, step by step" },
    subject: { fr: "Votre exercice ou votre question", en: "Your exercise or question", phFr: "Ex. : Résoudre 2x + 5 = 17, ou : pourquoi la Lune change de forme ?", phEn: "E.g. Solve 2x + 5 = 17, or: why does the Moon change shape?" } },
  { id: "course", audience: "student", hue: "#0f8a6a", fields: ["subject", "level", "source"], needsSource: true,
    title: { fr: "Mes cours", en: "My courses" }, hint: { fr: "Résumé et fiche de révision de votre cours", en: "Summary and revision sheet of your course" },
    subject: { fr: "Matière ou chapitre", en: "Subject or chapter", phFr: "Ex. : Histoire — La décolonisation en Afrique", phEn: "E.g. History — Decolonisation in Africa" } },
  { id: "quiz", audience: "student", hue: "#c2410c", fields: ["subject", "level", "count", "source"],
    title: { fr: "Quiz et QCM", en: "Quizzes" }, hint: { fr: "Questions interactives, chaque erreur expliquée", en: "Interactive questions, every mistake explained" },
    subject: { fr: "Sujet du quiz", en: "Quiz topic", phFr: "Ex. : Les fractions, la photosynthèse, le présent du subjonctif", phEn: "E.g. Fractions, photosynthesis, the past perfect" } },
  { id: "flashcards", audience: "student", hue: "#a21caf", fields: ["subject", "level", "count", "source"],
    title: { fr: "Flashcards", en: "Flashcards" }, hint: { fr: "Cartes à réviser au bon moment", en: "Cards reviewed at the right time" },
    subject: { fr: "Notions à mémoriser", en: "What to memorise", phFr: "Ex. : Dates de l'histoire du Bénin, vocabulaire anglais de la santé", phEn: "E.g. Key dates of African history, French health vocabulary" } },
  { id: "plan", audience: "student", hue: "#0369a1", fields: ["subject", "level", "exam", "date", "hours"],
    title: { fr: "Plan de révision", en: "Revision plan" }, hint: { fr: "Un programme jour par jour jusqu'à l'examen", en: "A day-by-day schedule until the exam" },
    subject: { fr: "Matières et chapitres à réviser", en: "Subjects and chapters to revise", phFr: "Ex. : Maths (fonctions, probabilités), Physique (électricité), Philo", phEn: "E.g. Maths (functions, probability), Physics (electricity)" } },
  { id: "explain", audience: "student", hue: "#b45309", fields: ["subject", "level"],
    title: { fr: "Expliquer autrement", en: "Explain it differently" }, hint: { fr: "Plus simple, avec des exemples d'ici", en: "Simpler, with local examples" },
    subject: { fr: "La notion que vous ne comprenez pas", en: "The idea you don't understand", phFr: "Ex. : Le pourcentage, l'inflation, la mitose", phEn: "E.g. Percentages, inflation, mitosis" } },
  { id: "exam", audience: "student", hue: "#be123c", fields: ["subject", "level", "exam", "country"],
    title: { fr: "Préparer un examen", en: "Exam practice" }, hint: { fr: "Sujet d'entraînement chronométré, puis correction", en: "Timed practice paper, then marking" },
    subject: { fr: "Matière", en: "Subject", phFr: "Ex. : Mathématiques, SVT, Français", phEn: "E.g. Mathematics, Biology, English" } },

  { id: "lesson", audience: "teacher", hue: "#4f6bd8", fields: ["subject", "level", "hours", "text"],
    title: { fr: "Plan de cours", en: "Lesson plan" }, hint: { fr: "Séquence, objectifs, déroulé, évaluation", en: "Sequence, goals, steps, assessment" },
    subject: { fr: "Thème de la séquence", en: "Topic of the sequence", phFr: "Ex. : Les équations du premier degré", phEn: "E.g. Linear equations" },
    text: { fr: "Contraintes ou programme", en: "Constraints or curriculum", phFr: "Ex. : 3 séances de 55 min, classe de 45 élèves, pas de vidéoprojecteur", phEn: "E.g. 3 sessions of 55 min, 45 pupils, no projector" } },
  { id: "assessment", audience: "teacher", hue: "#c2410c", fields: ["subject", "level", "kind", "count", "source"],
    title: { fr: "Quiz, exercices, examens", en: "Quizzes, exercises, exams" }, hint: { fr: "À imprimer, avec barème et corrigé", en: "Printable, with marking scheme and key" },
    subject: { fr: "Thème", en: "Topic", phFr: "Ex. : La Seconde Guerre mondiale, les vecteurs", phEn: "E.g. World War II, vectors" } },
  { id: "rubric", audience: "teacher", hue: "#0f8a6a", fields: ["subject", "level", "text"],
    title: { fr: "Grille d'évaluation", en: "Rubric" }, hint: { fr: "Critères, niveaux et points", en: "Criteria, levels and points" },
    subject: { fr: "Travail à évaluer", en: "Work to assess", phFr: "Ex. : Exposé oral de 10 min, dissertation, projet de groupe", phEn: "E.g. 10-min oral presentation, essay, group project" },
    text: { fr: "Consigne donnée aux élèves", en: "Instructions given to pupils", phFr: "Collez la consigne si vous l'avez", phEn: "Paste the instructions if you have them" } },
  { id: "feedback", audience: "teacher", hue: "#a21caf", fields: ["subject", "level", "text", "source"],
    title: { fr: "Aide à la correction", en: "Marking help" }, hint: { fr: "Note proposée et commentaires d'une copie", en: "Suggested mark and comments on a paper" },
    subject: { fr: "Sujet ou consigne", en: "Assignment", phFr: "Ex. : Rédaction — Racontez un jour de marché", phEn: "E.g. Essay — Describe a market day" },
    text: { fr: "La copie de l'élève", en: "The pupil's paper", phFr: "Collez la copie, ou joignez-en une photo ci-dessous", phEn: "Paste the paper, or attach a photo below" } },
  { id: "adapt", audience: "teacher", hue: "#0369a1", fields: ["subject", "level", "text"],
    title: { fr: "Adapter un texte", en: "Adapt a text" }, hint: { fr: "Le même contenu pour chaque niveau d'élève", en: "The same content for every reading level" },
    subject: { fr: "Titre ou sujet du texte", en: "Title or topic", phFr: "Ex. : Le cycle de l'eau", phEn: "E.g. The water cycle" },
    text: { fr: "Le texte à adapter", en: "The text to adapt", phFr: "Collez le texte ici…", phEn: "Paste the text here…", required: true } },
];
export const learnTool = (id: string) => learnTools.find((t) => t.id === id);
export const learnToolIds = learnTools.map((t) => t.id) as [LearnToolId, ...LearnToolId[]];

export const learnLevels = [
  { id: "primaire", fr: "Primaire", en: "Primary school" },
  { id: "college", fr: "Collège", en: "Middle school" },
  { id: "lycee", fr: "Lycée", en: "High school" },
  { id: "universite", fr: "Université", en: "University" },
  { id: "pro", fr: "Formation pro", en: "Professional" },
];
export const learnExams = [
  { id: "cep", fr: "CEP", en: "CEP (end of primary)" },
  { id: "bepc", fr: "BEPC", en: "BEPC" },
  { id: "bac", fr: "BAC", en: "Baccalaureate" },
  { id: "concours", fr: "Concours", en: "Competitive exam" },
  { id: "partiels", fr: "Partiels / examens universitaires", en: "University exams" },
];
export const learnCountries = ["Bénin", "Côte d'Ivoire", "Sénégal", "Mali", "Togo", "Burkina Faso", "Cameroun", "Niger", "Guinée", "Autre"];
export const learnCounts = ["5", "10", "15", "20"];
export const learnHours = ["1", "2", "3", "4"];
export const assessmentKinds = [
  { id: "qcm", fr: "QCM", en: "Multiple choice" },
  { id: "exercises", fr: "Exercices", en: "Exercises" },
  { id: "exam", fr: "Devoir / examen", en: "Test / exam" },
];
const labelOf = (list: { id: string; fr: string }[], id: string | undefined) => list.find((x) => x.id === id)?.fr;

/** What the wizard collected. */
export type LearnInput = { subject: string; level?: string; count?: string; exam?: string; country?: string; date?: string; hours?: string; text?: string; kind?: string };
/** The data part saved with the conversation's first message. */
export type LearnRequest = { tool: LearnToolId; level?: string };

/** The visible first message of the conversation (French, the product's learning audience; English labels for EN). */
export function learnMessage(tool: LearnTool, input: LearnInput, lang: "fr" | "en", hasDocument: boolean): { message: string; title: string } {
  const fr = lang === "fr";
  const lv = input.level ? learnLevels.find((l) => l.id === input.level)?.[lang] : "";
  const ex = input.exam ? learnExams.find((e) => e.id === input.exam)?.[lang] : "";
  const kind = input.kind ? assessmentKinds.find((k) => k.id === input.kind)?.[lang] : "";
  const bits = [
    tool.title[lang], input.subject.trim(), lv,
    input.count && (tool.id === "quiz" || tool.id === "assessment") ? `${input.count} questions` : "",
    input.count && tool.id === "flashcards" ? `${input.count} ${fr ? "cartes" : "cards"}` : "",
    kind, ex, input.country && input.country !== "Autre" ? input.country : "",
    input.date ? `${fr ? "examen le" : "exam on"} ${new Date(input.date + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}` : "",
    input.hours && tool.id === "plan" ? `${input.hours} h ${fr ? "par jour" : "a day"}` : "",
    input.hours && tool.id === "lesson" ? `${input.hours} ${fr ? (input.hours === "1" ? "séance" : "séances") : (input.hours === "1" ? "session" : "sessions")}` : "",
  ].filter(Boolean);
  let message = bits.join(" · ");
  if (hasDocument) message += fr ? "\n\nDocument joint : à utiliser comme source principale." : "\n\nAttached document: use it as the main source.";
  if (input.text?.trim()) message += `\n\n${tool.text?.[lang] ?? (fr ? "Texte" : "Text")} :\n${input.text.trim()}`;
  return { message, title: `${tool.title[lang]} · ${input.subject.trim().replace(/\s+/g, " ").slice(0, 48)}` };
}

const COMMON = [
  "You are TechNova's learning coach for students and teachers, mostly in French-speaking West and Central Africa.",
  "Accuracy comes first: never invent facts, dates, quotes, sources, statistics or official exam content; when you are not sure, say so plainly and tell the learner what to check in their textbook or with their teacher. Separate facts from simplifications.",
  "When the user attached a document or pasted course material, base the answer on it; anything you add that is not in it is marked « (hors du document) » / « (not in the document) ».",
  "Use concrete everyday examples familiar to the learner (market prices in FCFA, Mobile Money, football, farming, local cities) when they help, never stereotypes. Write formulas in plain text (x², √, ≤) rather than LaTeX.",
  "Use clear Markdown (short headings, lists, tables when useful), short paragraphs, no emoji.",
].join("\n");

const INTERACTIVE = {
  quiz: "Write ONE short sentence, then the quiz as a fenced block exactly like this:\n```technova-quiz\n{\"title\": \"…\", \"questions\": [{\"q\": \"…\", \"choices\": [\"…\", \"…\", \"…\", \"…\"], \"answer\": 0, \"explanation\": \"…\"}]}\n```\n`answer` is the 0-based index of the correct choice; vary its position. Four plausible choices (common mistakes as distractors), one clearly correct. `explanation`: 1-3 sentences saying why the right answer is right and why the most tempting wrong one is wrong. Valid JSON only inside the block (double quotes, no trailing commas, no comments). After the block, one line offering another quiz or flashcards.",
  flashcards: "Write ONE short sentence, then the cards as a fenced block exactly like this:\n```technova-flashcards\n{\"title\": \"…\", \"cards\": [{\"front\": \"…\", \"back\": \"…\"}]}\n```\n`front`: a short question, term or date (max 15 words). `back`: the answer, max 40 words, with a memory hook when useful. Valid JSON only inside the block. After the block, one line saying the cards can be added to « Mes révisions » with the button under them.",
  timer: "Put the duration of the paper at the very top as a fenced block exactly like this (minutes as a number):\n```technova-timer\n{\"minutes\": 120, \"label\": \"…\"}\n```",
};

/** Extra system rules for a learning conversation (server side, /api/chat). */
export function learnRules(req: LearnRequest): string {
  const level = labelOf(learnLevels, req.level);
  const rules: Record<LearnToolId, string> = {
    tutor: "Role: a patient Socratic tutor. NEVER give the final answer or the full solution straight away, even if the learner asks, insists or says it is urgent: ask one guiding question at a time, give progressive hints (first a nudge, then a method, then a partial step), and check each answer kindly. Keep replies short (under 120 words). Only after three genuine attempts on the same step may you show that step worked out, then give a similar exercise to try alone. When the learner finds the answer, confirm it, summarise the method in 2-3 lines and offer a slightly harder exercise. If the learner pasted a whole homework, work through it one question at a time the same way.",
    course: "Role: turn the learner's course into revision material. Produce, in this order: « Résumé » (about 10 lines), « Notions clés » (a table Notion | Définition), « À retenir » (5-8 bullets), « Erreurs fréquentes » (3-5 bullets), « Questions pour vérifier » (5 questions), then a final « Réponses » section. Then offer, in one line, a quiz, flashcards or a simpler explanation of any part. Afterwards, answer follow-up questions using only the course unless asked otherwise.",
    quiz: `Role: quiz maker. Make the number of questions requested (10 if not said), mixing easy, medium and hard. ${INTERACTIVE.quiz} If the learner later asks for another quiz, the same rules apply. If they ask about a question, explain it clearly.`,
    flashcards: `Role: flashcard maker for spaced repetition. Make the number of cards requested (15 if not said), one idea per card, covering the essentials first. ${INTERACTIVE.flashcards}`,
    plan: "Role: revision planner. Build a realistic day-by-day plan from today until the exam date (today's date is given above), within the hours per day given: a Markdown table per week (Jour | Matière / chapitre | Activité | Durée). Mix learning, active recall (quiz, flashcards), past-style exercises and rest; revisit each chapter at growing intervals (spaced repetition); keep a catch-up slot each week; make the last two days light review only. If the exam date is past or missing, ask for it. End with 5 practical tips (sleep, breaks, what to do the night before).",
    explain: "Role: explain the notion three ways, each under its own heading: « En une phrase », « Simplement » (as to a 12-year-old, with an everyday local example or analogy), « Plus précisément » (the correct, rigorous version at the learner's level, with one worked example). Point out the most common misunderstanding. End with 2 quick questions to check understanding, answers hidden at the very end under « Réponses ».",
    exam: `Role: exam practice. Write ONE practice paper in the spirit of the exam named (format, length, kind of exercises, points out of 20) for the subject and country given. Say clearly in one line that it is an original training paper, not an official past paper. ${INTERACTIVE.timer} Then the paper: instructions, exercises with points. Do NOT give the answers. End with: « Quand vous avez terminé, envoyez vos réponses (texte ou photo de votre copie) : je corrige et je note sur 20. » When the learner sends answers, mark them question by question against a fair marking scheme, give the mark out of 20, show the corrections and 3 priorities to work on.`,
    lesson: "Role: teaching assistant for a teacher. Write a lesson sequence: Objectifs (action verbs), Prérequis, Durée, then a table per session (Phase | Durée | Activité de l'enseignant | Activité des élèves | Supports), formative assessment, differentiation (struggling / advanced pupils), homework. Fit large classes and few resources when mentioned. Add one line: « À adapter au programme officiel de votre pays. »",
    assessment: "Role: teaching assistant. Write a printable assessment of the kind requested (QCM, exercises or a test/exam) with the number of questions requested: title, instructions, numbered questions with points, total out of 20 (or the scale asked). Then a separator line and « Corrigé et barème » with the answers and how points are given. No interactive blocks: plain Markdown that prints well.",
    rubric: "Role: teaching assistant. Write an assessment rubric as a Markdown table: one row per criterion (4-6 criteria from the task), columns « Insuffisant », « Fragile », « Satisfaisant », « Très bien » with short observable descriptors and points, then the total. Add 3 tips to use it fairly.",
    feedback: "Role: marking assistant for a teacher. From the assignment and the pupil's paper (text or photo), give: « Note proposée » out of 20 with a short marking scheme justification, « Points forts », « Erreurs » (quote the passage, give the correction, explain), « Conseils » (3 priorities), then a short encouraging comment the teacher can copy. Be fair and kind; remind in one line that the final mark is the teacher's decision. If the paper is unreadable, say which parts.",
    adapt: "Role: differentiation assistant. Rewrite the teacher's text at three reading levels, each under its own heading: « Version facile » (short sentences, everyday words), « Version standard », « Version approfondie » (richer vocabulary, one extra detail). Keep every fact identical; never add new facts. Then a « Vocabulaire » list of 5-8 hard words with simple definitions and 3 comprehension questions common to all versions.",
  };
  return `\n\n${COMMON}${level ? `\nLearner level: ${level}.` : ""}\n${rules[req.tool]}`;
}

// ---------------------------------------------------------------- Interactive blocks inside replies

export type QuizData = { title: string; questions: { q: string; choices: string[]; answer: number; explanation?: string }[] };
export type CardsData = { title: string; cards: { front: string; back: string }[] };
export type TimerData = { minutes: number; label?: string };
export type ReplySegment =
  | { kind: "text"; text: string }
  | { kind: "quiz"; data: QuizData | null }
  | { kind: "flashcards"; data: CardsData | null }
  | { kind: "timer"; data: TimerData | null };

function parseBlock(kind: "quiz" | "flashcards" | "timer", raw: string): QuizData | CardsData | TimerData | null {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (kind === "quiz") {
      const qs = (Array.isArray(v["questions"]) ? v["questions"] : []).filter((q): q is QuizData["questions"][number] =>
        !!q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length);
      return qs.length ? { title: String(v["title"] ?? "Quiz"), questions: qs.slice(0, 30) } : null;
    }
    if (kind === "flashcards") {
      const cards = (Array.isArray(v["cards"]) ? v["cards"] : []).filter((c): c is CardsData["cards"][number] => !!c && typeof c.front === "string" && typeof c.back === "string");
      return cards.length ? { title: String(v["title"] ?? "Flashcards"), cards: cards.slice(0, 60) } : null;
    }
    const minutes = Number(v["minutes"]);
    return minutes > 0 && minutes <= 600 ? { minutes, ...(typeof v["label"] === "string" ? { label: v["label"] } : {}) } : null;
  } catch { return null; }
}

/** Splits a reply into Markdown text and interactive blocks; a block still streaming comes back with data null. */
export function splitReply(text: string): ReplySegment[] {
  if (!text.includes("```technova-")) return [{ kind: "text", text }];
  const out: ReplySegment[] = [];
  const re = /```technova-(quiz|flashcards|timer)[^\n]*\n([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    const kind = m[1] as "quiz" | "flashcards" | "timer";
    const closed = m[0].endsWith("```");
    out.push({ kind, data: closed ? parseBlock(kind, m[2] ?? "") : null } as ReplySegment);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
