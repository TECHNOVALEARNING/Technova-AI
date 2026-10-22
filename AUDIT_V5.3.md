# AUDIT V5.3 — Phase 0

**STATUS : PASS (audit seul, aucune modification du code ni de la base)**
Date : 2026-10-22 · Périmètre : dépôt `TECHNOVALEARNING/Technova-AI` (commit `56dcb72`) + migrations `drizzle/migrations/0000 → 0021`.

> Limite : la base Supabase de production n'a pas été interrogée directement (mot de passe changé, ce qui est sain).
> L'état de la base est déduit des migrations. À confirmer : les migrations 0019, 0020 et 0021 ont-elles été exécutées ?

---

## 1. Architecture réelle (≠ hypothèses du prompt V5.3)

| Hypothèse V5.3 | Réalité du dépôt | Conséquence |
| --- | --- | --- |
| « Frontend Lovable existant » | Lovable entièrement retiré. TanStack Start (React 19) + Nitro, déployé sur **Vercel**. | Aucune dépendance Lovable à préserver. |
| Supabase **Edge Functions (Deno)** | **Aucune** Edge Function. Le backend = routes serveur `src/routes/api/*` + server functions `src/lib/*.functions.ts`, exécutées sur Vercel. | Les « Edge Functions » V5.3 seront des routes/server functions Vercel. Même sécurité (code serveur, secrets côté serveur), une seule plateforme à opérer. |
| Secrets dans `supabase secrets` | Secrets dans les **variables d'environnement Vercel**. | Idem : jamais dans le navigateur ni dans Git. |
| Table `wallets (balance)` | **Grand livre** `credit_transactions` (solde = somme des lignes). `credit_wallets` n'est qu'un cache. | Plus robuste (audit complet, pas de solde modifiable). À conserver ; ne pas créer de `wallets`. |
| `profiles.role = 'admin'` | Rôles dans **`user_roles`** + fonction `has_role()`. `profiles` n'a **pas** de colonne `role`. | Le SQL V5.3 qui teste `profiles.role` échouerait ou ne donnerait jamais accès. |
| `plans` + `subscriptions` (abonnement mensuel) | **`credit_packs`** = packs **prépayés à paiement unique**, sans abonnement ni expiration. Achats tracés dans `payments`. | Bloquant pour le gating vidéo « subscription.active » : voir décision D1. |

## 2. Inventaire base de données (migrations 0000–0021)

**Tables (28, RLS activé sur toutes)** : profiles, chat_threads, chat_messages, credit_transactions, credit_wallets, credit_reservations, credit_adjustments, credit_packs, credit_pricing_rules, plan_features, payments, api_keys, api_idempotency, usage_logs, rate_limits, security_events, user_roles, agents, agent_versions, registry_items, registry_favorites, media_generations, studio_jobs, studio_previews, studio_worker_config, published_sites, app_user_connections, supabase_connections.

**Fonctions SQL** : claim_welcome_bonus (50 crédits, une fois), settle_payment (crédit idempotent après paiement), reserve_credits / reserve_credits_v2 / confirm_credits / release_credits / refund_credits, get_wallet_balance, hit_rate_limit, has_role, get_shared_thread, get_pack_estimates, registry_download / registry_remix, studio_worker_arm / disarm, media_purge_arm, configure_app_url, handle_new_user (trigger profils).
Les fonctions financières sont exécutables par `service_role` uniquement (migration 0017).

**Planification** : pg_cron + pg_net (worker Studio chaque minute quand une génération tourne, purge médias quotidienne) + Vercel Cron en secours.

## 3. Inventaire applicatif

| Module V5.3 | Existant | État |
| --- | --- | --- |
| Discuter — chat multi-modèles | `/api/chat`, 15 modèles OpenRouter, TechNova Smart (auto-routing), fichiers joints (images, PDF, audio, vidéo) | ✅ fonctionnel |
| Discuter — Deep Research, Arena | — | ❌ absent |
| Créer — Images / Vidéos | kie.ai (`media-generation.functions.ts`), réservation de crédits + remboursement en cas d'échec, archivage 14 j | ✅ fonctionnel, **vidéo non restreinte** |
| Créer — Musique, Design Library | — | ❌ absent |
| Construire — Build | TechNova Studio (questions → plan → build en job serveur), aperçu iframe sandbox, publication `/s/slug`, push GitHub, partage d'aperçu | ✅ fonctionnel |
| Construire — **Technova Code** (terminal) | — | ❌ absent (cœur V5.3) |
| Agents | Agents personnalisés versionnés, budget par réponse, outils web refusés par défaut | ✅ |
| Workflows | — | ❌ absent |
| Registry | ✅ | ✅ |
| API publique | `/api/ai/chat`, clés `tn_live_` hachées, rate limit, idempotence | ✅ |
| Crédits / paiement | Nyole (Mobile Money + carte), webhook signé, `settle_payment` idempotent | ✅ |
| Admin | Statistiques + journal de sécurité | ✅ partiel — **pas de transfert de crédits** |
| Connexions | GitHub / Google Drive / Notion (OAuth direct), Supabase utilisateur (OAuth) | ✅ |

**Rate limits actuels (par compte)** : chat 30/min · studio 12/min · media 10/5 min · publish 10/10 min · connect 10/10 min · api 60/min.

## 4. Anomalies trouvées pendant l'audit (à corriger en Phase 1)

| # | Gravité | Constat |
| --- | --- | --- |
| A1 | 🔴 Haute | Le bucket Storage **`media-files`** utilisé par l'archivage des médias (`media-archive.server.ts`) n'est créé par **aucune** migration. Sur la nouvelle base Supabase, l'archivage 14 j des images/vidéos échouera. |
| A2 | 🟠 Moyenne | Chat (`/api/chat`) et Studio vérifient le solde **puis** débitent après coup, sans réservation : des requêtes simultanées peuvent rendre un solde négatif. Le moteur de réservation (`reserve_credits_v2` / `confirm_credits`) existe mais n'est utilisé que par les médias. |
| A3 | 🟠 Moyenne | La génération vidéo est accessible à tout compte ayant des crédits (pas de gating). |
| A4 | 🟡 Basse | Fichiers joints en data-URL dans la requête : Vercel limite le corps à **4,5 Mo**, alors que le code accepte jusqu'à 30 Mo. Les gros fichiers échouent sans message clair. |
| A5 | 🟡 Basse | Pas de `request_id` de corrélation dans les logs ni dans `security_events`. |

## 5. Le SQL de l'annexe A ne doit PAS être exécuté tel quel

| Bloc | Problème |
| --- | --- |
| Toutes les policies admin | Testent `profiles.role = 'admin'` → colonne inexistante. À remplacer par `public.has_role(auth.uid(), 'admin')`. |
| `transfer_credits` | Écrit dans `wallets` (inexistante) et dans `credit_transactions(user_id, type, ref_id, meta)` alors que les colonnes réelles sont `owner_id, amount, kind, label`. Insère `security_events(event_type, meta, request_id)` au lieu de `kind, severity, detail`. → La fonction planterait à chaque appel. |
| `transfer_credits` — idempotence | Sans clé fournie, la clé par défaut contient l'horodatage : deux clics = deux transferts. La clé doit être **obligatoire** et générée par l'interface. |
| `transfer_credits` — droits | Pas de `REVOKE … FROM PUBLIC`. Sans révocation, Postgres laisse tout le monde l'appeler (même faille que `refund_credits`, corrigée en 0017). |
| `check_video_access` | Dépend de `subscriptions` / `plans` / `profiles.access_level` (inexistants) et lit `auth.uid()` : une vérification lancée depuis le navigateur n'est pas une garantie serveur. |
| `credit_transfers` policy INSERT | Permet à un admin d'insérer directement des lignes « transfert » sans passer par la RPC → journal falsifiable. Aucune policy INSERT ne doit exister. |
| `uuid-ossp` | Inutile : le projet utilise `gen_random_uuid()`. |

Ces tables et fonctions seront réécrites dans les phases concernées, adaptées au schéma réel et accompagnées d'un rollback.

## 6. Technova Code — faisabilité

- **Exécution réelle de commandes** (`npm`, `python`, `git`…) impossible dans une fonction Vercel ou une Edge Function Supabase : il faut une **sandbox externe** (microVM éphémère). Options : **Vercel Sandbox** (microVM Firecracker, même facturation que l'hébergement), E2B, Daytona, Modal. → décision D3.
- Sans sandbox, seul un **MOCK-V5.3** clairement étiqueté est possible (fichiers virtuels + génération de code IA, pas d'exécution).
- **Modèles** (catalogue OpenRouter du 2026-10-07) : `deepseek/deepseek-coder` **n'existe pas** et `qwen/qwen2.5-coder-32b-instruct` s'écrit `qwen/qwen-2.5-coder-32b-instruct`. Disponibles et adaptés : `deepseek/deepseek-v4-pro` (architecture/debug), `deepseek/deepseek-v4-flash`, `qwen/qwen3-coder-flash` (rapide), `qwen/qwen3-coder-plus`, `qwen/qwen3-coder`. → décision D4.

## 7. Décisions à valider avant la Phase 1

| # | Question | Proposition |
| --- | --- | --- |
| **D1** ✅ | Gating vidéo sans abonnement : quand un compte a-t-il « Creator/Pro » ? | **Validé (option A)** : la vidéo est débloquée si le compte a **déjà acheté au moins une fois** un pack Creator ou Pro (paiement réussi dans `payments`). |
| **D2** ✅ | Crédits par pack | **Validé** : 1 000 / 2 600 / 5 500 / 8 500 (Starter / Essential / Creator / Pro). |
| **D3** ✅ | Sandbox Technova Code | **Reporté** : Technova Code reste masqué (aucune interface ni route exposée) jusqu'au choix d'une sandbox. |
| **D4** ✅ | Modèles code | **Validé** : `qwen/qwen3-coder-flash` (petites modifications), `deepseek/deepseek-v4-pro` (tâches complexes). |
| **D5** ✅ | Quotas Technova Code | **Validé** : 30 / 100 / 300 générations par heure ; Starter et Essential = « Basic » (30), Creator = 100, Pro = 300. S'appliquera quand Technova Code sera activé. |
| **D6** ✅ | Transfert admin | **Validé** : crédits créés par l'admin (pas de prélèvement sur son solde), **plafond 1 000 crédits par transfert**. |
| **D7** | Remboursement / effacement de compte | Politique à rédiger (hors code). |

## 8. Plan proposé pour les phases suivantes

- **Phase 1 — Fondations sécurité** : bucket `media-files` + policies (A1), `request_id` sur API et `security_events` (A5), réservation atomique de crédits pour chat/Studio (A2), message clair sur la taille des fichiers (A4). Tests : RLS, double-débit concurrent.
- **Phase 2 — Gating vidéo + transfert admin** : selon D1/D6. Contrôle serveur dans `createMediaGeneration` avec erreur `VIDEO_UPGRADE_REQUIRED`, journal `video_blocked_insufficient_plan`, message et boutons d'upgrade ; table `credit_transfers` + RPC `admin_transfer_credits` (service_role uniquement, clé d'idempotence obligatoire, rate limit 20/min) + page Admin → Crédits.
- **Phases 3 à 9** : selon l'ordre V5.3, chacune avec rapport PASS/BLOCKED.

**Prochaine étape : valider D1 à D6, puis lancer la Phase 1.**
