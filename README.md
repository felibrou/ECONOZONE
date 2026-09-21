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

## Automatiser "L'Essentiel" avec relecture humaine obligatoire

Le dossier `.github/workflows/`, `scripts/` et `data/` mettent en place un pipeline complet :

1. **Chaque matin**, vous ouvrez `data/daily-data.json` sur GitHub (bouton crayon ✏️) et vous
   remplissez les chiffres du jour (indices, radar titres, macro, marchés mondiaux, matières
   premières) — copiez le format de `data/daily-data.example.json`.
2. **Vous cliquez "Commit"** — ça déclenche automatiquement le workflow GitHub Actions.
3. Le workflow appelle l'**API Claude** avec le prompt calibré, régénère `src/pages/essentiel.astro`,
   et **ouvre une Pull Request** — le site public n'est *pas* modifié à ce stade.
4. GitHub/Vercel génère un **lien d'aperçu** de cette PR — ouvrez-le pour voir le rendu réel.
5. **Complétez la "Note de la rédaction"** directement dans la PR si besoin, relisez les chiffres.
6. **Cliquez "Merge"** — c'est ce clic, et uniquement ce clic, qui publie la nouvelle édition.

### Configuration requise (une seule fois)
Le site peut générer "L'Essentiel" avec **Claude, ChatGPT, Gemini ou Grok** — vous choisissez
le fournisseur à chaque lancement (menu déroulant dans l'onglet "Actions" de GitHub, ou
automatiquement Claude par défaut si déclenché par simple modification du fichier de données).

Sur GitHub : Settings → Secrets and variables → Actions → New repository secret, pour
**chaque** fournisseur que vous comptez utiliser (inutile de tous les configurer si vous
n'en utilisez qu'un) :

| Fournisseur | Nom du secret | Où obtenir la clé |
|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | console.anthropic.com |
| ChatGPT | `OPENAI_API_KEY` | platform.openai.com |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| Grok | `XAI_API_KEY` | console.x.ai |

**Copilot** fonctionne différemment des quatre autres — deux modes possibles, choisis
automatiquement selon ce que vous configurez :

- **Sans rien configurer de plus** : si `ANTHROPIC_API_KEY` est déjà défini (pour Claude),
  Copilot fonctionne aussitôt en mode BYOK ("Bring Your Own Key") — le prompt passe par le
  moteur d'orchestration du Copilot SDK, mais c'est Claude qui répond. Aucun coût ni compte
  Copilot nécessaire pour ce mode.
- **Mode natif (plus tard, si utile)** : ajoutez un secret `COPILOT_GITHUB_TOKEN` (un token
  GitHub avec accès Copilot) pour basculer sur un vrai modèle Copilot ("gpt-5"), facturé sur
  votre abonnement Copilot. Dès que ce secret existe, il prend automatiquement le dessus sur
  le mode BYOK.

Cette double option a été mise en place maintenant, même sans abonnement Copilot actif,
pour ne pas avoir à reconstruire l'intégration plus tard si Copilot devient l'option la
plus adaptée.

Ne mettez jamais une clé directement dans un fichier du dépôt — uniquement en secret GitHub.

**Sur GitHub Copilot** : volontairement absent de cette liste. Copilot n'a pas d'API publique
de génération de texte libre comme les quatre ci-dessus — c'est un assistant intégré aux
éditeurs de code (VS Code, etc.), pas un service qu'on peut appeler pour rédiger un article
via ce type de script automatisé. L'utiliser pour ce projet demanderait un mécanisme
entièrement différent (ouvrir le fichier dans VS Code et déclencher Copilot Chat à la main),
ce qui casserait justement l'automatisation recherchée ici.


- Les photos réelles (Abidjan/Dakar/Bamako) ne sont pas incluses dans cette version — la page `/essentiel` utilise du texte structuré sans bandeau photo pour l'instant. Ajoutez vos images dans `public/` et référencez-les en `<img src="/mon-image.jpg">`.
- Le contenu de "L'Essentiel" reste figé sur l'édition du 17 septembre 2026 — il faudra un processus pour le renouveler chaque jour (voir le prompt de génération d'article qu'on a calibré plus tôt dans le projet).
- Le statut d'Oragroup (possible sortie de cote BRVM) reste à vérifier avant publication réelle.

## Configurer le compteur de contacts SGI (page /sgi)

La page SGI affiche "X demandes de contact envoyées vers des SGI ce mois-ci" — un vrai
compteur qui s'incrémente à chaque clic sur un lien "Site officiel" vers une SGI, via
CounterAPI.dev (gratuit, sans base de données à gérer de notre côté).

**Configuration requise (une seule fois, ~2 minutes) :**
1. Créez un compte gratuit sur https://app.counterapi.dev (sans carte bancaire).
2. Créez un workspace nommé exactement `econozone`.
3. Le compteur `sgi-contact-clicks` se crée automatiquement au premier clic — rien d'autre à faire.

Le plan gratuit couvre 1 000 comptages par jour, largement suffisant pour démarrer.
Sans cette configuration, le badge affiche "—" au lieu d'un chiffre, mais le reste du site
continue de fonctionner normalement.
