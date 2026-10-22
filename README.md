# TechNova AI Hub

TanStack Start (React 19) + Supabase + OpenRouter, déployé sur **Vercel** via Nitro.

## Développement local

```bash
cp .env.example .env      # puis remplissez les valeurs
npm install
npm run dev               # http://localhost:3000
```

`npm run typecheck` · `npm run lint` · `npm run build`

## Déploiement sur Vercel

### 1. Base de données Supabase (votre propre projet)

L'ancien backend était un projet Supabase géré par Lovable Cloud. Créez votre propre projet sur
[supabase.com](https://supabase.com), puis :

1. **Database → Extensions** : activez `pg_cron` et `pg_net`.
2. Appliquez les migrations (`drizzle/migrations/0000` → `0017`) :
   ```bash
   DATABASE_URL="postgresql://…" npm run db:migrate
   ```
   (ou collez chaque fichier `.sql`, dans l'ordre, dans le SQL Editor).
3. **Authentication → URL Configuration** : *Site URL* = votre URL Vercel ; ajoutez
   `https://VOTRE-DOMAINE/**` dans *Redirect URLs*.
4. **Authentication → Providers → Google** : activez-le avec un client OAuth Google
   (redirect URI : `https://<ref>.supabase.co/auth/v1/callback`).
5. Après le premier déploiement, dans le SQL Editor :
   ```sql
   select public.configure_app_url('https://VOTRE-DOMAINE');
   ```
   (active le worker du Studio et la purge quotidienne des médias via `pg_cron`).
6. Pour vous donner le rôle admin :
   ```sql
   insert into public.user_roles (user_id, role) values ('<votre-user-id>', 'admin');
   ```

### 2. Projet Vercel

1. Importez le dépôt dans Vercel (le `vercel.json` fournit les commandes, aucun preset à choisir).
2. **Settings → Environment Variables** : ajoutez toutes les variables de [.env.example](.env.example)
   (sauf `DATABASE_URL`, inutile à l'exécution). Les variables `VITE_*` doivent exister **au build**.
3. Déployez, puis réglez `TECHNOVA_APP_URL` sur l'URL finale et redéployez.

### 3. Connecteurs (optionnels)

Créez vos propres applications OAuth, toutes avec la redirect URI
`https://VOTRE-DOMAINE/oauth/connect/return` :

| Service | Où créer l'app | Variables |
| --- | --- | --- |
| GitHub | Settings → Developer settings → OAuth Apps | `GITHUB_OAUTH_CLIENT_ID/SECRET` |
| Google Drive | Google Cloud Console → Identifiants (API Drive activée) | `GOOGLE_DRIVE_OAUTH_CLIENT_ID/SECRET` |
| Notion | notion.so/my-integrations → intégration publique | `NOTION_OAUTH_CLIENT_ID/SECRET` |

Un connecteur sans variables s'affiche « Configuration requise ».

## Sécurité en place

- Clés de service, OpenRouter, kie.ai, paiement et jetons OAuth : **serveur uniquement**.
- Jetons des connecteurs chiffrés AES-256-GCM (`TECHNOVA_CONN_CRYPTO_KEY`), `state` OAuth signé HMAC.
- RLS sur toutes les tables ; fonctions de crédit exécutables par `service_role` uniquement.
- Limitation de débit par compte, journal `security_events`, en-têtes HTTP de sécurité.
- Les URL fournies aux agents (`web_fetch`) ne peuvent pas viser le réseau interne (anti-SSRF).
- Workers planifiés protégés par jeton (`x-worker-token` ou `CRON_SECRET`).

## API publique

`POST /api/ai/chat` avec `Authorization: Bearer tn_live_…` (clé créée dans le tableau de bord) :

```json
{ "model": "openai/gpt-4o-mini", "messages": [{ "role": "user", "content": "Bonjour" }], "idempotency_key": "…" }
```
