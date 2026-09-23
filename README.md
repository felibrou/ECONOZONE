# ECONOZONE — Site web

Site Astro complet, prêt à déployer. Compilé et vérifié sans erreur (8 pages générées).

## Contenu inclus
- `/` — Accueil
- `/essentiel` — L'Essentiel (édition BRVM du 17 septembre 2026)
- `/sgi` — SGI & frais de courtage
- `/societes-cotees` — 47 sociétés cotées + Bridge Bank Group
- `/economie` — Économie & UEMOA
- `/matieres-premieres` — Matières premières
- `/startup` — Start-up & Investissement
- `/a-propos` — À propos & Méthodologie

## Déployer en 5 minutes sur Vercel (le plus simple)

1. Allez sur **vercel.com**, créez un compte gratuit (avec GitHub, Google ou email).
2. Cliquez **Add New → Project**.
3. Choisissez **"Deploy without Git"** (glisser-déposer), ou :
   - Créez un nouveau dépôt sur **github.com** (bouton vert "New")
   - Uploadez-y tout le contenu de ce dossier (glisser-déposer les fichiers sur la page GitHub, ou via `git push` si vous êtes à l'aise avec Git)
   - Sur Vercel, choisissez **"Import Git Repository"** et sélectionnez ce dépôt
4. Vercel détecte automatiquement Astro — laissez les réglages par défaut, cliquez **Deploy**.
5. En ~1 minute, votre site est en ligne sur une adresse `econozone-xxxx.vercel.app`.

## Ajouter votre nom de domaine (econozone.xx)

Une fois déployé : Project Settings → Domains → entrez votre domaine acheté (Namecheap, Cloudflare, etc.) → suivez les instructions DNS affichées (ajouter un enregistrement chez votre registrar). Actif en général sous 24h.

## Modifier le contenu par la suite

Chaque page est un fichier `.astro` dans `src/pages/` — c'est du HTML avec un peu de logique. Vous pouvez éditer directement le texte entre les balises, ou me redonner ce projet à modifier dans une prochaine session.

## Publication automatique quotidienne — L'Essentiel et Matières premières

Le pipeline publie directement sur `main` (donc sur le site en production) après un
double contrôle automatique — **choix assumé pour préserver la fraîcheur quotidienne de
l'information plutôt que d'introduire un délai de relecture avant chaque édition**. La
supervision humaine reste réelle, mais prend une forme différente d'une Pull Request
classique : vous suivez le déroulement du workflow **en direct** dans l'onglet Actions de
GitHub (chaque étape s'affiche au fur et à mesure, y compris la décision PASS/FAIL de
Gemini), avec la possibilité d'**interrompre l'exécution avant le push final** si quelque
chose semble anormal. Si une erreur passe malgré tout, une **correction a posteriori**
reste toujours possible par un commit normal, exactement comme pour tout le reste du site.

### Comment ça marche

1. **Chaque matin**, ouvrez `data/daily-data.json` sur GitHub (bouton crayon ✏️) et
   remplissez les chiffres du jour — copiez le format de `data/daily-data.example.json`,
   y compris le tableau `matieres_premieres` enrichi (`nom`, `cours`, `unite`,
   `variation`, `periode`, `pays_exposes`, `incidence_regionale` par matière première).
2. **Committez sur `main`** — ça déclenche automatiquement le workflow GitHub Actions.
3. **Ouvrez l'onglet Actions** pour suivre l'exécution en direct. Le workflow exécute,
   dans l'ordre, et s'arrête au premier échec :
   - **OpenAI (ChatGPT)** rédige `src/pages/essentiel.astro` ;
   - **Gemini** contrôle L'Essentiel (PASS obligatoire pour continuer) ;
   - **OpenAI** rédige la zone dynamique de `src/pages/matieres-premieres.astro`
     (uniquement le tableau "Marchés du jour" — le reste de la page, grille de lecture et
     cartes pays, est du contenu stable jamais régénéré) ;
   - **Gemini** contrôle cette zone (PASS obligatoire) ;
   - le site est compilé (`npm run build`) pour confirmer qu'il n'est pas cassé ;
   - si tout est passé, le workflow committe et pousse directement sur `main`.
   Si quelque chose semble anormal à n'importe quelle étape, **annulez le workflow**
   (bouton "Cancel workflow" dans l'onglet Actions) avant que l'étape finale de publication
   ne s'exécute.
4. **Vercel** détecte le nouveau commit et redéploie automatiquement.
5. **Une relecture reste possible après publication** — toute erreur repérée se corrige
   par un commit normal, comme n'importe quelle autre modification du site.

### Répartition des fournisseurs

| Rôle | Fournisseur | Pourquoi |
|---|---|---|
| Rédaction automatique (L'Essentiel + Matières premières) | **ChatGPT** (`gpt-5.6-luna`) | Rapide et économique pour ce volume quotidien |
| Contrôle qualité indépendant | **Gemini** (`gemini-2.5-flash`) | Modèle différent de celui qui rédige, pour une vraie vérification croisée |
| Développement et modification du site | **Claude** | Utilisé manuellement (comme dans cette conversation), pas dans le pipeline automatique |

Grok et Copilot ne sont pas utilisés dans ce pipeline — Grok par choix de coût, Copilot
car il n'a pas d'API de génération de texte libre adaptée à cet usage.

### Configuration requise (une seule fois)

Sur GitHub : Settings → Secrets and variables → Actions → New repository secret :

| Secret | Où l'obtenir |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com |
| `GEMINI_API_KEY` | aistudio.google.com |
| `ANTHROPIC_API_KEY` | console.anthropic.com (optionnel — développement du site uniquement) |

Ne mettez jamais une clé directement dans un fichier du dépôt — uniquement en secret GitHub.

### Limites connues

- Les photos réelles ne sont pas générées automatiquement — chaque `<!-- PHOTO: ... -->`
  laissé par l'IA doit être remplacé manuellement par une image en droits (voir les
  éditions déjà publiées dans `src/pages/essentiel/` pour des exemples réels, sourcés
  Wikimedia Commons).
- Le statut d'Oragroup (possible sortie de cote BRVM) reste à vérifier avant toute
  mention dans une édition.

## Configurer le compteur de clics SGI (page /sgi)

La page SGI affiche le nombre de clics sortants vers les sites des SGI — un vrai
compteur qui s'incrémente à chaque clic sur un lien "Site officiel" vers une SGI, via
CounterAPI.dev (gratuit, sans base de données à gérer de notre côté).

**Configuration requise (une seule fois, ~2 minutes) :**
1. Créez un compte gratuit sur https://app.counterapi.dev (sans carte bancaire).
2. Créez un workspace nommé exactement `econozone`.
3. Le compteur `sgi-contact-clicks` se crée automatiquement au premier clic — rien d'autre à faire.

Le plan gratuit couvre 1 000 comptages par jour, largement suffisant pour démarrer.
Sans cette configuration, le badge affiche "—" au lieu d'un chiffre, mais le reste du site
continue de fonctionner normalement.

## Pipeline Matières premières + contrôle qualité Gemini

En plus de "L'Essentiel", le workflow génère maintenant la page **Matières premières** —
mais seulement sa zone dynamique (le tableau "Marchés du jour" + une brève analyse),
délimitée par les marqueurs `<!-- ZONE-DYNAMIQUE-DEBUT -->` / `<!-- ZONE-DYNAMIQUE-FIN -->`
dans `src/pages/matieres-premieres.astro`. Le reste de la page (grille de lecture, cartes
pays "Qui gagne, qui perd") reste du contenu stable, écrit une fois et jamais régénéré —
pas de raison de payer un modèle pour réinventer des relations structurelles qui ne
changent pas d'un jour à l'autre.

Le champ `matieres_premieres` de `data/daily-data.json` doit inclure, par matière première :
`nom`, `cours`, `unite`, `variation`, `periode`, `pays_exposes`, `incidence_regionale`
(voir `data/daily-data.example.json` pour le format exact).

**Contrôle qualité Gemini** : après chaque génération (L'Essentiel *et* Matières
premières), Gemini relit le contenu produit face aux données sources et vérifie les
unités, les chiffres, le sens des variations et la cohérence régionale. Ce contrôle
n'empêche jamais la publication — le résultat est simplement ajouté à la description de
la Pull Request, pour que vous le lisiez avant de cliquer "Merge". Nécessite le secret
`GEMINI_API_KEY` (déjà configuré si vous suivez le README plus haut) ; sans lui, la PR
indique simplement que le contrôle n'a pas pu s'exécuter, sans bloquer le reste.
