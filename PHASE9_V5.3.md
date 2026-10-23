# Rapport Phase 9 — QA sécurité et go-live (V5.3)

**STATUS : PASS pour l'audit et les tests automatisés · 1 faille trouvée et corrigée (migration 0029) · 3 actions restent de ton côté avant l'ouverture publique (voir checklist)**

## 1. Méthode
Les 30 migrations (`0000` → `0029`) sont rejouées sur une base Postgres vierge qui imite Supabase (rôles `anon` / `authenticated` / `service_role`, `auth.uid()`, stockage, `pg_cron`). Deux comptes y sont simulés : A la victime, B l'attaquant. Le code est audité en parallèle.
- **Reconstruction complète depuis zéro : OK** (31 tables, 29 fonctions). C'est la preuve que le schéma peut être restauré.

## 2. Audit automatique des droits
- **Tables sans RLS : aucune.**
- **Fonctions sensibles appelables depuis le navigateur : aucune.** Seules sont ouvertes les fonctions prévues pour l'être : classement Arena, bonus de bienvenue, estimations, conversation partagée, `has_role` (nécessaire aux règles d'accès), solde (le sien uniquement), téléchargement et remix du Registry.

## 3. Tests d'intrusion — 47/47 PASS (après correction)

| Attaque testée | Résultat |
| --- | --- |
| Lire les données d'un autre compte (IDOR) dans 13 tables : conversations, messages, agents, clés API, crédits, paiements, aperçus, sites, usage, médias, journal, transferts, signalements | ✅ 0 ligne, pour un autre compte comme pour un visiteur anonyme |
| Renommer ou écrire dans la conversation d'un autre, supprimer son site, modifier son profil | ✅ refusé |
| Se créditer soi-même, créer un faux paiement, marquer un paiement payé | ✅ refusé |
| Appeler `refund_credits`, `settle_payment`, `reserve_credits_v2`, `admin_transfer_credits`, `report_site`, `admin_set_site_suspension`, `has_site_access`, `has_video_access`, `configure_app_url` | ✅ permission refusée |
| Lire le solde d'un autre compte | ✅ 0 renvoyé |
| Se nommer admin | ✅ refusé |
| Publier un site ou créer une génération média sans passer par le serveur | ✅ refusé |
| **Créer un lien d'aperçu public sans passer par le serveur** | ❌ → **corrigé** |

### Faille corrigée (0029)
Un utilisateur pouvait créer un lien d'aperçu public directement depuis la console de son navigateur, en **contournant les contrôles anti-phishing et anti-secrets** de la Phase 8. Maintenant, seul le serveur crée ces liens (nouvelle fonction `createPreviewLink`, qui applique les deux contrôles et une limite d'usage). Le propriétaire peut toujours lire et désactiver ses liens.

## 4. Audit du code

| Risque | Constat |
| --- | --- |
| XSS (Markdown des réponses IA, conversations partagées) | ✅ **Testé avec un message piégé** : `<script>`, `onerror`, liens `javascript:` et iframes sont neutralisés par le moteur Markdown. |
| XSS (HTML injecté) | ✅ Seuls un style de graphique interne et la config publique, échappée. |
| Sites générés | ✅ Cadres `sandbox` sans `allow-same-origin` ; sous-domaines avec CSP `sandbox` (Phase 8). |
| CSRF | ✅ Server functions protégées par le middleware CSRF ; routes API authentifiées par jeton `Bearer`, donc insensibles au CSRF. |
| SSRF | ✅ Outil `web_fetch` des agents : réseaux privés et redirections bloqués (`safe-fetch.server.ts`) ; proxy d'images limité à `*.wikimedia.org`. |
| Injection SQL | ✅ Requêtes paramétrées partout (supabase-js) ; la seule valeur interpolée est générée par le serveur. |
| Traversée de chemin / zip-slip | ✅ Chemins de fichiers sans `..` ni `/` initial ; aucun ZIP n'est extrait côté serveur. |
| Redirections ouvertes | ✅ Uniquement vers des adresses fournies par le serveur (Nyole, OAuth). |
| Rejeu de paiement / concurrence | ✅ Webhook horodaté et signé, crédit idempotent, réservations avec verrous (Phases 1, 2 et 4). |
| Prompt injection | ⚠️ Risque limité : le contenu web lu par un agent n'affecte que la réponse de son propriétaire, et les outils restent refusés par défaut, sans action possible (e-mails, paiements, écriture en base). |

## 5. Sauvegarde et restauration
- ✅ **Restauration du schéma prouvée** : la base complète se reconstruit depuis les migrations.
- ❌ **Sauvegarde et restauration des données non testées** : la base de production n'est pas accessible depuis cette session, et `pg_dump` n'est pas installé ici. **C'est à faire de ton côté** (procédure dans la checklist).

## 6. Fichiers
`drizzle/migrations/0029_preview_links_server_only.sql`, `src/lib/publishing.functions.ts` (`createPreviewLink`), `src/components/dashboard/Studio.tsx`, [GO_LIVE_V5.3.md](GO_LIVE_V5.3.md).

## Rollback
Code : commit précédent. Base : en-tête de la migration 0029.
