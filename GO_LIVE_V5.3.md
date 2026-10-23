# Checklist go-live V5.3

Légende : ✅ fait et testé · 🟡 fait, à vérifier en production · ⬜ action de ta part

## Code et base (fait)
- ✅ Plans Creator 4 999 F et Pro 7 699 F en base ; prix lus depuis `credit_packs`, rien en dur pour la facturation
- ✅ Gating vidéo côté serveur (Creator/Pro) et sites web (Essential/Creator/Pro), testé en SQL
- ✅ Message d'upgrade + boutons (vidéo et sites)
- ✅ Transfert de crédits admin : atomique, idempotent, plafonné à 1 000, journalisé
- ⏸️ Technova Code : reporté (décision D3)
- ✅ Aucun secret dans le frontend (variables serveur uniquement ; config publique = URL + clé publishable)
- ✅ RLS sur toutes les tables, fonctions financières réservées au serveur, webhook signé et idempotent, limites d'usage
- ✅ Expiration des médias à 14 jours ; export ZIP sans secrets
- ✅ Anti-phishing sur les sites publiés + signalement + suspension
- ✅ Aucun mock critique restant
- ✅ 47 tests d'intrusion + suites SQL des phases 1 à 8 au vert

## À vérifier en production avec de vrais comptes (🟡)
- 🟡 Un paiement Nyole réel de bout en bout (Mobile Money + carte) crédite **une seule fois**
- 🟡 Un compte Starter est bloqué sur la vidéo et les sites ; un compte Creator/Pro passe
- 🟡 Transfert de crédits depuis Admin ; signalement d'un site puis modération
- 🟡 Deep Research, Arena, musique avec le solde OpenRouter / kie.ai rechargé

## Actions de ta part avant l'ouverture publique (⬜)
1. ⬜ **Sauvegardes Supabase**
   - Vérifie dans **Database → Backups** que des sauvegardes quotidiennes existent. Elles sont incluses à partir du plan Pro ; l'option « Point in Time Recovery » est recommandée pour des paiements.
   - Fais **un test de restauration** : crée un projet Supabase de test, puis restaure-y une sauvegarde, ou exécute, depuis un ordinateur où Postgres est installé :
     ```bash
     pg_dump "$DATABASE_URL" --no-owner --no-acl -Fc -f technova.dump
     ```
     puis `pg_restore -d "$URL_PROJET_TEST" technova.dump`.
   - Enfin, vérifie que la connexion et les soldes sont corrects dans le projet de test.
2. ⬜ **Comptes admin protégés par MFA** : Supabase → Authentication → Multi-Factor, puis active l'authentificateur sur chaque compte admin.
3. ⬜ **Anti-abus des inscriptions** (bonus de bienvenue de 50 crédits) : active la **confirmation d'e-mail** et le **CAPTCHA** (Turnstile ou hCaptcha) dans Supabase → Authentication → Attack Protection.
4. ⬜ Clé Nyole `af_live_…`, webhook configuré, `NYOLE_ALLOW_TEST_PAYMENTS` absent en production.
5. ⬜ Désactiver **Vercel Authentication** (Deployment Protection) pour rendre le site public.
6. ⬜ Supprimer le projet Lovable une fois l'export des anciennes données fait.
7. ⬜ Politique de remboursement et d'effacement de compte (D7), plus mentions légales.

## Plan de retour arrière
- **Code :** dans Vercel → Deployments, choisis le dernier déploiement sain → **Promote to Production** (instantané).
- **Base :** chaque migration documente son rollback en en-tête ; en cas de corruption, restauration de la sauvegarde (point 1).
