import { useState } from "react";
import { Github, Globe2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SITE_SLUG_RE, toSlug } from "@/lib/connectors";
import { deploySiteToNetlify, deploySiteToVercel, publishSite, pushSiteToGitHub } from "@/lib/publishing.functions";
import { BrandLogo } from "./BrandLogo";
import type { StudioFile } from "@/lib/studio";
import { phishingMessage } from "@/lib/phishing-scan";
import { upgradeSentence } from "@/lib/plans";

const tx = (lang: string, fr: string, en: string) => (lang === "en" ? en : fr);
const ERR: Record<string, [string, string]> = {
  taken: ["Ce nom est déjà pris.", "This name is taken."],
  plan_publish: [upgradeSentence("publish", true), upgradeSentence("publish", false)],
  plan_github: [upgradeSentence("github", true), upgradeSentence("github", false)],
  reserved: ["Ce nom est réservé.", "This name is reserved."],
  rate: ["Trop de publications. Réessayez dans quelques minutes.", "Too many publishes. Try again in a few minutes."],
  size: ["Le site est trop volumineux.", "The site is too large."],
  not_connected: ["Connectez d’abord GitHub dans Connexions.", "Connect GitHub first in Connections."],
  reconnect: ["Votre accès GitHub doit être renouvelé dans Connexions.", "Your GitHub access needs to be renewed in Connections."],
  phishing: [phishingMessage(true), phishingMessage(false)],
  not_connected_netlify: ["Connectez d’abord Netlify dans Connexions.", "Connect Netlify first in Connections."],
  reconnect_netlify: ["Votre accès Netlify doit être renouvelé dans Connexions.", "Your Netlify access needs to be renewed in Connections."],
  reconnect_vercel: ["Connectez (ou reconnectez) Vercel dans Connexions.", "Connect (or reconnect) Vercel in Connections."],
  vercel_permissions: ["Vercel a refusé le déploiement : l’application TechNova doit avoir les permissions Deployments et Projects en lecture et écriture.", "Vercel refused the deployment: the TechNova app needs the Deployments and Projects read-and-write permissions."],
  secrets: ["Le code contient une clé secrète (API, mot de passe). Retirez-la avant de publier : elle serait visible par tous.", "The code contains a secret key (API, password). Remove it before publishing: it would be public."],
};

export function PublishDialog({ open, onOpenChange, title, files, lang }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; files: StudioFile[]; lang: string }) {
  const [slug, setSlug] = useState(() => toSlug(title) || "mon-site");
  const [busy, setBusy] = useState<"site" | "github" | "netlify" | "vercel" | null>(null);
  const [hosted, setHosted] = useState<{ netlify?: string; vercel?: string }>({});
  const [url, setUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const valid = SITE_SLUG_RE.test(slug);
  const payload = files.map((f) => ({ path: f.path.replace(/^\/+/, ""), content: f.content }));
  const msg = (code: string) => { const m = ERR[code]; return m ? tx(lang, m[0], m[1]) : /^(netlify|vercel)_\d+$/.test(code) ? tx(lang, `Le service a refusé le déploiement (${code.replace("_", " ")}). Réessayez ou reconnectez le compte dans Connexions.`, `The service refused the deployment (${code.replace("_", " ")}). Try again or reconnect the account in Connections.`) : tx(lang, "Une erreur est survenue.", "Something went wrong."); };
  const deploy = async (target: "netlify" | "vercel") => {
    setBusy(target); setError("");
    try {
      const r = await (target === "netlify" ? deploySiteToNetlify : deploySiteToVercel)({ data: { name: slug, files: payload } });
      if (r.ok) setHosted((h) => ({ ...h, [target]: r.url })); else setError(msg(r.error));
    } catch { setError(msg("failed")); }
    setBusy(null);
  };

  const publish = async () => {
    setBusy("site"); setError("");
    try {
      const r = await publishSite({ data: { slug, title, files: payload } });
      if (r.ok) setUrl(r.url); else setError(msg(r.error));
    } catch { setError(msg("failed")); }
    setBusy(null);
  };
  const github = async () => {
    setBusy("github"); setError("");
    try {
      const r = await pushSiteToGitHub({ data: { repo: slug, files: payload } });
      if (r.ok) setRepoUrl(r.url); else setError(msg(r.error));
    } catch { setError(msg("failed")); }
    setBusy(null);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{tx(lang, "Publier le site", "Publish site")}</DialogTitle><DialogDescription>{tx(lang, "Choisissez l’adresse de votre site. Republier met à jour la version en ligne.", "Choose your site address. Republishing updates the live version.")}</DialogDescription></DialogHeader>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="site-slug">{tx(lang, "Nom du site", "Site name")}</label>
      <div className="flex items-center gap-1 rounded-lg border border-border px-2"><span className="shrink-0 text-xs text-muted-foreground">/s/</span><Input id="site-slug" value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} className="border-0 px-1 shadow-none focus-visible:ring-0" /></div>
      {!valid && <p className="text-xs text-destructive">{tx(lang, "3 à 40 caractères : lettres, chiffres et tirets.", "3–40 characters: letters, numbers, dashes.")}</p>}
      <p className="text-xs text-muted-foreground">{tx(lang, "Une adresse du type nom.techlovaai.space sera proposée dès que le domaine sera relié.", "A name.techlovaai.space address will be offered once the domain is connected.")}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate rounded-lg bg-muted px-3 py-2 text-sm font-medium"><Globe2 className="size-4 shrink-0" />{url}</a>}
      {(["netlify", "vercel"] as const).map((k) => hosted[k] && <a key={k} href={hosted[k]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate rounded-lg bg-muted px-3 py-2 text-sm font-medium"><BrandLogo id={k} size="sm" />{hosted[k]}</a>)}
      {repoUrl && <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate rounded-lg bg-muted px-3 py-2 text-sm font-medium"><Github className="size-4 shrink-0" />{repoUrl}</a>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={!valid || busy !== null} onClick={() => void publish()}>{busy === "site" ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}{url ? tx(lang, "Republier", "Republish") : tx(lang, "Publier", "Publish")}</Button>
        <Button variant="outline" className="flex-1" disabled={!valid || busy !== null} onClick={() => void github()}>{busy === "github" ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}{tx(lang, "Envoyer sur GitHub", "Push to GitHub")}</Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {(["netlify", "vercel"] as const).map((k) => <Button key={k} variant="outline" className="flex-1" disabled={!valid || busy !== null} onClick={() => void deploy(k)}>{busy === k ? <Loader2 className="size-4 animate-spin" /> : <BrandLogo id={k} size="sm" />}{tx(lang, `Déployer sur ${k === "netlify" ? "Netlify" : "Vercel"}`, `Deploy to ${k === "netlify" ? "Netlify" : "Vercel"}`)}</Button>)}
      </div>
      <p className="text-[11px] text-muted-foreground">{tx(lang, "Netlify et Vercel déploient sur votre propre compte (à relier dans Connexions), avec le même nom de site.", "Netlify and Vercel deploy to your own account (link it in Connections), with the same site name.")}</p>
    </DialogContent>
  </Dialog>;
}
