import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, BookOpen, Code2, KeyRound, Library } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/_authenticated/dashboard/docs")({
  head: () => ({ meta: [
    { title: "Documentation | TechNova AI Hub" },
    { name: "description", content: "Guides et documentation TechNova." },
    { property: "og:title", content: "Documentation | TechNova AI Hub" },
    { property: "og:description", content: "Guides et documentation TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DocsHub,
});

/** Entry point to the documentation: public guides plus the dashboard pages developers need. */
function DocsHub() {
  const { lang } = useDashboard(); const fr = lang !== "en";
  const external = [
    { href: "/documentation", icon: BookOpen, title: fr ? "Documentation de l'API" : "API documentation", text: fr ? "Authentification, requêtes, modèles, erreurs et limites." : "Authentication, requests, models, errors and limits." },
    { href: "/developpeurs", icon: Code2, title: fr ? "Exemples de code" : "Code examples", text: fr ? "JavaScript, Python, PHP et cURL prêts à copier." : "Ready-to-copy JavaScript, Python, PHP and cURL." },
  ];
  const internal = [
    { to: "/dashboard/api" as const, icon: KeyRound, title: fr ? "Clés API" : "API keys", text: fr ? "Créez et supprimez vos clés." : "Create and delete your keys." },
    { to: "/dashboard/usage" as const, icon: Activity, title: fr ? "Utilisation" : "Usage", text: fr ? "Journal des requêtes et export CSV." : "Request log and CSV export." },
    { to: "/dashboard/registry" as const, icon: Library, title: "Registry", text: fr ? "Prompts et workflows prêts à l'emploi." : "Ready-made prompts and workflows." },
  ];
  const card = "group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20";
  return <div className="space-y-6">
    <div><h1 className="font-display text-[26px] font-semibold leading-tight">Documentation</h1><p className="mt-1 text-[13px] text-muted-foreground">{fr ? "Tout pour utiliser TechNova et intégrer l'API à vos produits." : "Everything to use TechNova and integrate the API into your products."}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{external.map((e) => <a key={e.href} href={e.href} target="_blank" rel="noopener noreferrer" className={card}>
      <span className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-secondary"><e.icon className="size-4" /></span><ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" /></span>
      <span className="mt-2 font-display text-lg font-semibold">{e.title}</span><span className="text-[13px] text-muted-foreground">{e.text}</span>
    </a>)}</div>
    <div className="grid gap-4 sm:grid-cols-3">{internal.map((i) => <Link key={i.to} to={i.to} className={card}>
      <span className="grid size-9 place-items-center rounded-xl bg-secondary"><i.icon className="size-4" /></span>
      <span className="mt-2 font-medium">{i.title}</span><span className="text-[13px] text-muted-foreground">{i.text}</span>
    </Link>)}</div>
  </div>;
}
