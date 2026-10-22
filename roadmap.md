# Roadmap

## Terminé
- [x] Archivage médias 14 j : résultats kie.ai copiés dans le bucket privé media-files, servis via URLs signées (1 h), purge quotidienne planifiée (/api/public/media-purge)
- [x] Console admin & rôles : statistiques (comptes, crédits distribués/consommés, usage par modèle sur 30 j, médias) + journal de sécurité, vérification serveur via has_role
- [x] Outils des agents : web_search et web_fetch actifs côté serveur dans /api/chat, deny-by-default, outils sensibles verrouillés

- [x] Moteur de crédits V4 : wallets, réservations, packs (6 formules), règles de prix, ajustements + RPC get_wallet_balance / reserve_credits_v2 / confirm_credits / release_credits / refund_credits (testés)

## En attente
- [ ] Paiement Technova PAY (bloquant : choix du prestataire) — brancher sur credit_packs + confirm_credits
- [ ] Connexion GitHub (approbation refusée par l'utilisateur)
- [ ] Nommer un compte administrateur (besoin de l'e-mail)
- [ ] Domaine techlovaai.space (non acheté)
- [x] Registry / Bundles / Remix (bibliothèque, licences, favoris, téléchargement, partage, remix)
