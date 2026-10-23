# Rapport Phase 8 — Sites publiés : anti-phishing, signalement, domaine provisoire (V5.3)

**STATUS : PASS (code + tests locaux) · migration 0028 à exécuter · domaine provisoire : configuration DNS facultative**

## Ce qui existait
Publication sur `/s/slug`, affichée dans un cadre `sandbox` sans accès aux sessions TechNova (isolation déjà correcte). Aucun contrôle du contenu publié, aucun moyen de signaler un site.

## Nouveautés

| Sujet | Implémentation |
| --- | --- |
| **Anti-phishing à la publication** | `src/lib/phishing-scan.ts`. Un site publié est statique : il n'a aucune raison de collecter des identifiants. La publication et le lien d'aperçu sont **refusés** si une page contient : un champ mot de passe ; un champ de carte bancaire ou CVV ; un code PIN, un code secret ou un OTP (Mobile Money) ; une phrase de récupération ou une clé de portefeuille crypto ; ou une page qui cite une marque (MTN, Orange Money, Wave, PayPal, banques, Facebook, Google, TechNova…) **et** demande de « se connecter » ou de « vérifier son compte ». Chaque tentative est journalisée (`publish_blocked_phishing`). |
| **Signalement public** | Bouton **Signaler** sur chaque site publié (motifs : hameçonnage, arnaque, malveillant, illégal, autre). Point d'entrée `/api/public/report-site` : visiteur identifié par une empreinte hachée (l'adresse IP n'est jamais stockée), limite de 5 signalements par heure. |
| **Suspension automatique** | 3 signalements de visiteurs **différents** en 7 jours suspendent le site. Les visiteurs voient « Site suspendu », et le contenu n'est plus servi. |
| **Modération admin** | Page Admin → **Sites signalés** : nombre de signalements, motifs, dernier commentaire, état, boutons **Suspendre** et **Rétablir** (rétablir remet le compteur à zéro). Le rôle admin est revérifié en base. |
| **Propriétaire informé** | Badge **Suspendu** dans sa liste de sites (page Connexions). |
| **Domaine provisoire isolé** | Si `SITES_BASE_DOMAIN` est défini, chaque site est servi sur `https://<slug>.<domaine>`. Chaque page est envoyée avec `Content-Security-Policy: sandbox` : origine opaque, aucun accès aux cookies ni au stockage, intégration dans un cadre interdite. Les pages portent un badge « Créé avec TechNova · Signaler ». La publication renvoie automatiquement la bonne adresse. Sans cette variable, rien ne change (`/s/slug`). |

## Base de données
`0028_site_reports.sql` (idempotente, rollback en en-tête) :
- colonnes `published_sites.disabled_at` et `disabled_reason` ;
- table `site_reports`, réservée au serveur ;
- fonctions `report_site` et `admin_set_site_suspension`, exécutables par `service_role` uniquement.

## Tests réels exécutés
- **Anti-phishing — 8/8 PASS :** mot de passe, carte/CVV, PIN Mobile Money, phrase crypto et faux « MTN MoMo – compte suspendu » sont bloqués ; un site vitrine avec WhatsApp et formulaire de contact, ou une simple mention d'Orange Money/Wave, est autorisé ; les fichiers CSS sont ignorés.
- **SQL — 12/12 PASS :**
  - doublon d'un même visiteur ignoré ;
  - suspension au 3e visiteur distinct ;
  - non-admin refusé ;
  - rétablissement avec remise à zéro ;
  - suspension manuelle ;
  - aucun accès depuis le navigateur.
- **Serveur construit avec un domaine simulé :**
  - sous-domaine inconnu → 404 avec en-tête `sandbox` ;
  - adresse invalide et remontée de dossier (`..`) → 404 ;
  - POST → 405 ;
  - application normale intacte ;
  - signalement mal formé → 400.
- **Non-régression :** toutes les suites SQL (63 + 12) ; `tsc` ; builds Node et Vercel OK.

## Non testé
- Un vrai site publié servi sur sous-domaine (il faut configurer le DNS).
- Le bouton Signaler et la page Admin sur ta base de production.

## Activer le domaine provisoire (facultatif)
1. Choisis un domaine dédié aux sites, idéalement **distinct** de TechNova (par exemple `technova-sites.com`) ou un sous-domaine (`sites.ton-domaine.com`).
2. Dans Vercel → **Settings → Domains**, ajoute `*.ce-domaine` (domaine générique). Vercel exige que le domaine utilise ses serveurs de noms (nameservers) pour les certificats génériques.
3. Ajoute la variable `SITES_BASE_DOMAIN=ce-domaine` sur Vercel, puis redéploie.

## Rollback
Code : commit précédent. Base : en-tête de la migration 0028.

## Prochaine phase
**Phase 9 — Go-live** : tests de sécurité complets (accès aux données d'autrui, injections, manipulation de crédits, rejeu de paiement…), sauvegarde et restauration réelles, plan de retour arrière.
