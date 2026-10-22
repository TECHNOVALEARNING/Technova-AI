import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Loader2, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type Shared = { title: string; updated_at: string; messages: { role: string; parts: { type: string; text?: string }[] }[] };

export const Route = createFileRoute("/partage/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Conversation partagée | TechNova AI Hub" },
    { name: "description", content: "Lisez une conversation partagée depuis TechNova AI Hub et poursuivez-la dans votre propre espace." },
    { property: "og:title", content: "Conversation partagée | TechNova AI Hub" },
    { property: "og:description", content: "Une conversation IA partagée depuis TechNova AI Hub." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: async ({ params }) => {
    const { data } = await supabase.rpc("get_shared_thread", { _token: params.token });
    return { shared: (data as unknown as Shared | null) ?? null };
  },
  component: SharedPage,
});

const textOf = (parts: Shared["messages"][number]["parts"]) => (Array.isArray(parts) ? parts.map(p => (p.type === "text" ? p.text ?? "" : "")).join("") : "");

function SharedPage() {
  const { shared } = Route.useLoaderData();
  const navigate = useNavigate();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (window.localStorage.getItem("technova-dashboard-lang") === "en") setLang("en"); }, []);
  const c = lang === "fr"
    ? { label: "Conversation partagée", cont: "Continuer à discuter", copy: "Copier le lien", copied: "Lien copié", missing: "Conversation introuvable", missingSub: "Ce lien a été désactivé ou n'existe pas.", home: "Découvrir TechNova", footer: "Partagé depuis TechNova AI Hub. Les réponses de l'IA peuvent contenir des erreurs.", you: "Utilisateur", ai: "TechNova AI" }
    : { label: "Shared conversation", cont: "Continue chatting", copy: "Copy link", copied: "Link copied", missing: "Conversation not found", missingSub: "This link was disabled or does not exist.", home: "Discover TechNova", footer: "Shared from TechNova AI Hub. AI answers may contain mistakes.", you: "User", ai: "TechNova AI" };

  async function continueChat() {
    if (!shared) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { void navigate({ to: "/connexion" }); return; }
    const { data: thread, error } = await supabase.from("chat_threads").insert({ title: shared.title }).select("id").single();
    if (error || !thread) { setBusy(false); return; }
    if (shared.messages.length) {
      await supabase.from("chat_messages").insert(shared.messages.map(m => ({ thread_id: thread.id, role: m.role, sdk_id: crypto.randomUUID(), parts: m.parts as unknown as Json })));
    }
    void navigate({ to: "/dashboard/chat/$threadId", params: { threadId: thread.id } });
  }

  return <div className="min-h-svh bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="font-display text-[15px] font-bold tracking-[0.14em]">TECHNOVA</Link>
        {shared && <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-9 rounded-full max-sm:px-2.5" onClick={() => { void navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); }} aria-label={c.copy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}<span className="max-sm:hidden">{copied ? c.copied : c.copy}</span></Button>
          <Button size="sm" className="h-9 rounded-full px-4" disabled={busy} onClick={() => void continueChat()}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}{c.cont}<ArrowRight className="size-4" /></Button>
        </div>}
      </div>
    </header>
    {!shared ? <main className="mx-auto grid max-w-md place-items-center px-6 py-28 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-border bg-secondary"><MessageSquareOff className="size-6 text-muted-foreground" /></div>
      <h1 className="text-xl font-semibold">{c.missing}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{c.missingSub}</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/">{c.home}</Link></Button>
    </main> : <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-primary">{c.label}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{shared.title}</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{new Date(shared.updated_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="mt-10 space-y-8">
        {shared.messages.map((m, i) => {
          const text = textOf(m.parts);
          if (!text) return null;
          return m.role === "user"
            ? <div key={i} className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-3xl border border-border bg-card px-4 py-2.5 text-[14.5px] leading-relaxed">{text}</div></div>
            : <div key={i}><p className="mb-2 text-[12px] font-semibold text-muted-foreground">{c.ai}</p><div className="text-[14.5px] leading-relaxed"><MessageResponse>{text}</MessageResponse></div></div>;
        })}
      </div>
      <p className="mt-16 border-t border-border pt-6 text-center text-[12px] text-muted-foreground">{c.footer}</p>
    </main>}
  </div>;
}
