import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer, PageHero, useReveal, useSiteLang } from "@/components/site/SiteChrome";
import { CodeBlock } from "@/components/site/CodeBlock";

export const Route = createFileRoute("/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — TechNova AI Hub" },
      { name: "description", content: "Démarrage rapide, authentification, chat completions, crédits, codes d'erreur et paiements Mobile Money pour l'API TechNova." },
      { property: "og:title", content: "Documentation — TechNova AI Hub" },
      { property: "og:description", content: "Tout pour brancher l'IA à votre produit, de la première requête à la production." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

type Sec = { id: string; title: string; body: string[]; code?: string; list?: string[] };

const docs: Record<"fr" | "en", { tag: string; title: string; sub: string; toc: string; sections: Sec[] }> = {
  fr: {
    tag: "Documentation", title: "Documentation TechNova AI", sub: "Tout ce qu'il faut pour brancher l'IA à votre produit : de la première requête à la mise en production.", toc: "Sur cette page",
    sections: [
      { id: "demarrage", title: "Démarrage rapide", body: ["Créez un compte, rechargez votre portefeuille TechNova Credits, générez une clé API depuis le tableau de bord, puis envoyez votre première requête. Aucune carte bancaire n'est requise : le rechargement se fait en francs CFA."], code: `curl https://api.technova.ai/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "google/gemini-2.5-flash",\n    "messages": [{ "role": "user", "content": "Bonjour Technova" }],\n    "idempotency_key": "0f2a1c6e-...-9b17"\n  }'` },
      { id: "auth", title: "Authentification", body: ["Chaque appel se fait avec un jeton porteur. Une clé appartient à un seul compte et consomme le portefeuille de ce compte. Ne l'exposez jamais dans un navigateur ou une application mobile : appelez l'API depuis votre serveur.", "En cas de fuite, révoquez la clé depuis le tableau de bord : la révocation est immédiate."], code: "Authorization: Bearer tnv_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["Un seul point d'entrée pour tous les modèles texte. Le champ model accepte l'identifiant affiché sur la page Modèles. Le mode streaming renvoie les jetons au fil de l'eau (Server-Sent Events).", "La réponse contient le texte généré, les jetons consommés et le nombre exact de crédits débités. Répéter la même idempotency_key renvoie la réponse d'origine sans refacturer."], code: `POST /api/ai/chat\n{\n  "model": "anthropic/claude-sonnet-4.5",\n  "messages": [\n    { "role": "system", "content": "Tu es un assistant commercial." },\n    { "role": "user", "content": "Rédige une relance client." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "stream": false,\n  "idempotency_key": "<uuid>"\n}` },
      { id: "modeles", title: "Modèles disponibles", body: ["Le catalogue est administré côté serveur : chaque modèle porte son fournisseur, sa fenêtre de contexte et son tarif indicatif en crédits. Un modèle désactivé renvoie MODEL_NOT_AVAILABLE au lieu d'échouer silencieusement."] },
      { id: "credits", title: "Crédits & facturation", body: ["L'unité de facturation est le crédit TechNova. Avant chaque appel, une estimation est réservée ; après la réponse, la réservation est ajustée à la consommation réelle. Une requête échouée ne coûte rien."], list: ["1 crédit ≈ 1 FCFA de valeur d'usage.", "Les crédits n'expirent pas et sont communs au chat, à l'image, à la vidéo et à l'audio.", "L'historique complet est consultable dans le tableau de bord et n'est jamais modifiable."] },
      { id: "erreurs", title: "Codes d'erreur", body: ["Toutes les erreurs sont structurées et lisibles par machine. Traitez-les explicitement."], list: ["INSUFFICIENT_CREDITS — solde insuffisant, proposez un rechargement.", "MODEL_NOT_AVAILABLE — modèle inconnu ou désactivé.", "RATE_LIMITED — trop de requêtes, réessayez après une pause.", "UPSTREAM_ERROR — fournisseur indisponible, aucun crédit perdu.", "TIMEOUT — traitement expiré, crédits restitués."] },
      { id: "limites", title: "Limites de débit", body: ["Par défaut, 30 requêtes par minute et par compte, avec une tolérance de rafale courte. Besoin de limites plus élevées ? Écrivez-nous."] },
      { id: "paiements", title: "Paiements Mobile Money", body: ["Le rechargement se fait par Mobile Money (MTN MoMo, Moov Money, Wave, Orange Money). Le portefeuille n'est jamais crédité depuis le navigateur : seule la confirmation signée du prestataire, reçue sur notre webhook, déclenche le crédit."], code: "POST /api/public/payment-webhook\nx-signature: <HMAC-SHA256 du corps>" },
    ],
  },
  en: {
    tag: "Docs", title: "TechNova AI Documentation", sub: "Everything you need to plug AI into your product, from first request to production.", toc: "On this page",
    sections: [
      { id: "demarrage", title: "Quick start", body: ["Create an account, top up your TechNova Credits wallet, generate an API key from the dashboard, then send your first request. No bank card required: top-ups are in CFA francs."], code: `curl https://api.technova.ai/api/ai/chat \\\n  -H "Authorization: Bearer $TECHNOVA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "google/gemini-2.5-flash",\n    "messages": [{ "role": "user", "content": "Hello Technova" }],\n    "idempotency_key": "0f2a1c6e-...-9b17"\n  }'` },
      { id: "auth", title: "Authentication", body: ["Every call uses a bearer token. A key belongs to one account and spends that account's wallet. Never expose it in a browser or mobile app: call the API from your server.", "If a key leaks, revoke it from the dashboard: revocation is immediate."], code: "Authorization: Bearer tnv_live_xxxxxxxxxxxxxxxx" },
      { id: "chat", title: "Chat completions", body: ["One endpoint for every text model. The model field accepts the identifier shown on the Models page. Streaming returns tokens as they come (Server-Sent Events).", "The response contains the generated text, tokens used and the exact credits charged. Repeating an idempotency_key returns the original response without charging again."], code: `POST /api/ai/chat\n{\n  "model": "anthropic/claude-sonnet-4.5",\n  "messages": [\n    { "role": "system", "content": "You are a sales assistant." },\n    { "role": "user", "content": "Write a follow-up email." }\n  ],\n  "temperature": 0.7,\n  "max_tokens": 800,\n  "stream": false,\n  "idempotency_key": "<uuid>"\n}` },
      { id: "modeles", title: "Available models", body: ["The catalog is managed server-side: each model carries its provider, context window and indicative credit price. A disabled model returns MODEL_NOT_AVAILABLE instead of failing silently."] },
      { id: "credits", title: "Credits & billing", body: ["The billing unit is the TechNova credit. An estimate is reserved before each call and adjusted to real usage afterwards. A failed request costs nothing."], list: ["1 credit ≈ 1 FCFA of usage value.", "Credits never expire and are shared across chat, image, video and audio.", "Full history is available in the dashboard and is never editable."] },
      { id: "erreurs", title: "Error codes", body: ["All errors are structured and machine-readable. Handle them explicitly."], list: ["INSUFFICIENT_CREDITS — balance too low, offer a top-up.", "MODEL_NOT_AVAILABLE — unknown or disabled model.", "RATE_LIMITED — too many requests, retry after a pause.", "UPSTREAM_ERROR — provider unavailable, no credits lost.", "TIMEOUT — processing expired, credits refunded."] },
      { id: "limites", title: "Rate limits", body: ["By default, 30 requests per minute per account with a short burst allowance. Need higher limits? Contact us."] },
      { id: "paiements", title: "Mobile Money payments", body: ["Top-ups use Mobile Money (MTN MoMo, Moov Money, Wave, Orange Money). The wallet is never credited from the browser: only the provider's signed confirmation, received on our webhook, triggers the credit."], code: "POST /api/public/payment-webhook\nx-signature: <HMAC-SHA256 of body>" },
    ],
  },
};

function DocsPage() {
  const [lang, setLang] = useSiteLang();
  const d = docs[lang];
  useReveal();
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav lang={lang} setLang={setLang} />
      <PageHero tag={d.tag} title={d.title} sub={d.sub} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-[22px] border border-border bg-card p-4 shadow-soft">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{d.toc}</p>
            {d.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground">{s.title}</a>)}
          </nav>
        </aside>
        <div className="min-w-0 space-y-6">
          {d.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-[28px] border border-border bg-card p-6 shadow-soft md:p-8">
              <span className="font-display text-xs font-semibold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">{s.title}</h2>
              {s.body.map((b) => <p key={b} className="mt-3 leading-relaxed text-muted-foreground">{b}</p>)}
              {s.list && <ul className="mt-4 space-y-2">{s.list.map((l) => <li key={l} className="flex gap-2 text-sm"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-iris" /><span>{l}</span></li>)}</ul>}
              {s.code && <div className="mt-5"><CodeBlock code={s.code} /></div>}
            </section>
          ))}
        </div>
      </div>
      <Footer lang={lang} />
    </div>
  );
}
