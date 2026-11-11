import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Mail, X } from "lucide-react";
import { content, type SiteLang } from "@/lib/i18n";

// Floating help on public pages: the TechNova logo as an avatar, opening a frosted-glass panel where the
// visitor picks a question and reads the answer as a short conversation (answers come from the site FAQ).
const copy = {
  fr: { open: "Questions et réponses", close: "Fermer l'aide", title: "Assistance TechNova", status: "Réponses immédiates", hello: "Bonjour 👋 Quelle est votre question ?", pick: "Questions fréquentes", again: "Autre question", mail: "Écrire au support", docs: "Documentation" },
  en: { open: "Questions and answers", close: "Close help", title: "TechNova support", status: "Instant answers", hello: "Hi 👋 What would you like to know?", pick: "Frequent questions", again: "Another question", mail: "Email support", docs: "Documentation" },
  es: { open: "Preguntas y respuestas", close: "Cerrar la ayuda", title: "Asistencia TechNova", status: "Respuestas inmediatas", hello: "Hola 👋 ¿Cuál es tu pregunta?", pick: "Preguntas frecuentes", again: "Otra pregunta", mail: "Escribir al soporte", docs: "Documentación" },
  pt: { open: "Perguntas e respostas", close: "Fechar a ajuda", title: "Suporte TechNova", status: "Respostas imediatas", hello: "Olá 👋 Qual é a sua pergunta?", pick: "Perguntas frequentes", again: "Outra pergunta", mail: "Escrever ao suporte", docs: "Documentação" },
} satisfies Record<SiteLang, unknown>;

function Avatar({ size = 32 }: { size?: number }) {
  return <img src="/favicon.svg" alt="" width={size} height={size} className="shrink-0 rounded-[10px] shadow-sm" style={{ width: size, height: size }} />;
}

export function HelpWidget({ lang }: { lang: SiteLang }) {
  const t = copy[lang];
  const faq = content[lang].faq.items;
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<number[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [asked]);

  const left = faq.map((_, i) => i).filter((i) => !asked.includes(i));

  return <div className="help-widget fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
    {open && <section role="dialog" aria-label={t.title} className="help-panel flex max-h-[min(560px,calc(100svh-120px))] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-[26px] text-foreground">
      <header className="flex items-center gap-3 border-b border-white/40 px-4 py-3.5 dark:border-white/10">
        <span className="relative"><Avatar size={38} /><span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" /></span>
        <div className="min-w-0 flex-1"><p className="font-display text-[15px] font-semibold leading-tight">{t.title}</p><p className="text-[11.5px] text-muted-foreground">{t.status}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"><X className="size-4" /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="flex items-end gap-2"><Avatar size={26} /><p className="help-bubble rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13.5px]">{t.hello}</p></div>
        {asked.map((i) => <div key={i} className="space-y-3">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13.5px] text-background">{faq[i]!.q}</p>
          <div className="flex items-end gap-2"><Avatar size={26} /><p className="help-bubble max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13.5px] leading-relaxed">{faq[i]!.a}</p></div>
        </div>)}
        {left.length > 0 && <div className="pt-1">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{asked.length ? t.again : t.pick}</p>
          <div className="flex flex-wrap gap-1.5">{left.map((i) => <button key={i} type="button" onClick={() => setAsked([...asked, i])} className="help-chip rounded-full px-3 py-1.5 text-left text-[12.5px] transition">{faq[i]!.q}</button>)}</div>
        </div>}
        <div ref={end} />
      </div>
      <footer className="grid grid-cols-2 gap-2 border-t border-white/40 p-3 dark:border-white/10">
        <a href="mailto:support@technovaihub.com" className="help-chip inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium"><Mail className="size-3.5" />{t.mail}</a>
        <a href="/documentation" className="help-chip inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium"><BookOpen className="size-3.5" />{t.docs}<ArrowUpRight className="size-3" /></a>
      </footer>
    </section>}
    <button ref={button} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t.close : t.open} title={t.open}
      className="help-launcher relative grid size-14 place-items-center rounded-full transition hover:scale-105 active:scale-95">
      {open ? <X className="size-5" /> : <Avatar size={34} />}
      {!open && <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-white bg-emerald-500" />}
    </button>
  </div>;
}
