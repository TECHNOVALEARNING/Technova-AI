import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Bot, CheckCheck, Clapperboard, Coins, Download, Image as ImageIcon, Inbox as InboxIcon, Lightbulb, Music2, ShieldCheck, Wallet, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mediaCatalog } from "@/lib/public-models";
import { chatTierCredits } from "@/lib/chat-modes";
import { Modal } from "./Modal";

// Inbox of the account menu: live notices built from the account (creations that will soon be deleted, low
// balance) and a fixed set of professional tips (what each creation costs, the 14-day retention, privacy, Smart,
// agents). Nothing is sent by e-mail; read state is kept in this browser (technova-inbox-read, see /cookies).

type Tone = "warning" | "credit" | "tip" | "info";
export type InboxMessage = { id: string; tone: Tone; icon: typeof InboxIcon; title: string; body: string; date?: string; link?: { to: "/dashboard/credits" | "/dashboard/chat" | "/dashboard/agents" | "/dashboard/models" | "/dashboard/usage"; label: string } };

const READ_KEY = "technova-inbox-read";
const readIds = (): string[] => { try { return JSON.parse(localStorage.getItem(READ_KEY) ?? "[]") as string[]; } catch { return []; } };
const saveIds = (ids: string[]) => { try { localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-200))); } catch { /* storage blocked */ } };
const credits = (fr: boolean, n: number) => `${n.toLocaleString(fr ? "fr-FR" : "en-US")} ${fr ? "crédits" : "credits"}`;

function staticMessages(fr: boolean): InboxMessage[] {
  const price = (name: string) => mediaCatalog.find((m) => m.name === name);
  const img = price("Image rapide"), hd = price("Image HD"), vid = price("Vidéo rapide"), vidQ = price("Vidéo qualité"), music = price("Musique");
  return [
    { id: "retention-14d", tone: "warning", icon: Download, title: fr ? "Vos créations sont conservées 14 jours" : "Your creations are kept for 14 days", body: fr ? "Images, vidéos et musiques générées sont supprimées automatiquement 14 jours après leur création. Téléchargez celles que vous souhaitez garder." : "Generated images, videos and music are deleted automatically 14 days after creation. Download the ones you want to keep." },
    { id: "cost-images", tone: "credit", icon: ImageIcon, title: fr ? "Le savez-vous ? Le prix d'une image" : "Did you know? The price of an image", body: fr ? `Une image rapide coûte ${credits(fr, img?.credits ?? 0)}, une image HD ${credits(fr, hd?.credits ?? 0)}. Ajoutez « HD » à votre demande pour la qualité supérieure ; une génération qui échoue est remboursée.` : `A quick image costs ${credits(fr, img?.credits ?? 0)}, an HD image ${credits(fr, hd?.credits ?? 0)}. Add "HD" to your request for the higher quality; a failed generation is refunded.`, link: { to: "/dashboard/models", label: fr ? "Voir les tarifs" : "See prices" } },
    { id: "cost-videos", tone: "credit", icon: Clapperboard, title: fr ? "Le prix d'une vidéo" : "The price of a video", body: fr ? `Une vidéo rapide de ${vid?.seconds ?? 5} s coûte ${credits(fr, vid?.credits ?? 0)} ; une vidéo qualité ${credits(fr, vidQ?.credits ?? 0)} (pack Creator ou Pro).` : `A ${vid?.seconds ?? 5}s quick video costs ${credits(fr, vid?.credits ?? 0)}; a quality video ${credits(fr, vidQ?.credits ?? 0)} (Creator or Pro pack).` },
    { id: "cost-music", tone: "credit", icon: Music2, title: fr ? "Le prix d'une musique" : "The price of a song", body: fr ? `Une chanson complète coûte ${credits(fr, music?.credits ?? 0)}. Décrivez le style, l'ambiance et, si vous le souhaitez, les paroles.` : `A full song costs ${credits(fr, music?.credits ?? 0)}. Describe the style, the mood and, if you like, the lyrics.` },
    { id: "cost-chat", tone: "credit", icon: Coins, title: fr ? "Le prix d'un message" : "The price of a message", body: fr ? `Éclair : ${credits(fr, chatTierCredits("eclair", false, 0))} par message, Équilibré : ${credits(fr, chatTierCredits("equilibre", false, 0))}, Expert : ${credits(fr, chatTierCredits("expert", false, 2))} (Creator) ou ${credits(fr, chatTierCredits("expert", false, 3))} (Pro). Un fichier joint coûte 1 crédit de plus (5 en Expert Pro).` : `Flash: ${credits(fr, chatTierCredits("eclair", false, 0))} per message, Balanced: ${credits(fr, chatTierCredits("equilibre", false, 0))}, Expert: ${credits(fr, chatTierCredits("expert", false, 2))} (Creator) or ${credits(fr, chatTierCredits("expert", false, 3))} (Pro). An attached file costs 1 more credit (5 on Expert Pro).` },
    { id: "tip-smart", tone: "tip", icon: Zap, title: fr ? "Astuce : laissez TechNova Smart choisir" : "Tip: let TechNova Smart choose", body: fr ? "Dans le chat, le mode TechNova Smart prend pour chaque message le mode le moins cher qui convient : vous payez 1 crédit pour une question simple, plus seulement quand c'est utile." : "In the chat, TechNova Smart picks the cheapest suitable mode for each message: 1 credit for a simple question, more only when it helps.", link: { to: "/dashboard/chat", label: fr ? "Ouvrir le chat" : "Open the chat" } },
    { id: "tip-agents", tone: "tip", icon: Bot, title: fr ? "Astuce : créez un agent pour vos tâches récurrentes" : "Tip: create an agent for recurring tasks", body: fr ? "Un agent garde ses instructions, sa mémoire, ses outils et vos documents : plus besoin de tout réexpliquer à chaque conversation." : "An agent keeps its instructions, memory, tools and your documents: no need to explain everything again in each conversation.", link: { to: "/dashboard/agents", label: fr ? "Mes agents" : "My agents" } },
    { id: "info-privacy", tone: "info", icon: ShieldCheck, title: fr ? "Vos données restent privées" : "Your data stays private", body: fr ? "Vos conversations et fichiers ne servent jamais à entraîner des modèles, et nos fournisseurs d'IA ne les conservent pas." : "Your conversations and files are never used to train models, and our AI providers do not keep them." },
  ];
}

/** Messages for this account (live ones first) and read state. */
export function useInbox(lang: "fr" | "en") {
  const fr = lang === "fr";
  const [live, setLive] = useState<InboxMessage[]>([]);
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => { setRead(readIds()); }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
      const [gens, wallet] = await Promise.all([
        supabase.from("media_generations").select("id, kind, expires_at").eq("status", "success").gt("expires_at", new Date().toISOString()).lt("expires_at", soon).order("expires_at").limit(50),
        supabase.rpc("get_wallet_balance", { _owner: uid }),
      ]);
      if (!alive) return;
      const out: InboxMessage[] = [];
      const expiring = gens.data ?? [];
      if (expiring.length) {
        const first = new Date(expiring[0]!.expires_at!);
        const day = first.toISOString().slice(0, 10);
        out.push({ id: `expiring-${day}-${expiring.length}`, tone: "warning", icon: AlertTriangle, date: first.toLocaleDateString(fr ? "fr-FR" : "en-US"),
          title: fr ? `${expiring.length} création${expiring.length > 1 ? "s" : ""} bientôt supprimée${expiring.length > 1 ? "s" : ""}` : `${expiring.length} creation${expiring.length > 1 ? "s" : ""} will soon be deleted`,
          body: fr ? `Dès le ${first.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, certaines de vos images, vidéos ou musiques arrivent au bout des 14 jours de conservation. Ouvrez vos conversations pour les télécharger.` : `From ${first.toLocaleDateString("en-US", { day: "numeric", month: "long" })}, some of your images, videos or songs reach the end of the 14-day retention. Open your conversations to download them.`,
          link: { to: "/dashboard/chat", label: fr ? "Mes conversations" : "My conversations" } });
      }
      const w = (wallet.data ?? {}) as { balance?: number; reserved?: number };
      const available = (w.balance ?? 0) - (w.reserved ?? 0);
      if (wallet.data && available < 100) {
        out.push({ id: `low-balance-${new Date().toISOString().slice(0, 10)}`, tone: "credit", icon: Wallet, title: fr ? "Solde de crédits bas" : "Low credit balance", body: fr ? `Il vous reste ${credits(fr, Math.max(0, available))}. Rechargez par Mobile Money ou carte pour continuer à créer sans interruption.` : `You have ${credits(fr, Math.max(0, available))} left. Top up by Mobile Money or card to keep creating without interruption.`, link: { to: "/dashboard/credits", label: fr ? "Recharger" : "Top up" } });
      }
      setLive(out);
    })().catch(() => {});
    return () => { alive = false; };
  }, [fr]);
  const messages = useMemo(() => [...live, ...staticMessages(fr)], [live, fr]);
  const unread = messages.filter((m) => !read.includes(m.id)).length;
  const markRead = useCallback((ids: string[]) => { const next = [...new Set([...readIds(), ...ids])]; saveIds(next); setRead(next); }, []);
  return { messages, unread, read, markRead };
}

const toneStyle: Record<Tone, string> = {
  warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  credit: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  tip: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
  info: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
};

export function InboxDialog({ lang, inbox, onClose }: { lang: "fr" | "en"; inbox: ReturnType<typeof useInbox>; onClose: () => void }) {
  const fr = lang === "fr";
  const [filter, setFilter] = useState<"all" | Tone>("all");
  const shown = inbox.messages.filter((m) => filter === "all" || m.tone === filter);
  const filters: [typeof filter, string][] = [["all", fr ? "Tout" : "All"], ["warning", fr ? "Important" : "Important"], ["credit", fr ? "Crédits" : "Credits"], ["tip", fr ? "Astuces" : "Tips"], ["info", fr ? "Infos" : "Info"]];
  return <Modal onClose={onClose} label={fr ? "Boîte de réception" : "Inbox"} className="max-w-xl p-0 sm:p-0">
    <div className="flex items-center gap-3 border-b border-border px-5 py-4 pr-14">
      <span className="grid size-10 place-items-center rounded-xl bg-ink text-ink-foreground"><InboxIcon className="size-5" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-display text-lg font-semibold">{fr ? "Boîte de réception" : "Inbox"}</h2><p className="text-xs text-muted-foreground">{inbox.unread ? (fr ? `${inbox.unread} non lu${inbox.unread > 1 ? "s" : ""}` : `${inbox.unread} unread`) : (fr ? "Tout est lu" : "All read")}</p></div>
      {inbox.unread > 0 && <button type="button" onClick={() => inbox.markRead(inbox.messages.map((m) => m.id))} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium transition hover:bg-secondary"><CheckCheck className="size-3.5" />{fr ? "Tout marquer comme lu" : "Mark all as read"}</button>}
    </div>
    <div className="flex gap-1.5 overflow-x-auto px-5 pt-3 [scrollbar-width:none]">{filters.map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`h-7 shrink-0 rounded-full px-3 text-xs transition ${filter === k ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>)}</div>
    <ul className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
      {shown.map((m) => { const unread = !inbox.read.includes(m.id); const I = m.icon; return <li key={m.id} onMouseEnter={() => unread && inbox.markRead([m.id])} onFocus={() => unread && inbox.markRead([m.id])} tabIndex={0}
        className={`relative flex gap-3 rounded-2xl border p-3.5 outline-none transition ${unread ? "border-foreground/15 bg-secondary/50" : "border-border"}`}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${toneStyle[m.tone]}`}><I className="size-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold leading-snug">{m.title}</p>{unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" aria-label={fr ? "Non lu" : "Unread"} />}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{m.body}</p>
          {(m.link || m.date) && <div className="mt-2 flex items-center justify-between gap-2">{m.link ? <Link to={m.link.to} onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline">{m.link.label}<ArrowRight className="size-3" /></Link> : <span />}{m.date && <span className="text-[11px] text-muted-foreground">{m.date}</span>}</div>}
        </div>
      </li>; })}
      {!shown.length && <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground"><Lightbulb className="size-5" />{fr ? "Aucun message ici." : "No message here."}</li>}
    </ul>
  </Modal>;
}
