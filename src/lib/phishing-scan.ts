// Browser- and server-safe phishing checks for sites published or shared from TechNova.
// Published sites are static (no backend), so they never need to collect passwords, card
// numbers, PINs or wallet phrases: any such field, or a login page posing as a well-known
// brand, blocks publication.

type FileLike = { path: string; content: string };
export type PhishingReason = "credentials" | "card" | "pin" | "wallet" | "impersonation";
export type PhishingFinding = { path: string; reason: PhishingReason };

const FIELD = /<(?:input|textarea|select)\b[^>]*>/gi;
const isPassword = /\btype\s*=\s*["']?password\b/i;
const isCard = /\bautocomplete\s*=\s*["']?cc-(?:number|csc|exp)|\b(?:name|id|placeholder|aria-label)\s*=\s*["'][^"']*(?:card.?number|num[ée]ro\s+de\s+(?:la\s+)?carte|\bcvv\b|\bcvc\b|cryptogramme|security\s+code)/i;
const isPin = /\b(?:name|id|placeholder|aria-label)\s*=\s*["'][^"']*(?:\bpin\b|code\s+pin|code\s+secret|\botp\b|one.time|mot\s+de\s+passe|password)/i;
const isWallet = /\b(?:name|id|placeholder|aria-label)\s*=\s*["'][^"']*(?:seed|mnemonic|phrase\s+de\s+r[ée]cup[ée]ration|recovery\s+phrase|cl[ée]\s+priv[ée]e|private\s+key)/i;

const BRANDS = /\b(?:paypal|mtn|momo|orange\s+money|wave|moov|airtel|m-?pesa|flooz|t-?money|facebook|instagram|whatsapp|google|gmail|microsoft|outlook|office\s*365|apple|icloud|netflix|amazon|binance|coinbase|visa|mastercard|ecobank|uba|soci[ée]t[ée]\s+g[ée]n[ée]rale|western\s+union|moneygram|technova)\b/i;
const LOGIN = /\b(?:connectez-vous|se\s+connecter|identifiez-vous|sign\s+in|log\s*in|v[ée]rifie[zr]\s+votre\s+compte|verify\s+your\s+account|compte\s+(?:suspendu|bloqu[ée])|account\s+(?:suspended|locked)|confirmez\s+vos\s+informations|confirm\s+your\s+(?:identity|details))\b/i;

export function findPhishing(files: FileLike[]): PhishingFinding[] {
  const found: PhishingFinding[] = [];
  const add = (path: string, reason: PhishingReason) => { if (!found.some((f) => f.path === path && f.reason === reason)) found.push({ path, reason }); };
  for (const f of files) {
    if (!/\.(?:html?|js|jsx|tsx?|vue|svelte)$/i.test(f.path)) continue;
    for (const field of f.content.match(FIELD) ?? []) {
      if (isPassword.test(field)) add(f.path, "credentials");
      if (isCard.test(field)) add(f.path, "card");
      if (isPin.test(field)) add(f.path, "pin");
      if (isWallet.test(field)) add(f.path, "wallet");
    }
    // A page that names a bank, wallet or big platform AND asks visitors to log in or verify an account.
    const text = f.content.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
    if (BRANDS.test(text) && LOGIN.test(text)) add(f.path, "impersonation");
  }
  return found;
}

export const phishingMessage = (fr: boolean) => fr
  ? "Publication refusée : ce site demande des identifiants, un mot de passe, un code PIN, une carte bancaire ou se présente comme la page de connexion d'une marque connue. Les sites publiés avec TechNova ne peuvent pas collecter ces informations."
  : "Publishing refused: this site asks for credentials, a password, a PIN, a bank card or poses as a well-known brand's login page. Sites published with TechNova cannot collect this information.";
