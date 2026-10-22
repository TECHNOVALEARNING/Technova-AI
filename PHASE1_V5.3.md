# Rapport Phase 1 — Fondations sécurité (V5.3)

**STATUS : PASS (code + tests locaux) · en attente : exécution de la migration 0022 sur la base de production**

## Objectif
Corriger les anomalies A1, A2, A4 et A5 de l'audit ([AUDIT_V5.3.md](AUDIT_V5.3.md)) sans changer le comportement visible, hormis les nouveaux messages d'erreur.

## Changements

| Anomalie | Correction | Fichiers |
| --- | --- | --- |
| A1 — bucket médias absent | Bucket privé `media-files` (500 Mo/fichier), accessible seulement par le serveur via URLs signées | `drizzle/migrations/0022_phase1_storage_reservations.sql` |
| A2 — débit après coup | **Chat** : réservation du coût maximal avant l'appel au modèle, règlement au coût réel en fin de réponse (le surplus revient), libération si le modèle échoue ; si l'utilisateur coupe la réponse, seule la partie générée est facturée. **Studio** (questions/plan/build) : réservation du coût de l'étape, réglée en cas de succès, libérée en cas d'échec. **Builds en arrière-plan** : la réservation suit le job, y compris quand le worker le reprend, et n'est réglée qu'à la fin. **Médias** : ne peuvent plus dépenser des crédits déjà réservés. Les réservations abandonnées depuis plus de 30 min sont libérées automatiquement, sauf celles d'un build en cours. | `src/lib/credits.server.ts`, `src/routes/api/chat.ts`, `src/routes/api/studio.ts`, `src/routes/api/studio-job.ts`, `src/lib/studio-job.server.ts`, migration 0022 |
| A4 — fichiers trop lourds | 3 Mo maximum par PDF/audio/vidéo (au lieu de 10–20 Mo). Budget total d'environ 4 Mo par requête : les fichiers les plus récents sont prioritaires et un message clair s'affiche si le message actuel dépasse. Le serveur refuse au-delà de 4,5 Mo par fichier. | `src/lib/chat-attachments.ts`, `src/components/dashboard/ChatWorkspace.tsx`, `src/routes/api/chat.ts` |
| A5 — pas de `request_id` | Chaque réponse porte un en-tête `X-Request-Id` (repris de la requête s'il est valide, sinon `x-vercel-id` ou un UUID). Il est ajouté à `security_events.detail.request_id` et préfixe les erreurs serveur dans les logs. | `src/lib/request-context.server.ts`, `src/server.ts`, `src/lib/security.server.ts` |

## Migration
`0022_phase1_storage_reservations.sql` est **idempotente** (rejouée deux fois en test) et documente son rollback en en-tête :
- crée le bucket `media-files` ;
- ajoute la colonne `studio_jobs.reservation_id` ;
- redéfinit `reserve_credits_v2` (libération des réservations abandonnées) et `reserve_credits` (prise en compte des réservations en cours) ;
- les deux fonctions restent exécutables par `service_role` uniquement.

## Tests réels exécutés

**SQL** (Postgres en mémoire, PGlite : migration 0013 pour le moteur de crédits + migration 0022) — **11/11 PASS** :
1. Bucket `media-files` créé, privé, migration rejouable.
2. Réserver 60 sur 100 laisse 40 disponibles.
3. Une seconde réservation de 50 est refusée (pas de double dépense).
4. Un média ne peut pas dépenser les crédits réservés.
5. Le règlement au coût réel (25) rend les 35 restants.
6. Le règlement est idempotent.
7. Une libération après échec ne débite rien.
8. Une nouvelle réservation reste possible.
9. Une réservation abandonnée depuis plus de 30 min est libérée.
10. La réservation d'un build en cours est conservée.
11. Les fonctions sont refusées aux rôles `anon` et `authenticated`.

**Budget des fichiers** (`budgetFiles`) — **4/4 PASS** : le plus récent est prioritaire, un fichier trop lourd est exclu, seuls les 6 derniers tours gardent leurs fichiers, l'ordre des messages est conservé.

**Serveur construit** — PASS :
- `X-Request-Id` généré automatiquement, repris s'il est valide, remplacé s'il contient des caractères invalides (`<script>`).
- `/api/chat`, `/api/studio` et `/api/studio-job` renvoient 401 sans session.
- Build Node et build Vercel réussis, `tsc` sans erreur.

## Non testé (à vérifier après déploiement)
- Le parcours complet sur la vraie base avec un vrai compte (chat payant, build Studio, génération média), car la base de production n'est pas accessible depuis cet environnement.
- La concurrence réelle de plusieurs requêtes simultanées : PGlite n'a qu'une connexion. La protection repose sur `pg_advisory_xact_lock`, déjà utilisé par le moteur de crédits.

## Risques
- Un utilisateur au solde très faible ne peut plus envoyer un message dont le coût **maximal** dépasse son solde, alors qu'avant il pouvait passer en négatif. C'est le comportement voulu.
- Les builds lancés **avant** cette version n'ont pas de `reservation_id` : ils sont facturés à l'ancienne, à la fin.

## Rollback
Revenir au commit précédent pour le code. Pour la base, voir l'en-tête de la migration 0022. Le bucket peut rester : il est inoffensif.

## Variables d'environnement
Aucune nouvelle.

## Prochaine phase
**Phase 2** — gating vidéo (D1 : achat Creator/Pro) avec erreur `VIDEO_UPGRADE_REQUIRED` + transfert de crédits par l'admin (D6 : crédits créés, plafond 1 000).
