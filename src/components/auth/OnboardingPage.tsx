import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Building2, Check, Globe, LoaderCircle, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSiteLang } from "@/components/site/SiteChrome";
import { accountTypes, referralSources, workDomains, type AccountType, type ReferralSource, type WorkDomain } from "@/lib/onboarding";
import { markOnboarded } from "@/lib/onboarding-guard";
import { cn } from "@/lib/utils";
import artifact from "@/assets/auth-artifact.jpg";

// Steps 2 to 4 of sign-up (step 1 is the e-mail / Google form). Answers are saved on the
// user's own profile (owner-only RLS); the dashboard opens once they are complete.
const TOTAL = 4;

function Choice({ selected, onClick, children, hint, icon }: { selected: boolean; onClick: () => void; children: string; hint?: string | undefined; icon?: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={selected}
    className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition", selected ? "border-foreground bg-foreground/[0.04] ring-1 ring-foreground" : "border-border hover:border-foreground/40")}>
    {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">{icon}</span>}
    <span className="min-w-0 flex-1"><span className="block font-medium">{children}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-foreground bg-foreground text-background" : "border-border")}>{selected && <Check className="size-3" />}</span>
  </button>;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useSiteLang();
  const fr = lang === "fr";
  const [step, setStep] = useState(2);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [organization, setOrganization] = useState("");
  const [domain, setDomain] = useState<WorkDomain | null>(null);
  const [domainOther, setDomainOther] = useState("");
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [referralOther, setReferralOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  // Someone who already answered goes straight to the dashboard.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).maybeSingle();
      if (profile?.onboarded_at) { markOnboarded(); void navigate({ to: "/dashboard", replace: true }); }
    })();
  }, [navigate]);

  const canContinue = step === 2 ? accountType !== null && (accountType === "individual" || organization.trim().length >= 2)
    : step === 3 ? domain !== null && (domain !== "other" || domainOther.trim().length >= 2)
    : referral !== null && (referral !== "other" || referralOther.trim().length >= 2);

  async function finish() {
    setBusy(true); setFailure("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { void navigate({ to: "/connexion" }); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: data.user.id,
      account_type: accountType,
      organization_name: accountType === "organization" ? organization.trim().slice(0, 120) : null,
      work_domain: domain,
      work_domain_other: domain === "other" ? domainOther.trim().slice(0, 120) : null,
      referral_source: referral,
      referral_other: referral === "other" ? referralOther.trim().slice(0, 120) : null,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    setBusy(false);
    if (error) { setFailure(fr ? "Enregistrement impossible. Réessayez." : "Could not save. Please try again."); return; }
    markOnboarded();
    void navigate({ to: "/dashboard", replace: true });
  }

  const titles: Record<number, [string, string, string, string]> = {
    2: ["Vous utilisez TechNova…", "You use TechNova…", "Pour adapter votre espace à votre situation.", "So we can tailor your workspace."],
    3: ["Quel est votre domaine ?", "What is your field?", "Choisissez celui qui vous décrit le mieux.", "Pick the one that describes you best."],
    4: ["Où avez-vous entendu parler de nous ?", "Where did you hear about us?", "Cela nous aide à faire connaître TechNova.", "It helps us spread the word about TechNova."],
  };
  const [tFr, tEn, sFr, sEn] = titles[step]!;

  return <main className="auth-layout min-h-svh bg-background text-foreground lg:grid lg:place-items-center lg:px-6 lg:py-6">
    <div className="auth-shell mx-auto grid w-full max-w-[1120px] overflow-hidden border border-border bg-card lg:min-h-[min(780px,calc(100svh-48px))] lg:grid-cols-2">
      <section className="auth-visual relative hidden min-h-[520px] flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12" aria-label="TechNova AI Hub">
        <img src={artifact} alt="" width={1024} height={1280} className="auth-artifact absolute inset-0 h-full w-full object-cover" />
        <span className="relative z-10 w-fit font-display text-lg font-bold text-foreground">TECH<span className="opacity-60">NOVA</span></span>
        <div className="relative z-10 max-w-[420px]">
          <span className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground"><Sparkles className="size-4" />{fr ? "Bienvenue" : "Welcome"}</span>
          <h2 className="font-display text-3xl font-semibold leading-[1.2] xl:text-4xl">{fr ? "Encore trois questions et votre espace est prêt." : "Three more questions and your workspace is ready."}</h2>
        </div>
      </section>
      <section className="flex min-w-0 flex-col px-5 pb-9 pt-5 sm:px-10 lg:px-12 lg:py-8 xl:px-16">
        <div className="flex items-center justify-between gap-4">
          {step > 2 ? <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{fr ? "Retour" : "Back"}</button> : <span />}
          <Button type="button" variant="ghost" size="sm" onClick={() => setLang(fr ? "en" : "fr")} className="gap-2 rounded-full border border-border px-3 text-xs font-bold"><Globe className="size-4" />{fr ? "EN" : "FR"}</Button>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8 lg:py-5">
          <div className="mb-6">
            <p className="mb-3 text-[11px] font-bold uppercase text-muted-foreground">{fr ? `Étape ${step} sur ${TOTAL}` : `Step ${step} of ${TOTAL}`}</p>
            <div className="mb-5 flex gap-1.5" aria-hidden="true">{Array.from({ length: TOTAL }, (_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-foreground" : "bg-border")} />)}</div>
            <h1 className="font-display text-[27px] font-semibold leading-tight">{fr ? tFr : tEn}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{fr ? sFr : sEn}</p>
          </div>

          {step === 2 && <div className="space-y-2.5">
            {accountTypes.map((o) => <Choice key={o.key} selected={accountType === o.key} onClick={() => setAccountType(o.key)} hint={fr ? o.hint?.fr : o.hint?.en}
              icon={o.key === "individual" ? <User className="size-4" /> : <Building2 className="size-4" />}>{fr ? o.fr : o.en}</Choice>)}
            {accountType === "organization" && <Input autoFocus value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={120} placeholder={fr ? "Nom de l'organisation" : "Organization name"} aria-label={fr ? "Nom de l'organisation" : "Organization name"} className="h-11 rounded-xl" />}
          </div>}

          {step === 3 && <div className="space-y-2">
            <div className="grid max-h-[46svh] gap-2 overflow-y-auto pr-1">{workDomains.map((o) => <Choice key={o.key} selected={domain === o.key} onClick={() => setDomain(o.key)}>{fr ? o.fr : o.en}</Choice>)}</div>
            {domain === "other" && <Input autoFocus value={domainOther} onChange={(e) => setDomainOther(e.target.value)} maxLength={120} placeholder={fr ? "Précisez votre domaine" : "Describe your field"} aria-label={fr ? "Votre domaine" : "Your field"} className="h-11 rounded-xl" />}
          </div>}

          {step === 4 && <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">{referralSources.map((o) => <button key={o.key} type="button" onClick={() => setReferral(o.key)} aria-pressed={referral === o.key}
              className={cn("rounded-xl border px-3 py-2.5 text-left text-sm transition", referral === o.key ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40")}>{fr ? o.fr : o.en}</button>)}</div>
            {referral === "other" && <Input autoFocus value={referralOther} onChange={(e) => setReferralOther(e.target.value)} maxLength={120} placeholder={fr ? "Où exactement ?" : "Where exactly?"} aria-label={fr ? "Précisez" : "Details"} className="h-11 rounded-xl" />}
          </div>}

          {failure && <p role="alert" className="mt-4 text-sm text-destructive">{failure}</p>}
          <Button type="button" disabled={!canContinue || busy} onClick={() => (step < TOTAL ? setStep(step + 1) : void finish())} className="mt-6 h-11 w-full rounded-full">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : step < TOTAL ? <>{fr ? "Continuer" : "Continue"}<ArrowRight className="size-4" /></> : <>{fr ? "Accéder à mon espace" : "Go to my workspace"}<ArrowRight className="size-4" /></>}
          </Button>
        </div>
      </section>
    </div>
  </main>;
}
