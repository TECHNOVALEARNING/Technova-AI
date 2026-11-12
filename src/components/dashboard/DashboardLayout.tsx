import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { savePref } from "@/lib/consent";
import { planKeyOf, planLabels, usePlan } from "@/lib/plan-client";
import { BookMarked, Bot, ChevronUp, ExternalLink, Library, MessageSquareHeart, Plug, ShieldAlert, Puzzle } from "lucide-react";
import { getMyRole } from "@/lib/admin.functions";
import { Activity, ArrowLeft, CalendarDays, Check, Palette, Crown, Bell, BookOpen, Boxes, ChevronDown, ChevronRight, Code2, CreditCard, Diamond, Gift, Globe2, Inbox, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings2, Sun, Wallet, X, Wrench } from "lucide-react";
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
import { TopActions } from "./TopActions";
import { SuggestionBox } from "./SuggestionBox";
import { usePresence } from "@/lib/presence";
import { InboxDialog, useInbox } from "./Inbox";
import { clearSessionGuard, useSessionGuard } from "@/lib/session-guard";
import { DashboardContext, type Thread } from "./dashboard-context";
export { useDashboard, type Thread } from "./dashboard-context";

// Arena is hidden from the site for now (its routes redirect).
const links = [
  { key: "overview", to: "/dashboard", icon: LayoutDashboard },
  { key: "chat", to: "/dashboard/chat", icon: MessageCircle },
  { key: "agents", to: "/dashboard/agents", icon: Bot },
  { key: "plugins", to: "/dashboard/plugins", icon: Puzzle },
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

/** One line of the account menu. */
function AccountItem({ to, icon: Icon, label, chevron = false }: { to: "/dashboard/credits" | "/dashboard/settings" | "/dashboard/connexions" | "/dashboard/usage" | "/dashboard/api" | "/dashboard/docs"; icon: typeof Plug; label: string; chevron?: boolean }) {
  return <Link to={to} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition hover:bg-secondary"><Icon className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{label}</span>{chevron && <ChevronRight className="size-4 text-muted-foreground" />}</Link>;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [look, setLookState] = useState<DashboardLook>(defaultLook.light);
  const theme = lookMode(look);
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
  // Inbox (account menu): tips, credit prices and live notices, with an unread dot on the profile.
  const inbox = useInbox(lang === "en" ? "en" : "fr");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [accountView, setAccountView] = useState<"menu" | "themes">("menu");
  const [suggestOpen, setSuggestOpen] = useState(false);
  usePresence();
  // Sessions end after a week without activity (see session-guard.ts).
  useSessionGuard(useCallback(() => { void navigate({ to: "/connexion", replace: true }); }, [navigate]));
  async function signOut() {
    clearSessionGuard();
    try { localStorage.removeItem("technova-inbox-read"); } catch { /* ignore */ }
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
  // Sidebar wording: the models page is about prices per mode, the credits page holds packs and balance.
  const navLabel = (key: (typeof links)[number]["key"] | "docs") => key === "models" ? "Modes" : key === "credits" ? (lang === "fr" ? "Tarifs et crédits" : "Pricing & credits") : t[key];
  const matchingSections = [...links, { key: "docs", to: "/dashboard/docs", icon: BookOpen } as const].filter(item => navLabel(item.key).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const initials = (name || email || "T").charAt(0).toUpperCase();
  // The secondary links stay unfolded while one of them is the open page (and in the icon-only menu).
  const onSecondary = !primaryKeys.includes(current) || pathname === "/dashboard/admin";
  const showAll = mini || moreOpen || onSecondary;
  // Plan badge and avatar ring colours follow the highest pack bought (display only).
  const plan = usePlan();
  const planKey = plan ? planKeyOf(plan.tier, plan.paid) : null;
  const planName = planKey ? planLabels[planKey][lang] : "";

  // "Sites à visiter" banner: the TechNova family sites.
  const marqueeItems = ["technovalearning.com", "beninbeyond.com", "dukaio.com"];
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })); }, [lang]);

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
            {links.filter(item => showAll || primaryKeys.includes(item.key)).map(item => <Link key={item.key} to={item.to} title={navLabel(item.key)} aria-current={current === item.key ? "page" : undefined} className={`side-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${mini ? "lg:justify-center lg:px-0" : ""} ${current === item.key ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}><item.icon className="size-[15px] shrink-0" strokeWidth={1.7} /><span className={mini ? "lg:hidden" : ""}>{navLabel(item.key)}</span></Link>)}
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
          {/* Account menu (click the profile): plan, upgrade, settings, connections, usage, API, help and sign-out. */}
          <Popover open={accountOpen} onOpenChange={(open) => { setAccountOpen(open); if (!open) setAccountView("menu"); }}>
            <PopoverTrigger asChild>
              <button type="button" aria-label={lang === "fr" ? "Menu du compte" : "Account menu"} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-secondary/70 ${mini ? "lg:justify-center lg:px-0" : ""}`}>
                <span className={`plan-ring plan-${planKey ?? "free"}`} title={planName ? `${lang === "fr" ? "Forfait" : "Plan"} ${planName}` : undefined}><span className="grid size-9 place-items-center rounded-full bg-card text-[13px] font-semibold text-foreground">{initials}</span></span>
                <span className={`min-w-0 flex-1 ${mini ? "lg:hidden" : ""}`}><span className="block truncate text-[12px] font-medium">{name || t.accountName}</span>{email && <span className="block truncate text-[10.5px] text-muted-foreground">{email}</span>}{planKey && planKey !== "free" && <span className={`plan-${planKey} plan-pill mt-1 inline-flex items-center gap-1 rounded-full font-semibold leading-none ${planKey === "pro" ? "h-5 px-2.5 text-[10.5px] tracking-[0.06em]" : "h-[18px] px-2 text-[10px]"}`}>{planKey === "pro" && <Crown className="size-3" strokeWidth={2.4} aria-hidden="true" />}<span className="plan-chip-text">{planKey === "pro" ? "PRO" : planName}</span></span>}</span>
                {inbox.unread > 0 && <span className={`${mini ? "lg:hidden " : ""}grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-sky-500 px-1.5 text-[10.5px] font-semibold text-white`} aria-label={lang === "fr" ? `${inbox.unread} messages non lus` : `${inbox.unread} unread messages`}>{inbox.unread}</span>}
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${accountOpen ? "rotate-180" : ""} ${mini ? "lg:hidden" : ""}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8} className="w-[260px] rounded-2xl p-1.5">
              {accountView === "themes" ? <>
                <button type="button" onClick={() => setAccountView("menu")} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition hover:bg-secondary"><ArrowLeft className="size-4" />{lang === "fr" ? "Thèmes" : "Themes"}</button>
                {(["dark", "light"] as const).map((mode) => <div key={mode} className="py-1">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{mode === "dark" ? (lang === "fr" ? "Sombres" : "Dark") : (lang === "fr" ? "Clairs" : "Light")}</p>
                  {dashboardLooks.filter((item) => item.mode === mode).map((item) => <button key={item.id} type="button" onClick={() => { setLook(item.id); setAccountOpen(false); }} aria-pressed={look === item.id}
                    className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] transition-colors hover:bg-secondary ${look === item.id ? "bg-secondary font-medium" : ""}`}>
                    {mode === "dark" ? <Moon className="size-3.5 text-muted-foreground" strokeWidth={1.7} /> : <Sun className="size-3.5 text-muted-foreground" strokeWidth={1.7} />}
                    <span className="flex-1">{mode === "dark" ? (lang === "fr" ? "Sombre" : "Dark") : (lang === "fr" ? "Clair" : "Light")} — {item[lang === "fr" ? "fr" : "en"]}</span>
                    {look === item.id ? <Check className="size-3.5" /> : <span className="size-3 rounded-full border border-border" style={{ background: item.swatch }} />}
                  </button>)}
                </div>)}
              </> : <>
              <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5">
                <span className={`plan-ring plan-${planKey ?? "free"}`}><span className="grid size-9 place-items-center rounded-full bg-card text-[13px] font-semibold text-foreground">{initials}</span></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{name || t.accountName}</span><span className="block truncate text-[11.5px] text-muted-foreground">{planName || (lang === "fr" ? "Gratuit" : "Free")}</span></span>
              </div>
              <div className="my-1 h-px bg-border" />
              <button type="button" onClick={() => { setAccountOpen(false); setInboxOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition hover:bg-secondary">
                <span className="relative"><Inbox className="size-[18px] text-muted-foreground" strokeWidth={1.7} />{inbox.unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sky-500 ring-2 ring-popover" />}</span>
                <span className="flex-1">{lang === "fr" ? "Boîte de réception" : "Inbox"}</span>
                {inbox.unread > 0 && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300">{inbox.unread}</span>}
              </button>
              {(plan?.tier ?? 0) < 3 && <AccountItem to="/dashboard/credits" icon={Crown} label={lang === "fr" ? "Passer à l'offre supérieure" : "Upgrade your plan"} />}
              <AccountItem to="/dashboard/settings" icon={Settings2} label={lang === "fr" ? "Paramètres" : "Settings"} />
              <AccountItem to="/dashboard/connexions" icon={Plug} label={lang === "fr" ? "Connexions" : "Connections"} />
              <AccountItem to="/dashboard/usage" icon={Activity} label={lang === "fr" ? "Utilisation" : "Usage"} />
              <AccountItem to="/dashboard/api" icon={Code2} label="API" />
              <div className="my-1 h-px bg-border" />
              <button type="button" onClick={() => setAccountView("themes")} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition hover:bg-secondary"><Palette className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{lang === "fr" ? "Thèmes" : "Themes"}</span><span className="size-3 rounded-full border border-border" style={{ background: dashboardLooks.find((l) => l.id === look)?.swatch }} /><ChevronRight className="size-4 text-muted-foreground" /></button>
              <AccountItem to="/dashboard/docs" icon={BookOpen} label={lang === "fr" ? "Aide et documentation" : "Help and docs"} chevron />
              <button type="button" onClick={() => { setAccountOpen(false); setSuggestOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition hover:bg-secondary"><MessageSquareHeart className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{lang === "fr" ? "Boîte à suggestions" : "Suggestion box"}</span></button>
              <a href="https://www.technovalearning.com/outils-digitaux" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition hover:bg-secondary"><Wrench className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{lang === "fr" ? "Autres outils" : "Other tools"}</span><ExternalLink className="size-3.5 text-muted-foreground" /></a>
              <Link to="/" className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition hover:bg-secondary"><ArrowLeft className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{lang === "fr" ? "Retour au site" : "Back to the website"}</span></Link>
              <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition hover:bg-secondary"><LogOut className="size-[18px] text-muted-foreground" strokeWidth={1.7} /><span className="flex-1">{lang === "fr" ? "Se déconnecter" : "Sign out"}</span></button>
              </>}
            </PopoverContent>
          </Popover>
          <SuggestionBox open={suggestOpen} onOpenChange={setSuggestOpen} lang={lang === "en" ? "en" : "fr"} />
          {inboxOpen && <InboxDialog lang={lang === "en" ? "en" : "fr"} inbox={inbox} onClose={() => setInboxOpen(false)} />}
        </div>
      </aside>
      <div className="dashboard-content relative isolate min-w-0 flex-1">
        {!isThread && <div className={`dashboard-wallpaper pointer-events-none fixed inset-0 z-0 overflow-hidden`} aria-hidden="true"><img src={media.cloudBackground} alt="" className="h-full w-full scale-105 object-cover" /><span className="wallpaper-glow wallpaper-glow-1" /><span className="wallpaper-glow wallpaper-glow-2" /><span className="wallpaper-glow wallpaper-glow-3" /></div>}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur-xl lg:hidden"><Button variant="ghost" size="icon-sm" aria-label={t.menu} onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button><Link to="/dashboard" className="font-display text-[14px] font-bold">TechNova</Link><span className={`plan-ring plan-${planKey ?? "free"}`}><span className="grid size-7 place-items-center rounded-full bg-card text-[11px] font-bold text-foreground">{initials}</span></span></header>
        {/* Top bar of every dashboard page: today's date on the left (not inside a conversation), and on the right
            "Get the app" and "Upgrade" (browser time is set after mount to avoid a server/browser mismatch). */}
        <div className="relative z-20 mx-auto flex w-full max-w-[1640px] items-center justify-between gap-3 px-4 pt-2 sm:px-6 lg:px-3 lg:pt-0">
          {!isThread ? <p className="flex h-8 min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground"><CalendarDays className="size-3.5 shrink-0" strokeWidth={1.6} /><span className="truncate first-letter:uppercase">{today}</span></p> : <span />}
          <TopActions lang={lang} tier={plan?.tier ?? null} showCredits={pathname.startsWith("/dashboard/chat")} />
        </div>
        <main className={`relative z-10 mx-auto w-full max-w-[1640px] px-4 pt-6 sm:px-6 lg:px-3 ${isThread ? "min-h-[calc(100svh-48px)] pb-8 lg:min-h-[calc(100svh-2rem)] lg:pb-4" : "min-h-[calc(100svh-148px)] pb-4 lg:min-h-[calc(100svh-124px)]"}`}>{error && <div role="alert" className="mb-5 flex items-center justify-between border-l-2 border-destructive bg-secondary px-4 py-3 text-sm"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void reload()}>{t.retry}</Button></div>}<PendingDeletionBanner fr={lang === "fr"} /><div key={pathname} className="dashboard-page-enter">{children}</div></main>
        {/* "Sites à visiter": the TechNova family sites, at the bottom of the dashboard. */}
        {!isThread && <div className="relative z-10 px-4 pb-4 sm:px-6 lg:px-3 lg:pb-0"><div className="dashboard-marquee mx-auto flex h-8 max-w-[1640px] items-center overflow-hidden rounded-full border border-border bg-card lg:h-9">
          <span className="flex shrink-0 items-center gap-1.5 border-r border-border px-3.5 text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground"><span className="size-1.5 rounded-full bg-foreground/60" />{lang === "fr" ? "Sites à visiter" : "Sites to visit"}</span>
          <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]"><div className="dashboard-marquee-track flex w-max items-center gap-9 whitespace-nowrap px-6 text-[11px] text-muted-foreground">{[0, 1, 2, 3].map((copy) => <span key={copy} className="contents" aria-hidden={copy > 0 ? true : undefined}>{marqueeItems.map((site) => <a key={site} href={`https://${site}/`} target="_blank" rel="noopener noreferrer" tabIndex={copy > 0 ? -1 : undefined} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"><Globe2 className="size-3.5" strokeWidth={1.6} />{site}</a>)}</span>)}</div></div>
        </div></div>}
      </div>
    </div>
  </DashboardContext.Provider>;
}
