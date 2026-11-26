import { useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";
import { fnName, fnSyntax, openFunction, suggestFunctions, typedFunction, type FnInfo } from "@/lib/sheet/functions";
import { cn } from "@/lib/utils";

// Formula suggestions, like Excel: typing « = » lists the most used functions, letters filter them (French or
// English names), ↑ ↓ choose, Tab or Entrée insert « NOM( », Échap closes the list. Once inside the brackets, a
// tip shows the function's arguments with the current one in bold.

type Lang = "fr" | "en";
type Editing = { text: string };

export function useFormulaAssist(lang: Lang, editing: Editing | null, setText: (text: string, caret: number) => void) {
  const [caret, setCaret] = useState(0);
  const [idx, setIdx] = useState(0);
  const [off, setOff] = useState(false);
  const [moved, setMoved] = useState(false);
  const typed = editing ? typedFunction(editing.text, Math.min(caret, editing.text.length)) : null;
  const items = typed && !off ? suggestFunctions(typed.prefix, lang) : [];
  const open = items.length > 0;
  const tip = editing && !open ? openFunction(editing.text, Math.min(caret, editing.text.length)) : null;

  const apply = (f: FnInfo) => {
    if (!editing || !typed) return;
    const name = fnName(f, lang);
    const end = Math.min(caret, editing.text.length);
    const after = editing.text.slice(end);
    const text = editing.text.slice(0, typed.start) + name + (after.startsWith("(") ? "" : "(") + after;
    const next = typed.start + name.length + 1;
    setOff(true); setIdx(0); setMoved(false); setCaret(next);
    setText(text, next);
  };
  return {
    open, items, idx: Math.min(idx, Math.max(0, items.length - 1)), tip, apply,
    /** Call from the input's onChange / onSelect / onClick with the element: keeps the caret in step. */
    track: (el: HTMLInputElement, changed: boolean) => { setCaret(el.selectionStart ?? el.value.length); if (changed) { setOff(false); setIdx(0); setMoved(false); } },
    reset: () => { setOff(false); setIdx(0); setCaret(0); },
    hover: setIdx,
    /** Handles ↑ ↓ Tab Entrée Échap while the list is open; returns true when the key was used. */
    onKey: (e: KeyboardEvent<HTMLInputElement>): boolean => {
      if (!open) return false;
      if (e.key === "ArrowDown") { e.preventDefault(); setMoved(true); setIdx((i) => (i + 1) % items.length); return true; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMoved(true); setIdx((i) => (i - 1 + items.length) % items.length); return true; }
      if (e.key === "Enter" && !moved && (typed?.prefix.length ?? 0) < 2) return false;
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); apply(items[Math.min(idx, items.length - 1)]!); return true; }
      if (e.key === "Escape") { e.preventDefault(); setOff(true); return true; }
      return false;
    },
  };
}

type Assist = ReturnType<typeof useFormulaAssist>;

export function FormulaSuggest({ assist, lang, style }: { assist: Assist; lang: Lang; style: CSSProperties }) {
  if (!assist.open) {
    if (!assist.tip) return null;
    const { info, arg } = assist.tip;
    const args = (lang === "fr" ? info.argsFr : info.argsEn).split(lang === "fr" ? "; " : ", ");
    const cur = Math.min(arg, args.length - 1 - (args[args.length - 1] === "…" ? 1 : 0));
    return <div data-no-grid onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} className="pointer-events-none absolute z-[40] max-w-[440px] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] text-zinc-800 shadow-lg" style={style}>
      <span className="font-mono">{fnName(info, lang)}(</span>
      {args.map((a, i) => <span key={i} className={cn("font-mono", i === cur && "font-bold text-[#1f7a5a]")}>{a}{i < args.length - 1 ? (lang === "fr" ? "; " : ", ") : ""}</span>)}
      <span className="font-mono">)</span>
      <p className="mt-0.5 text-[11.5px] text-zinc-500">{lang === "fr" ? info.fr_ : info.en_}</p>
    </div>;
  }
  const sel = assist.items[assist.idx]!;
  return <div data-no-grid role="listbox" aria-label={lang === "fr" ? "Fonctions" : "Functions"} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    className="absolute z-[40] w-[340px] overflow-hidden rounded-xl border border-zinc-200 bg-white text-[12.5px] text-zinc-900 shadow-2xl" style={style}>
    <ul className="max-h-[232px] overflow-y-auto py-1">
      {assist.items.map((f, i) => <li key={f.en} role="option" aria-selected={i === assist.idx}
        onPointerEnter={() => assist.hover(i)} onPointerDown={(e) => { e.preventDefault(); assist.apply(f); }}
        className={cn("flex cursor-pointer items-center gap-2 px-2.5 py-1.5", i === assist.idx ? "bg-[#1f7a5a] text-white" : "hover:bg-zinc-100")}>
        <span className={cn("grid h-5 w-6 shrink-0 place-items-center rounded font-serif text-[11px] italic", i === assist.idx ? "bg-white/20" : "bg-[#e7f3ee] text-[#1f7a5a]")}>fx</span>
        <span className="font-mono font-semibold">{fnName(f, lang)}</span>
        {lang === "fr" && f.fr !== f.en && <span className={cn("ml-auto font-mono text-[10.5px]", i === assist.idx ? "text-white/70" : "text-zinc-400")}>{f.en}</span>}
      </li>)}
    </ul>
    <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="font-mono text-[11.5px] font-semibold text-[#1f7a5a]">{fnSyntax(sel, lang)}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-zinc-600">{lang === "fr" ? sel.fr_ : sel.en_}</p>
      <p className="mt-1 text-[10.5px] text-zinc-400">{lang === "fr" ? "↑ ↓ pour choisir · Tab ou Entrée pour insérer · Échap pour fermer" : "↑ ↓ to choose · Tab or Enter to insert · Esc to close"}</p>
    </div>
  </div>;
}

/** Position for the suggestions under an input. */
export const under = (el: RefObject<HTMLElement | null>, fallback: { left: number; top: number }): CSSProperties => {
  const x = el.current;
  return x ? { left: x.offsetLeft, top: x.offsetTop + x.offsetHeight + 4 } : fallback;
};
