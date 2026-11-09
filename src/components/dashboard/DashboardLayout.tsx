import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { savePref } from "@/lib/consent";
import { planKeyOf, planLabels, usePlan } from "@/lib/plan-client";
import { BookMarked, Bot, ChevronUp, Library, Plug, ShieldAlert } from "lucide-react";
import { getMyRole } from "@/lib/admin.functions";
import { Activity, ArrowLeft, Check, Palette, Crown, Bell, BookOpen, Boxes, ChevronDown, Code2, CreditCard, Diamond, Gift, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings2, Sun, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardText, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { media } from "@/lib/media";
import { dashboardLooks, defaultLook, lookMode, storedLook, type DashboardLook } from "@/lib/dashboard-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ThreadItem } from "./ThreadItem";
import { PendingDeletionBanner } from "./PendingDeletionBanner";
import { DashboardContext, type Thread } from "./dashboard-context";
export { useDashboard, type Thread } from "./dashboard-context";

// Arena is hidden from the site for now (its routes redirect).
const links = [
  { key: "overview", to: "/dashboard", icon: LayoutDashboard },
  { key: "chat", to: "/dashboard/chat", icon: MessageCircle },
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
/** Always visible; the rest unfolds under "Plus" so the history gets the room. */
const primaryKeys: readonly string[] = ["overview", "chat", "agents", "credits"];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [look, setLookState] = useState<DashboardLook>(defaultLook.light);
  const theme = lookMode(look);
  const [themeOpen, setThemeOpen] = useState(false);
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
  const [moreOpen, setMoreOpen] = useState(false);
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
    const savedLook = storedLook(savedTheme);
    if (savedLook) setLookState(savedLook);
    setCollapsed(window.localStorage.getItem("technova-sidebar-collapsed") === "1");
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); return () => document.documentElement.classList.remove("dark"); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
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
  // The admin link is shown only to administrators (the page itself re-checks the role server-side).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { getMyRole().then((r) => setIsAdmin(r.admin)).catch(() => setIsAdmin(false)); }, []);
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
  function setLang(value: Lang) { setLangState(value); savePref("technova-dashboard-lang", value); }
  function setLook(value: DashboardLook) { setLookState(value); savePref("technova-dashboard-theme", value); }
  // Light/dark switch (Settings): keeps the current look when it already has that mode, else the original theme.
  function setTheme(value: "light" | "dark") { if (lookMode(look) !== value) setLook(defaultLook[value]); }
  function toggleCollapsed() {
    if (artifactWorkspaceOpen) setWorkspaceCollapsed(!effectiveCollapsed);
    else setCollapsed(v => { savePref("technova-sidebar-collapsed", v ? "0" : "1"); return !v; });
  }
  const effectiveCollapsed = artifactWorkspaceOpen ? (workspaceCollapsed ?? true) : collapsed;
  const mini = effectiveCollapsed && !mobileOpen;
  const isThread = pathname.startsWith("/dashboard/chat/");
  const current = links.find(l => pathname === l.to)?.key ?? (pathname.startsWith("/dashboard/chat") ? "chat" : pathname === "/dashboard/docs" ? "docs" : "overview");
  const filtered = threads.filter(thread => thread.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const matchingSections = [...links, { key: "docs", to: "/dashboard/docs", icon: BookOpen } as const].filter(item => t[item.key].toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const initials = (name || email || "T").charAt(0).toUpperCase();
  // The secondary links stay unfolded while one of them is the open page (and in the icon-only menu).
  const onSecondary = !primaryKeys.includes(current) || pathname === "/dashboard/admin";
  const showAll = mini || moreOpen || onSecondary;
  // Plan badge and avatar ring colours follow the highest pack bought (display only).
  const plan = usePlan();
  const planKey = plan ? planKeyOf(plan.tier, plan.paid) : null;
  const planName = planKey ? planLabels[planKey][lang] : "";

  return <DashboardContext.Provider value={{ lang, t, theme, setLang, setTheme, setArtifactWorkspaceOpen: setWorkspaceOpen, threads, reload, createThread, name, email, error }}>
    <div className={`dashboard-shell look-${look} flex min-h-svh overflow-x-clip bg-background text-foreground lg:gap-3 lg:p-4`}>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`dashboard-sidebar sidebar-glass fixed inset-y-0 left-0 z-50 flex w-[224px] flex-col border-r border-border bg-card transition-[width,transform] duration-200 lg:sticky lg:overflow-hidden lg:rounded-[22px] lg:border ${mini ? "lg:w-[64px]" : "lg:w-60"} lg:top-4 lg:h-[calc(100svh-2rem)] ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex h-14 shrink-0 items-center justify-between ${mini ? "lg:justify-center lg:px-0" : ""} px-5`}>
          <Link to="/dashboard" className={`font-display text-[15px] font-bold tracking-[0.14em] text-foreground ${mini ? "lg:hidden" : ""}`}>TECHNOVA</Link>
          <Button variant="ghost" size="icon-sm" className="hidden rounded-lg text-muted-foreground lg:inline-flex" onClick={toggleCollapsed} aria-label={effectiveCollapsed ? (lang === "fr" ? "Déplier le menu" : "Expand menu") : (lang === "fr" ? "Replier le menu" : "Collapse menu")} title={effectiveCollapsed ? (lang === "fr" ? "Déplier le menu" : "Expand menu") : (lang === "fr" ? "Replier le menu" : "Collapse menu")}>{effectiveCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</Button>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t.close}><X /></Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <nav aria-label={t.navigation} className="shrink-0 space-y-px">
            {links.filter(item => showAll || primaryKeys.includes(item.key)).map(item => <Link key={item.key} to={item.to} title={t[item.key]} aria-current={current === item.key ? "page" : undefined} className={`side-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${mini ? "lg:justify-center lg:px-0" : ""} ${current === item.key ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}><item.icon className="size-[15px] shrink-0" strokeWidth={1.7} /><span className={mini ? "lg:hidden" : ""}>{t[item.key]}</span></Link>)}
            {isAdmin && showAll && <Link to="/dashboard/admin" title="Administration" aria-current={pathname === "/dashboard/admin" ? "page" : undefined} className={`side-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${mini ? "lg:justify-center lg:px-0" : ""} ${pathname === "/dashboard/admin" ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}><ShieldAlert className="size-[15px] shrink-0" strokeWidth={1.7} /><span className={mini ? "lg:hidden" : ""}>Administration</span></Link>}
            {!mini && !onSecondary && <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen}
              className="side-link flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              {moreOpen ? <ChevronUp className="size-[15px] shrink-0" strokeWidth={1.7} /> : <ChevronDown className="size-[15px] shrink-0" strokeWidth={1.7} />}
              <span>{moreOpen ? (lang === "fr" ? "Moins" : "Less") : (lang === "fr" ? "Plus" : "More")}</span>
            </button>}
          </nav>
          <div className={`mt-5 flex min-h-0 flex-1 flex-col ${mini ? "lg:hidden" : ""}`}>
            <p className="shrink-0 px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">{t.history}</p>
            <div className="relative shrink-0"><Search className="absolute left-2.5 top-[9px] size-3.5 text-muted-foreground" /><Input aria-label={t.search} placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="h-8 rounded-lg border-transparent bg-secondary/70 pl-8 text-[12px] shadow-none focus-visible:ring-0" /></div>
            <div className="mt-1.5 min-h-0 flex-1 space-y-px overflow-y-auto pb-2">{filtered.slice(0, 30).map(thread => <ThreadItem key={thread.id} thread={thread} active={pathname.endsWith(thread.id)} lang={lang} reload={reload} />)}{filtered.length === 0 && <p className="px-2.5 py-2 text-[11px] text-muted-foreground">{search ? t.noResults : t.noChats}</p>}</div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border p-2">
          <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${mini ? "lg:hidden" : ""}`}>
            <span className={`plan-ring plan-${planKey ?? "free"}`} title={planName ? `${lang === "fr" ? "Forfait" : "Plan"} ${planName}` : undefined}><span className="grid size-9 place-items-center rounded-full bg-card text-[13px] font-semibold text-foreground">{initials}</span></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium">{name || t.accountName}</span>{email && <span className="block truncate text-[10.5px] text-muted-foreground">{email}</span>}{planKey && planKey !== "free" && <Link to="/dashboard/credits" title={lang === "fr" ? "Voir les forfaits" : "See plans"} className={`plan-${planKey} plan-pill mt-1 inline-flex items-center gap-1 rounded-full font-semibold leading-none transition-opacity hover:opacity-85 ${planKey === "pro" ? "h-5 px-2.5 text-[10.5px] tracking-[0.06em]" : "h-[18px] px-2 text-[10px]"}`}>{planKey === "pro" && <Crown className="size-3" strokeWidth={2.4} aria-hidden="true" />}<span className="plan-chip-text">{planKey === "pro" ? "PRO" : planName}</span></Link>}</span>
          </div>
          <div className={`mt-1 flex items-center gap-0.5 px-1 ${mini ? "lg:mt-auto lg:flex-col lg:px-0" : ""}`}>
            <Popover open={themeOpen} onOpenChange={setThemeOpen}>
              <PopoverTrigger asChild><Button variant="ghost" size="sm" className={`h-8 gap-1.5 rounded-lg px-2 text-[12px] font-medium text-muted-foreground ${mini ? "lg:w-8 lg:px-0" : ""}`} aria-label={t.theme} title={t.theme}><Palette className="size-4" /><span className={mini ? "lg:hidden" : ""}>{lang === "fr" ? "Thème" : "Theme"}</span></Button></PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-56 rounded-2xl p-1.5">
                {(["dark", "light"] as const).map((mode) => <div key={mode} className="py-1">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{mode === "dark" ? (lang === "fr" ? "Sombres" : "Dark") : (lang === "fr" ? "Clairs" : "Light")}</p>
                  {dashboardLooks.filter((item) => item.mode === mode).map((item) => <button key={item.id} type="button" onClick={() => { setLook(item.id); setThemeOpen(false); }} aria-pressed={look === item.id}
                    className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] transition-colors hover:bg-secondary ${look === item.id ? "bg-secondary font-medium" : ""}`}>
                    {mode === "dark" ? <Moon className="size-3.5 text-muted-foreground" strokeWidth={1.7} /> : <Sun className="size-3.5 text-muted-foreground" strokeWidth={1.7} />}
                    <span className="flex-1">{mode === "dark" ? (lang === "fr" ? "Sombre" : "Dark") : (lang === "fr" ? "Clair" : "Light")} — {item[lang === "fr" ? "fr" : "en"]}</span>
                    {look === item.id ? <Check className="size-3.5" /> : <span className="size-3 rounded-full border border-border" style={{ background: item.swatch }} />}
                  </button>)}
                </div>)}
              </PopoverContent>
            </Popover>
            <Button asChild variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground"><Link to="/dashboard/docs" aria-label={t.docs} title={t.docs}><BookOpen className="size-4" /></Link></Button>
            <Button asChild variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground"><Link to="/" aria-label={t.home} title={t.home}><ArrowLeft className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon-sm" className={`size-8 rounded-lg text-muted-foreground ${mini ? "" : "ml-auto"}`} onClick={() => void signOut()} aria-label={t.signOut} title={t.signOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </aside>
      <div className="dashboard-content relative isolate min-w-0 flex-1">
        {!isThread && <div className={`dashboard-wallpaper pointer-events-none fixed inset-0 z-0 overflow-hidden`} aria-hidden="true"><img src={media.cloudBackground} alt="" className="h-full w-full scale-105 object-cover" /><span className="wallpaper-glow wallpaper-glow-1" /><span className="wallpaper-glow wallpaper-glow-2" /><span className="wallpaper-glow wallpaper-glow-3" /></div>}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur-xl lg:hidden"><Button variant="ghost" size="icon-sm" aria-label={t.menu} onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button><Link to="/dashboard" className="font-display text-[14px] font-bold">TechNova</Link><span className={`plan-ring plan-${planKey ?? "free"}`}><span className="grid size-7 place-items-center rounded-full bg-card text-[11px] font-bold text-foreground">{initials}</span></span></header>
        <main className="relative z-10 mx-auto min-h-[calc(100svh-48px)] lg:min-h-[calc(100svh-2rem)] w-full max-w-[1640px] px-4 pb-8 pt-6 sm:px-6 lg:px-3 lg:pb-4">{error && <div role="alert" className="mb-5 flex items-center justify-between border-l-2 border-destructive bg-secondary px-4 py-3 text-sm"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void reload()}>{t.retry}</Button></div>}<PendingDeletionBanner fr={lang === "fr"} /><div key={pathname} className="dashboard-page-enter">{children}</div></main>
      </div>
    </div>
  </DashboardContext.Provider>;
}
