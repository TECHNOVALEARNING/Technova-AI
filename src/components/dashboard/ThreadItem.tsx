import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Globe2, Link2Off, Loader2, Pencil, Pin, PinOff, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Thread } from "./dashboard-context";

type Props = { thread: Thread; active: boolean; lang: "fr" | "en"; reload: () => Promise<void> };

const copy = {
  fr: { rename: "Renommer", pin: "Épingler", unpin: "Désépingler", share: "Partager", del: "Supprimer", delTitle: "Supprimer cette conversation ?", delSub: "Elle sera définitivement effacée, ainsi que son lien public éventuel.", cancel: "Annuler", shareTitle: "Partager la conversation", shareSub: "Toute personne disposant du lien pourra lire cette conversation, même sans compte.", creating: "Création du lien public…", copy: "Copier", copied: "Copié", open: "Ouvrir", revoke: "Désactiver le lien", revoked: "Le lien a été désactivé.", newLink: "Créer un nouveau lien", error: "Impossible de créer le lien. Réessayez.", public: "Lien public actif" },
  en: { rename: "Rename", pin: "Pin", unpin: "Unpin", share: "Share", del: "Delete", delTitle: "Delete this conversation?", delSub: "It will be permanently erased, along with any public link.", cancel: "Cancel", shareTitle: "Share conversation", shareSub: "Anyone with the link can read this conversation, even without an account.", creating: "Creating public link…", copy: "Copy", copied: "Copied", open: "Open", revoke: "Disable link", revoked: "The link has been disabled.", newLink: "Create a new link", error: "Unable to create the link. Try again.", public: "Public link active" },
};

function makeToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export function ThreadItem({ thread, active, lang, reload }: Props) {
  const c = copy[lang];
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  async function saveTitle() {
    setEditing(false);
    const next = title.trim().slice(0, 120);
    if (!next || next === thread.title) { setTitle(thread.title); return; }
    await supabase.from("chat_threads").update({ title: next }).eq("id", thread.id);
    await reload();
  }
  async function togglePin() {
    await supabase.from("chat_threads").update({ pinned: !thread.pinned }).eq("id", thread.id);
    await reload();
  }
  async function remove() {
    await supabase.from("chat_messages").delete().eq("thread_id", thread.id);
    await supabase.from("chat_threads").delete().eq("id", thread.id);
    await reload();
    if (active) void navigate({ to: "/dashboard/chat" });
  }

  const iconBtn = "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground";

  return <>
    <div className={`side-link group/thread relative flex items-center rounded-lg ${active ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {editing
        ? <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} onBlur={() => void saveTitle()} onKeyDown={e => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") { setTitle(thread.title); setEditing(false); } }} aria-label={c.rename} className="m-0.5 h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-[12px] text-foreground outline-none" />
        : <Link to="/dashboard/chat/$threadId" params={{ threadId: thread.id }} className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-[12px]">
            {thread.pinned && <Pin className="size-3 shrink-0 rotate-45 text-primary" />}
            <span className="truncate">{thread.title}</span>
          </Link>}
      {!editing && <div className={`absolute right-1 flex items-center gap-px rounded-md bg-secondary pl-1 opacity-0 transition-opacity group-hover/thread:opacity-100 focus-within:opacity-100 ${active ? "max-lg:opacity-100" : ""}`}>
        <button type="button" className={iconBtn} onClick={() => setEditing(true)} aria-label={c.rename} title={c.rename}><Pencil className="size-3" /></button>
        <button type="button" className={iconBtn} onClick={() => void togglePin()} aria-label={thread.pinned ? c.unpin : c.pin} title={thread.pinned ? c.unpin : c.pin}>{thread.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}</button>
        <button type="button" className={iconBtn} onClick={() => setShareOpen(true)} aria-label={c.share} title={c.share}><Share2 className="size-3" /></button>
        <button type="button" className={`${iconBtn} hover:text-destructive`} onClick={() => setDeleteOpen(true)} aria-label={c.del} title={c.del}><Trash2 className="size-3" /></button>
      </div>}
    </div>
    <ShareDialog open={shareOpen} onOpenChange={setShareOpen} thread={thread} lang={lang} reload={reload} />
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader><AlertDialogTitle>{c.delTitle}</AlertDialogTitle><AlertDialogDescription>{c.delSub}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="rounded-full">{c.cancel}</AlertDialogCancel><AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void remove()}>{c.del}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function ShareDialog({ open, onOpenChange, thread, lang, reload }: { open: boolean; onOpenChange: (v: boolean) => void; thread: Thread; lang: "fr" | "en"; reload: () => Promise<void> }) {
  const c = copy[lang];
  const [token, setToken] = useState<string | null>(thread.share_token);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "revoked" | "error">("idle");
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setState("loading");
    const next = makeToken();
    const [{ error }] = await Promise.all([
      supabase.from("chat_threads").update({ share_token: next }).eq("id", thread.id),
      new Promise(r => setTimeout(r, 900)),
    ]);
    if (error) { setState("error"); return; }
    setToken(next); setState("ready"); void reload();
  }
  useEffect(() => {
    if (!open) { setCopied(false); return; }
    if (thread.share_token) { setToken(thread.share_token); setState("ready"); } else void createLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function revoke() {
    await supabase.from("chat_threads").update({ share_token: null }).eq("id", thread.id);
    setToken(null); setState("revoked"); void reload();
  }
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/partage/${token}` : "";

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="block w-[calc(100vw-2rem)] max-w-[440px] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[440px]">
      <div className="min-w-0 px-6 pt-6 pb-5 pr-12">
        <div className="mb-4 grid size-11 place-items-center rounded-2xl border border-border bg-secondary"><Globe2 className="size-5 text-primary" /></div>
        <DialogHeader className="text-left"><DialogTitle className="text-[17px]">{c.shareTitle}</DialogTitle><DialogDescription className="text-[13px]">{c.shareSub}</DialogDescription></DialogHeader>
      </div>
      <div className="min-w-0 border-t border-border bg-secondary/40 px-6 py-5">
        <p className="mb-2 truncate text-[12px] font-medium text-foreground">{thread.title}</p>
        {state === "loading" && <div className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 text-[13px] text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" />{c.creating}</div>}
        {state === "ready" && <>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background pl-3.5 pr-1.5">
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{url}</span>
            <Button size="sm" className="h-8 rounded-full px-3.5" onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? c.copied : c.copy}</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />{c.public}</span>
            <div className="flex gap-1">
              <Button asChild variant="ghost" size="sm" className="h-8 rounded-full text-[12px]"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />{c.open}</a></Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-full text-[12px] text-muted-foreground hover:text-destructive" onClick={() => void revoke()}><Link2Off className="size-3.5" />{c.revoke}</Button>
            </div>
          </div>
        </>}
        {(state === "revoked" || state === "error") && <div className="flex items-center justify-between gap-3"><p className="text-[13px] text-muted-foreground">{state === "error" ? c.error : c.revoked}</p><Button size="sm" className="h-8 rounded-full" onClick={() => void createLink()}>{c.newLink}</Button></div>}
      </div>
    </DialogContent>
  </Dialog>;
}
