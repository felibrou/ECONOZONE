// scripts/generate-commodities.mjs
//
// Lit data/daily-data.json (champ "matieres_premieres"), appelle OpenAI pour écrire
// UNIQUEMENT la zone dynamique de src/pages/matieres-premieres.astro :
// tableau "Marchés du jour" + brève analyse.
//
// Le reste de la page reste stable et n'est jamais régénéré.
//
// Gemini intervient séparément dans qa-commodities.mjs
// comme contrôleur qualité indépendant.
//
// Usage local : node scripts/generate-commodities.mjs
// Usage CI     : appelé par .github/workflows/daily-essentiel.yml

import fs from 'node:fs';
import path from 'node:path';
import { PROVIDERS } from './providers.mjs';

const DATA_PATH = path.join(
  process.cwd(),
  'data',
  'daily-data.json'
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  'src',
  'pages',
  'matieres-premieres.astro'
);

const ZONE_START = '<!-- ZONE-DYNAMIQUE-DEBUT';
const ZONE_END = '<!-- ZONE-DYNAMIQUE-FIN -->';


// -----------------------------------------------------------------------------
// PROMPT ÉDITORIAL MATIÈRES PREMIÈRES
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `
Tu rédiges UNIQUEMENT la section "Marchés du jour" de la page
Matières premières d'ECONOZONE, média économique et financier
centré sur l'Afrique de l'Ouest.

Tu ne rédiges PAS la page entière.

Le reste de la page — grille de lecture, cartes pays et avertissement —
existe déjà et ne doit jamais être dupliqué.


1. PRINCIPES GÉNÉRAUX

Utilise exclusivement les données fournies dans le JSON,
notamment le champ "matieres_premieres".

N'invente :
- aucun cours ;
- aucune variation ;
- aucune unité ;
- aucune date ;
- aucune matière première absente des données ;
- aucune information régionale non soutenue par le contexte fourni.

Si une donnée indispensable manque, ne publie pas la ligne concernée.

Reste bref :
- un tableau des cours du jour ;
- puis un paragraphe de 2 à 4 phrases maximum.

L'analyse doit porter uniquement sur les mouvements réellement significatifs
et expliquer leur incidence sur l'Afrique de l'Ouest.

Ne publie jamais de conseil d'achat ou de vente.

Ne formule aucune recommandation personnalisée.

Ne t'adresse jamais au propriétaire du site ou au lecteur comme dans
une conversation.

N'utilise jamais comme étiquette :
- "Lecture" ;
- "Pourquoi cela compte" ;
- "À retenir" ;
- "Conclusion" ;
- "Bottom line".


2. TABLEAU OBLIGATOIRE

Chaque ligne publiée doit obligatoirement contenir les quatre éléments suivants :

1. Matière première
2. Cours / variation
3. Pays particulièrement exposés
4. Incidence régionale

L'en-tête doit être exactement :

Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

Aucune ligne ne doit être publiée si l'un de ces quatre éléments manque.


3. COURS / VARIATION

Pour chaque matière première publiée :

- indique toujours un cours numérique précis ;
- indique toujours l'unité ;
- indique toujours la variation en pourcentage lorsqu'elle est disponible ;
- indique toujours la période ou la date de comparaison.

Codage visuel exclusif :

- ▲ pour une hausse ;
- ▼ pour une baisse ;
- → pour une stabilité réelle ou une valeur de référence.

Les flèches doivent être colorées avec les classes CSS :

- .up pour une hausse ;
- .down pour une baisse ;
- .flat pour une stabilité ou une référence.

Ne jamais utiliser de boules ou pastilles colorées.

Exemples acceptables :

Or | 3 742,50 $/once · ▲ +0,80 % (séance)

Brent | 71,25 $/baril · ▼ −1,20 % (depuis la clôture précédente)

Cacao | 6 850 $/tonne · ▲ +2,10 % (24 heures)

Exemples interdits :

"niveau élevé"

"en hausse"

"prix ferme"

"marché stable"

"cours non précisé"

Ne remplace jamais une donnée chiffrée manquante
par une appréciation qualitative.


4. PAYS PARTICULIÈREMENT EXPOSÉS

Indique uniquement les pays d'Afrique de l'Ouest réellement concernés
par la matière première.

Exemples de relations structurelles possibles,
uniquement lorsque cohérentes avec les données fournies :

Or :
Ghana, Mali, Burkina Faso, Côte d'Ivoire, Sénégal

Cacao :
Côte d'Ivoire, Ghana

Pétrole :
Nigeria, Ghana, Côte d'Ivoire, Sénégal

Bauxite :
Guinée

Uranium :
Niger

Ces exemples servent de grille éditoriale et ne doivent pas être utilisés
pour fabriquer une information absente du contexte.


5. INCIDENCE RÉGIONALE

Explique en une phrase courte le principal canal économique concerné :

- recettes d'exportation ;
- recettes fiscales ;
- revenus agricoles ;
- coût des importations ;
- carburant ;
- transport ;
- inflation ;
- balance commerciale ;
- investissement ;
- activité industrielle.

Le commentaire doit rester descriptif et neutre.

Évite toute formulation pouvant être interprétée comme
une recommandation d'investissement.


6. RÈGLE DE SÉLECTION

Si le cours, l'unité, la période de comparaison
ou les données régionales nécessaires ne sont pas disponibles,
ne publie pas la ligne.

N'invente jamais une valeur manquante.


7. FORMAT DE SORTIE

Réponds UNIQUEMENT avec le HTML destiné à remplacer
la zone dynamique existante.

Aucun Markdown.

Aucune balise <Layout>.

Aucune explication avant ou après le HTML.

Structure obligatoire :

1. Une ligne :

<p class="page-meta">...</p>

indiquant la date de mise à jour à partir du champ "date" du JSON.

2. Le titre :

<h2>Marchés du jour</h2>

3. Un tableau :

<table class="z">

avec l'en-tête exact :

Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

4. Un paragraphe <p> de 2 à 4 phrases maximum.

Réutilise uniquement les classes existantes :

.page-meta
.z
.up
.down
.flat

N'invente pas de nouvelle classe CSS.
`;


// -----------------------------------------------------------------------------
// GÉNÉRATION
// -----------------------------------------------------------------------------

async function main() {
  const provider = PROVIDERS.chatgpt;

  console.log('');
  console.log('==========================================');
  console.log('✍️  RÉDACTION MATIÈRES PREMIÈRES — OPENAI');
  console.log('==========================================');


  // ---------------------------------------------------------------------------
  // Vérification du fournisseur
  // ---------------------------------------------------------------------------

  if (!provider) {
    console.error(
      '❌ Le fournisseur "chatgpt" est absent de scripts/providers.mjs.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérification de la clé OpenAI
  // ---------------------------------------------------------------------------

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      '❌ OPENAI_API_KEY est absente des secrets GitHub.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérification du fichier de données
  // ---------------------------------------------------------------------------

  if (!fs.existsSync(DATA_PATH)) {
    console.error(
      `❌ Fichier de données introuvable : ${DATA_PATH}`
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Lecture du JSON
  // ---------------------------------------------------------------------------

  let data;

  try {
    const raw = fs.readFileSync(
      DATA_PATH,
      'utf-8'
    );

    data = JSON.parse(raw);

  } catch (err) {
    console.error(
      '❌ Impossible de lire data/daily-data.json :',
      err?.message || err
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérification de la date
  // ---------------------------------------------------------------------------

  if (!data.date) {
    console.error(
      '❌ Le champ "date" est absent de data/daily-data.json.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérification des données matières premières
  // ---------------------------------------------------------------------------

  if (
    !data.matieres_premieres ||
    (
      Array.isArray(data.matieres_premieres) &&
      data.matieres_premieres.length === 0
    )
  ) {
    console.log(
      'ℹ️ Aucune donnée "matieres_premieres" exploitable dans daily-data.json.'
    );

    console.log(
      '→ La page Matières premières reste inchangée.'
    );

    return;
  }


  // ---------------------------------------------------------------------------
  // Construction du message envoyé à OpenAI
  // ---------------------------------------------------------------------------

  const userMessage =
    `Date : ${data.date}\n\n` +
    `Données matières premières disponibles :\n\n` +
    `${JSON.stringify(data.matieres_premieres, null, 2)}\n\n` +
    `Génère uniquement les lignes pour lesquelles les données permettent ` +
    `d'afficher un cours chiffré, une unité, une période ou date de comparaison, ` +
    `des pays ouest-africains réellement exposés et une incidence régionale exploitable. ` +
    `N'invente aucune valeur. ` +
    `N'utilise jamais une expression qualitative telle que "niveau élevé" ` +
    `à la place d'un prix numérique.`;

  console.log(
    `→ Données chargées pour le ${data.date}`
  );

  console.log(
    `→ Génération via ${provider.label}...`
  );


  // ---------------------------------------------------------------------------
  // Appel OpenAI
  // ---------------------------------------------------------------------------

  let newZoneHtml;

  try {
    newZoneHtml = await provider.call(
      SYSTEM_PROMPT,
      userMessage
    );

  } catch (err) {
    console.error('');

    console.error(
      `❌ Échec de la rédaction avec ${provider.label} :`
    );

    console.error(
      err?.message || String(err)
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérification de la réponse
  // ---------------------------------------------------------------------------

  if (
    !newZoneHtml ||
    !String(newZoneHtml).trim()
  ) {
    console.error(
      '❌ OpenAI a retourné une réponse vide.'
    );

    process.exit(1);
  }

  newZoneHtml = String(
    newZoneHtml
  ).trim();


  // ---------------------------------------------------------------------------
  // Bloquer le Markdown
  // ---------------------------------------------------------------------------

  if (
    newZoneHtml.startsWith('```html') ||
    newZoneHtml.startsWith('```')
  ) {
    console.error(
      '❌ OpenAI a retourné du Markdown au lieu du HTML attendu.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Bloquer un Layout imbriqué
  // ---------------------------------------------------------------------------

  if (
    newZoneHtml.includes('<Layout') ||
    newZoneHtml.includes('</Layout>')
  ) {
    console.error(
      '❌ OpenAI a retourné une balise <Layout>.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Vérifier la page cible
  // ---------------------------------------------------------------------------

  if (!fs.existsSync(OUTPUT_PATH)) {
    console.error(
      `❌ Fichier introuvable : ${OUTPUT_PATH}`
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Lire la page actuelle
  // ---------------------------------------------------------------------------

  const pageContent = fs.readFileSync(
    OUTPUT_PATH,
    'utf-8'
  );

  const startIdx =
    pageContent.indexOf(ZONE_START);

  const endIdx =
    pageContent.indexOf(
      ZONE_END,
      startIdx
    );


  // ---------------------------------------------------------------------------
  // Vérifier les marqueurs dynamiques
  // ---------------------------------------------------------------------------

  if (
    startIdx === -1 ||
    endIdx === -1 ||
    endIdx <= startIdx
  ) {
    console.error(
      '❌ Marqueurs ZONE-DYNAMIQUE introuvables ou incohérents dans matieres-premieres.astro.'
    );

    console.error(
      '→ Abandon pour éviter de modifier accidentellement le reste de la page.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Identifier la fin de la ligne du marqueur de début
  // ---------------------------------------------------------------------------

  const startLineEnd =
    pageContent.indexOf(
      '\n',
      startIdx
    );

  if (startLineEnd === -1) {
    console.error(
      '❌ Le marqueur ZONE-DYNAMIQUE-DEBUT est mal formé.'
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Construire la nouvelle page
  // ---------------------------------------------------------------------------

  const before =
    pageContent.slice(
      0,
      startLineEnd + 1
    );

  const after =
    pageContent.slice(
      endIdx
    );

  const newPageContent =
    `${before}${newZoneHtml}\n${after}`;


  // ---------------------------------------------------------------------------
  // Écriture du fichier
  // ---------------------------------------------------------------------------

  try {
    fs.writeFileSync(
      OUTPUT_PATH,
      newPageContent,
      'utf-8'
    );

  } catch (err) {
    console.error(
      "❌ Impossible d'écrire matieres-premieres.astro :",
      err?.message || err
    );

    process.exit(1);
  }


  // ---------------------------------------------------------------------------
  // Confirmation
  // ---------------------------------------------------------------------------

  console.log('');

  console.log(
    `✅ ${OUTPUT_PATH} — zone dynamique régénérée pour le ${data.date}.`
  );

  console.log(
    `✅ Rédacteur automatique : ${provider.label}`
  );

  console.log(
    '→ Étape suivante : contrôle qualité indépendant par Gemini.'
  );

  console.log(
    '=========================================='
  );
}


// -----------------------------------------------------------------------------
// EXÉCUTION
// -----------------------------------------------------------------------------

main().catch((err) => {
  console.error(
    '❌ Échec général de la génération :',
    err?.message || err
  );

  process.exit(1);
});
