import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Scale, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import { useDashboard } from "./DashboardLayout";
import { openRouterModelIds } from "@/lib/chat-models";
import { getArenaLeaderboard, runArena, voteArena } from "@/lib/arena.functions";

type Battle = { battleId: string; answerA: string; answerB: string; credits: number; models: { a: string; b: string } | null };
type Row = { model: string; battles: number; wins: number; ties: number };
const models = Object.keys(openRouterModelIds);

export function ArenaPage() {
  const { lang } = useDashboard();
  const fr = lang !== "en";
  const loc = fr ? "fr-FR" : "en-US";
  const [prompt, setPrompt] = useState("");
  const [modelA, setModelA] = useState("random");
  const [modelB, setModelB] = useState("random");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [revealed, setRevealed] = useState<{ a: string; b: string } | null>(null);
  const [voted, setVoted] = useState<"a" | "b" | "tie" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState<Row[]>([]);
  const loadBoard = useCallback(() => { getArenaLeaderboard().then(setBoard).catch(() => setBoard([])); }, []);
  useEffect(loadBoard, [loadBoard]);

  async function start(e: FormEvent) {
    e.preventDefault();
    if (busy || prompt.trim().length < 2) return;
    setBusy(true); setError(""); setBattle(null); setRevealed(null); setVoted(null);
    try {
      const b = await runArena({ data: { prompt, modelA, modelB, lang: fr ? "fr" : "en" } });
      setBattle(b);
      setRevealed(b.models);
    } catch (err) { setError(String((err as Error)?.message ?? err)); }
    setBusy(false);
  }

  async function vote(winner: "a" | "b" | "tie") {
    if (!battle || voted) return;
    setVoted(winner);
    try { setRevealed(await voteArena({ data: { battleId: battle.battleId, winner } })); loadBoard(); }
    catch (err) { setVoted(null); setError(String((err as Error)?.message ?? err)); }
  }

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className="h-9 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-xs">
      <option value="random">{fr ? "Aléatoire (à l'aveugle)" : "Random (blind)"}</option>
      {models.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  );
  const side = (key: "a" | "b", answer: string) => (
    <article className={`flex min-w-0 flex-col rounded-2xl border bg-card/90 p-4 ${voted === key ? "border-chat-glow ring-1 ring-chat-glow/40" : "border-border"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {fr ? "Modèle" : "Model"} {key.toUpperCase()}{revealed ? ` · ${revealed[key]}` : ""}
      </p>
      <div className="mt-2 min-w-0 flex-1 overflow-x-auto text-sm"><MessageResponse>{answer}</MessageResponse></div>
      {!voted && <Button className="mt-3" variant="outline" size="sm" onClick={() => void vote(key)}>{fr ? `${key.toUpperCase()} est meilleur` : `${key.toUpperCase()} is better`}</Button>}
    </article>
  );

  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
    <header>
      <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Swords className="size-5" />Arena</h1>
      <p className="mt-1 text-sm text-muted-foreground">{fr
        ? "Posez la même question à deux modèles et votez pour la meilleure réponse. En mode aléatoire, les noms sont révélés après le vote. Les deux réponses sont facturées comme dans le chat."
        : "Ask two models the same question and vote for the better answer. In random mode, names are revealed after the vote. Both answers are billed like chat replies."}</p>
    </header>

    <form onSubmit={(e) => void start(e)} className="space-y-3 rounded-2xl border border-border bg-card/90 p-4">
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={4000} rows={3} placeholder={fr ? "Votre question…" : "Your question…"} aria-label={fr ? "Votre question" : "Your question"} />
      <div className="flex flex-wrap items-center gap-2">
        {select(modelA, setModelA, fr ? "Modèle A" : "Model A")}
        <span className="text-xs text-muted-foreground">vs</span>
        {select(modelB, setModelB, fr ? "Modèle B" : "Model B")}
        <Button type="submit" disabled={busy || prompt.trim().length < 2}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}{fr ? "Lancer le duel" : "Start battle"}</Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>

    {battle && <section className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">{side("a", battle.answerA)}{side("b", battle.answerB)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{fr ? `Coût du duel : ${battle.credits.toLocaleString(loc)} crédits` : `Battle cost: ${battle.credits.toLocaleString(loc)} credits`}</span>
        {!voted ? <Button size="sm" variant="ghost" onClick={() => void vote("tie")}><Scale className="size-4" />{fr ? "Égalité" : "Tie"}</Button>
          : <span>{fr ? "Merci pour votre vote." : "Thanks for voting."}</span>}
      </div>
    </section>}

    <section>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Trophy className="size-4" />{fr ? "Classement (votes à l'aveugle)" : "Leaderboard (blind votes)"}</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90">
        <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>
          <th className="p-3">#</th><th className="p-3">{fr ? "Modèle" : "Model"}</th><th className="p-3">{fr ? "Victoires" : "Win rate"}</th><th className="p-3">{fr ? "Duels" : "Battles"}</th>
        </tr></thead>
        <tbody>{board.length === 0
          ? <tr><td colSpan={4} className="p-3 text-muted-foreground">{fr ? "Pas encore de votes. Lancez un duel en mode aléatoire !" : "No votes yet. Start a random battle!"}</td></tr>
          : board.map((r, i) => <tr key={r.model} className="border-t border-border"><td className="p-3">{i + 1}</td><td className="p-3 font-medium">{r.model}</td>
            <td className="p-3">{Math.round(((r.wins + r.ties / 2) / r.battles) * 100)} %</td><td className="p-3">{r.battles}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
