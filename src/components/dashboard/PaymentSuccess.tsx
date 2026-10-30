import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { planLabels, type PlanKey } from "@/lib/plan-client";

// Confetti pieces: fixed angles and distances so the burst looks the same on every render.
const confetti = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.17;
  const distance = 110 + ((i * 37) % 70);
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 30, r: (i * 47) % 360, color: `var(--plan-${"abcd"[i % 4]})` };
});

/** "Payment successful" pop-up: ring, drawn tick and confetti in the colours of the pack just bought. */
export function PaymentSuccess({ open, pack, credits, lang, onClose }: { open: boolean; pack: string | null; credits: number | null; lang: "fr" | "en"; onClose: () => void }) {
  const fr = lang === "fr";
  const key: PlanKey = pack === "essential" || pack === "creator" || pack === "pro" || pack === "starter" ? pack : "starter";
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className={`plan-${key} overflow-hidden text-center sm:max-w-sm`}>
      <div className="relative mx-auto mt-4 grid size-24 place-items-center">
        {confetti.map((c, i) => <span key={i} className="pay-confetti" aria-hidden="true"
          style={{ ["--i" as string]: i, ["--x" as string]: `${c.x}px`, ["--y" as string]: `${c.y}px`, ["--r" as string]: `${c.r + 360}deg`, background: c.color }} />)}
        <span className="pay-success-halo absolute inset-0 rounded-full" aria-hidden="true" />
        <span className="pay-success-ring grid size-24 place-items-center rounded-full p-[3px]">
          <span className="grid size-full place-items-center rounded-full bg-background">
            <svg viewBox="0 0 24 24" className="size-11" aria-hidden="true"><path pathLength={1} className="pay-success-tick" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </span>
      </div>
      <DialogTitle className="mt-5 font-display text-2xl font-semibold">{fr ? "Paiement réussi" : "Payment successful"}</DialogTitle>
      <DialogDescription asChild>
        <div className="pay-success-count space-y-1">
          {credits ? <p className="font-display text-3xl font-semibold text-foreground tabular-nums">+{credits.toLocaleString(fr ? "fr-FR" : "en-US")}</p> : null}
          <p className="text-sm text-muted-foreground">{fr ? "crédits Technova ajoutés à votre solde" : "Technova credits added to your balance"}</p>
          <p className="pt-2 text-sm"><span className="text-muted-foreground">{fr ? "Forfait " : "Plan "}</span><span className="plan-chip-text font-semibold">{planLabels[key][lang]}</span><span className="text-muted-foreground">{fr ? " activé" : " activated"}</span></p>
        </div>
      </DialogDescription>
      <Button className="mt-4 w-full rounded-full" onClick={onClose}>{fr ? "Continuer" : "Continue"}</Button>
    </DialogContent>
  </Dialog>;
}
