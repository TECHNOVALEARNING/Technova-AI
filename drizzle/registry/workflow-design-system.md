# Workflow — Construire un système de design cohérent

Pour que toutes vos pages, présentations et réseaux sociaux parlent la même langue visuelle.

## 1. Les fondations (tokens)
Définissez une seule fois, en variables CSS :

```css
:root {
  /* Couleurs : 1 encre, 1 fond, 1 surface, 1 accent, 3 statuts */
  --ink: #0d0d12; --bg: #fbfbfa; --surface: #ffffff; --line: #e9e9ec; --muted: #6b6b76;
  --accent: #4f46e5; --success: #16a34a; --warning: #d97706; --danger: #dc2626;
  /* Typographie : 2 familles maximum */
  --font-display: "Instrument Serif", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
  /* Espacements : base 4 px */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s6: 24px; --s8: 32px; --s12: 48px; --s16: 64px; --s24: 96px;
  /* Formes */
  --r-sm: 8px; --r-md: 14px; --r-lg: 22px;
}
```

## 2. L'échelle typographique
| Rôle | Taille | Graisse | Interlignage |
|---|---|---|---|
| Display | 64–96 px | 600 | 1.0 |
| Titre H2 | 40–48 px | 600 | 1.05 |
| Titre H3 | 20–24 px | 600 | 1.25 |
| Texte | 16–17 px | 400 | 1.6 |
| Légende | 13 px | 500 | 1.4 |

Lettres légèrement resserrées sur les grands titres (−0,03 em à −0,045 em).

## 3. Les composants
Partez du **Kit UI Monochrome** ou du **Kit UI Nuit** du Registry : boutons, champs, interrupteurs, onglets, badges, cartes, alertes, tableaux. Remplacez uniquement les variables : les composants suivent.

## 4. Les règles
1. Une seule couleur d'accent, réservée aux actions.
2. Un seul bouton principal par écran.
3. Espacements uniquement dans l'échelle.
4. Contraste AA minimum (4,5:1 pour le texte).
5. Animations courtes (200–400 ms) et désactivées si `prefers-reduced-motion`.

## 5. Le partager
Enregistrez vos variables dans **Registry → Ajouter** (format CSS, privé) pour les réutiliser dans chaque projet Studio.
