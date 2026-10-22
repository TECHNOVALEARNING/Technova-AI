import { createFileRoute } from "@tanstack/react-router";

/**
 * Landing page of the Supabase consent pop-up. It holds no session and shows no
 * app chrome: it verifies the `state` written by the opener, hands the one-time
 * code back to the opener through postMessage, and closes. The code exchange
 * itself runs in the opener's authenticated server function.
 */
function bridge(code: string, state: string, error: string) {
  // Escape for an inline <script>: query values are attacker-controlled.
  const payload = JSON.stringify({ code, state, error }).replace(/[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Connexion Supabase | TechNova AI Hub</title>
<style>
html,body{height:100%;margin:0;display:grid;place-items:center;background:#f4f4f5;color:#18181b;font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){html,body{background:#0b0b0d;color:#f4f4f5}}
.card{max-width:340px;padding:26px 24px;text-align:center;border:1px solid rgba(120,120,135,.28);border-radius:18px;background:rgba(255,255,255,.6)}
@media (prefers-color-scheme:dark){.card{background:rgba(255,255,255,.05)}}
h1{margin:0 0 6px;font-size:16px;font-weight:600}
p{margin:0;font-size:12.5px;opacity:.72}
.dot{width:9px;height:9px;margin:0 auto 14px;border-radius:99px;background:#3b82f6;animation:p 1.1s ease-in-out infinite}
@keyframes p{0%,100%{opacity:.35}50%{opacity:1}}
</style></head><body><div class="card"><div class="dot"></div><h1 id="t">Connexion en cours…</h1><p id="p">Autorisez TechNova dans la fenêtre Supabase.</p></div>
<script>
var d=${payload};
var KEY="technova-supabase-oauth-state";
var TYPE="technova-supabase-oauth";
function say(t,p){document.getElementById("t").textContent=t;document.getElementById("p").textContent=p;}
function post(ok,x){try{if(window.opener)window.opener.postMessage(Object.assign({type:TYPE,ok:ok},x||{}),window.location.origin);}catch(e){}}
var stored="";try{stored=localStorage.getItem(KEY)||"";}catch(e){}
if(d.error){say("Autorisation refusée","La connexion à Supabase a été annulée. Vous pouvez fermer cet onglet.");post(false,{error:d.error});}
else if(!d.code){say("Connexion incomplète","Aucun code de validation reçu. Fermez cet onglet et réessayez.");post(false,{error:"missing_code"});}
else if(stored&&stored!==d.state){say("Connexion refusée","La demande de connexion n'a pas pu être vérifiée. Fermez cet onglet et réessayez.");post(false,{error:"state_mismatch"});}
else{try{localStorage.removeItem(KEY);}catch(e){}say("Supabase connecté","Merci. Revenez sur TechNova : vous pouvez fermer cet onglet.");post(true,{code:d.code});setTimeout(function(){window.close();},900);}
</script></body></html>`;
}

export const Route = createFileRoute("/api/public/supabase-oauth/callback")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const q = new URL(request.url).searchParams;
        const html = bridge(q.get("code") ?? "", q.get("state") ?? "", q.get("error") ?? "");
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-robots-tag": "noindex, nofollow",
            "referrer-policy": "no-referrer",
          },
        });
      },
    },
  },
});
