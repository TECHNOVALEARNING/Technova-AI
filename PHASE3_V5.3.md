# Rapport Phase 3 — Discuter (V5.3)

**STATUS : PASS (code + tests locaux et appels réels OpenRouter) · en attente : migration 0024 sur la base de production**

## Existant conservé
Chat multi-modèles (15 modèles OpenRouter), historique privé, fichiers joints, TechNova Smart, réservation de crédits (Phase 1).

## Nouveautés

| Fonction | Ce qui change | Fichiers |
| --- | --- | --- |
| **Mode Auto par défaut** | Le chat démarre en **TechNova Smart · Auto** (avant : GPT-4o, l'un des plus chers). Auto figure en tête du sélecteur ; choisir un modèle précis = mode Expert. | `ChatWorkspace.tsx` |
| **Deep Research** | Bouton **Recherche** (icône télescope) dans le chat. Le pipeline : 3–4 sous-questions → recherche web pour chacune (plugin web OpenRouter, 4 résultats) → rapport Markdown structuré, sources citées `[n]` et liste de sources cliquables. Les étapes s'affichent en direct (« Recherche : … », « Rédaction du rapport (8 sources)… »). Le rapport est enregistré dans la conversation. | `src/routes/api/research.ts`, `src/lib/research.ts`, `src/lib/openrouter.server.ts` |
| **Arena** | Nouvelle page **Arena** dans le menu : une question, deux modèles (choisis ou **aléatoires à l'aveugle**), réponses côte à côte, vote A / B / égalité, noms révélés après le vote, **classement** public calculé uniquement sur les votes à l'aveugle. | `ArenaPage.tsx`, `src/lib/arena.functions.ts`, route `dashboard/arena`, migration 0024 |

## Choix appliqués (modifiables)
- **Deep Research :** recherche rapide (environ 30 à 60 s), avec Gemini 2.5 Flash pour planifier, chercher et rédiger. **Facturée au coût réel** (dollars OpenRouter × 1 200, facteur de la grille tarifaire), avec un **plafond de 300 crédits** réservé avant le lancement et affiché sur le bouton. Coût mesuré : environ 9 crédits par recherche web, soit environ 40 à 80 crédits par recherche complète. Limite : 5 recherches par 10 minutes. Si la recherche échoue en cours de route, seule la partie déjà payée au fournisseur est facturée.
- **Arena :** les **deux réponses sont facturées** au tarif chat, avec réservation du maximum avant le lancement. Limite : 10 duels par 5 minutes. **Ni les questions ni les réponses ne sont stockées**, seulement les modèles, le vote et le coût.

## Base de données
`0024_phase3_arena.sql` (idempotente, rollback en en-tête) :
- table `arena_battles`, lisible par son propriétaire uniquement ; écritures réservées au serveur ;
- fonction `arena_leaderboard()`, réservée aux utilisateurs connectés.

## Tests réels exécutés
- **SQL (PGlite) — 9/9 PASS :**
  - migration idempotente ;
  - un modèle ne peut pas s'affronter lui-même ;
  - le classement ne compte que les duels à l'aveugle et votés ;
  - tri par taux de victoire, avec départage par nombre de duels ;
  - RLS (chacun ne voit que ses duels) ;
  - le navigateur ne peut pas modifier un vote ;
  - classement interdit aux visiteurs anonymes.
- **Appels réels OpenRouter — 6/6 PASS :**
  - lecture du flux Deep Research (étapes et rapport) ;
  - recherche web avec sources réelles (ex. bceao.int) ;
  - coût réel renvoyé (0,0074 $ = 9 crédits) ;
  - duel entre deux modèles ;
  - code d'erreur du fournisseur remonté (404).
- **Serveur construit :** `/api/research` refuse sans session (401), la page Arena répond.
- **Non-régression :** tests SQL Phase 1 (11/11) et Phase 2 (18/18) ; `tsc` ; builds Node et Vercel OK.

## Non testé
- Le parcours complet connecté (une Deep Research de bout en bout dans le chat, un duel puis un vote sur la page Arena) : il demande une session sur ta base de production et du solde OpenRouter.

## ⚠️ Constat important hors périmètre : grille tarifaire
Comparée aux prix OpenRouter actuels × 1 200, la grille `model-pricing.ts` **sous-facture** certains modèles :

| Modèle | Prix TechNova (crédits par million de tokens produits) | Coût réel × 1 200 |
| --- | --- | --- |
| Gemini 2.5 Flash | 720 | ≈ 3 000 |
| DeepSeek V3 | 336 | ≈ 1 235 |

Chaque réponse de ces modèles fait perdre de l'argent, et TechNova Smart les choisit souvent. Correction proposée : recalculer toute la grille à partir des prix OpenRouter × 1 200. C'est une décision de prix, donc à valider.

## Rollback
Code : commit précédent. Base : en-tête de la migration 0024.

## Variables d'environnement
Aucune nouvelle (Deep Research et Arena utilisent `OPENROUTER_API_KEY`).

## Prochaine phase
**Phase 4 — Paiement** (revue de bout en bout de Nyole), ou **Phase 5 — Créer** (musique).
