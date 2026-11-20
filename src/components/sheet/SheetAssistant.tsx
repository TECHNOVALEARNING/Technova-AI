import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { type Evaluator, isErr } from "@/lib/sheet/formula";
import { type SheetAction, applyActions, describeAction, sheetContext } from "@/lib/sheet/ai-actions";
import { type Workbook, addr, display } from "@/lib/sheet/model";
import { confirmAiCredits } from "@/lib/ai-credit-notice";
import { notifyCreditsChanged } from "@/components/dashboard/TopActions";

// The TechNova Tableur assistant: a side panel that reads the active sheet, answers, writes and proposes changes
// (cells, formulas, formats, charts, sheets). Proposed changes are listed and applied only on « Appliquer »; the
// assistant uses a few credits per request (real cost under TechNova's pricing), billed on the server only when it
// answers; the first request of the tab asks for confirmation (confirmAiCredits) and no fixed price is shown.

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
type Msg = { role: "user" | "assistant"; content: string; cost?: number; actions?: SheetAction[]; state?: "pending" | "applied" | "ignored" };

export function SheetAssistant({ lang, wb, si, selection, ev, onApply, onClose }: { lang: Lang; wb: Workbook; si: number; selection: string; ev: Evaluator; onApply: (wb: Workbook) => void; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const sheet = wb.sheets[si]!;
  const empty = Object.values(sheet.cells).every((c) => c.v === "");
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const ideas = empty
    ? [tx(lang, "Crée un budget mensuel avec revenus, dépenses et solde", "Create a monthly budget with income, expenses and balance"), tx(lang, "Prépare un suivi des ventes de ma boutique", "Set up a sales tracker for my shop"), tx(lang, "Fais une liste de présence pour 30 élèves", "Make an attendance list for 30 students"), tx(lang, "Que puis-je mettre dans ce tableau pour une tontine ?", "What should a savings circle sheet contain?")]
    : [tx(lang, "Ajoute une ligne de total en bas", "Add a total row at the bottom"), tx(lang, "Mets ce tableau en forme de façon professionnelle", "Format this table professionally"), tx(lang, "Crée un graphique adapté à ces données", "Create a chart for this data"), tx(lang, `Explique la formule de ${selection.split(":")[0]}`, `Explain the formula in ${selection.split(":")[0]}`), tx(lang, "Trouve les erreurs et incohérences", "Find errors and inconsistencies"), tx(lang, "Résume ces chiffres en trois phrases", "Summarise these figures in three sentences")];

  async function send(message: string) {
    const m = message.trim(); if (!m || busy) return;
    if (!(await confirmAiCredits("sheet", lang))) return;
    setText("");
    const history = msgs.slice(-6).map((x) => ({ role: x.role, content: x.content.slice(0, 3800) }));
    setMsgs((l) => [...l, { role: "user", content: m }]);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/sheet-ai", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({
          kind: "assist", lang, title: wb.title.slice(0, 120), sheet: sheet.name, sheets: wb.sheets.map((s) => s.name).slice(0, 30), selection,
          context: sheetContext(wb, si, (c, r) => { const v = ev.value(si, c, r); return isErr(v) ? v.err : display(v, sheet.cells[addr(c, r)]?.s); }).slice(0, 40_000),
          history, message: m,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { reply: string; actions: SheetAction[]; credits?: number };
      notifyCreditsChanged();
      setMsgs((l) => [...l, { role: "assistant", content: json.reply, ...(json.credits ? { cost: json.credits } : {}), ...(json.actions.length ? { actions: json.actions, state: "pending" as const } : {}) }]);
    } catch (e) {
      const t = e instanceof Error && e.message && e.message.length < 300 ? e.message : tx(lang, "L'assistant n'a pas pu répondre.", "The assistant could not answer.");
      setMsgs((l) => [...l, { role: "assistant", content: t }]);
    } finally { setBusy(false); }
  }
  const apply = (i: number) => {
    const msg = msgs[i]; if (!msg?.actions) return;
    onApply(applyActions(wb, si, msg.actions));
    setMsgs((l) => l.map((x, k) => (k === i ? { ...x, state: "applied" } : x)));
  };

  return <aside className="flex w-[360px] shrink-0 flex-col border-l border-border bg-background">
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#1f7a5a] to-[#2b9b74] text-white"><Sparkles className="size-3.5" /></span>
      <div className="min-w-0 flex-1"><strong className="block text-[13px]">{tx(lang, "Assistant IA du tableur", "Spreadsheet AI assistant")}</strong><span className="block text-[11px] text-muted-foreground">{tx(lang, "Vous validez chaque changement", "You approve every change")}</span></div>
      <button type="button" onClick={onClose} aria-label={tx(lang, "Fermer l'assistant", "Close assistant")} className="grid size-7 place-items-center rounded-md hover:bg-secondary"><X className="size-4" /></button>
    </div>
    <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      {!msgs.length && <div className="space-y-3">
        <p className="rounded-xl bg-secondary/70 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {empty
            ? tx(lang, "Dites-moi ce que vous voulez suivre : je propose les colonnes, les formules, la mise en forme et un graphique. Vous gardez la main : rien ne change sans votre accord.", "Tell me what you want to track: I suggest the columns, formulas, formatting and a chart. Nothing changes without your approval.")
            : tx(lang, `Je lis la feuille « ${sheet.name} ». Demandez une formule, un total, une mise en forme, un graphique, une analyse ou un texte.`, `I read the sheet "${sheet.name}". Ask for a formula, a total, formatting, a chart, an analysis or some text.`)}
        </p>
        <div className="flex flex-col gap-1.5">{ideas.map((i) => <button key={i} type="button" onClick={() => void send(i)} className="rounded-xl border border-border px-3 py-2 text-left text-[12.5px] transition hover:border-[#1f7a5a]/50 hover:bg-[#1f7a5a]/[0.05]">{i}</button>)}</div>
      </div>}
      {msgs.map((m, i) => <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed", m.role === "user" ? "bg-[#1f7a5a] text-white" : "bg-secondary text-foreground")}>
          <p className="whitespace-pre-wrap">{m.content}</p>
          {m.cost ? <p className="mt-1 text-[10.5px] text-muted-foreground">{tx(lang, `${m.cost} crédits utilisés`, `${m.cost} credits used`)}</p> : null}
          {m.actions && <div className="mt-2 rounded-xl border border-border bg-background p-2 text-foreground">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tx(lang, "Changements proposés", "Proposed changes")}</p>
            <ul className="space-y-0.5">{m.actions.slice(0, 12).map((a, k) => <li key={k} className="flex gap-1.5 text-[12px]"><span className="text-[#1f7a5a]">•</span><span className="min-w-0">{describeAction(a, lang === "fr")}</span></li>)}</ul>
            {m.actions.length > 12 && <p className="mt-0.5 text-[11px] text-muted-foreground">+ {m.actions.length - 12}</p>}
            {m.state === "pending" ? <div className="mt-2 flex gap-1.5">
              <button type="button" onClick={() => apply(i)} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-[#1f7a5a] text-[12px] font-semibold text-white hover:brightness-110"><Check className="size-3.5" />{tx(lang, "Appliquer", "Apply")}</button>
              <button type="button" onClick={() => setMsgs((l) => l.map((x, k) => (k === i ? { ...x, state: "ignored" } : x)))} className="h-8 rounded-full border border-border px-3 text-[12px] hover:bg-secondary">{tx(lang, "Ignorer", "Dismiss")}</button>
            </div> : <p className="mt-1.5 text-[11.5px] font-medium text-muted-foreground">{m.state === "applied" ? tx(lang, "Appliqué · Ctrl+Z pour annuler", "Applied · Ctrl+Z to undo") : tx(lang, "Ignoré", "Dismissed")}</p>}
          </div>}
        </div>
      </div>)}
      {busy && <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{tx(lang, "L'assistant réfléchit…", "The assistant is thinking…")}</div>}
    </div>
    <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="border-t border-border p-2.5">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-2.5 py-2 focus-within:border-[#1f7a5a]/60">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
          placeholder={tx(lang, "Ex. : calcule la marge en colonne E et colore en rouge les pertes", "E.g. compute the margin in column E and colour losses red")}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent text-[12.5px] outline-none" />
        <button type="submit" disabled={busy || !text.trim()} aria-label={tx(lang, "Envoyer", "Send")} className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1f7a5a] text-white disabled:opacity-40"><ArrowUp className="size-4" /></button>
      </div>
      <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">{tx(lang, "L'IA peut se tromper : vérifiez les chiffres importants.", "AI can make mistakes: check important figures.")}</p>
    </form>
  </aside>;
}
