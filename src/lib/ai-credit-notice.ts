import { confirmDialog } from "@/components/ConfirmHost";

// Before the first use of an AI assistant (Tableur, Créativité writing, PDF tables, background removal) in this tab:
// a white / black notice that the work uses a few credits, billed from what the model really used under TechNova's
// pricing (real provider cost × 1 200, a small minimum per request) — no fixed price is shown in the interface.
// The exact amount appears once the work is done; nothing is charged when it fails.

const acknowledged = new Set<string>();

export async function confirmAiCredits(kind: "sheet" | "design" | "pdf" | "background", lang: "fr" | "en"): Promise<boolean> {
  if (acknowledged.has(kind)) return true;
  const fr = lang === "fr";
  const what = {
    sheet: fr ? "L'assistant IA du tableur" : "The spreadsheet AI assistant",
    design: fr ? "La rédaction par l'IA" : "AI writing",
    pdf: fr ? "La lecture des tableaux d'un PDF par l'IA" : "Reading a PDF's tables with AI",
    background: fr ? "La suppression d'arrière-plan" : "Background removal",
  }[kind];
  const ok = await confirmDialog({
    title: fr ? "Cette action utilise vos crédits" : "This action uses your credits",
    description: fr
      ? `${what} consomme quelques crédits à chaque demande, selon le travail réellement effectué par le modèle et nos tarifs. Le nombre exact de crédits s'affiche une fois le travail terminé ; rien n'est débité si la demande échoue.`
      : `${what} uses a few credits per request, depending on the work the model really did and our pricing. The exact number of credits shows once the work is done; nothing is charged if the request fails.`,
    confirmLabel: fr ? "Continuer" : "Continue",
    cancelLabel: fr ? "Annuler" : "Cancel",
  });
  if (ok) acknowledged.add(kind);
  return ok;
}
