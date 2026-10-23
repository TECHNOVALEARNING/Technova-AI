# Rapport Phase 7 — Projets, versions, export, partage (V5.3)

**STATUS : PASS (code + tests locaux + vérification visuelle) · migration 0027 à exécuter**

## Existant conservé
Panneau du Studio (activité, aperçu, code, SQL), export ZIP, lien d'aperçu partagé, publication sur `/s/slug`, envoi vers GitHub.

## Nouveautés et corrections

| Sujet | Avant | Maintenant |
| --- | --- | --- |
| **Versions** | Chaque génération remplaçait la précédente dans le panneau, sans retour possible. | Sélecteur **Version 1, 2, … (dernière)** dans le panneau. Chaque génération terminée dans la conversation est une version ; l'aperçu, le code, le ZIP, le partage et la publication utilisent la version choisie (retour arrière). |
| **Secrets dans le code** | Une clé API écrite par l'IA partait telle quelle dans le ZIP, le site publié ou GitHub. | Détecteur de secrets : OpenAI/OpenRouter, jeton `service_role` Supabase, clés privées, GitHub, AWS, Stripe live, Google API, TechNova/Nyole, Slack. **ZIP** : secrets remplacés par `REMPLACEZ_PAR_VOTRE_CLE`, avec un fichier `SECRETS-RETIRES.txt` et une notification. **Publication, envoi GitHub et lien d'aperçu** : refusés tant que le secret est présent, et journalisés. La clé « anon » de Supabase, publique, n'est pas signalée. |
| **GitHub** | Dépôts créés **publics**. | Dépôts créés **privés**, comme le demande V5.3. |
| **Liens d'aperçu** | Publics, sans fin et impossibles à désactiver. | **Expiration à 30 jours** (les anciens liens expirent 30 jours après leur création), bouton **Désactiver** immédiat, et mention claire de qui peut voir le lien. |

## Fichiers
`src/lib/secret-scan.ts` (nouveau), `src/components/dashboard/Studio.tsx`, `src/components/dashboard/ChatWorkspace.tsx`, `src/components/dashboard/PublishDialog.tsx`, `src/lib/publishing.functions.ts`, `src/routes/api/public/studio-preview.$token.ts`, migration `0027_preview_link_expiry.sql`.

## Tests réels exécutés
- **Détecteur de secrets — 6/6 PASS :** clé OpenRouter, jeton `service_role` (décodé, pas deviné), Stripe live et GitHub détectés ; clé anon et fichier sain non signalés ; masquage complet.
  - Un vrai bug (caractère de contrôle à la place de `\b` dans une expression régulière) a été trouvé par ces tests, puis corrigé.
- **SQL — 3/3 PASS :** migration idempotente ; un lien de 40 jours a expiré, un lien de 2 jours reste actif ; nouveaux liens à 30 jours.
- **Dans le navigateur, sur le vrai panneau :**
  - le ZIP téléchargé contient `app.js` avec la clé remplacée et `SECRETS-RETIRES.txt` ;
  - la notification s'affiche ;
  - le passage à la version 1 affiche bien le code de la version 1.
- **Non-régression :** toutes les suites SQL précédentes (63/63) ; `tsc` ; builds Node et Vercel OK.

## Non testé
Désactivation d'un lien et refus de publication sur ta base de production (session connectée nécessaire).

## Rollback
Code : commit précédent. Base : en-tête de la migration 0027.

## Prochaine phase
**Phase 8** — domaine provisoire et protection anti-phishing des sites publiés.
