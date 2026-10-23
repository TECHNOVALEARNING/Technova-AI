# Rapport Phase 5 — Créer (V5.3)

**STATUS : PASS pour la musique et l'estimation des coûts · Design Library non réalisée (voir plus bas) · migration 0025 à exécuter**

## Nouveautés

| Fonction | Ce qui change | Fichiers |
| --- | --- | --- |
| **Musique (Suno V6 via kie.ai)** | Dans le chat : « Crée-moi une chanson… », « fais un jingle… », « make a song… ». Le morceau est généré en environ 1 min et proposé en **une seule version** avec un lecteur audio (kie.ai en produit deux au même prix ; seule la première est conservée), et il est archivé 14 jours comme les images et vidéos. Le mot « instrumental » (ou « sans paroles ») produit un morceau sans voix. Pas de restriction de forfait. | `media-models.ts`, `media-generation.functions.ts`, `ChatMedia.tsx`, `ChatWorkspace.tsx`, migration 0025 |
| **Prix affiché avant chaque création** | Le sélecteur de modèles affiche le prix de **chaque** modèle d'image, de vidéo (pour 5 s) et de musique, en crédits. Ce montant est réservé avant la création ; seul le coût réel annoncé par kie.ai est facturé, le reste est rendu. | `ChatWorkspace.tsx` |

## Contrat API (vérifié, pas inventé)
- Documentation : docs.kie.ai/suno-api/generate-music. `POST /api/v1/jobs/createTask` avec `model: "ai-music-api/generate"` et `input { custom_mode: false, instrumental, model: "V6", prompt, style }`, puis `GET /api/v1/jobs/recordInfo`.
- **Test réel effectué** avec ta clé kie.ai (coût : 12 crédits kie ≈ 0,06 $) : tâche créée, terminée en 40 s, `creditsConsumed = 12`, résultat `resultJson.data[].audio_url` (mp3).
- Prix : 12 crédits kie par demande (liste officielle kie.ai) × 6 = **72 crédits TechNova**.

## Base de données
`0025_phase5_music.sql` : la contrainte `media_generations.kind` accepte `music`. Migration idempotente, rollback en en-tête.

## Tests réels exécutés
- **Unitaires — 10/10 PASS :**
  - requête conforme à la doc ;
  - « instrumental » détecté (un bug réel, des caractères de contrôle à la place de `\b`, a été trouvé puis corrigé grâce à ce test) ;
  - prix 72 crédits ;
  - détection dans le chat : chanson, vidéo, image, « song » ;
  - une simple question sur la musique ne lance **pas** de génération ;
  - le résultat Suno réel donne 2 mp3.
- **SQL — 2/2 PASS :** migration idempotente ; `music` accepté, type inconnu refusé.
- **API kie.ai réelle :** génération d'un morceau de bout en bout.
- Vérification des types, builds Node et Vercel OK.

## Non testé
Le parcours dans le chat connecté à ta base de production (création, attente, lecture, archivage, facturation).

## Non réalisé : Design Library
Le cahier des charges décrit une bibliothèque de « templates, composants UI, animations, polices, thèmes », sans en préciser le contenu. Plutôt que d'inventer un catalogue, je propose de la cadrer d'abord : quels modèles de sites, à quel public, intégrés au Studio ou en page séparée ?

## Rollback
Code : commit précédent. Base : en-tête de la migration 0025.

## Prochaine phase
**Phase 6** (Technova Code) est **reportée** (décision D3). Suivantes : **Phase 7** (projets : versions, export ZIP, partage privé), **Phase 8** (domaine provisoire, anti-phishing des sites publiés), **Phase 9** (go-live : tests de sécurité complets, sauvegarde et restauration).
