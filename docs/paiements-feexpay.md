# Paiements : FeexPay + Nyole

## Comment les paiements sont répartis

| Moyen de paiement | Prestataire | Repli automatique |
|---|---|---|
| Carte bancaire (Visa, Mastercard) | **FeexPay** (page de paiement 3-D Secure) | Nyole si FeexPay refuse ou est indisponible |
| Mobile Money d'un pays et d'un opérateur couverts par FeexPay | **FeexPay** | Nyole si FeexPay refuse ou est indisponible |
| Mobile Money d'un autre pays ou d'un autre opérateur | **Nyole** (page de paiement hébergée) | — |

Opérateurs envoyés à FeexPay :

| Pays | Opérateurs | Confirmation |
|---|---|---|
| Bénin | MTN MoMo, Moov Money, Celtiis Cash | code secret sur le téléphone |
| Togo | T-Money (Togocom), Flooz (Moov) | code secret sur le téléphone |
| Côte d'Ivoire | MTN MoMo | code secret sur le téléphone |
| Côte d'Ivoire | Orange Money, Moov Money, Wave | page de l'opérateur |
| Sénégal | Orange Money, Wave | page de l'opérateur |
| Sénégal | Free Money | code secret sur le téléphone |
| Burkina Faso | Moov Money (code), Wave (page) | production uniquement |
| Congo | MTN MoMo | code secret sur le téléphone |

Coris Money (Bénin) et Orange Money (Burkina Faso) demandent un code SMS ou USSD supplémentaire. Ils passent par Nyole.

Le choix est fait par le serveur (`src/lib/payment-routing.ts` et `src/lib/payments.functions.ts`). Le navigateur se contente de proposer le moyen de paiement. Les crédits ne sont accordés qu'après une vérification du statut auprès du prestataire (`src/lib/payments.server.ts`), une seule fois par paiement.

## Configuration à faire

### 1. Dans le tableau de bord FeexPay

1. Récupérez l'**identifiant de la boutique** (Shop ID) et la **clé API** :
   - en test, la clé commence par `test_key_` ;
   - en production, elle commence par `fp_`.
2. **Activez les paiements par carte** sur la boutique. FeexPay demande pour cela une vérification de l'entreprise (KYB). Tant qu'elle n'est pas faite, les cartes passent automatiquement par Nyole.
3. **Webhook** :
   - URL : `https://www.technovaihub.com/api/public/feexpay-webhook`
   - Type d'authentification : `Bearer`
   - Valeur : une longue chaîne aléatoire que vous générez vous-même (voir plus bas).
4. **Restriction d'adresses IP** : si FeexPay propose de limiter la clé à certaines adresses IP, laissez cette option **désactivée**. Vercel n'a pas d'adresse IP fixe, et les appels seraient refusés (erreur `ERR_IP_NOT_AUTHORIZED`).

Pour générer la valeur secrète du webhook, sur votre ordinateur :

```bash
openssl rand -hex 32
```

Copiez le résultat dans FeexPay (valeur du Bearer) et dans Vercel (`FEEXPAY_WEBHOOK_SECRET`). Ne l'écrivez nulle part ailleurs.

### 2. Dans Vercel (Settings → Environment Variables, environnement Production)

| Variable | Valeur |
|---|---|
| `FEEXPAY_API_KEY` | la clé API FeexPay (`test_key_…` pour tester, puis `fp_…`) |
| `FEEXPAY_SHOP_ID` | l'identifiant de la boutique |
| `FEEXPAY_WEBHOOK_SECRET` | la valeur générée avec `openssl rand -hex 32` |

Les variables Nyole existantes (`NYOLE_SECRET_KEY`, `NYOLE_WEBHOOK_SECRET`) restent en place : Nyole sert de second prestataire.

Ces secrets se mettent **uniquement dans Vercel**, jamais dans un fichier du dépôt. Le fichier `.env.example` ne contient que les noms des variables.

Après avoir ajouté les variables, **redéployez** le projet dans Vercel pour qu'elles soient prises en compte.

### 3. Tester avant d'ouvrir au public

1. Commencez avec la clé `test_key_…`. Le tableau de bord affiche alors l'avis « Mode test ».
2. En production, un paiement de test n'accorde jamais de crédits, sauf si vous ajoutez temporairement `NYOLE_ALLOW_TEST_PAYMENTS=true` dans Vercel le temps du test. Retirez-la ensuite.
3. Faites un paiement par opérateur que vous utilisez le plus (par exemple MTN Bénin) :
   - la fenêtre « Confirmez sur votre téléphone » s'affiche ;
   - après la validation, l'animation « Paiement réussi » apparaît et les crédits sont ajoutés.
4. Remplacez ensuite la clé par `fp_…` et redéployez.

Sans variable FeexPay, tout continue de passer par Nyole, comme avant.

## Suivi

- Chaque bascule vers Nyole est enregistrée dans le journal de sécurité avec l'événement `payment_fallback_nyole` et sa raison.
- Un webhook refusé (mauvais Bearer) est enregistré comme `payment_webhook_invalid_signature`.
- La tâche planifiée existante revérifie aussi les paiements FeexPay en attente depuis moins de 72 heures, si un webhook se perd.
