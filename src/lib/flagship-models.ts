// Flagship models a Creator or Pro account can pick in the chat, under the four modes (Éclair, Équilibré,
// Expert, TechNova Smart). Client-safe list; the server re-checks the plan and bills the real cost reported by
// OpenRouter (usage.cost × 1 200), like custom agents. `name` is the key in openRouterModelIds; every entry
// comes from openrouter-catalog.ts, i.e. answered a provider.data_collection "deny" test request.
// Keep the list short (the selector must stay light) and update it when a newer flagship replaces one.

export type FlagshipModel = { name: string; label: string; fr: string; en: string; cost: 1 | 2 | 3 };

export const FLAGSHIP_MODELS: FlagshipModel[] = [
  { name: "GPT-6.1 Sol", label: "GPT-6.1 Sol", fr: "Polyvalent, raisonnement avancé", en: "Versatile, advanced reasoning", cost: 2 },
  { name: "Claude Opus 5.5", label: "Claude Opus 5.5", fr: "Le plus puissant pour l'écriture et le code", en: "The most capable for writing and code", cost: 3 },
  { name: "Claude Sonnet 5.5", label: "Claude Sonnet 5.5", fr: "Précis et efficace au quotidien", en: "Precise and efficient every day", cost: 2 },
  { name: "Gemini 3.8 Flash", label: "Gemini 3.8 Flash", fr: "Rapide, lit images et documents", en: "Fast, reads images and documents", cost: 1 },
  { name: "DeepSeek V4 Pro 0813", label: "DeepSeek V4 Pro", fr: "Fort en code, très économique", en: "Strong at code, very affordable", cost: 1 },
  { name: "Grok 4.7", label: "Grok 4.7", fr: "Vif et direct dans ses réponses", en: "Quick and direct answers", cost: 2 },
  { name: "Kimi K3.1 Pro", label: "Kimi K3.1 Pro", fr: "Excellent sur les longs documents", en: "Excellent on long documents", cost: 2 },
];

/** Creator (2) and Pro (3) only; Starter and Essential never see the list. */
export const FLAGSHIP_MIN_TIER = 2;

export const isFlagshipModel = (value: unknown): value is string => typeof value === "string" && FLAGSHIP_MODELS.some((m) => m.name === value);
export const flagshipLabel = (name: string) => FLAGSHIP_MODELS.find((m) => m.name === name)?.label ?? name;
