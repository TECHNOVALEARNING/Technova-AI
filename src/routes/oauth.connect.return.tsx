import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/connect/return")({
  head: () => ({ meta: [
    { title: "Connexion en cours | TechNova AI Hub" },
    { name: "description", content: "Finalisation de la connexion du service." },
    { property: "og:title", content: "Connexion en cours | TechNova AI Hub" },
    { property: "og:description", content: "Finalisation de la connexion du service." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finalisation de la connexion…");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const state = p.get("state") ?? "";
    // The connector id is only read for routing; the server verifies the signed state.
    let connectorId: string | null = null;
    try { connectorId = (JSON.parse(atob((state.split(".")[0] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { c?: string }).c ?? null; } catch { connectorId = null; }
    const send = (type: string, code?: string) => {
      window.opener?.postMessage({ type, connectorId, code: code ?? null, state }, window.location.origin);
      window.close();
    };
    const code = p.get("code");
    if (p.get("error") || !code || !connectorId) { setMessage("La connexion n’a pas abouti."); send("technovaOAuthFailed"); return; }
    send("technovaOAuthComplete", code);
  }, []);
  return <p className="p-8 text-center text-sm text-muted-foreground">{message}</p>;
}
