import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Globe, LoaderCircle, Sparkles } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { content, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import artifact from "@/assets/auth-artifact.jpg";

type Mode = "login" | "signup" | "forgot" | "reset";
type Field = "name" | "email" | "password" | "confirm";

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}

export function AuthPage({ mode }: { mode: Mode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const navigate = useNavigate();
  const t = content[lang].auth;
  const isSignup = mode === "signup";
  const isLogin = mode === "login";
  const isReset = mode === "reset";

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (isReset) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const search = new URLSearchParams(window.location.search);
      setRecovery(hash.get("type") === "recovery" || search.get("type") === "recovery" || hash.has("access_token") || search.has("code"));
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setRecovery(true);
      });
      return () => listener.subscription.unsubscribe();
    }
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate({ to: "/dashboard", replace: true });
    };
    void check();
    return undefined;
  }, [isReset, navigate]);

  const clear = (field: Field) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFailure("");
  };

  async function handleGoogle() {
    setBusy(true);
    setFailure("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/connexion` } });
      if (error) throw error;
    } catch {
      setFailure(t.googleError);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const next: Partial<Record<Field, string>> = {};
    if (isSignup && !z.string().min(2).max(100).safeParse(name).success) next.name = t.invalidName;
    if (!isReset && !z.string().email().max(255).safeParse(email).success) next.email = t.invalidEmail;
    if (mode !== "forgot" && !z.string().min(8).max(128).safeParse(password).success) next.password = t.invalidPassword;
    if ((isSignup || isReset) && confirm !== password) next.confirm = t.mismatch;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      if (isSignup) {
        const { data: result, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/connexion`, data: { display_name: name } } });
        if (error) throw error;
        if (result.session) navigate({ to: "/dashboard" });
        else setMessage(t.preview);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (isReset) {
        if (!recovery) { setFailure(t.invalidLink); return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setMessage(t.passwordSaved);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage(t.resetSent);
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  const title = isSignup ? t.signupTitle : isLogin ? t.loginTitle : isReset ? t.newPasswordTitle : t.resetTitle;
  const sub = isSignup ? t.signupSub : isLogin ? t.loginSub : isReset ? t.newPasswordSub : t.resetSub;
  return <main className="auth-layout min-h-svh bg-background px-0 py-0 text-foreground lg:grid lg:place-items-center lg:px-6 lg:py-6">
    <div className="auth-shell mx-auto grid w-full max-w-[1120px] overflow-hidden border border-border bg-card lg:min-h-[min(780px,calc(100svh-48px))] lg:grid-cols-2">
      <section className="auth-visual relative hidden min-h-[520px] flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12" aria-label="TechNova AI Hub">
        <img src={artifact} alt="" width={1024} height={1280} className="auth-artifact absolute inset-0 h-full w-full object-cover" />
        <Link to="/" className="relative z-10 w-fit font-display text-lg font-bold text-foreground" aria-label="TechNova — accueil">TECH<span className="opacity-60">NOVA</span><span className="ml-2 align-top text-[10px] font-medium text-muted-foreground">AI HUB</span></Link>
        <div className="relative z-10 max-w-[420px]">
          <span className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground"><Sparkles className="size-4" />{t.visualTag}</span>
          <h2 className="font-display text-3xl font-semibold leading-[1.2] text-foreground xl:text-4xl">{t.visualTitle}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.visualSub}</p>
        </div>
      </section>
      <section className="flex min-w-0 flex-col px-5 pb-9 pt-5 sm:px-10 lg:px-12 lg:py-8 xl:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t.back}</Link>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLang(lang === "fr" ? "en" : "fr")} aria-label={lang === "fr" ? "Switch to English" : "Passer en français"} className="gap-2 rounded-full border border-border px-3 text-xs font-bold"><Globe className="size-4" />{lang === "fr" ? "EN" : "FR"}</Button>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8 lg:py-5">
          <Link to="/" className="mb-7 w-fit font-display text-lg font-bold lg:hidden">TECH<span className="opacity-60">NOVA</span></Link>
          <div className="mb-6">
            <p className="mb-3 text-[11px] font-bold uppercase text-muted-foreground">TECHNOVA / {isSignup ? t.signup : isLogin ? t.login : t.password}</p>
            <h1 className="font-display text-[29px] font-semibold leading-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sub}</p>
          </div>
          {(isSignup || isLogin) && <><Button type="button" variant="outline" disabled={busy || !ready} onClick={handleGoogle} className="auth-google h-12 w-full gap-3 font-semibold"><GoogleMark />{t.google}</Button><div className="my-5 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground"><span className="h-px flex-1 bg-border" />{t.orEmail}<span className="h-px flex-1 bg-border" /></div></>}
          <form noValidate method="post" onSubmit={handleSubmit} className="space-y-4">
            {isSignup && <div className="space-y-1.5"><Label htmlFor="auth-name">{t.name}</Label><Input id="auth-name" name="name" autoComplete="name" placeholder={t.namePlaceholder} maxLength={100} aria-invalid={!!errors.name} onChange={() => clear("name")} className="auth-input" />{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}</div>}
            {!isReset && <div className="space-y-1.5"><Label htmlFor="auth-email">{t.email}</Label><Input id="auth-email" name="email" type="email" autoComplete="email" placeholder={t.emailPlaceholder} maxLength={255} aria-invalid={!!errors.email} onChange={() => clear("email")} className="auth-input" />{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}</div>}
            {mode !== "forgot" && <div className="space-y-1.5"><div className="flex items-center justify-between gap-2"><Label htmlFor="auth-password">{t.password}</Label>{isLogin && <Link to="/mot-de-passe-oublie" className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{t.forgot}</Link>}</div><div className="relative"><Input id="auth-password" name="password" type={visible ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} maxLength={128} aria-invalid={!!errors.password} onChange={() => clear("password")} className="auth-input pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-10 text-muted-foreground" onClick={() => setVisible(!visible)} aria-label={visible ? t.hidePassword : t.showPassword} title={t.eye}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div>{errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : (isSignup || isReset) && <p className="text-xs text-muted-foreground">{t.passwordHint}</p>}</div>}
            {(isSignup || isReset) && <div className="space-y-1.5"><Label htmlFor="auth-confirm">{t.confirm}</Label><Input id="auth-confirm" name="confirm" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={128} aria-invalid={!!errors.confirm} onChange={() => clear("confirm")} className="auth-input" />{errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}</div>}
            <Button type="submit" disabled={!ready || busy || (isReset && !recovery)} className="auth-submit mt-2 h-12 w-full gap-2 text-sm font-bold">{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? t.working : isSignup ? t.submitSignup : isLogin ? t.submitLogin : isReset ? t.savePassword : t.resetSubmit}{!busy && <ArrowRight className="size-4" />}</Button>
            {message && <p role="status" className="border-l-2 border-foreground bg-secondary px-4 py-3 text-sm leading-relaxed">{message}</p>}
            {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
            {isReset && !recovery && !message && <p role="alert" className="text-sm text-destructive">{t.invalidLink}</p>}
          </form>
          <div className="mt-7 border-t border-border pt-6 text-center text-sm text-muted-foreground">{isSignup ? t.hasAccount : isLogin ? t.noAccount : null} <Link to={isSignup || !isLogin ? "/connexion" : "/inscription"} className="font-bold text-foreground underline underline-offset-4">{isSignup || !isLogin ? t.switchLogin : t.switchSignup}</Link></div>
          {isSignup && <p className="mt-4 text-center text-xs text-muted-foreground">{t.note}</p>}
        </div>
      </section>
    </div>
  </main>;
}
