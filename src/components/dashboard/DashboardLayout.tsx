import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookMarked, Bot, Library, Plug, Swords } from "lucide-react";
import { Activity, ArrowLeft, Bell, BookOpen, Boxes, ChevronDown, Code2, CreditCard, Diamond, Gift, Globe2, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings2, Sun, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardText, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { media } from "@/lib/media";

import { ThreadItem } from "./ThreadItem";
import { DashboardContext, type Thread } from "./dashboard-context";
export { useDashboard, type Thread } from "./dashboard-context";

const links = [
  { key: "overview", to: "/dashboard", icon: LayoutDashboard },
  { key: "chat", to: "/dashboard/chat", icon: MessageCircle },
  { key: "arena", to: "/dashboard/arena", icon: Swords },
  { key: "agents", to: "/dashboard/agents", icon: Bot },
  { key: "knowledge", to: "/dashboard/knowledge", icon: BookMarked },
  { key: "registry", to: "/dashboard/registry", icon: Library },
  { key: "models", to: "/dashboard/models", icon: Boxes },
  { key: "credits", to: "/dashboard/credits", icon: Wallet },
  { key: "api", to: "/dashboard/api", icon: Code2 },
  { key: "usage", to: "/dashboard/usage", icon: Activity },
  { key: "billing", to: "/dashboard/billing", icon: CreditCard },
  { key: "connections", to: "/dashboard/connexions", icon: Plug },
  { key: "settings", to: "/dashboard/settings", icon: Settings2 },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [artifactWorkspaceOpen, setArtifactWorkspaceOpen] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => (state.resolvedLocation ?? state.location).pathname });
  const t = dashboardText[lang];
  const setWorkspaceOpen = useCallback((open: boolean) => { setArtifactWorkspaceOpen(open); if (!open) setWorkspaceCollapsed(null); }, []);

  useEffect(() => {
    const savedLang = window.localStorage.getItem("technova-dashboard-lang");
    const savedTheme = window.localStorage.getItem("technova-dashboard-theme");
    if (savedLang === "fr" || savedLang === "en") setLangState(savedLang);
    if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
    setCollapsed(window.localStorage.getItem("technova-sidebar-collapsed") === "1");
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); return () => document.documentElement.classList.remove("dark"); }, [theme]);
  useEffect(() => { setMobileOpen(false); setNoticeOpen(false); setAccountOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!live || !data.user) return;
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
      if (live) setName(profile?.display_name || (typeof data.user.user_metadata?.["display_name"] === "string" ? data.user.user_metadata["display_name"] : ""));
    });
    return () => { live = false; };
  }, []);
  const reload = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
    if (loadError) { setError(dashboardText[lang].loadError); return; }
    setError(""); setThreads(data ?? []);
  }, [lang]);
  useEffect(() => { void reload(); }, [reload]);
  async function createThread() {
    const { data, error: insertError } = await supabase.from("chat_threads").insert({ title: t.newChat }).select("id").single();
    if (insertError || !data) { setError(t.actionError); return; }
    await reload();
    void navigate({ to: "/dashboard/chat/$threadId", params: { threadId: data.id } });
  }
  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/connexion", replace: true });
  }
  function setLang(value: Lang) { setLangState(value); window.localStorage.setItem("technova-dashboard-lang", value); }
  function setTheme(value: "light" | "dark") { setThemeState(value); window.localStorage.setItem("technova-dashboard-theme", value); }
  function toggleCollapsed() {
    if (artifactWorkspaceOpen) setWorkspaceCollapsed(!effectiveCollapsed);
    else setCollapsed(v => { window.localStorage.setItem("technova-sidebar-collapsed", v ? "0" : "1"); return !v; });
  }
  const effectiveCollapsed = artifactWorkspaceOpen ? (workspaceCollapsed ?? true) : collapsed;
  const mini = effectiveCollapsed && !mobileOpen;
  const isChat = pathname.startsWith("/dashboard/chat");
  const isThread = pathname.startsWith("/dashboard/chat/");
  const current = links.find(l => pathname === l.to)?.key ?? (pathname.startsWith("/dashboard/chat") ? "chat" : pathname === "/dashboard/docs" ? "docs" : "overview");
  const filtered = threads.filter(thread => thread.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const matchingSections = [...links, { key: "docs", to: "/dashboard/docs", icon: BookOpen } as const].filter(item => t[item.key].toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const initials = (name || email || "T").charAt(0).toUpperCase();

  return <DashboardContext.Provider value={{ lang, t, theme, setLang, setTheme, setArtifactWorkspaceOpen: setWorkspaceOpen, threads, reload, createThread, name, email, error }}>
    <div className="dashboard-shell flex min-h-svh overflow-x-clip bg-background text-foreground">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[224px] flex-col border-r border-border bg-card transition-[width,transform] duration-200 lg:sticky ${mini ? "lg:w-[60px]" : ""} lg:top-0 lg:h-svh ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex h-14 shrink-0 items-center justify-between ${mini ? "lg:justify-center lg:px-0" : ""} px-5`}>
          <Link to="/dashboard" className={`font-display text-[15px] font-bold tracking-[0.14em] text-foreground ${mini ? "lg:hidden" : ""}`}>TECHNOVA</Link>
          <Button variant="ghost" size="icon-sm" className="hidden rounded-lg text-muted-foreground lg:inline-flex" onClick={toggleCollapsed} aria-label={effectiveCollapsed ? (lang === "fr" ? "Déplier le menu" : "Expand menu") : (lang === "fr" ? "Replier le menu" : "Collapse menu")} title={effectiveCollapsed ? (lang === "fr" ? "Déplier le menu" : "Expand menu") : (lang === "fr" ? "Replier le menu" : "Collapse menu")}>{effectiveCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</Button>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t.close}><X /></Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <nav aria-label={t.navigation} className="shrink-0 space-y-px">
            {links.map(item => <Link key={item.key} to={item.to} title={t[item.key]} aria-current={current === item.key ? "page" : undefined} className={`side-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${mini ? "lg:justify-center lg:px-0" : ""} ${current === item.key ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}><item.icon className="size-[15px] shrink-0" strokeWidth={1.7} /><span className={mini ? "lg:hidden" : ""}>{t[item.key]}</span></Link>)}
          </nav>
          <div className={`mt-5 flex min-h-0 flex-1 flex-col ${mini ? "lg:hidden" : ""}`}>
            <p className="shrink-0 px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">{t.history}</p>
            <div className="relative shrink-0"><Search className="absolute left-2.5 top-[9px] size-3.5 text-muted-foreground" /><Input aria-label={t.search} placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="h-8 rounded-lg border-transparent bg-secondary/70 pl-8 text-[12px] shadow-none focus-visible:ring-0" /></div>
            <div className="mt-1.5 min-h-0 flex-1 space-y-px overflow-y-auto pb-2">{filtered.slice(0, 30).map(thread => <ThreadItem key={thread.id} thread={thread} active={pathname.endsWith(thread.id)} lang={lang} reload={reload} />)}{filtered.length === 0 && <p className="px-2.5 py-2 text-[11px] text-muted-foreground">{search ? t.noResults : t.noChats}</p>}</div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border p-2">
          <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${mini ? "lg:hidden" : ""}`}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">{initials}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium">{name || t.accountName}</span>{email && <span className="block truncate text-[10.5px] text-muted-foreground">{email}</span>}</span>
          </div>
          <div className={`mt-1 flex items-center gap-0.5 px-1 ${mini ? "lg:mt-auto lg:flex-col lg:px-0" : ""}`}>
            <Button variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={t.theme} title={t.theme}>{theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button>
            <Button asChild variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground"><Link to="/dashboard/docs" aria-label={t.docs} title={t.docs}><BookOpen className="size-4" /></Link></Button>
            <Button asChild variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground"><Link to="/" aria-label={t.home} title={t.home}><ArrowLeft className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon-sm" className={`size-8 rounded-lg text-muted-foreground ${mini ? "" : "ml-auto"}`} onClick={() => void signOut()} aria-label={t.signOut} title={t.signOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </aside>
      <div className="relative isolate min-w-0 flex-1">
        {!isThread && <div className={`dashboard-wallpaper pointer-events-none fixed inset-y-0 right-0 left-0 z-0 overflow-hidden ${mini ? "lg:left-[60px]" : "lg:left-[224px]"}`} aria-hidden="true"><img src={media.cloudBackground} alt="" className="h-full w-full scale-105 object-cover" /></div>}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur-xl lg:hidden"><Button variant="ghost" size="icon-sm" aria-label={t.menu} onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button><Link to="/dashboard" className="font-display text-[14px] font-bold">TechNova</Link><span className="grid size-8 place-items-center rounded-full bg-iris text-[11px] font-bold text-ink">{initials}</span></header>
        {!isChat && <div className="dashboard-marquee relative z-10 flex h-8 items-center overflow-hidden border-b border-border bg-card"><span className="shrink-0 border-r border-border px-3 text-[9px] font-semibold text-muted-foreground">TECHNOVA / HUB</span><div className="min-w-0 overflow-hidden"><div className="dashboard-marquee-track flex w-max items-center gap-12 px-6 text-[10px] text-muted-foreground"><span>TECHNOVA <strong className="text-foreground">AI HUB</strong> · {t.marqueeOne}</span><span>SONORYA · {t.marqueeTwo}</span><span>HUMANIZER AI · {t.marqueeThree}</span><span>TECHNOVA <strong className="text-foreground">AI HUB</strong> · {t.marqueeOne}</span><span>SONORYA · {t.marqueeTwo}</span><span>HUMANIZER AI · {t.marqueeThree}</span></div></div></div>}
        <main className="relative z-10 mx-auto min-h-[calc(100svh-80px)] lg:min-h-[calc(100svh-32px)] w-full max-w-[1640px] px-4 pb-8 pt-6 sm:px-6 lg:px-7">{error && <div role="alert" className="mb-5 flex items-center justify-between border-l-2 border-destructive bg-secondary px-4 py-3 text-sm"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void reload()}>{t.retry}</Button></div>}<div key={pathname} className="dashboard-page-enter">{children}</div></main>
      </div>
    </div>
  </DashboardContext.Provider>;
}
