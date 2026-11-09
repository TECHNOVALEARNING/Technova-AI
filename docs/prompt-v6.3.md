# Technova AI Hub V6.3 — prompt de référence (corrigé)

> Version corrigée du prompt V6.3 du fondateur. Les corrections sont signalées par **[Corrigé]** avec la raison.
> Rien n'est construit à partir de ce document pour l'instant.

## 1. Contexte et admin

- Fondateur : Cédric Toudonou — toudonouhulk@gmail.com, seul admin.
- La page `/dashboard/admin/treasury` est visible uniquement pour lui.
  **[Corrigé]** L'accès passe par le rôle `admin` (table `user_roles` + `has_role`), revérifié côté serveur, et seul ce compte reçoit ce rôle. Un e-mail écrit en dur dans le code ou dans une politique RLS se contourne plus facilement et se maintient mal.
- Marque : TechnovaAIHub@technovaihub.com
- Langue : toute l'interface en français simple.
- Domaine : `technova.app` pour les sous-domaines des apps des utilisateurs.
  **[Corrigé]** Il faut acheter le domaine et ajouter un domaine générique `*.technova.app` sur Vercel (avec ses DNS). En attendant, les apps restent publiées sur `/s/slug`.

## 2. Stack — 3 fournisseurs seulement

- Autorisés :
  - **OpenRouter**, seul fournisseur de modèles de texte (`OPENROUTER_API_KEY`) ;
  - **KIE**, seul fournisseur de médias (`KIE_API_KEY`) ;
  - **FeexPay** et **Nyole** pour les paiements.
- **[Corrigé]** Pas de LiteLLM : `npm:litellm` n'existe pas en JavaScript (LiteLLM est une librairie Python, et son serveur proxy est exclu). OpenRouter est déjà une passerelle unique vers tous les modèles : on l'appelle directement (API compatible OpenAI).
- **[Corrigé]** Le projet reste sur la stack actuelle : TanStack Start, Supabase, Tailwind, déployé sur Vercel (preset Nitro). La logique serveur vit dans les routes `/api/*` et les fonctions serveur, pas dans des Supabase Edge Functions en double.
- Interdits :
  - Novita, Llama ;
  - clés directes Anthropic, Google ou OpenAI ;
  - FedaPay, Paystack, Fal en direct ;
  - gamification, concours, badges, niveaux, marketplace.
- Variables d'environnement : `OPENROUTER_API_KEY`, `KIE_API_KEY`, `FEEXPAY_SECRET`, `NYOLE_SECRET`. Elles sont uniquement sur Vercel, jamais dans le dépôt.

## 3. Trois modes — les noms des modèles ne s'affichent jamais

L'interface montre 3 boutons. Le moteur reste côté serveur.

| Bouton | Pour quoi | Moteur (serveur) | Crédits sans fichier / avec fichier |
|---|---|---|---|
| ⚡ Éclair | Question rapide, idée, reformulation | `google/gemini-2.0-flash-lite` | 1 / 2 |
| ⚖️ Équilibré | Coder une page, analyser un PDF, corriger un bug | `qwen/qwen3-235b-a22b`, ou `google/gemini-2.0-flash` avec un fichier | 3 / 4 |
| 🧠 Expert, forfait Creator (Starter et Essential : Éclair et Équilibré seulement) | App complète avec auth, paiement MoMo, admin | `anthropic/claude-sonnet-4` | 25 / 26 |
| 🧠 Expert, forfait Pro | App complète avec auth, paiement MoMo, admin | `anthropic/claude-opus-4` | 60 / 65 |

Expert est le même bouton dans les deux forfaits : seul le moteur change, ce qui sert d'argument pour passer à Pro.

Autres coûts :

| Action | Crédits |
|---|---|
| Image rapide | 35 |
| Image HD | 50 |
| Vidéo rapide | 350 |
| Vidéo qualité | 1 800 |
| Musique | 130 |
| Site / App | 80 |

Les crédits n'expirent jamais.
**[À décider]** Ces coûts remplacent la grille actuelle (`plans.ts`, `model-pricing`). Le changement doit s'appliquer sans toucher les crédits déjà achetés.

## 4. Base de données Supabase — sans gamification

**[Corrigé]** Le registre de crédits actuel (ledger écrit par le serveur, fonctions réservées au `service_role`) est conservé : le solde reste la somme du registre, et l'utilisateur ne peut jamais créditer son compte lui-même.

Tables :
- `credit_costs(mode, has_file, plan, credits)`
- `api_wallets(provider: openrouter | kie | feexpay | nyole, balance, threshold, recharge_link)`
- `treasury_transactions`, `daily_revenue`, `treasury_alerts`, `security_logs`, `v_treasury_dashboard`
  (pas d'`admin_users` : les rôles existants suffisent)
- `user_projects(id, user_id, name, prompt, code, preview_url, subdomain, created_at, views int default 0)`
  → bibliothèque permanente, même quand le solde de crédits est à 0.
- `user_memory(user_id, full_name, city, business_type)` → l'IA se souvient de l'utilisateur.
  Lecture et écriture limitées au propriétaire.
- `credit_history(user_id, amount, type: achat | recharge | bonus | reparation)`
  → **[Corrigé]** c'est une vue sur le registre existant, pas une deuxième source de vérité.
- `templates(id, name, prompt_base)` : Boutique MoMo MTN, École paiement scolarité, Restaurant WhatsApp, Taxi-moto GPS, Immo Bénin…

## 5. Fonctions serveur

1. **Routeur de chat** (`/api/chat`)
   - Reçoit `{message, mode, hasFile, history}`. Le forfait et l'utilisateur sont lus côté serveur, jamais envoyés par le navigateur.
   - Vérifie les crédits, choisit le modèle OpenRouter selon le mode et le forfait, puis appelle OpenRouter.
   - Débite les crédits, enregistre le résultat dans `user_projects` si c'est une app, et met à jour `user_memory`.
   - **« Ça ne marche pas ? »** relance en mode Expert gratuitement, une seule fois par app. La réparation est inscrite dans l'historique comme `reparation`, à 0 crédit.
2. **Médias** (KIE) : image rapide 20, image HD 35, vidéo rapide 350, vidéo qualité 1 800, musique 130.
3. **Webhook de paiement** : FeexPay et Nyole.
   - Vérifie la signature ou le secret.
   - Relit le statut chez le fournisseur avant de créditer, et ne crédite qu'une fois.
   - Crédite 1 000, 2 600, 5 500 ou 8 500 crédits selon le pack.
   - Ventile le montant (60 % API, 25 % bénéfice, 15 % réserve) et ajoute une ligne à `daily_revenue`.
4. **Contrôle des soldes** : tâche cron toutes les 6 h qui vérifie les soldes OpenRouter et KIE et crée une alerte `treasury_alerts` sous le seuil.
   Le solde OpenRouter se lit avec `GET /api/v1/credits`, qui demande une clé de gestion (management key).

## 6. Pages

- `/` : landing avec les 3 modes expliqués simplement et une grille de modèles africains utilisables en 1 clic.
- `/chat` :
  - les 3 boutons ⚡ | ⚖️ | 🧠 et la barre « Mes Apps » ;
  - après une génération : « Explique-moi comme si j'avais 10 ans » ;
  - « Ça ne marche pas ? On te répare gratuit ».
- `/mes-apps` :
  - tous les projets, gardés pour toujours, avec aperçu et nombre de vues ;
  - bouton « Partager sur WhatsApp » en 1 clic ;
  - bouton « Inviter un client » en lecture seule.
- `/templates` : 10 modèles 100 % Afrique, avec paiement MoMo via FeexPay déjà intégré.
- `/dashboard/admin/treasury` (admin seulement) :
  - CA du jour, coûts OpenRouter et KIE, marge (objectif 72 %) ;
  - jauges des soldes avec liens de recharge ;
  - ventes FeexPay et Nyole.

## 7. Rétention — sans gamification

1. **Effet « waouh » en 60 s.** Après un paiement confirmé, l'utilisateur arrive sur `/chat?template=boutique-momo` avec l'app déjà en ligne. Message : « Ton app est en ligne ! Partage-la sur WhatsApp ».
2. **Bibliothèque permanente.** `user_projects` n'est jamais vidé, même quand le solde est à 0. La page `/mes-apps` est la vitrine de l'utilisateur.
3. **Garantie de réparation gratuite.** Une fois par app, sans débiter de crédits, inscrite comme `reparation`.
4. **Mémoire.** `user_memory` est mise à jour à chaque échange. Le prompt système reçoit par exemple : « Tu parles à Cédric, qui crée des apps de restaurant à Abomey-Calavi. » Ces données sont présentées au modèle comme des informations, jamais comme des instructions.
5. **Alerte de crédits.** Sous 100 crédits : « Il te reste moins de 100 crédits. Pense à recharger ou à passer à un forfait supérieur. »
6. **PWA et mode économie de données.**
   - L'app est installable (déjà en place via `public/sw.js`) et `/mes-apps` s'ouvre hors ligne.
   - Réglage « Mode économie de données : ne pas charger les aperçus vidéo ».
   - Images compressées.
7. **Partage WhatsApp en 1 clic.** Texte pré-rempli : « Regarde mon app : <lien> créée avec Technova AI Hub ».

## 8. Messages d'upsell en langage simple

Notification qui glisse en bas à droite, en violet, au plus une toutes les 15 min :

- **Consommation rapide** (70 % des crédits utilisés en moins de 7 jours) : « Tu vas vite ! Passe à Essential pour avoir plus de crédits et analyser tes PDF. »
  **[Corrigé]** Les chiffres affichés (nombre de messages, de jours, de crédits) sont ceux de l'utilisateur, calculés depuis sa consommation réelle, jamais des valeurs fixes.
- **3 régénérations** : « Tu as recommencé 3 fois (<crédits réellement dépensés> crédits). En Pro, le mode Expert utilise un moteur plus puissant. »
  **[Corrigé]** La phrase « 35 % de nos agences sont en Pro » est retirée : un chiffre inventé présenté comme réel est une pratique commerciale trompeuse. On ne l'affiche que s'il est calculé depuis la base.
  **[Corrigé]** « En Pro, ça marche du premier coup » est remplacé par une promesse vérifiable : on ne peut pas garantir qu'une génération réussit.
- **Tâche complexe** (auth + paiement + tableau de bord) : badge « Tâche complexe : mode Expert recommandé ».

Fenêtre d'upsell vers Pro : quand un utilisateur Creator clique sur GitHub, « Publier sur ton GitHub et ton Supabase personnels, c'est réservé au forfait Pro ».

## 9. Livrables

- **[Corrigé]** Pas de nouveau projet Next.js séparé : les fonctionnalités manquantes s'ajoutent à l'app existante, étape par étape, avec des migrations SQL numérotées dans `drizzle/`.
- Interdits : afficher les noms des modèles, Llama, gamification, concours, marketplace.
