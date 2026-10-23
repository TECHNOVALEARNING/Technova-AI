// Content for the public Models, Blog, Docs and Developers pages (FR/EN).
// Source: the client's existing site (technovaaihub.vercel.app).

export type Cap = "chat" | "reasoning" | "coding" | "vision" | "image";

export type SiteModel = { name: string; id: string; provider: string; icon?: string; caps: Cap[]; context: string; speed: string; free?: boolean };

export const siteModels: SiteModel[] = [
  { name: "GPT-4o", id: "openai/gpt-4o", provider: "OpenAI", caps: ["chat", "reasoning", "vision"], context: "128K", speed: "122" },
  { name: "GPT-4o Mini", id: "openai/gpt-4o-mini", provider: "OpenAI", caps: ["chat", "vision", "coding"], context: "128K", speed: "180" },
  { name: "Claude 3.5 Sonnet", id: "anthropic/claude-3.5-sonnet", provider: "Anthropic", icon: "anthropic/d97757", caps: ["chat", "reasoning", "coding"], context: "200K", speed: "96" },
  { name: "DeepSeek R1", id: "deepseek/deepseek-r1-0528", provider: "DeepSeek", icon: "deepseek/4d6bfe", caps: ["reasoning", "coding", "chat"], context: "131K", speed: "88" },
  { name: "Gemini 2.5 Flash", id: "google/gemini-2.5-flash", provider: "Google", icon: "googlegemini/4285f4", caps: ["chat", "vision", "reasoning"], context: "1M", speed: "165" },
  { name: "DeepSeek V3 Chat", id: "deepseek/deepseek-chat", provider: "DeepSeek", icon: "deepseek/4d6bfe", caps: ["chat", "coding"], context: "131K", speed: "120" },
  { name: "Gemini 2.5 Pro", id: "google/gemini-2.5-pro", provider: "Google", icon: "googlegemini/4285f4", caps: ["chat", "vision", "reasoning"], context: "2M", speed: "110" },
  { name: "Claude 3.5 Haiku", id: "anthropic/claude-3.5-haiku", provider: "Anthropic", icon: "anthropic/d97757", caps: ["chat", "coding"], context: "200K", speed: "190" },
  { name: "Llama 3.3 70B", id: "meta-llama/llama-3.3-70b", provider: "Meta", icon: "meta/0866ff", caps: ["chat", "coding", "vision"], context: "128K", speed: "210" },
  { name: "Qwen 2.5 Coder 32B", id: "qwen/qwen-2.5-coder", provider: "Alibaba", icon: "alibabacloud/615ced", caps: ["chat", "coding"], context: "131K", speed: "160" },
  { name: "Llama 3.1 8B", id: "meta-llama/llama-3.1-8b:free", provider: "Meta", icon: "meta/0866ff", caps: ["chat"], context: "128K", speed: "190", free: true },
  { name: "Mistral Large 2411", id: "mistralai/mistral-large", provider: "Mistral AI", icon: "mistralai/ff7000", caps: ["chat", "coding", "reasoning"], context: "128K", speed: "175" },
  { name: "Gemma 2 9B", id: "google/gemma-2-9b:free", provider: "Google", icon: "googlegemini/4285f4", caps: ["chat"], context: "8K", speed: "180", free: true },
  { name: "FLUX 1.1 Pro", id: "black-forest-labs/flux-1.1-pro", provider: "Black Forest Labs", caps: ["image"], context: "—", speed: "—" },
  { name: "FLUX Schnell", id: "black-forest-labs/flux-schnell", provider: "Black Forest Labs", caps: ["image"], context: "—", speed: "—" },
];

type L = { fr: string; en: string };
export type Post = { cat: "compare" | "guides" | "models" | "marketing" | "law"; title: L; excerpt: L; url: string };

export const blogCats: Record<Post["cat"], L> = {
  compare: { fr: "Comparatifs", en: "Comparisons" },
  guides: { fr: "Guides", en: "Guides" },
  models: { fr: "Modèles", en: "Models" },
  marketing: { fr: "Marketing", en: "Marketing" },
  law: { fr: "Réglementation", en: "Regulation" },
};

export const posts: Post[] = [
  { cat: "compare", url: "https://blog-ia.com/chatgpt-vs-claude-vs-gemini-2026/", title: { fr: "ChatGPT vs Claude vs Gemini : lequel choisir en 2026 ?", en: "ChatGPT vs Claude vs Gemini: which one in 2026?" }, excerpt: { fr: "Le comparatif honnête des trois géants, métier par métier : rédaction, analyse, code et automatisation.", en: "An honest, job-by-job comparison of the three giants: writing, analysis, code and automation." } },
  { cat: "guides", url: "https://blog-ia.com/chatgpt-en-2026-ecosysteme/", title: { fr: "ChatGPT en 2026 : modèles, plans et écosystème complet", en: "ChatGPT in 2026: models, plans and the full ecosystem" }, excerpt: { fr: "GPT-5.6, ChatGPT Work, apps connectées et sept forfaits : comprendre l'écosystème avant de se lancer.", en: "GPT-5.6, ChatGPT Work, connected apps and seven plans: understand the ecosystem first." } },
  { cat: "guides", url: "https://blog-ia.com/maitriser-claude/", title: { fr: "Maîtriser Claude de A à Z : le guide complet", en: "Mastering Claude from A to Z" }, excerpt: { fr: "Quatorze guides progressifs : prompts, Projects, mémoire, fichiers, Claude Code, MCP et Skills.", en: "Fourteen step-by-step guides: prompts, Projects, memory, files, Claude Code, MCP and Skills." } },
  { cat: "marketing", url: "https://blog-ia.com/ia-seo/", title: { fr: "IA et SEO : ce qui marche, ce qui est risqué, ce qui est interdit", en: "AI and SEO: what works, what's risky, what's banned" }, excerpt: { fr: "Position officielle de Google, AI Overviews, GEO et bonnes pratiques pour un contenu assisté par IA.", en: "Google's official stance, AI Overviews, GEO and best practices for AI-assisted content." } },
  { cat: "law", url: "https://blog-ia.com/ai-act-declarer-ia/", title: { fr: "AI Act 2026 : votre site doit-il se déclarer IA ?", en: "AI Act 2026: must your site disclose AI?" }, excerpt: { fr: "Obligations de transparence, mentions à afficher et sanctions possibles pour les services en ligne.", en: "Transparency duties, required notices and possible penalties for online services." } },
  { cat: "law", url: "https://blog-ia.com/regulation-agents-ia/", title: { fr: "Régulation des agents IA : l'AI Act face aux règles chinoises", en: "Regulating AI agents: the AI Act vs Chinese rules" }, excerpt: { fr: "Comparatif des cadres européen et chinois pour les agents autonomes, et ce que cela change pour les éditeurs.", en: "European and Chinese frameworks for autonomous agents compared, and what it means for publishers." } },
  { cat: "models", url: "https://blog-ia.com/claude-opus-5-anthropic/", title: { fr: "Claude Opus 5 : la puissance haut de gamme à moitié prix", en: "Claude Opus 5: high-end power at half the price" }, excerpt: { fr: "Performances, tarifs par million de jetons et cas d'usage où le surcoût se justifie vraiment.", en: "Performance, price per million tokens and when the premium is truly worth it." } },
  { cat: "models", url: "https://blog-ia.com/kimi-k3-moonshot-ai/", title: { fr: "Kimi K3 : pourquoi Moonshot AI ouvre son modèle le plus puissant", en: "Kimi K3: why Moonshot AI opened its strongest model" }, excerpt: { fr: "Stratégie open weights, qualité réelle et impact sur les prix du marché des LLM.", en: "Open-weights strategy, real quality and the impact on LLM market prices." } },
  { cat: "guides", url: "https://blog-ia.com/custom-gpts-assistant-chatgpt-2026/", title: { fr: "Custom GPTs : créer un assistant spécialisé", en: "Custom GPTs: build a specialised assistant" }, excerpt: { fr: "Méthode pas à pas pour bâtir un assistant métier fiable, et quand préférer une API à un GPT public.", en: "A step-by-step method for a reliable business assistant, and when an API beats a public GPT." } },
  { cat: "law", url: "https://blog-ia.com/mode-ia-google/", title: { fr: "Aperçus IA et Mode IA Google : historique et confidentialité", en: "Google AI Overviews & AI Mode: history and privacy" }, excerpt: { fr: "Ce que Google enregistre quand vous utilisez le Mode IA, et comment reprendre la main sur vos données.", en: "What Google records when you use AI Mode, and how to take back control of your data." } },
];

export const codeSamples: { label: string; code: string }[] = [
  { label: "JavaScript", code: `const r = await fetch("https://api.technova.ai/api/ai/chat", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.TECHNOVA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "Résume ce devis." }],
    idempotency_key: crypto.randomUUID(),
  }),
});
const data = await r.json();` },
  { label: "Python", code: `import os, uuid, requests

r = requests.post(
    "https://api.technova.ai/api/ai/chat",
    headers={"Authorization": f"Bearer {os.environ['TECHNOVA_API_KEY']}"},
    json={
        "model": "anthropic/claude-haiku-4.5",
        "messages": [{"role": "user", "content": "Traduis en fon."}],
        "idempotency_key": str(uuid.uuid4()),
    },
    timeout=60,
)
print(r.json())` },
  { label: "PHP", code: `$ch = curl_init("https://api.technova.ai/api/ai/chat");
curl_setopt_array($ch, [
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . getenv("TECHNOVA_API_KEY"),
    "Content-Type: application/json",
  ],
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "model" => "openai/gpt-4o-mini",
    "messages" => [["role" => "user", "content" => "Bonjour"]],
    "idempotency_key" => bin2hex(random_bytes(16)),
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);` },
  { label: "cURL", code: `curl https://api.technova.ai/api/ai/chat \\
  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deepseek/deepseek-v3.1","messages":[{"role":"user","content":"Salut"}]}'` },
];
