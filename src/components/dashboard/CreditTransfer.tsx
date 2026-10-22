import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Gift, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFindUser, adminTransferCredits, listCreditTransfers } from "@/lib/admin.functions";

type Found = { id: string; email: string; display_name: string; balance: number };
type Transfer = { id: string; to_user_id: string; amount: number; reason: string; created_at: string };
const MAX = 1000;

/** Admin: give credits to one account (created credits, 1 000 max per transfer). */
export function CreditTransfer({ fr }: { fr: boolean }) {
  const loc = fr ? "fr-FR" : "en-US";
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<Found | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // One key per intended transfer: a double click or a retry cannot credit twice.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [history, setHistory] = useState<Transfer[]>([]);
  const load = useCallback(() => { listCreditTransfers().then(setHistory).catch(() => setHistory([])); }, []);
  useEffect(load, [load]);

  const value = Number(amount);
  const valid = user && Number.isInteger(value) && value >= 1 && value <= MAX && reason.trim().length >= 3;

  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setNotice(""); setUser(null); setConfirming(false);
    try {
      const found = await adminFindUser({ data: { email } });
      if (found) setUser(found); else setNotice(fr ? "Aucun compte avec cet e-mail." : "No account with this e-mail.");
    } catch { setNotice(fr ? "Recherche impossible." : "Search failed."); }
    setBusy(false);
  }

  async function transfer() {
    if (!user || !valid) return;
    setBusy(true);
    try {
      const r = await adminTransferCredits({ data: { toUserId: user.id, amount: value, reason: reason.trim(), idempotencyKey: key } });
      const balance = r.new_balance ?? user.balance;
      toast.success(fr ? `${value} crédits transférés à ${user.email}.` : `${value} credits sent to ${user.email}.`);
      setUser({ ...user, balance });
      setAmount(""); setReason(""); setConfirming(false); setKey(crypto.randomUUID());
      load();
    } catch (e) { toast.error(String((e as Error)?.message ?? e)); }
    setBusy(false);
  }

  return <section className="mt-6">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Gift className="size-4" />{fr ? "Transférer des crédits" : "Transfer credits"}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{fr ? `Crédits offerts par TechNova, sans débit de votre solde. Maximum ${MAX} par transfert.` : `Credits granted by TechNova, not deducted from your balance. Max ${MAX} per transfer.`}</p>
    <div className="mt-3 rounded-2xl border border-border bg-card/90 p-4">
      <form onSubmit={(e) => void search(e)} className="flex gap-2">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={fr ? "E-mail de l'utilisateur" : "User e-mail"} aria-label={fr ? "E-mail de l'utilisateur" : "User e-mail"} />
        <Button type="submit" variant="outline" disabled={busy}><Search className="size-4" />{fr ? "Rechercher" : "Search"}</Button>
      </form>
      {notice && <p role="status" className="mt-2 text-sm text-muted-foreground">{notice}</p>}
      {user && <div className="mt-4 space-y-3">
        <p className="text-sm"><span className="font-medium">{user.display_name || user.email}</span> · {user.email} · {fr ? "solde" : "balance"} <strong>{user.balance.toLocaleString(loc)}</strong> {fr ? "crédits" : "credits"}</p>
        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <Input type="number" min={1} max={MAX} step={1} value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} placeholder={fr ? "Montant" : "Amount"} aria-label={fr ? "Montant" : "Amount"} />
          <Input value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setConfirming(false); }} placeholder={fr ? "Raison (obligatoire)" : "Reason (required)"} aria-label={fr ? "Raison" : "Reason"} />
        </div>
        {!confirming
          ? <Button disabled={!valid || busy} onClick={() => setConfirming(true)}>{fr ? "Transférer" : "Transfer"}</Button>
          : <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
              <span>{fr ? `Confirmer : ${value} crédits pour ${user.email} ?` : `Confirm: ${value} credits to ${user.email}?`}</span>
              <Button size="sm" disabled={busy} onClick={() => void transfer()}>{busy && <Loader2 className="size-4 animate-spin" />}{fr ? "Confirmer" : "Confirm"}</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            </div>}
      </div>}
    </div>
    {history.length > 0 && <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card/90">
      <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">{fr ? "Destinataire" : "Recipient"}</th><th className="p-3">{fr ? "Crédits" : "Credits"}</th><th className="p-3">{fr ? "Raison" : "Reason"}</th></tr></thead>
        <tbody>{history.map((t) => <tr key={t.id} className="border-t border-border"><td className="whitespace-nowrap p-3 text-xs">{new Date(t.created_at).toLocaleString(loc)}</td><td className="p-3 font-mono text-xs">{t.to_user_id.slice(0, 8)}…</td><td className="p-3">{t.amount.toLocaleString(loc)}</td><td className="p-3 text-xs">{t.reason}</td></tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
