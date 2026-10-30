import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Promise-based replacement for window.confirm / window.prompt: `await confirmDialog({...})` opens one
// accessible modal rendered by <ConfirmHost /> (mounted once in __root).

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for deletions, suspensions and other destructive actions. */
  tone?: "default" | "danger";
  /** Asks for a short text (e.g. a reason); the promise then resolves to that text. */
  input?: { label: string; placeholder?: string; required?: boolean };
};
type Request = ConfirmOptions & { resolve: (value: string | null) => void };

let open: ((request: Request) => void) | null = null;

/** Resolves true when confirmed, false when cancelled. */
export function confirmDialog(options: Omit<ConfirmOptions, "input">): Promise<boolean> {
  return ask(options).then((v) => v !== null);
}
/** Resolves to the text entered, or null when cancelled. */
export function promptDialog(options: ConfirmOptions & { input: NonNullable<ConfirmOptions["input"]> }): Promise<string | null> {
  return ask(options);
}
function ask(options: ConfirmOptions): Promise<string | null> {
  return new Promise((resolve) => {
    if (!open) { resolve(null); return; }
    open({ ...options, resolve });
  });
}

const fr = () => typeof document === "undefined" || document.documentElement.lang !== "en";

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const settled = useRef(false);
  useEffect(() => {
    open = (r) => { settled.current = false; setValue(""); setRequest(r); };
    return () => { open = null; };
  }, []);
  const finish = (result: string | null) => {
    if (!request || settled.current) return;
    settled.current = true;
    request.resolve(result);
    setRequest(null);
  };
  const danger = request?.tone === "danger";
  const Icon = danger ? AlertTriangle : Info;
  const blocked = !!request?.input?.required && !value.trim();
  return <AlertDialog open={!!request} onOpenChange={(o) => { if (!o) finish(null); }}>
    <AlertDialogContent className="max-w-[420px] rounded-[24px] border-border p-6 sm:rounded-[24px]">
      {request && <form onSubmit={(e) => { e.preventDefault(); if (!blocked) finish(request.input ? value.trim() : "ok"); }} className="grid gap-5">
        <AlertDialogHeader className="items-center text-center sm:items-center sm:text-center">
          <span className={`mb-1 grid size-12 place-items-center rounded-2xl ${danger ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"}`}><Icon className="size-5" /></span>
          <AlertDialogTitle className="font-display text-lg font-semibold">{request.title}</AlertDialogTitle>
          {request.description && <AlertDialogDescription className="text-sm leading-relaxed">{request.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {request.input && <label className="grid gap-1.5 text-left text-sm">
          <span className="font-medium">{request.input.label}</span>
          <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={request.input.placeholder} maxLength={300} className="h-10 rounded-xl" />
        </label>}
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
          <AlertDialogCancel type="button" className="mt-0 h-10 rounded-full">{request.cancelLabel ?? (fr() ? "Annuler" : "Cancel")}</AlertDialogCancel>
          <Button type="submit" autoFocus={!request.input} disabled={blocked} variant={danger ? "destructive" : "default"} className="h-10 rounded-full">{request.confirmLabel ?? (fr() ? "Continuer" : "Continue")}</Button>
        </AlertDialogFooter>
      </form>}
    </AlertDialogContent>
  </AlertDialog>;
}
