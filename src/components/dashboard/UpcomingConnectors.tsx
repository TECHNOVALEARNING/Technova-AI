import { useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import { connectorCategories, upcomingConnectors, type ConnectorCategory } from "@/lib/connector-catalog";
import { cn } from "@/lib/utils";

// Under the official plugins: a call to action that unfolds the connectors on the way (not connected yet).
// The official plugins stay first; this list only shows what is coming, with each service's own icon.

export function UpcomingConnectors({ lang }: { lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ConnectorCategory | "all">("all");
  const shown = upcomingConnectors.filter((c) => category === "all" || c.category === category);
  const preview = ["gmail", "slack", "whatsapp-business", "shopify", "paypal", "google-analytics", "elevenlabs"];

  return <section className="space-y-4">
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="upcoming-connectors"
      className="group flex w-full flex-col gap-3 rounded-2xl border border-dashed border-border bg-card/70 p-4 text-left transition hover:border-foreground/30 sm:flex-row sm:items-center">
      <span className="flex -space-x-2.5">{preview.map((slug) => <img key={slug} src={`/media/connectors/${slug}.png`} alt="" className="size-9 rounded-xl border-2 border-card bg-white object-cover shadow-sm" loading="lazy" />)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{fr ? `Voir les ${upcomingConnectors.length} connecteurs à venir` : `See the ${upcomingConnectors.length} upcoming connectors`}</span>
        <span className="block text-[12.5px] text-muted-foreground">{fr ? "Gmail, Slack, WhatsApp Business, Shopify, PayPal, Google Analytics… bientôt reliables à vos agents et à vos sites." : "Gmail, Slack, WhatsApp Business, Shopify, PayPal, Google Analytics… soon linkable to your agents and sites."}</span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full bg-foreground px-4 text-[12.5px] font-semibold text-background sm:self-auto">
        {open ? (fr ? "Masquer" : "Hide") : (fr ? "Dérouler la liste" : "Show the list")}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </span>
    </button>

    {open && <div id="upcoming-connectors" className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(["all", ...(Object.keys(connectorCategories) as ConnectorCategory[])] as const).map((k) => {
          const count = k === "all" ? upcomingConnectors.length : upcomingConnectors.filter((c) => c.category === k).length;
          return <button key={k} type="button" aria-pressed={category === k} onClick={() => setCategory(k)}
            className={cn("h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition", category === k ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30")}>
            {k === "all" ? (fr ? "Tous" : "All") : connectorCategories[k][lang]} <span className="opacity-60">{count}</span>
          </button>;
        })}
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((c) => <li key={c.slug} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <img src={`/media/connectors/${c.slug}.png`} alt="" className="size-10 shrink-0 rounded-xl object-cover" loading="lazy" />
        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{c.name}</span><span className="line-clamp-2 block text-[12px] leading-snug text-muted-foreground" title={c.text[lang]}>{c.text[lang]}</span></span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"><Clock3 className="size-3" />{fr ? "Bientôt" : "Soon"}</span>
      </li>)}</ul>
    </div>}
  </section>;
}
