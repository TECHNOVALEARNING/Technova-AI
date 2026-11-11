import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, Mail, X } from "lucide-react";
import { content, type SiteLang } from "@/lib/i18n";

// Floating help on public pages: the TechNova logo as an avatar and a compact, solid panel. A frequent question
// is answered at once from the site FAQ; a typed question goes to the AI assistant (DeepSeek, /api/public/help-chat).
// When the assistant is unavailable, the closest FAQ answer or a prefilled support e-mail takes over.
const copy = {
  fr: { open: "Questions et réponses", close: "Fermer l'aide", title: "Assistance TechNova", status: "Assistant IA · réponses immédiates", typing: "L'assistant écrit…", busy: "Beaucoup de questions en ce moment : réessayez dans quelques minutes, ou écrivez-nous :", hello: "Bonjour 👋 Posez votre question ou choisissez-en une.", placeholder: "Votre question…", send: "Envoyer", unknown: "Je n'ai pas de réponse toute prête à cette question. Notre équipe vous répond par e-mail :", write: "Écrire au support", mail: "Support", docs: "Documentation", subject: "Question depuis le site" },
  en: { open: "Questions and answers", close: "Close help", title: "TechNova support", status: "AI assistant · instant answers", typing: "The assistant is typing…", busy: "Lots of questions right now: try again in a few minutes, or write to us:", hello: "Hi 👋 Ask your question or pick one.", placeholder: "Your question…", send: "Send", unknown: "I don't have a ready answer to that. Our team will reply by e-mail:", write: "Email support", mail: "Support", docs: "Documentation", subject: "Question from the website" },
  es: { open: "Preguntas y respuestas", close: "Cerrar la ayuda", title: "Asistencia TechNova", status: "Asistente IA · respuestas inmediatas", typing: "El asistente está escribiendo…", busy: "Muchas preguntas ahora mismo: inténtalo en unos minutos o escríbenos:", hello: "Hola 👋 Escribe tu pregunta o elige una.", placeholder: "Tu pregunta…", send: "Enviar", unknown: "No tengo una respuesta lista para eso. Nuestro equipo te responde por correo:", write: "Escribir al soporte", mail: "Soporte", docs: "Documentación", subject: "Pregunta desde el sitio" },
  pt: { open: "Perguntas e respostas", close: "Fechar a ajuda", title: "Suporte TechNova", status: "Assistente IA · respostas imediatas", typing: "O assistente está escrevendo…", busy: "Muitas perguntas agora: tente em alguns minutos ou escreva para nós:", hello: "Olá 👋 Escreva sua pergunta ou escolha uma.", placeholder: "Sua pergunta…", send: "Enviar", unknown: "Não tenho uma resposta pronta para isso. Nossa equipe responde por e-mail:", write: "Escrever ao suporte", mail: "Suporte", docs: "Documentação", subject: "Pergunta pelo site" },
} satisfies Record<SiteLang, unknown>;

type Msg = { from: "me" | "bot"; text: string; mail?: string };

const STOP = new Set("le la les un une des de du d l et ou a à au aux en est ce que qui quoi pour par sur avec mes mon ma vos votre vous je j il on y the a an of to is are do does can i my your you and or in for with el los las es que y o en para con mi tu o os as um uma do da dos das com meu".split(" "));
const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
/** Closest FAQ entry by shared words (question counts double); null when nothing really matches. */
function bestAnswer(question: string, faq: readonly { q: string; a: string }[]) {
  const asked = new Set(words(question));
  let best = -1, score = 0;
  faq.forEach((f, i) => {
    const qs = words(f.q), as = words(f.a);
    const s = qs.filter((w) => asked.has(w) || [...asked].some((a) => a.length > 4 && (w.startsWith(a.slice(0, 5)) || a.startsWith(w.slice(0, 5))))).length * 2 + as.filter((w) => asked.has(w)).length;
    if (s > score) { score = s; best = i; }
  });
  return score >= 2 ? faq[best]! : null;
}

function Avatar({ size = 28 }: { size?: number }) {
  return <img src="/favicon.svg" alt="" width={size} height={size} className="shrink-0 rounded-[8px]" style={{ width: size, height: size }} />;
}

export function HelpWidget({ lang }: { lang: SiteLang }) {
  const t = copy[lang];
  const faq: readonly { q: string; a: string }[] = content[lang].faq.items;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, thinking]);

  async function ask(question: string) {
    const q = question.trim().slice(0, 500);
    if (!q || thinking) return;
    setDraft("");
    const mail = `mailto:support@technovaihub.com?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(q)}`;
    // A suggested question is answered at once from the FAQ (no AI call).
    const exact = faq.find((f) => f.q === q);
    if (exact) { setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", text: exact.a }]); return; }
    const history = [...msgs.filter((m) => !m.mail).slice(-6), { from: "me" as const, text: q }];
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setThinking(true);
    let reply: Msg;
    try {
      const res = await fetch("/api/public/help-chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: history.map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text.slice(0, 800) })) }) });
      const data = (await res.json().catch(() => ({}))) as { answer?: string };
      if (res.ok && data.answer) reply = { from: "bot", text: data.answer };
      else if (res.status === 429) reply = { from: "bot", text: t.busy, mail };
      else throw new Error("unavailable");
    } catch {
      const hit = bestAnswer(q, faq);
      reply = hit ? { from: "bot", text: hit.a } : { from: "bot", text: t.unknown, mail };
    }
    setThinking(false);
    setMsgs((m) => [...m, reply]);
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void ask(draft); };
  const askedQs = new Set(msgs.filter((m) => m.from === "me").map((m) => m.text));
  const suggestions = faq.filter((f) => !askedQs.has(f.q)).slice(0, msgs.length ? 3 : 5);

  return <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5 sm:bottom-5 sm:right-5">
    {open && <section role="dialog" aria-label={t.title} className="help-panel flex max-h-[min(500px,calc(100svh-110px))] w-[min(330px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border border-border bg-card text-foreground">
      <header className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
        <span className="relative"><Avatar size={32} /><span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" /></span>
        <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold leading-tight">{t.title}</p><p className="text-[11px] text-muted-foreground">{t.status}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"><X className="size-3.5" /></button>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-background/60 px-3.5 py-3.5" aria-live="polite">
        <div className="flex items-end gap-2"><Avatar size={22} /><p className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-[12.5px] leading-relaxed">{t.hello}</p></div>
        {msgs.map((m, i) => m.from === "me"
          ? <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-[12.5px] text-background">{m.text}</p>
          : <div key={i} className="flex items-end gap-2"><Avatar size={22} /><div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-[12.5px] leading-relaxed">{m.text}{m.mail && <a href={m.mail} className="mt-1.5 flex w-fit items-center gap-1.5 font-semibold underline underline-offset-2"><Mail className="size-3.5" />{t.write}</a>}</div></div>)}
        {thinking && <div className="flex items-end gap-2" role="status"><Avatar size={22} /><p className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2.5" aria-label={t.typing}><span className="help-dot" /><span className="help-dot" /><span className="help-dot" /></p></div>}
        {suggestions.length > 0 && !thinking && <div className="flex flex-wrap gap-1.5 pt-0.5">{suggestions.map((f) => <button key={f.q} type="button" onClick={() => void ask(f.q)} className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11.5px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground">{f.q}</button>)}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-2.5">
        <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={t.placeholder} aria-label={t.placeholder}
          className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3.5 text-[12.5px] outline-none focus:border-foreground/40" />
        <button type="submit" disabled={!draft.trim() || thinking} aria-label={t.send} className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition disabled:opacity-30"><ArrowUp className="size-4" /></button>
      </form>
      <footer className="flex justify-center gap-4 pb-2.5 text-[11px] text-muted-foreground">
        <a href="mailto:support@technovaihub.com" className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="size-3" />{t.mail}</a>
        <a href="/documentation" className="inline-flex items-center gap-1 hover:text-foreground"><BookOpen className="size-3" />{t.docs}</a>
      </footer>
    </section>}
    <button ref={button} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t.close : t.open} title={t.open}
      className="help-launcher relative grid size-12 place-items-center rounded-full border border-border bg-card text-foreground transition hover:scale-105 active:scale-95">
      {open ? <X className="size-4" /> : <Avatar size={28} />}
      {!open && <span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />}
    </button>
  </div>;
}
