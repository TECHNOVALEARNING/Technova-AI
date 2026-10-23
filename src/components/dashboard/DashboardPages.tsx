import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BookOpen, Boxes, Check, ChevronRight, Clock3, Code2, CreditCard, LayoutDashboard, MessageCircle, Pencil, Plus, Search, Trash2, Wallet, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard, type Thread } from "./dashboard-context";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import type { UIMessage } from "ai";
import type { Json } from "@/integrations/supabase/types";
import { openRouterModelIds } from "@/lib/chat-models";
import { mediaModels } from "@/lib/media-models";

type Overview = {
  balance: number; reserved: number; credits30: number; requests30: number; tokens30: number; keys: number;
  activity: { id: string; amount: number; label: string; kind: string; created_at: string }[];
};

/** Live figures for the signed-in account; every query is owner-scoped by RLS. */
function useOverview() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await supabase.rpc("claim_welcome_bonus");
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [wallet, usage, keys, activity] = await Promise.all([
        supabase.rpc("get_wallet_balance", { _owner: uid }),
        supabase.from("usage_logs").select("credits,input_tokens,output_tokens").gte("created_at", since),
        supabase.from("api_keys").select("id", { count: "exact", head: true }),
        supabase.from("credit_transactions").select("id,amount,label,kind,created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      if (!live) return;
      const w = (wallet.data ?? {}) as { balance?: number; reserved?: number };
      const rows = usage.data ?? [];
      setData({
        balance: w.balance ?? 0, reserved: w.reserved ?? 0,
        credits30: rows.reduce((n, r) => n + r.credits, 0), requests30: rows.length,
        tokens30: rows.reduce((n, r) => n + r.input_tokens + r.output_tokens, 0),
        keys: keys.count ?? 0, activity: activity.data ?? [],
      });
    })();
    return () => { live = false; };
  }, []);
  return data;
}

export function OverviewPage() {
  const { t, threads, name, createThread, lang } = useDashboard();
  const first = name.trim().split(" ")[0];
  const o = useOverview();
  const fr = lang !== "en";
  const loc = fr ? "fr-FR" : "en-US";
  const n = (v: number) => v.toLocaleString(loc);
  const mediaCount = mediaModels.length;
  const chatCount = Object.keys(openRouterModelIds).length;
  const cards = [
    { label: t.balance, value: o ? n(o.balance - o.reserved) : "…", hint: o ? (o.reserved ? (fr ? `${n(o.reserved)} réservés en cours · solde ${n(o.balance)}` : `${n(o.reserved)} reserved · balance ${n(o.balance)}`) : (fr ? "crédits disponibles" : "credits available")) : t.loading, icon: Wallet, to: "/dashboard/credits" as const },
    { label: t.usage, value: o ? n(o.credits30) : "…", hint: o ? (fr ? `crédits · ${n(o.requests30)} requêtes · 30 jours` : `credits · ${n(o.requests30)} requests · 30 days`) : t.loading, icon: Activity, to: "/dashboard/usage" as const },
    { label: t.api, value: o ? n(o.keys) : "…", hint: o ? (fr ? (o.keys > 1 ? "clés API actives" : "clé API active") : "active API keys") : t.loading, icon: Code2, to: "/dashboard/api" as const },
    { label: t.models, value: n(chatCount + mediaCount), hint: fr ? `${chatCount} modèles de chat · ${mediaCount} image, vidéo, musique` : `${chatCount} chat models · ${mediaCount} image, video, music`, icon: Boxes, to: "/dashboard/models" as const },
  ];
  return <div className="relative isolate min-h-[calc(100svh-120px)] lg:min-h-[calc(100svh-72px)]">
    <div className="relative flex flex-wrap items-end justify-between gap-3"><div><h1 className="chat-heading font-display text-[23px] font-semibold leading-tight">{t.greeting}{first ? `, ${first}` : ""}</h1><p className="mt-1 text-xs text-muted-foreground">{t.welcomeSub}</p></div><div className="flex gap-2"><Button asChild variant="outline" size="sm" className="h-8 rounded-full bg-card text-xs"><Link to="/dashboard/chat"><MessageCircle className="size-4" />{t.chat}</Link></Button><Button asChild size="sm" className="h-8 rounded-full text-xs"><Link to="/dashboard/credits"><Plus className="size-4" />{t.credits}</Link></Button></div></div>
    <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(item => <Link key={item.label} to={item.to} className="min-h-[124px] rounded-[8px] border border-border bg-card p-4 shadow-sm transition hover:border-foreground/25"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-muted-foreground">{item.label.toUpperCase()}</p><item.icon className="size-4 text-muted-foreground" strokeWidth={1.6} /></div><p className="mt-3 font-display text-[22px] font-semibold leading-none tabular-nums">{item.value}</p><p className="mt-2 truncate text-[11px] text-muted-foreground" title={item.hint}>{item.hint}</p></Link>)}</div>
    <div className="relative mt-3 grid gap-3 lg:grid-cols-2"><div className="min-h-[200px] rounded-[8px] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-[11px] font-bold">{t.conversations.toUpperCase()}</h2><Link to="/dashboard/chat" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">{t.allChats} →</Link></div><div className="mt-4 divide-y divide-border">{threads.slice(0, 3).map(thread => <Link to="/dashboard/chat/$threadId" params={{ threadId: thread.id }} key={thread.id} className="flex items-center gap-2 py-3 text-xs hover:text-muted-foreground"><MessageCircle className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{thread.title}</span><ChevronRight className="size-4" /></Link>)}{!threads.length && <p className="py-7 text-xs text-muted-foreground">{t.noChats}</p>}</div></div>
      <div className="min-h-[200px] rounded-[8px] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-[11px] font-bold">{t.activity.toUpperCase()}</h2><Link to="/dashboard/credits" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">{t.credits} →</Link></div>
        {o && o.activity.length ? <div className="mt-4 divide-y divide-border">{o.activity.map(a => <div key={a.id} className="flex items-center gap-3 py-2.5 text-xs"><span className="min-w-0 flex-1 truncate">{a.label || a.kind}</span><span className="shrink-0 text-muted-foreground">{new Date(a.created_at).toLocaleDateString(loc)}</span><span className={`shrink-0 font-semibold tabular-nums ${a.amount >= 0 ? "text-supabase" : ""}`}>{a.amount > 0 ? "+" : ""}{n(a.amount)}</span></div>)}</div>
          : <div className="flex h-[135px] flex-col items-center justify-center text-center"><Clock3 className="size-5 text-muted-foreground" /><p className="mt-2 text-xs font-medium text-muted-foreground">{o ? t.noActivity : t.loading}</p></div>}
      </div></div>
    <div className="relative mt-3 rounded-[8px] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-[11px] font-bold">{t.chat.toUpperCase()}</h2><Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => void createThread()}><Plus className="size-3.5" />{t.newChat}</Button></div><p className="mt-3 text-xs text-muted-foreground">{fr ? `${o ? n(o.tokens30) : "…"} tokens utilisés ces 30 derniers jours. ${t.chatSub}` : `${o ? n(o.tokens30) : "…"} tokens used in the last 30 days. ${t.chatSub}`}</p></div>
  </div>;
}

const icons = { models: Boxes, credits: Wallet, api: Code2, usage: Activity, billing: CreditCard, docs: BookOpen } as const;
export function PendingPage({ section }: { section: keyof typeof icons }) {
  const { t } = useDashboard(); const Icon = icons[section];
  return <div><p className="dash-eyebrow">TECHNOVA / {t.workspace.toUpperCase()}</p><h1 className="mt-3 font-display text-3xl font-bold">{t[section]}</h1><p className="mt-3 text-sm text-muted-foreground">{t[`${section}Sub`]}</p><div className="mt-9 border-t border-border pt-10"><div className="grid size-14 place-items-center rounded-[7px] border border-border bg-card"><Icon className="size-6" strokeWidth={1.5} /></div><p className="mt-6 text-xs font-bold text-muted-foreground">{t.pending.toUpperCase()}</p><h2 className="mt-2 font-display text-xl font-bold">{t.pendingTitle}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t.pendingSub}</p><Button asChild variant="outline" className="mt-6 rounded-[5px]"><Link to="/dashboard"><LayoutDashboard className="size-4" />{t.overview}</Link></Button></div></div>;
}

export function SettingsPage() {
  const { t, lang, setLang, theme, setTheme, email, name } = useDashboard();
  return <div className="max-w-3xl"><p className="dash-eyebrow">TECHNOVA / {t.account}</p><h1 className="mt-3 font-display text-3xl font-bold">{t.settings}</h1><p className="mt-3 text-sm text-muted-foreground">{t.settingsSub}</p><div className="mt-9 divide-y divide-border border-y border-border"><div className="flex flex-wrap items-center justify-between gap-4 py-6"><div><p className="text-sm font-bold">{t.profile}</p><p className="mt-1 text-xs text-muted-foreground">{name || t.accountName} · {email}</p></div><span className="text-xs text-muted-foreground">{t.active}</span></div><div className="flex flex-wrap items-center justify-between gap-4 py-6"><div><p className="text-sm font-bold">{t.theme}</p><p className="mt-1 text-xs text-muted-foreground">{t.settingsSaved}</p></div><div className="flex rounded-[5px] border border-border bg-card p-1"><Button variant={theme === "light" ? "secondary" : "ghost"} size="sm" onClick={() => setTheme("light")} className="rounded-[4px]"><span className="sr-only">{t.light}</span>☀ {t.light}</Button><Button variant={theme === "dark" ? "secondary" : "ghost"} size="sm" onClick={() => setTheme("dark")} className="rounded-[4px]"><span className="sr-only">{t.dark}</span>☾ {t.dark}</Button></div></div><div className="flex flex-wrap items-center justify-between gap-4 py-6"><p className="text-sm font-bold">{t.language}</p><div className="flex rounded-[5px] border border-border bg-card p-1"><Button variant={lang === "fr" ? "secondary" : "ghost"} size="sm" onClick={() => setLang("fr")} className="rounded-[4px]">Français</Button><Button variant={lang === "en" ? "secondary" : "ghost"} size="sm" onClick={() => setLang("en")} className="rounded-[4px]">English</Button></div></div></div></div>;
}

export function ChatListPage() {
  const { t, threads, createThread } = useDashboard(); const [query, setQuery] = useState("");
  const filtered = threads.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  return <div><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="dash-eyebrow">TECHNOVA / {t.workspace.toUpperCase()}</p><h1 className="mt-3 font-display text-3xl font-bold">{t.allChats}</h1><p className="mt-3 text-sm text-muted-foreground">{t.chatSub}</p></div><Button onClick={() => void createThread()} className="rounded-[5px]"><Plus className="size-4" />{t.newChat}</Button></div><div className="relative mt-9 max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="rounded-[5px] bg-card pl-10" placeholder={t.search} aria-label={t.search} value={query} onChange={event => setQuery(event.target.value)} /></div><div className="mt-6 divide-y divide-border border-y border-border">{filtered.map(thread => <Link key={thread.id} to="/dashboard/chat/$threadId" params={{ threadId: thread.id }} className="group flex items-center gap-4 py-5"><span className="grid size-10 shrink-0 place-items-center rounded-[5px] bg-secondary"><MessageCircle className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{thread.title}</strong><small className="text-xs text-muted-foreground">{new Date(thread.updated_at).toLocaleDateString()}</small></span><ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground" /></Link>)}{filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{query ? t.noResults : t.noChats}</p>}</div></div>;
}

export function ThreadPage({ threadId }: { threadId: string }) {
  const { t, threads, reload, createThread } = useDashboard();
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const [thread, setThread] = useState<Thread | null>(null); const [messages, setMessages] = useState<UIMessage[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [editing, setEditing] = useState(false); const [title, setTitle] = useState(""); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  useEffect(() => { let live = true; setLoading(true); setMessages([]); setError(""); setSuccess(""); void (async () => {
    const [{ data: selected, error: threadError }, { data: rows, error: messageError }] = await Promise.all([supabase.from("chat_threads").select("*").eq("id", threadId).maybeSingle(), supabase.from("chat_messages").select("sdk_id,role,parts").eq("thread_id", threadId).order("created_at", { ascending: true })]);
    if (!live) return;
    if (threadError || messageError || !selected) setError(t.loadError);
    else { setThread(selected); setTitle(selected.title); setMessages((rows ?? []).map(row => ({ id: row.sdk_id, role: row.role as "user" | "assistant", parts: Array.isArray(row.parts) ? row.parts as UIMessage["parts"] : [] }))); }
    setLoading(false);
  })(); return () => { live = false; }; }, [threadId, t.loadError]);
  useEffect(() => { if (!loading && thread && !editing) noteInput.current?.focus(); }, [loading, thread, editing]);
  async function saveTitle() {
    if (!title.trim()) return; setBusy(true); const { error: saveError } = await supabase.from("chat_threads").update({ title: title.trim().slice(0, 100), updated_at: new Date().toISOString() }).eq("id", threadId);
    setBusy(false); if (saveError) { setError(t.actionError); return; } setThread(current => current ? { ...current, title: title.trim().slice(0, 100) } : current); setEditing(false); await reload();
  }
  async function removeThread() {
    if (!window.confirm(t.deleteConfirm)) return; setBusy(true); const { error: deleteError } = await supabase.from("chat_threads").delete().eq("id", threadId); setBusy(false);
    if (deleteError) { setError(t.actionError); return; } await reload(); void navigate({ to: "/dashboard/chat", replace: true });
  }
  async function addNote(input: { text: string }) {
    const text = input.text.trim(); if (!text || busy) return; setBusy(true); setError(""); setSuccess("");
    const id = crypto.randomUUID(); const part = [{ type: "text" as const, text }];
    const { error: insertError } = await supabase.from("chat_messages").insert({ thread_id: threadId, sdk_id: id, role: "user", parts: part as Json });
    if (insertError) { setError(t.actionError); setBusy(false); requestAnimationFrame(() => noteInput.current?.focus()); return; }
    setMessages(previous => [...previous, { id, role: "user", parts: part }]);
    const updated = new Date().toISOString();
    const automaticTitle = messages.length === 0 && thread && ["Nouvelle conversation", "New conversation"].includes(thread.title);
    const nextTitle = automaticTitle ? text.replace(/\s+/g, " ").slice(0, 65) : thread?.title;
    const { error: touchError } = await supabase.from("chat_threads").update({ updated_at: updated, ...(automaticTitle && nextTitle ? { title: nextTitle } : {}) }).eq("id", threadId);
    if (touchError) setError(t.actionError); else {
      if (automaticTitle && nextTitle) { setThread(current => current ? { ...current, title: nextTitle } : current); setTitle(nextTitle); }
      void reload();
    }
    setSuccess(t.draftSaved); setBusy(false); requestAnimationFrame(() => noteInput.current?.focus());
  }
  return <div className="flex h-[calc(100svh-190px)] min-h-[440px] flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5"><div className="min-w-0 flex-1"><p className="dash-eyebrow">TECHNOVA / {t.chat}</p>{editing ? <div className="mt-2 flex max-w-md gap-2"><Input autoFocus maxLength={100} value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") setEditing(false); }} className="rounded-[5px]" aria-label={t.titlePlaceholder} /><Button size="icon-sm" disabled={busy} onClick={() => void saveTitle()} aria-label={t.save}><Check /></Button></div> : <h1 className="mt-2 truncate font-display text-lg font-bold sm:text-xl">{thread?.title || t.loading}</h1>}</div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" title={t.rename} aria-label={t.rename} disabled={!thread || busy} onClick={() => setEditing(true)}><Pencil /></Button><Button variant="ghost" size="icon-sm" title={t.remove} aria-label={t.remove} disabled={!thread || busy} onClick={() => void removeThread()}><Trash2 /></Button><Button variant="outline" size="icon-sm" title={t.newChat} aria-label={t.newChat} onClick={() => void createThread()}><Plus /></Button></div></div>
    {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}{success && <p role="status" className="mt-3 text-xs text-muted-foreground">{success}</p>}
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden"><Conversation className="relative min-h-0 w-full"><ConversationContent className="mx-auto w-full max-w-3xl gap-6 py-7">{!messages.length && !loading && <ConversationEmptyState className="min-h-[300px]" icon={<span className="font-display text-5xl font-bold">T<span className="text-muted-foreground">.</span></span>} title={t.chatTitle} description={t.emptyThread} />}{messages.map(message => <Message key={message.id} from={message.role}><MessageContent className="rounded-[6px]">{message.parts.map((part, i) => part.type === "text" ? <p key={i} className="whitespace-pre-wrap leading-relaxed">{part.text}</p> : null)}</MessageContent></Message>)}</ConversationContent><ConversationScrollButton /></Conversation></div>
    <div className="relative mx-auto w-full max-w-3xl pt-3"><p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" />{t.chatUnavailable}</p><PromptInput onSubmit={({ text }) => addNote({ text })} className="rounded-[7px] bg-card shadow-soft"><PromptInputTextarea ref={noteInput} autoFocus disabled={loading || !thread || busy} placeholder={t.draftPlaceholder} className="min-h-[80px]" /><PromptInputFooter className="justify-between"><span className="text-xs text-muted-foreground">{t.note}</span><PromptInputSubmit disabled={loading || !thread || busy} aria-label={t.writeNote} /></PromptInputFooter></PromptInput><p className="mt-2 text-center text-[11px] text-muted-foreground">{t.privacy}</p></div>
  </div>;
}