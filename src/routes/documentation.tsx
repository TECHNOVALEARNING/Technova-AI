import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowRight, Boxes, Route as RouteIcon, BarChart3, ShieldCheck, Check, MessageCircle, FileText, Code2, Languages } from "lucide-react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Nav, Footer, PageHero, Heading, R, ActionText, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { CodeBlock } from "@/components/site/CodeBlock";
import type { SiteLang } from "@/lib/i18n";
import { codeSamples, useApiBase, withApiBase } from "@/lib/site-pages";

// Documentation and developer guide on one page: API reference, code examples, use cases and the
// production checklist (the former /developpeurs page redirects here).
export const Route = createFileRoute("/documentation")({
  head: () => pageHead({ path: "/documentation", title: "Documentation & API — TechNova AI Hub", description: "Démarrage rapide, exemples JavaScript, Python, PHP et cURL, authentification, chat completions, modèles, crédits, codes d'erreur et limites de l'API TechNova.", ogDescription: "Une seule clé API pour les meilleurs modèles d'IA : tout pour l'intégrer à votre produit, de la première requête à la production.", jsonLd: [breadcrumbLd("Documentation", "/documentation")] }),
  component: DocsPage,
});

type Sec = { id: string; title: string; body: string[]; code?: string; list?: string[] };

const docs: Record<SiteLang, { tag: string; title: string; sub: string; toc: string; sections: Sec[] }> = {
  fr: {
    tag: "Documentation", title: "Documentation TechNova AI", sub: "Tout ce qu'il faut pour brancher l'IA à votre produit : de la première requête à la mise en production.", toc: "Sur cette page",
    sections: [
      { id: "demarrage", title: "Démarrage rapide", body: ["Créez un compte, rechargez vos crédits Technova (Mobile Money ou carte), générez une clé API dans votre tableau de bord, rubrique API, puis envoyez votre première requête depuis votre serveur."], code: `curl __API_BASE__/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "Gemini 2.5 Flash",\n    "messages": [{ "role": "user", "content": "Bonjour Technova" }]\n  }'` },
      { id: "auth", title: "Authentification", body: ["Chaque appel se fait avec un jeton porteur. Une clé appartient à un seul compte et consomme les crédits de ce compte. Elle n'est affichée qu'une seule fois, à sa création : conservez-la dans une variable d'environnement. Ne l'exposez jamais dans un navigateur ou une application mobile : appelez l'API depuis votre serveur.", "En cas de fuite, supprimez la clé depuis le tableau de bord et créez-en une nouvelle."], code: "Authorization: Bearer tn_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["Un seul point d'entrée, POST /api/ai/chat, pour tous les modèles de texte. Champs acceptés : model, messages (rôles system, user et assistant, 60 messages au plus), max_tokens (1 à 4 096), temperature (0 à 2) et idempotency_key.", "La réponse suit le format chat.completion : le texte généré dans choices[0].message.content et, dans usage, les tokens consommés ainsi que les crédits exacts débités. Répéter la même idempotency_key renvoie la réponse d'origine sans facturer une seconde fois. Les réponses sont renvoyées en une fois (pas de streaming)."], code: `POST /api/ai/chat\n{\n  "model": "Claude Sonnet 5",\n  "messages": [\n    { "role": "system", "content": "Tu es un assistant commercial." },\n    { "role": "user", "content": "Rédige une relance client." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "idempotency_key": "<uuid>"\n}\n\n→ 200\n{\n  "object": "chat.completion",\n  "choices": [{ "message": { "role": "assistant", "content": "…" } }],\n  "usage": { "prompt_tokens": 42, "completion_tokens": 180, "credits": 3 }\n}` },
      { id: "modeles", title: "Modèles disponibles", body: ["Le champ model accepte le nom affiché sur la page Modèles, par exemple « GPT-4o Mini », « Claude Sonnet 5 », « Gemini 2.5 Flash » ou « DeepSeek V3 ». Un modèle inconnu renvoie l'erreur model_not_available avec la liste des modèles acceptés.", "L'API couvre les modèles de texte et de code. Les images, vidéos et musiques se génèrent depuis l'interface TechNova."] },
      { id: "credits", title: "Crédits & facturation", body: ["L'unité de facturation est le crédit Technova. Chaque réponse est facturée selon les tokens réellement consommés et le tarif du modèle ; une requête qui échoue ne coûte rien."], list: ["1 crédit ≈ 1 FCFA de valeur d'usage.", "Les crédits n'expirent pas et sont communs à toute la plateforme.", "Le détail de chaque requête est visible dans la rubrique Utilisation du tableau de bord, avec export CSV."] },
      { id: "erreurs", title: "Codes d'erreur", body: ["Les erreurs sont renvoyées sous la forme { \"error\": { \"code\", \"message\" } }. Traitez-les explicitement."], list: ["invalid_api_key (401) — clé absente ou invalide.", "insufficient_credits (402) — solde insuffisant, proposez une recharge.", "model_not_available (400) — modèle inconnu.", "invalid_request (400) — requête mal formée ; le message précise le champ en cause.", "rate_limited (429) — trop de requêtes, réessayez après une pause.", "upstream_error (502) — le modèle n'a pas pu répondre, aucun crédit n'est débité."] },
      { id: "limites", title: "Limites", body: ["Par défaut : 60 requêtes par minute et par compte, 60 messages par requête, 40 000 caractères par message et 4 096 tokens de réponse au plus. Besoin de limites plus élevées ? Écrivez-nous."] },
      { id: "paiements", title: "Recharge des crédits", body: ["La recharge se fait depuis le tableau de bord, par Mobile Money (MTN, Moov, Orange Money, Wave) ou par carte bancaire, via notre partenaire de paiement sécurisé. Les crédits ne sont ajoutés qu'après la confirmation du paiement par ce partenaire, jamais depuis le navigateur."] },
    ],
  },
  en: {
    tag: "Docs", title: "TechNova AI Documentation", sub: "Everything you need to plug AI into your product, from first request to production.", toc: "On this page",
    sections: [
      { id: "demarrage", title: "Quick start", body: ["Create an account, top up your Technova credits (Mobile Money or card), generate an API key in the API section of your dashboard, then send your first request from your server."], code: `curl __API_BASE__/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "Gemini 2.5 Flash",\n    "messages": [{ "role": "user", "content": "Hello Technova" }]\n  }'` },
      { id: "auth", title: "Authentication", body: ["Every call uses a bearer token. A key belongs to one account and spends that account's credits. It is shown only once, when created: keep it in an environment variable. Never expose it in a browser or mobile app: call the API from your server.", "If a key leaks, delete it from the dashboard and create a new one."], code: "Authorization: Bearer tn_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["One endpoint, POST /api/ai/chat, for every text model. Accepted fields: model, messages (system, user and assistant roles, 60 messages max), max_tokens (1 to 4,096), temperature (0 to 2) and idempotency_key.", "The response follows the chat.completion format: the generated text in choices[0].message.content and, in usage, the tokens used and the exact credits charged. Repeating an idempotency_key returns the original response without charging again. Responses are returned in one piece (no streaming)."], code: `POST /api/ai/chat\n{\n  "model": "Claude Sonnet 5",\n  "messages": [\n    { "role": "system", "content": "You are a sales assistant." },\n    { "role": "user", "content": "Write a follow-up email." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "idempotency_key": "<uuid>"\n}\n\n→ 200\n{\n  "object": "chat.completion",\n  "choices": [{ "message": { "role": "assistant", "content": "…" } }],\n  "usage": { "prompt_tokens": 42, "completion_tokens": 180, "credits": 3 }\n}` },
      { id: "modeles", title: "Available models", body: ["The model field accepts the name shown on the Models page, for example \"GPT-4o Mini\", \"Claude Sonnet 5\", \"Gemini 2.5 Flash\" or \"DeepSeek V3\". An unknown model returns model_not_available with the list of accepted models.", "The API covers text and code models. Images, videos and music are generated from the TechNova app."] },
      { id: "credits", title: "Credits & billing", body: ["The billing unit is the Technova credit. Each response is charged for the tokens actually used at the model's rate; a failed request costs nothing."], list: ["1 credit ≈ 1 FCFA of usage value.", "Credits never expire and are shared across the whole platform.", "Every request is listed in the Usage section of the dashboard, with CSV export."] },
      { id: "erreurs", title: "Error codes", body: ["Errors are returned as { \"error\": { \"code\", \"message\" } }. Handle them explicitly."], list: ["invalid_api_key (401) — missing or invalid key.", "insufficient_credits (402) — balance too low, offer a top-up.", "model_not_available (400) — unknown model.", "invalid_request (400) — malformed request; the message names the field.", "rate_limited (429) — too many requests, retry after a pause.", "upstream_error (502) — the model could not answer, no credits charged."] },
      { id: "limites", title: "Limits", body: ["By default: 60 requests per minute per account, 60 messages per request, 40,000 characters per message and 4,096 response tokens max. Need higher limits? Contact us."] },
      { id: "paiements", title: "Topping up credits", body: ["Top up from the dashboard with Mobile Money (MTN, Moov, Orange Money, Wave) or a bank card, through our secure payment partner. Credits are added only after the partner confirms the payment, never from the browser."] },
    ],
  },
  es: {
    tag: "Documentación", title: "Documentación de TechNova AI", sub: "Todo lo necesario para conectar la IA a tu producto, de la primera solicitud a la producción.", toc: "En esta página",
    sections: [
      { id: "demarrage", title: "Inicio rápido", body: ["Crea una cuenta, recarga tus créditos Technova (Mobile Money o tarjeta), genera una clave API en la sección API de tu panel y envía tu primera solicitud desde tu servidor."], code: `curl __API_BASE__/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "Gemini 2.5 Flash",\n    "messages": [{ "role": "user", "content": "Hola Technova" }]\n  }'` },
      { id: "auth", title: "Autenticación", body: ["Cada llamada usa un token portador. Una clave pertenece a una sola cuenta y consume sus créditos. Solo se muestra una vez, al crearla: guárdala en una variable de entorno. No la expongas nunca en un navegador o una app móvil: llama a la API desde tu servidor.", "Si una clave se filtra, elimínala desde el panel y crea una nueva."], code: "Authorization: Bearer tn_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["Un único punto de entrada, POST /api/ai/chat, para todos los modelos de texto. Campos aceptados: model, messages (roles system, user y assistant, 60 mensajes como máximo), max_tokens (1 a 4.096), temperature (0 a 2) e idempotency_key.", "La respuesta sigue el formato chat.completion: el texto generado en choices[0].message.content y, en usage, los tokens consumidos y los créditos exactos cobrados. Repetir la misma idempotency_key devuelve la respuesta original sin volver a cobrar. Las respuestas se devuelven de una vez (sin streaming)."], code: `POST /api/ai/chat\n{\n  "model": "Claude Sonnet 5",\n  "messages": [\n    { "role": "system", "content": "Eres un asistente comercial." },\n    { "role": "user", "content": "Redacta un recordatorio al cliente." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "idempotency_key": "<uuid>"\n}\n\n→ 200\n{\n  "object": "chat.completion",\n  "choices": [{ "message": { "role": "assistant", "content": "…" } }],\n  "usage": { "prompt_tokens": 42, "completion_tokens": 180, "credits": 3 }\n}` },
      { id: "modeles", title: "Modelos disponibles", body: ["El campo model acepta el nombre que aparece en la página Modelos, por ejemplo «GPT-4o Mini», «Claude Sonnet 5», «Gemini 2.5 Flash» o «DeepSeek V3». Un modelo desconocido devuelve model_not_available con la lista de modelos aceptados.", "La API cubre los modelos de texto y código. Las imágenes, vídeos y música se generan desde la aplicación TechNova."] },
      { id: "credits", title: "Créditos y facturación", body: ["La unidad de facturación es el crédito Technova. Cada respuesta se cobra según los tokens realmente consumidos y la tarifa del modelo; una solicitud fallida no cuesta nada."], list: ["1 crédito ≈ 1 FCFA de valor de uso.", "Los créditos no caducan y se comparten en toda la plataforma.", "Cada solicitud aparece en la sección Uso del panel, con exportación CSV."] },
      { id: "erreurs", title: "Códigos de error", body: ["Los errores se devuelven como { \"error\": { \"code\", \"message\" } }. Trátalos de forma explícita."], list: ["invalid_api_key (401) — clave ausente o no válida.", "insufficient_credits (402) — saldo insuficiente, propón una recarga.", "model_not_available (400) — modelo desconocido.", "invalid_request (400) — solicitud mal formada; el mensaje indica el campo.", "rate_limited (429) — demasiadas solicitudes, reintenta tras una pausa.", "upstream_error (502) — el modelo no pudo responder, no se cobra ningún crédito."] },
      { id: "limites", title: "Límites", body: ["Por defecto: 60 solicitudes por minuto y por cuenta, 60 mensajes por solicitud, 40.000 caracteres por mensaje y 4.096 tokens de respuesta como máximo. ¿Necesitas límites más altos? Escríbenos."] },
      { id: "paiements", title: "Recarga de créditos", body: ["La recarga se hace desde el panel, con Mobile Money (MTN, Moov, Orange Money, Wave) o tarjeta bancaria, a través de nuestro socio de pago seguro. Los créditos solo se añaden tras la confirmación del pago por ese socio, nunca desde el navegador."] },
    ],
  },
  pt: {
    tag: "Documentação", title: "Documentação da TechNova AI", sub: "Tudo o que é preciso para ligar a IA ao seu produto, da primeira solicitação à produção.", toc: "Nesta página",
    sections: [
      { id: "demarrage", title: "Início rápido", body: ["Crie uma conta, recarregue seus créditos Technova (Mobile Money ou cartão), gere uma chave de API na seção API do painel e envie sua primeira solicitação a partir do seu servidor."], code: `curl __API_BASE__/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "Gemini 2.5 Flash",\n    "messages": [{ "role": "user", "content": "Olá Technova" }]\n  }'` },
      { id: "auth", title: "Autenticação", body: ["Cada chamada usa um token de portador. Uma chave pertence a uma única conta e consome os créditos dessa conta. Ela só é exibida uma vez, na criação: guarde-a numa variável de ambiente. Nunca a exponha num navegador ou app móvel: chame a API a partir do seu servidor.", "Em caso de vazamento, exclua a chave no painel e crie uma nova."], code: "Authorization: Bearer tn_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["Um único ponto de entrada, POST /api/ai/chat, para todos os modelos de texto. Campos aceitos: model, messages (papéis system, user e assistant, 60 mensagens no máximo), max_tokens (1 a 4.096), temperature (0 a 2) e idempotency_key.", "A resposta segue o formato chat.completion: o texto gerado em choices[0].message.content e, em usage, os tokens consumidos e os créditos exatos cobrados. Repetir a mesma idempotency_key devolve a resposta original sem cobrar de novo. As respostas são devolvidas de uma vez (sem streaming)."], code: `POST /api/ai/chat\n{\n  "model": "Claude Sonnet 5",\n  "messages": [\n    { "role": "system", "content": "Você é um assistente comercial." },\n    { "role": "user", "content": "Escreva um lembrete ao cliente." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "idempotency_key": "<uuid>"\n}\n\n→ 200\n{\n  "object": "chat.completion",\n  "choices": [{ "message": { "role": "assistant", "content": "…" } }],\n  "usage": { "prompt_tokens": 42, "completion_tokens": 180, "credits": 3 }\n}` },
      { id: "modeles", title: "Modelos disponíveis", body: ["O campo model aceita o nome exibido na página Modelos, por exemplo «GPT-4o Mini», «Claude Sonnet 5», «Gemini 2.5 Flash» ou «DeepSeek V3». Um modelo desconhecido devolve model_not_available com a lista de modelos aceitos.", "A API cobre os modelos de texto e código. Imagens, vídeos e músicas são gerados no aplicativo TechNova."] },
      { id: "credits", title: "Créditos e faturamento", body: ["A unidade de faturamento é o crédito Technova. Cada resposta é cobrada pelos tokens realmente consumidos e pela tarifa do modelo; uma solicitação que falha não custa nada."], list: ["1 crédito ≈ 1 FCFA de valor de uso.", "Os créditos não expiram e valem para toda a plataforma.", "Cada solicitação aparece na seção Uso do painel, com exportação CSV."] },
      { id: "erreurs", title: "Códigos de erro", body: ["Os erros são devolvidos como { \"error\": { \"code\", \"message\" } }. Trate-os explicitamente."], list: ["invalid_api_key (401) — chave ausente ou inválida.", "insufficient_credits (402) — saldo insuficiente, proponha uma recarga.", "model_not_available (400) — modelo desconhecido.", "invalid_request (400) — solicitação malformada; a mensagem indica o campo.", "rate_limited (429) — solicitações demais, tente de novo após uma pausa.", "upstream_error (502) — o modelo não conseguiu responder, nenhum crédito é cobrado."] },
      { id: "limites", title: "Limites", body: ["Por padrão: 60 solicitações por minuto por conta, 60 mensagens por solicitação, 40.000 caracteres por mensagem e 4.096 tokens de resposta no máximo. Precisa de limites maiores? Fale conosco."] },
      { id: "paiements", title: "Recarga de créditos", body: ["A recarga é feita no painel, com Mobile Money (MTN, Moov, Orange Money, Wave) ou cartão bancário, por meio do nosso parceiro de pagamento seguro. Os créditos só são adicionados após a confirmação do pagamento por esse parceiro, nunca pelo navegador."] },
    ],
  },
};

const devTxt = {
  fr: {
    bpToc: "Mise en production", tag: "Développeurs", title: "Une API. Des possibilités infinies.", sub: "Une seule clé TechNova pour intégrer GPT, Claude, Gemini, DeepSeek et les meilleurs modèles de texte et de code à vos produits, facturés en crédits.", docs: "Lire la documentation", models: "Voir les modèles",
    stats: ["Une seule clé API", "15 modèles de texte", "Facturation au token", "Clés hachées et révocables"],
    exTag: "Exemples", exTitle: "Votre première requête.",
    feTag: "Expérience développeur", feTitle: "Pensée pour les développeurs.",
    features: [["Une seule API", "Le même format de requête pour tous les modèles de texte."], ["Coût transparent", "Chaque réponse indique les crédits exacts débités."], ["Suivi d'usage", "Requêtes, tokens et crédits par modèle dans votre tableau de bord."], ["Clés protégées", "Clés stockées sous forme hachée, révocables à tout moment."]],
    reTag: "Cas d'usage", reTitle: "Recettes prêtes à copier.",
    recipes: [["Assistant client WhatsApp", "Branchez votre webhook WhatsApp sur /api/ai/chat et gardez l'historique côté serveur."], ["Résumé de documents", "Découpez le texte en blocs de 4 000 jetons, résumez chaque bloc puis fusionnez les résumés."], ["Génération de code", "Utilisez un modèle spécialisé avec temperature 0.2 pour des sorties déterministes."], ["Traduction locale", "Français, anglais, fon, yoruba, wolof : précisez la langue cible dans le message système."]],
    bpTitle: "À vérifier avant la mise en production.",
    bp: ["Appelez l'API depuis votre serveur, jamais depuis le navigateur.", "Envoyez une idempotency_key par requête pour ne jamais payer deux fois.", "Gérez INSUFFICIENT_CREDITS en proposant un rechargement Mobile Money.", "Prévoyez un repli sur un modèle plus léger en cas d'indisponibilité.", "Surveillez votre consommation depuis le tableau de bord."],
    stTitle: "Limites de l'API.", status: [["Requêtes", "60 par minute"], ["Messages par requête", "60 maximum"], ["Longueur de réponse", "4 096 tokens maximum"]],
    ctaT: "Construisez le futur avec l'IA.", ctaS: "Un compte. Des centaines de modèles. Une API puissante.", cta: "Commencer gratuitement",
  },
  en: {
    bpToc: "Going to production", tag: "Developers", title: "One API. Infinite possibilities.", sub: "One TechNova key to bring GPT, Claude, Gemini, DeepSeek and the best text and code models into your products, billed in credits.", docs: "Read the docs", models: "Explore models",
    stats: ["One API key", "15 text models", "Per-token billing", "Hashed, revocable keys"],
    exTag: "Examples", exTitle: "Your first request.",
    feTag: "Developer experience", feTitle: "Built for developers.",
    features: [["One API", "The same request format for every text model."], ["Transparent cost", "Every response states the exact credits charged."], ["Usage tracking", "Requests, tokens and credits per model in your dashboard."], ["Protected keys", "Keys stored hashed, revocable at any time."]],
    reTag: "Use cases", reTitle: "Copy-ready recipes.",
    recipes: [["WhatsApp support assistant", "Connect your WhatsApp webhook to /api/ai/chat and keep history server-side."], ["Document summaries", "Split text into 4,000-token chunks, summarise each, then merge the summaries."], ["Code generation", "Use a specialised model with temperature 0.2 for deterministic output."], ["Local translation", "French, English, Fon, Yoruba, Wolof: set the target language in the system message."]],
    bpTitle: "Check before going to production.",
    bp: ["Call the API from your server, never from the browser.", "Send one idempotency_key per request so you never pay twice.", "Handle INSUFFICIENT_CREDITS by offering a Mobile Money top-up.", "Plan a fallback to a lighter model during outages.", "Monitor usage from the dashboard."],
    stTitle: "API limits.", status: [["Requests", "60 per minute"], ["Messages per request", "60 max"], ["Response length", "4,096 tokens max"]],
    ctaT: "Build the future with AI.", ctaS: "One account. Hundreds of models. One powerful API.", cta: "Start for free",
  },
  es: {
    bpToc: "Paso a producción", tag: "Desarrolladores", title: "Una API. Posibilidades infinitas.", sub: "Una sola clave TechNova para integrar GPT, Claude, Gemini, DeepSeek y los mejores modelos de texto y código en tus productos, facturados en créditos.", docs: "Leer la documentación", models: "Ver los modelos",
    stats: ["Una sola clave API", "15 modelos de texto", "Facturación por token", "Claves cifradas y revocables"],
    exTag: "Ejemplos", exTitle: "Tu primera solicitud.",
    feTag: "Experiencia del desarrollador", feTitle: "Pensada para desarrolladores.",
    features: [["Una sola API", "El mismo formato de petición para todos los modelos de texto."], ["Coste transparente", "Cada respuesta indica los créditos exactos cobrados."], ["Seguimiento de uso", "Peticiones, tokens y créditos por modelo en tu panel."], ["Claves protegidas", "Claves guardadas cifradas, revocables en cualquier momento."]],
    reTag: "Casos de uso", reTitle: "Recetas listas para copiar.",
    recipes: [["Asistente de clientes en WhatsApp", "Conecta tu webhook de WhatsApp a /api/ai/chat y guarda el historial en el servidor."], ["Resumen de documentos", "Divide el texto en bloques de 4.000 tokens, resume cada bloque y luego fusiona los resúmenes."], ["Generación de código", "Usa un modelo especializado con temperature 0.2 para obtener salidas deterministas."], ["Traducción local", "Francés, inglés, fon, yoruba, wolof: indica el idioma de destino en el mensaje de sistema."]],
    bpTitle: "Revisa esto antes de pasar a producción.",
    bp: ["Llama a la API desde tu servidor, nunca desde el navegador.", "Envía una idempotency_key por solicitud para no pagar nunca dos veces.", "Gestiona INSUFFICIENT_CREDITS proponiendo una recarga con Mobile Money.", "Prevé un modelo más ligero de respaldo en caso de indisponibilidad.", "Supervisa tu consumo desde el panel."],
    stTitle: "Límites de la API.", status: [["Peticiones", "60 por minuto"], ["Mensajes por petición", "60 como máximo"], ["Longitud de respuesta", "4.096 tokens como máximo"]],
    ctaT: "Construye el futuro con IA.", ctaS: "Una cuenta. Cientos de modelos. Una API potente.", cta: "Empezar gratis",
  },
  pt: {
    bpToc: "Ida para produção", tag: "Desenvolvedores", title: "Uma API. Possibilidades infinitas.", sub: "Uma única chave TechNova para integrar GPT, Claude, Gemini, DeepSeek e os melhores modelos de texto e código aos seus produtos, cobrados em créditos.", docs: "Ler a documentação", models: "Ver os modelos",
    stats: ["Uma única chave de API", "15 modelos de texto", "Cobrança por token", "Chaves protegidas e revogáveis"],
    exTag: "Exemplos", exTitle: "Sua primeira solicitação.",
    feTag: "Experiência do desenvolvedor", feTitle: "Pensada para desenvolvedores.",
    features: [["Uma única API", "O mesmo formato de requisição para todos os modelos de texto."], ["Custo transparente", "Cada resposta indica os créditos exatos cobrados."], ["Acompanhamento de uso", "Requisições, tokens e créditos por modelo no seu painel."], ["Chaves protegidas", "Chaves guardadas de forma protegida, revogáveis a qualquer momento."]],
    reTag: "Casos de uso", reTitle: "Receitas prontas para copiar.",
    recipes: [["Assistente de clientes no WhatsApp", "Ligue o seu webhook do WhatsApp a /api/ai/chat e mantenha o histórico no servidor."], ["Resumo de documentos", "Divida o texto em blocos de 4.000 tokens, resuma cada bloco e depois junte os resumos."], ["Geração de código", "Use um modelo especializado com temperature 0.2 para saídas determinísticas."], ["Tradução local", "Francês, inglês, fon, iorubá, wolof: indique o idioma de destino na mensagem de sistema."]],
    bpTitle: "Verifique antes de ir para produção.",
    bp: ["Chame a API a partir do seu servidor, nunca do navegador.", "Envie uma idempotency_key por solicitação para nunca pagar duas vezes.", "Trate INSUFFICIENT_CREDITS propondo uma recarga com Mobile Money.", "Preveja um modelo mais leve como alternativa em caso de indisponibilidade.", "Acompanhe o seu consumo no painel."],
    stTitle: "Limites da API.", status: [["Requisições", "60 por minuto"], ["Mensagens por requisição", "60 no máximo"], ["Tamanho da resposta", "4.096 tokens no máximo"]],
    ctaT: "Construa o futuro com IA.", ctaS: "Uma conta. Centenas de modelos. Uma API poderosa.", cta: "Começar grátis",
  },
};

const featureIcons = [Boxes, RouteIcon, BarChart3, ShieldCheck];
const recipeIcons = [MessageCircle, FileText, Code2, Languages];

function DocCard({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[28px] border border-border bg-card p-6 shadow-soft md:p-8">
      <span className="font-display text-xs font-semibold text-muted-foreground">{String(n).padStart(2, "0")}</span>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function DocsPage() {
  const [lang, setLang] = useSiteLang();
  const d = docs[lang];
  const t = devTxt[lang];
  const apiBase = useApiBase();
  const [tab, setTab] = useState(0);
  useReveal();

  const examples = (
    <>
      <div className="mt-5 mb-3 flex flex-wrap gap-2">
        {codeSamples.map((c, i) => <button key={c.label} type="button" onClick={() => setTab(i)} className={`rounded-full px-4 py-2 text-sm transition ${tab === i ? "bg-ink text-ink-foreground shadow-soft" : "border border-border text-muted-foreground hover:text-foreground"}`}>{c.label}</button>)}
      </div>
      <CodeBlock code={withApiBase(codeSamples[tab]!.code, apiBase)} label={`POST /api/ai/chat · ${codeSamples[tab]!.label}`} />
    </>
  );
  const recipes = (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {t.recipes.map(([h, p], i) => { const I = recipeIcons[i]!; return (
        <div key={h} className="flex gap-3 rounded-[20px] border border-border p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-secondary"><I className="size-4" /></div>
          <div><h3 className="font-display font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{p}</p></div>
        </div>
      ); })}
    </div>
  );
  const checklist = <ul className="mt-5 space-y-3">{t.bp.map((b) => <li key={b} className="flex gap-3 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground"><Check className="size-3" /></span>{b}</li>)}</ul>;

  // Reference sections in reading order, with the code examples after the quick start and the
  // use cases and production checklist at the end.
  const blocks: { id: string; title: string; body: ReactNode }[] = [];
  for (const s of d.sections) {
    blocks.push({ id: s.id, title: s.title, body: <>
      {s.body.map((b) => <p key={b} className="mt-3 leading-relaxed text-muted-foreground">{b}</p>)}
      {s.list && <ul className="mt-4 space-y-2">{s.list.map((l) => <li key={l} className="flex gap-2 text-sm"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-iris" /><span>{l}</span></li>)}</ul>}
      {s.code && <div className="mt-5"><CodeBlock code={withApiBase(s.code, apiBase)} /></div>}
    </> });
    if (s.id === "demarrage") blocks.push({ id: "exemples", title: t.exTag, body: <><p className="mt-3 leading-relaxed text-muted-foreground">{t.exTitle}</p>{examples}</> });
  }
  blocks.push({ id: "cas-usage", title: t.reTag, body: <><p className="mt-3 leading-relaxed text-muted-foreground">{t.reTitle}</p>{recipes}</> });
  blocks.push({ id: "production", title: t.bpToc, body: <><p className="mt-3 leading-relaxed text-muted-foreground">{t.bpTitle}</p>{checklist}</> });

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav lang={lang} setLang={setLang} />
      <PageHero tag={d.tag} title={d.title} sub={`${t.sub} ${d.sub}`}>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light px-6 py-3 text-sm font-semibold"><a href="#demarrage"><ActionText>{d.sections[0]!.title}</ActionText><ArrowRight className="size-4" /></a></Button>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-glass px-6 py-3 text-sm"><Link to="/modeles"><ActionText>{t.models}</ActionText></Link></Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">{t.stats.map((s) => <span key={s} className="rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-3 py-1 text-xs text-ink-foreground/75">{s}</span>)}</div>
      </PageHero>

      <section className="px-4 pt-10">
        <Heading tag={t.feTag} title={t.feTitle} />
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.map(([h, p], i) => { const I = featureIcons[i]!; return (
            <R key={h} delay={i * 60}><div className="h-full rounded-[26px] bg-ink p-6 text-ink-foreground shadow-lift">
              <div className="grid size-11 place-items-center rounded-[14px] border border-ink-foreground/15 bg-ink-foreground/10"><I className="size-5" /></div>
              <h3 className="mt-5 font-display text-lg font-semibold">{h}</h3><p className="mt-2 text-sm text-ink-foreground/65">{p}</p>
            </div></R>
          ); })}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-[22px] border border-border bg-card p-4 shadow-soft">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{d.toc}</p>
            {blocks.map((s) => <a key={s.id} href={`#${s.id}`} className="block rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground">{s.title}</a>)}
          </nav>
        </aside>
        <div className="min-w-0 space-y-6">
          {blocks.map((s, i) => <DocCard key={s.id} id={s.id} n={i + 1} title={s.title}>{s.body}</DocCard>)}
        </div>
      </div>

      <section className="px-4 pb-12">
        <R className="mx-auto max-w-6xl rounded-[32px] bg-ink px-6 py-12 text-center text-ink-foreground shadow-lift">
          <h2 className="font-display text-3xl font-semibold md:text-4xl"><span className="text-hero-gradient">{t.ctaT}</span></h2>
          <p className="mx-auto mt-3 max-w-md text-ink-foreground/70">{t.ctaS}</p>
          <Button asChild variant="pill" size="pill" className="action-pill action-pill-light mt-6 px-6 py-3 text-sm font-semibold"><a href="/inscription"><ActionText>{t.cta}</ActionText><ArrowRight className="size-4" /></a></Button>
        </R>
      </section>
      <Footer lang={lang} />
    </div>
  );
}
