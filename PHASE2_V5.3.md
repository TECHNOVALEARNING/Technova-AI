# Rapport Phase 2 — Gating vidéo + transfert de crédits admin (V5.3)

**STATUS : PASS (code + tests locaux) · en attente : migrations 0022 et 0023 sur la base de production**

## Objectif
- **D1** : la vidéo n'est autorisée qu'aux comptes ayant **payé au moins une fois** un pack Creator ou Pro. Le contrôle se fait côté serveur ; le frontend ne décide jamais.
- **D6** : un admin peut **créer** des crédits pour un utilisateur, sans débit de son propre solde, avec un **maximum de 1 000 par transfert**.

## Changements

| Sujet | Implémentation | Fichiers |
| --- | --- | --- |
| Règle d'accès vidéo | `has_video_access(user)` = admin **ou** paiement `credited` sur `creator`/`pro` (service_role uniquement) | migration 0023 |
| Blocage serveur | `createMediaGeneration` refuse toute vidéo sans accès **avant** de réserver des crédits ou d'appeler kie.ai. Il renvoie l'erreur codée `VIDEO_UPGRADE_REQUIRED` et journalise `video_blocked_insufficient_plan`. | `src/lib/media-generation.functions.ts` |
| Message d'upgrade | Carte dans le chat : « 🎬 La génération vidéo est réservée aux forfaits Creator (4999 frs) et Pro (7699 frs)… Il vous reste X crédits. » + boutons **Passer à Creator** / **Passer à Pro**, qui ouvrent la confirmation d'achat du pack dans Crédits. | `src/components/dashboard/ChatWorkspace.tsx` |
| Transfert | Table `credit_transfers` (lecture admin uniquement, **aucune** écriture directe possible) + RPC `admin_transfer_credits` (rôle admin revérifié en base, montant 1–1000, clé d'idempotence obligatoire, destinataire existant, ligne `admin_transfer` dans le grand livre) | migration 0023 |
| Serveur | `adminFindUser` (recherche par e-mail exact), `adminTransferCredits` (rate limit **20/min/admin**, événements `credit_transfer` / `credit_transfer_failed` dans `security_events` avec `request_id`), `listCreditTransfers` | `src/lib/admin.functions.ts`, `src/lib/security.server.ts` |
| Interface | Admin → **Transférer des crédits** : recherche par e-mail → solde actuel → montant + raison (obligatoire) → étape de **confirmation** → notification + historique des 50 derniers transferts. Une clé unique par transfert empêche le double crédit (double clic, nouvel essai). | `src/components/dashboard/CreditTransfer.tsx`, `AdminPage.tsx` |
| Historique utilisateur | Le transfert apparaît comme « Crédits offerts par TechNova » dans l'activité Crédits | `DashboardTools.tsx` |

## Écarts assumés par rapport au prompt V5.3
- Pas d'Edge Function `check-video-access` : la vérification se fait dans la fonction serveur qui lance la génération. C'est le seul endroit où la vidéo peut démarrer, donc impossible à contourner.
- Pas de page séparée `/admin/credits` : la section est intégrée à la page Admin existante.
- Le rôle admin vient de `user_roles` / `has_role` (pas de `profiles.role`).

## Tests réels exécutés

**SQL** (PGlite : rôles et `has_role` de la migration 0010 + migration 0023 appliquée deux fois) — **18/18 PASS** :
- migration idempotente ;
- vidéo bloquée sans achat, bloquée avec un Pro non payé + un Essential payé, débloquée après un Creator payé, autorisée pour l'admin ;
- non-admin refusé ; montants 0 et 1001 refusés ; clé d'idempotence obligatoire ; destinataire inconnu refusé ;
- transfert de 1000 → solde 1000 ; même clé rejouée → aucun double crédit ; clé réutilisée avec un autre montant → refus ;
- ligne `admin_transfer` dans le grand livre ; aucun débit sur l'admin ;
- recherche e-mail insensible à la casse et aux espaces ;
- le navigateur ne peut ni transférer, ni rechercher, ni écrire dans `credit_transfers` ;
- RLS : seuls les admins lisent l'historique.

**Non-régression** : tests SQL Phase 1 rejoués **11/11 PASS** ; `tsc` OK ; builds Node et Vercel OK.

## Non testé (à vérifier après déploiement, avec de vrais comptes)
- Parcours vidéo dans le navigateur : un compte sans achat voit la carte d'upgrade, un compte Creator/Pro lance la vidéo.
- Transfert depuis la page Admin sur la vraie base.

Ces deux parcours demandent une session connectée sur ta base de production.

## Risques
- Les comptes déjà inscrits sans achat Creator/Pro perdent l'accès vidéo à la mise en ligne. C'est voulu (D1).
- Le choix du modèle vidéo reste visible dans le menu : le blocage intervient à l'envoi, avec la carte d'upgrade.

## Rollback
Code : revenir au commit précédent. Base : voir l'en-tête de la migration 0023.

## Variables d'environnement
Aucune nouvelle.

## Ordre de déploiement
1. SQL Editor : exécuter **0022** puis **0023**.
2. Pousser le code (Phases 1 et 2).

## Prochaine phase
**Phase 3** — Discuter + OpenRouter (selon V5.3 : routing Auto/Expert, historique, fichiers). Le chat multi-modèles existe déjà ; la phase portera sur les écarts.
