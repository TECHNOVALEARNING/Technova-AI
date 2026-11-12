import { upgradeFeatureOf, upgradeSentence } from "@/lib/plans";

// Readable reasons for a failed account connection (GitHub, Google Drive, Notion). Server functions throw
// CONNECT_<REASON>; the provider can also send back ?error=… on the return page.
const reasons: Record<string, { fr: string; en: string }> = {
  CONNECT_NOT_CONFIGURED: { fr: "Ce service n'est pas encore configuré sur TechNova (identifiants de l'application ou clé de chiffrement manquants côté serveur).", en: "This service is not configured on TechNova yet (app credentials or encryption key missing on the server)." },
  CONNECT_RATE_LIMITED: { fr: "Trop de tentatives de connexion. Réessayez dans une dizaine de minutes.", en: "Too many connection attempts. Try again in about ten minutes." },
  CONNECT_STATE_INVALID: { fr: "La demande a expiré ou ne correspond pas à votre session. Relancez la connexion depuis la page Connexions.", en: "The request expired or does not match your session. Start again from the Connections page." },
  CONNECT_EXCHANGE_FAILED: { fr: "Le service a refusé de finaliser la connexion (code expiré, secret de l'application incorrect ou adresse de retour différente).", en: "The service refused to finish the connection (expired code, wrong app secret or different return address)." },
  CONNECT_SIGNED_OUT: { fr: "Votre session TechNova n'est pas ouverte dans cette fenêtre. Connectez-vous puis relancez la connexion.", en: "Your TechNova session is not open in this window. Sign in, then start the connection again." },
  closed: { fr: "La fenêtre a été fermée avant la fin de l'autorisation.", en: "The window was closed before the authorization finished." },
  access_denied: { fr: "L'autorisation a été refusée sur le service.", en: "Authorization was declined on the service." },
  redirect_uri_mismatch: { fr: "L'adresse de retour déclarée dans l'application du service ne correspond pas à celle de TechNova.", en: "The return address registered in the service's app does not match TechNova's." },
};

export function connectErrorText(raw: string, fr: boolean): string {
  const feature = upgradeFeatureOf(raw);
  if (feature) return upgradeSentence(feature, fr);
  const key = Object.keys(reasons).find((k) => raw.includes(k));
  if (key) return reasons[key]![fr ? "fr" : "en"];
  return fr ? "La connexion n'a pas abouti." : "The connection did not complete.";
}
