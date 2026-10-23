# Rapport Phase 4 — Paiement (V5.3)

**STATUS : PASS (code + tests locaux) · aucune migration · une variable d'environnement facultative**

## Audit du parcours existant
Achat d'un pack → `startCheckout` (session Nyole, idempotente par `payment.id`) → paiement Mobile Money ou carte chez Nyole → **webhook signé** `/api/public/nyole-webhook` **et** retour du client sur `/dashboard/credits?payment=…` → `reconcilePayment` demande le statut **à Nyole** (jamais au navigateur) et vérifie montant + devise XOF → `settle_payment` crédite **une seule fois** (verrou `FOR UPDATE` + drapeau `credited`, exécutable par le serveur uniquement).

Conforme aux principes V5.3 : aucun crédit sur confirmation frontend, opération atomique et idempotente, webhook vérifié.

## Failles corrigées

| # | Gravité | Problème | Correction |
| --- | --- | --- | --- |
| P1 | 🔴 | Un paiement **en mode test** (clé `af_test_…`) créditait de **vrais** crédits, même en production : n'importe qui pouvait « payer » avec une carte de test. | En production (`VERCEL_ENV=production`), un paiement de test réussi n'est **pas crédité**. Il passe en statut `test_blocked`, l'événement `test_payment_blocked` est journalisé et l'utilisateur voit « Paiement de test refusé… ». Pour tester volontairement en production : `NYOLE_ALLOW_TEST_PAYMENTS=true`, à retirer ensuite. |
| P2 | 🟠 | Lancement et vérification de paiement sans limite (spam de sessions Nyole). | 10 lancements par 10 min et 30 vérifications par minute, par compte. |
| P3 | 🟠 | Si le webhook est perdu et que le client ne revient pas sur le site, le paiement n'était **jamais crédité**. | Rattrapage quotidien : la tâche planifiée (`/api/public/media-purge`) revérifie auprès de Nyole les paiements non crédités des 72 dernières heures. |
| P4 | 🟡 | Les signatures de webhook invalides passaient inaperçues. | Journalisées dans `security_events` (`payment_webhook_invalid_signature`). |
| P5 | 🟡 | « Mode test actif » était écrit en dur sur la page Facturation, même en mode réel. | Le message ne s'affiche que si la clé Nyole est une clé de test. |
| — | amélioration | Le webhook était signé avec la clé API. | Une variable facultative `NYOLE_WEBHOOK_SECRET` permet d'utiliser un secret de signature dédié, si Nyole en fournit un. Sinon, la clé API reste utilisée. |

## Fichiers
`src/lib/nyole.server.ts`, `src/lib/payments.functions.ts`, `src/routes/api/public/nyole-webhook.ts`, `src/routes/api/public/media-purge.ts`, `src/lib/security.server.ts`, `src/components/dashboard/DashboardTools.tsx`.

## Tests réels exécutés — 12/12 PASS
- **Webhook :**
  - signature valide acceptée ;
  - mauvaise clé, corps modifié et absence de signature refusés ;
  - **rejeu d'un message de plus de 5 minutes refusé** ;
  - secret dédié pris en compte.
- **Mode test :**
  - une clé `af_test_` est bien détectée ;
  - production + clé de test : **non crédité** ;
  - production + autorisation explicite : crédité ;
  - préproduction et local : crédité.
- **SQL (PGlite) :**
  - webhook + retour client = **un seul** crédit de 8 500 ;
  - `settle_payment` interdit au navigateur.
- **Non-régression :** tests SQL Phases 1, 2 et 3 (11/11, 18/18, 9/9) ; builds Node et Vercel OK.

## Non testé
Un vrai paiement de bout en bout avec Nyole (Mobile Money ou carte). Il nécessite ton compte Nyole et un paiement réel ou de test. **À faire avant l'ouverture au public.**

## Variables d'environnement
| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `NYOLE_SECRET_KEY` | oui | Clé API (`af_live_…` en production) |
| `NYOLE_WEBHOOK_SECRET` | non | Secret de signature du webhook, s'il est fourni par Nyole |
| `NYOLE_ALLOW_TEST_PAYMENTS` | non | `true` uniquement pendant un test en production |

## Rollback
Revenir au commit précédent (aucune migration).

## Prochaine phase
**Phase 5 — Créer** : musique (kie.ai), estimation du coût avant chaque génération, bibliothèque de designs.
