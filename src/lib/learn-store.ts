// « Apprendre » progress kept on this device only (technova-learn, listed on /cookies, cleared on sign-out):
// flashcard decks with spaced repetition (Leitner boxes), quiz results and the days with learning activity.
// Nothing is sent to TechNova.

export const LEARN_KEY = "technova-learn";
const DAY = 86_400_000;
/** Days before the next review, by box (a known card climbs one box, a missed card goes back to box 0). */
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

export type StoredCard = { id: string; front: string; back: string; box: number; due: number };
export type Deck = { id: string; title: string; created: number; cards: StoredCard[] };
export type QuizResult = { title: string; score: number; total: number; at: number };
type LearnState = { decks: Deck[]; quizzes: QuizResult[]; days: string[] };

const empty = (): LearnState => ({ decks: [], quizzes: [], days: [] });
const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString("en-CA");

export function loadLearn(): LearnState {
  try {
    const v = JSON.parse(localStorage.getItem(LEARN_KEY) ?? "null") as Partial<LearnState> | null;
    return { decks: v?.decks ?? [], quizzes: v?.quizzes ?? [], days: v?.days ?? [] };
  } catch { return empty(); }
}
function save(state: LearnState) {
  try { localStorage.setItem(LEARN_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new Event("technova-learn"));
}
function withActivity(state: LearnState): LearnState {
  const today = dayKey();
  return state.days.includes(today) ? state : { ...state, days: [...state.days, today].slice(-120) };
}

/** Adds a deck (all cards due today). Returns false when the same deck is already saved. */
export function addDeck(title: string, cards: { front: string; back: string }[]): boolean {
  const state = loadLearn();
  if (state.decks.some((d) => d.title === title && d.cards.length === cards.length && d.cards[0]?.front === cards[0]?.front)) return false;
  const now = Date.now();
  const deck: Deck = { id: crypto.randomUUID(), title: title.slice(0, 120), created: now, cards: cards.slice(0, 60).map((c) => ({ id: crypto.randomUUID(), front: c.front.slice(0, 300), back: c.back.slice(0, 600), box: 0, due: now })) };
  save(withActivity({ ...state, decks: [deck, ...state.decks].slice(0, 40) }));
  return true;
}
export const deckSaved = (title: string, first: string | undefined) => loadLearn().decks.some((d) => d.title === title && d.cards[0]?.front === first);
export function deleteDeck(id: string) { const s = loadLearn(); save({ ...s, decks: s.decks.filter((d) => d.id !== id) }); }

/** Cards due now, oldest due first. */
export function dueCards(state = loadLearn()): { deck: Deck; card: StoredCard }[] {
  const now = Date.now();
  return state.decks.flatMap((deck) => deck.cards.filter((c) => c.due <= now).map((card) => ({ deck, card }))).sort((a, b) => a.card.due - b.card.due);
}
export function reviewCard(deckId: string, cardId: string, knew: boolean) {
  const state = loadLearn();
  const decks = state.decks.map((d) => d.id !== deckId ? d : { ...d, cards: d.cards.map((c) => {
    if (c.id !== cardId) return c;
    const box = knew ? Math.min(c.box + 1, INTERVALS.length - 1) : 0;
    return { ...c, box, due: knew ? Date.now() + INTERVALS[box]! * DAY : Date.now() + 10 * 60_000 };
  }) });
  save(withActivity({ ...state, decks }));
}

export function recordQuiz(title: string, score: number, total: number) {
  const state = loadLearn();
  save(withActivity({ ...state, quizzes: [...state.quizzes, { title: title.slice(0, 120), score, total, at: Date.now() }].slice(-60) }));
}

/** Consecutive days with learning activity, ending today or yesterday. */
export function streak(state = loadLearn()): number {
  const days = new Set(state.days);
  let n = 0;
  let t = Date.now();
  if (!days.has(dayKey(t))) t -= DAY;
  while (days.has(dayKey(t))) { n++; t -= DAY; }
  return n;
}
