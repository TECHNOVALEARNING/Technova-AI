import { useState } from "react";
import { Loader2, MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Suggestion box (profile menu): a message and/or a 1–5 star rating of the site, sent to the admin console
// (user_feedback, migration 0042: owner-only insert, 10 per day, read by the admin through service_role).

const labels = {
  fr: ["Très décevant", "Décevant", "Correct", "Très bien", "Excellent"],
  en: ["Very poor", "Poor", "Okay", "Very good", "Excellent"],
};

export function SuggestionBox({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (o: boolean) => void; lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = hover || rating;

  async function send() {
    if (!rating && message.trim().length < 3) { setError(fr ? "Donnez une note ou écrivez une suggestion." : "Give a rating or write a suggestion."); return; }
    setBusy(true); setError("");
    const { error: e } = await supabase.from("user_feedback").insert({ message: message.trim().slice(0, 4000), page: window.location.pathname.slice(0, 200), ...(rating ? { rating } : {}) });
    setBusy(false);
    if (e) {
      setError(e.message.includes("FEEDBACK_LIMIT") ? (fr ? "Vous avez déjà envoyé 10 suggestions aujourd'hui. Merci, réessayez demain." : "You already sent 10 suggestions today. Thank you, try again tomorrow.") : (fr ? "Envoi impossible pour le moment. Réessayez." : "Could not send right now. Try again."));
      return;
    }
    toast.success(fr ? "Merci ! Votre suggestion a bien été reçue." : "Thank you! Your suggestion was received.");
    setRating(0); setMessage(""); onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[480px] rounded-2xl sm:rounded-2xl">
      <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold"><MessageSquareHeart className="size-5 text-primary" />{fr ? "Boîte à suggestions" : "Suggestion box"}</DialogTitle>
      <DialogDescription className="text-[13px]">{fr ? "Une idée, un problème, un souhait ? Votre message arrive directement à l'équipe TechNova." : "An idea, a problem, a wish? Your message goes straight to the TechNova team."}</DialogDescription>
      <div>
        <p className="text-[12px] font-medium text-foreground/80">{fr ? "Votre note du site" : "Rate the site"}</p>
        <div className="mt-1.5 flex items-center gap-1" role="radiogroup" aria-label={fr ? "Note de 1 à 5 étoiles" : "Rating from 1 to 5 stars"} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} / 5 — ${labels[lang][n - 1]}`}
            onMouseEnter={() => setHover(n)} onClick={() => setRating(rating === n ? 0 : n)} className="rounded-md p-0.5 transition hover:scale-110">
            <Star className={cn("size-7 transition-colors", n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} strokeWidth={1.5} />
          </button>)}
          <span className="ml-2 text-[12.5px] text-muted-foreground">{shown ? labels[lang][shown - 1] : (fr ? "facultatif" : "optional")}</span>
        </div>
      </div>
      <label className="block space-y-1">
        <span className="text-[12px] font-medium text-foreground/80">{fr ? "Votre suggestion" : "Your suggestion"}</span>
        <textarea value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} className="min-h-[120px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
          placeholder={fr ? "Ex. : ajouter l'export en PDF des factures, une page plus claire pour…" : "E.g. add PDF export for invoices, a clearer page for…"} />
      </label>
      {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">{fr ? "Annuler" : "Cancel"}</button>
        <button type="button" disabled={busy} onClick={() => void send()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90 disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}{fr ? "Envoyer" : "Send"}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
