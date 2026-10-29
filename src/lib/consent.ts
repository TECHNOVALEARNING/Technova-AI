// Cookie and local-storage consent. Strictly necessary storage (sign-in session, security, this choice,
// actions you start such as a pending purchase) needs no consent. Preferences (language, theme, layout,
// models, currency, reminders) are only remembered once you accept them. TechNova uses no audience
// measurement and no advertising storage; those categories stay off until such a tool exists.

export type ConsentChoice = { v: 1; preferences: boolean; analytics: false; marketing: false; at: number };

export const CONSENT_KEY = "technova-consent";
/** A choice is kept 6 months, then asked again. */
export const CONSENT_MAX_AGE = 182 * 86_400_000;
export const CONSENT_EVENT = "technova:consent";
export const OPEN_CONSENT_EVENT = "technova:open-cookie-settings";

/** Browser-stored preferences, removed when preferences are refused. */
export const PREFERENCE_KEYS = [
  "technova-site-lang", "technova-dashboard-lang", "technova-dashboard-theme", "technova-sidebar-collapsed",
  "technova-currency", "technova-workspace-mode", "technova-workspace-model", "technova-image-model",
  "technova-video-model", "technova-chat-kbs", "tn-artifact-width", "technova-install-dismissed",
] as const;

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ConsentChoice;
    if (c?.v !== 1 || typeof c.at !== "number" || Date.now() - c.at > CONSENT_MAX_AGE) return null;
    return c;
  } catch { return null; }
}

export function saveConsent(preferences: boolean) {
  const choice: ConsentChoice = { v: 1, preferences, analytics: false, marketing: false, at: Date.now() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
    if (!preferences) for (const k of PREFERENCE_KEYS) window.localStorage.removeItem(k);
  } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export const preferencesAllowed = () => readConsent()?.preferences === true;

/** Remembers a preference only with consent; otherwise it lasts for this visit only. */
export function savePref(key: (typeof PREFERENCE_KEYS)[number], value: string) {
  if (!preferencesAllowed()) return;
  try { window.localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
