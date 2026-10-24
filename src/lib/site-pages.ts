// Content for the public Models, Blog, Docs and Developers pages (FR/EN/ES/PT).
// Source: the client's existing site (technovaaihub.vercel.app).

type L = { fr: string; en: string; es: string; pt: string };
export type Post = { cat: "compare" | "guides" | "models" | "marketing" | "law"; title: L; excerpt: L; url: string };

export const blogCats: Record<Post["cat"], L> = {
  compare: { fr: "Comparatifs", en: "Comparisons", es: "Comparativas", pt: "Comparativos" },
  guides: { fr: "Guides", en: "Guides", es: "Guías", pt: "Guias" },
  models: { fr: "Modèles", en: "Models", es: "Modelos", pt: "Modelos" },
  marketing: { fr: "Marketing", en: "Marketing", es: "Marketing", pt: "Marketing" },
  law: { fr: "Réglementation", en: "Regulation", es: "Regulación", pt: "Regulamentação" },
};

export const posts: Post[] = [
  { cat: "compare", url: "https://blog-ia.com/chatgpt-vs-claude-vs-gemini-2026/", title: { fr: "ChatGPT vs Claude vs Gemini : lequel choisir en 2026 ?", en: "ChatGPT vs Claude vs Gemini: which one in 2026?", es: "ChatGPT vs Claude vs Gemini: ¿cuál elegir en 2026?", pt: "ChatGPT vs Claude vs Gemini: qual escolher em 2026?" }, excerpt: { fr: "Le comparatif honnête des trois géants, métier par métier : rédaction, analyse, code et automatisation.", en: "An honest, job-by-job comparison of the three giants: writing, analysis, code and automation.", es: "La comparativa honesta de los tres grandes asistentes: puntos fuertes, límites y precios.", pt: "O comparativo honesto dos três grandes assistentes: pontos fortes, limites e preços." } },
  { cat: "guides", url: "https://blog-ia.com/chatgpt-en-2026-ecosysteme/", title: { fr: "ChatGPT en 2026 : modèles, plans et écosystème complet", en: "ChatGPT in 2026: models, plans and the full ecosystem", es: "ChatGPT en 2026: modelos, planes y ecosistema completo", pt: "ChatGPT em 2026: modelos, planos e ecossistema completo" }, excerpt: { fr: "GPT-5.6, ChatGPT Work, apps connectées et sept forfaits : comprendre l'écosystème avant de se lancer.", en: "GPT-5.6, ChatGPT Work, connected apps and seven plans: understand the ecosystem first.", es: "Modelos, planes, aplicaciones conectadas y agentes: todo el ecosistema ChatGPT explicado.", pt: "Modelos, planos, apps conectados e agentes: todo o ecossistema ChatGPT explicado." } },
  { cat: "guides", url: "https://blog-ia.com/maitriser-claude/", title: { fr: "Maîtriser Claude de A à Z : le guide complet", en: "Mastering Claude from A to Z", es: "Dominar Claude de la A a la Z: la guía completa", pt: "Dominar o Claude de A a Z: o guia completo" }, excerpt: { fr: "Quatorze guides progressifs : prompts, Projects, mémoire, fichiers, Claude Code, MCP et Skills.", en: "Fourteen step-by-step guides: prompts, Projects, memory, files, Claude Code, MCP and Skills.", es: "Catorce guías progresivas: prompts, Projects, memoria, archivos y mucho más.", pt: "Catorze guias progressivos: prompts, Projects, memória, arquivos e muito mais." } },
  { cat: "marketing", url: "https://blog-ia.com/ia-seo/", title: { fr: "IA et SEO : ce qui marche, ce qui est risqué, ce qui est interdit", en: "AI and SEO: what works, what's risky, what's banned", es: "IA y SEO: lo que funciona, lo arriesgado y lo prohibido", pt: "IA e SEO: o que funciona, o que é arriscado e o que é proibido" }, excerpt: { fr: "Position officielle de Google, AI Overviews, GEO et bonnes pratiques pour un contenu assisté par IA.", en: "Google's official stance, AI Overviews, GEO and best practices for AI-assisted content.", es: "La posición oficial de Google, los AI Overviews y las buenas prácticas para no ser penalizado.", pt: "A posição oficial do Google, os AI Overviews e as boas práticas para não ser penalizado." } },
  { cat: "law", url: "https://blog-ia.com/ai-act-declarer-ia/", title: { fr: "AI Act 2026 : votre site doit-il se déclarer IA ?", en: "AI Act 2026: must your site disclose AI?", es: "AI Act 2026: ¿debe tu sitio declarar el uso de IA?", pt: "AI Act 2026: o seu site deve declarar o uso de IA?" }, excerpt: { fr: "Obligations de transparence, mentions à afficher et sanctions possibles pour les services en ligne.", en: "Transparency duties, required notices and possible penalties for online services.", es: "Obligaciones de transparencia, menciones obligatorias y sanciones previstas.", pt: "Obrigações de transparência, menções obrigatórias e sanções previstas." } },
  { cat: "law", url: "https://blog-ia.com/regulation-agents-ia/", title: { fr: "Régulation des agents IA : l'AI Act face aux règles chinoises", en: "Regulating AI agents: the AI Act vs Chinese rules", es: "Regulación de los agentes de IA: el AI Act frente a las normas chinas", pt: "Regulação dos agentes de IA: o AI Act frente às regras chinesas" }, excerpt: { fr: "Comparatif des cadres européen et chinois pour les agents autonomes, et ce que cela change pour les éditeurs.", en: "European and Chinese frameworks for autonomous agents compared, and what it means for publishers.", es: "Comparativa de los marcos europeo y chino para los agentes autónomos, y lo que cambia para los editores.", pt: "Comparativo dos quadros europeu e chinês para os agentes autônomos, e o que muda para os editores." } },
  { cat: "models", url: "https://blog-ia.com/claude-opus-5-anthropic/", title: { fr: "Claude Opus 5 : la puissance haut de gamme à moitié prix", en: "Claude Opus 5: high-end power at half the price", es: "Claude Opus 5: la potencia de gama alta a mitad de precio", pt: "Claude Opus 5: potência topo de linha pela metade do preço" }, excerpt: { fr: "Performances, tarifs par million de jetons et cas d'usage où le surcoût se justifie vraiment.", en: "Performance, price per million tokens and when the premium is truly worth it.", es: "Rendimiento, precios por millón de tokens y casos de uso.", pt: "Desempenho, preços por milhão de tokens e casos de uso." } },
  { cat: "models", url: "https://blog-ia.com/kimi-k3-moonshot-ai/", title: { fr: "Kimi K3 : pourquoi Moonshot AI ouvre son modèle le plus puissant", en: "Kimi K3: why Moonshot AI opened its strongest model", es: "Kimi K3: por qué Moonshot AI abre su modelo más potente", pt: "Kimi K3: por que a Moonshot AI abre o seu modelo mais poderoso" }, excerpt: { fr: "Stratégie open weights, qualité réelle et impact sur les prix du marché des LLM.", en: "Open-weights strategy, real quality and the impact on LLM market prices.", es: "Estrategia open weights, calidad y lo que significa para el mercado.", pt: "Estratégia open weights, qualidade e o que significa para o mercado." } },
  { cat: "guides", url: "https://blog-ia.com/custom-gpts-assistant-chatgpt-2026/", title: { fr: "Custom GPTs : créer un assistant spécialisé", en: "Custom GPTs: build a specialised assistant", es: "Custom GPTs: crear un asistente especializado", pt: "Custom GPTs: criar um assistente especializado" }, excerpt: { fr: "Méthode pas à pas pour bâtir un assistant métier fiable, et quand préférer une API à un GPT public.", en: "A step-by-step method for a reliable business assistant, and when an API beats a public GPT.", es: "Método paso a paso para construir un asistente a tu medida.", pt: "Método passo a passo para construir um assistente sob medida." } },
  { cat: "law", url: "https://blog-ia.com/mode-ia-google/", title: { fr: "Aperçus IA et Mode IA Google : historique et confidentialité", en: "Google AI Overviews & AI Mode: history and privacy", es: "AI Overviews y Modo IA de Google: historial y privacidad", pt: "AI Overviews e Modo IA do Google: histórico e privacidade" }, excerpt: { fr: "Ce que Google enregistre quand vous utilisez le Mode IA, et comment reprendre la main sur vos données.", en: "What Google records when you use AI Mode, and how to take back control of your data.", es: "Lo que Google registra cuando usas sus funciones de IA y cómo controlarlo.", pt: "O que o Google registra quando você usa as funções de IA e como controlar isso." } },
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
