import { createFileRoute } from "@tanstack/react-router";

// One-click unsubscribe from the reminder e-mails (link signed per account in reminders.server.ts; also answers the
// List-Unsubscribe-Post one-click request of mail clients). Turns profiles.email_reminders off.
async function run(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "", t = url.searchParams.get("t") ?? "";
  const { verifyUnsubscribe } = await import("@/lib/reminders.server");
  const valid = /^[0-9a-f-]{36}$/i.test(u) && verifyUnsubscribe(u, t);
  if (valid) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ email_reminders: false } as never).eq("id", u);
  }
  if (request.method === "POST") return new Response(null, { status: valid ? 200 : 400 });
  const body = valid
    ? "<h1>C'est fait</h1><p>Vous ne recevrez plus de rappels par e-mail de TechNova AI Hub. Vous pouvez les réactiver dans Paramètres.</p>"
    : "<h1>Lien invalide</h1><p>Ce lien de désinscription n'est pas valide. Vous pouvez désactiver les rappels dans Paramètres.</p>";
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Rappels par e-mail · TechNova AI Hub</title><style>body{font-family:system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:0 20px;color:#111}a{color:#111}</style></head><body>${body}<p><a href="https://www.technovaihub.com/">Retour à TechNova AI Hub</a></p></body></html>`,
    { status: valid ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/email-unsubscribe")({
  server: { handlers: { GET: ({ request }) => run(request), POST: ({ request }) => run(request) } },
});
