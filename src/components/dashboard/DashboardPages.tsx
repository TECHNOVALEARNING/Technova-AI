import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Boxes, ChevronRight, Clock3, Code2, MessageCircle, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "./dashboard-context";
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
      const [wallet, usage, keys, activity, spent] = await Promise.all([
        supabase.rpc("get_wallet_balance", { _owner: uid }),
        supabase.from("usage_logs").select("credits,input_tokens,output_tokens").gte("created_at", since),
        supabase.from("api_keys").select("id", { count: "exact", head: true }),
        supabase.from("credit_transactions").select("id,amount,label,kind,created_at").order("created_at", { ascending: false }).limit(5),
        // Credits used = charges and holds minus their refunds (transfers and bonuses are not usage).
        supabase.from("credit_transactions").select("amount").in("kind", ["charge", "usage", "reserve", "refund"]).gte("created_at", since).limit(10000),
      ]);
      if (!live) return;
      const w = (wallet.data ?? {}) as { balance?: number; reserved?: number };
      const rows = usage.data ?? [];
      setData({
        balance: w.balance ?? 0, reserved: w.reserved ?? 0,
        credits30: Math.max(0, -(spent.data ?? []).reduce((n, r) => n + r.amount, 0)), requests30: rows.length,
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
