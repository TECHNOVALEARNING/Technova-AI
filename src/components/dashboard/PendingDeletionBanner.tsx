import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelAccountDeletion, getAccountDeletion } from "@/lib/account.functions";

/** Shown in the dashboard while the account is scheduled for deletion: one click cancels it. */
export function PendingDeletionBanner({ fr }: { fr: boolean }) {
  const load = useServerFn(getAccountDeletion);
  const cancel = useServerFn(cancelAccountDeletion);
  const [purgeAfter, setPurgeAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; load().then((r) => { if (live) setPurgeAfter(r?.purge_after ?? null); }).catch(() => {}); return () => { live = false; }; }, [load]);
  if (!purgeAfter) return null;
  const date = new Date(purgeAfter).toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  async function undo() {
    setBusy(true);
    try {
      await cancel();
      setPurgeAfter(null);
      toast.success(fr ? "Suppression annulée : votre compte est conservé." : "Deletion cancelled: your account is kept.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }
  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]">
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1">{fr ? `Votre compte sera supprimé définitivement le ${date}.` : `Your account will be deleted for good on ${date}.`}</span>
      <Button size="sm" variant="outline" disabled={busy} className="h-8 rounded-full" onClick={() => void undo()}>{fr ? "Annuler la suppression" : "Cancel deletion"}</Button>
    </div>
  );
}
