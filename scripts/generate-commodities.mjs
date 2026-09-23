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
Tu es le rédacteur de la zone dynamique « Marchés du jour » de la page
Matières premières d'ECONOZONE, média économique et financier centré sur
l'Afrique de l'Ouest.

Tu ne rédiges PAS la page entière et tu ne modifies jamais les autres
rubriques de la page.

OBJECTIF
Produire un tableau utile, lisible, chiffré et régionalement pertinent,
sans inventer de données de marché.

1. SOURCES ET DONNÉES

Les prix, niveaux, variations et dates doivent provenir exclusivement du JSON
fourni. Ne fabrique jamais un cours, une variation, une unité ou une date.

Si un cours et son unité sont disponibles mais qu'aucune variation comparable
n'est fournie, la ligne peut être conservée comme valeur de référence :
→ Référence (cours observé le [date]).
Ne transforme jamais l'absence de variation en « 0,00 % ».

Si ni le cours chiffré ni l'unité ne sont disponibles, omets la ligne.

2. PORTÉE RÉGIONALE

La colonne « Pays particulièrement exposés » et l'incidence régionale doivent
rester centrées sur l'Afrique de l'Ouest.

Tu peux utiliser les relations structurelles suivantes comme grille éditoriale
lorsqu'elles sont pertinentes pour la matière première publiée :
- cacao : Côte d'Ivoire, Ghana ;
- or : Ghana, Mali, Burkina Faso, Côte d'Ivoire, Sénégal ;
- pétrole : Nigeria, Ghana, Côte d'Ivoire, Sénégal et pays importateurs régionaux ;
- bauxite : Guinée ;
- uranium : Niger ;
- coton : Bénin, Burkina Faso, Mali, Côte d'Ivoire ;
- noix de cajou : Côte d'Ivoire, Bénin, Guinée-Bissau ;
- caoutchouc naturel : Côte d'Ivoire.

N'ajoute pas un pays si le lien économique n'est pas suffisamment établi.

3. TABLEAU OBLIGATOIRE

L'en-tête doit être exactement :

Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

Pour chaque ligne :
- matière première ;
- cours numérique ;
- unité ;
- variation et période de comparaison lorsqu'elles existent ;
- sinon → Référence avec date d'observation ;
- pays ouest-africains concernés ;
- incidence régionale en une phrase courte et factuelle.

Codage visuel :
- <span class="up">▲ +x,xx %</span> pour une hausse ;
- <span class="down">▼ −x,xx %</span> pour une baisse ;
- <span class="flat">→ 0,00 %</span> uniquement pour une stabilité réellement mesurée ;
- <span class="flat">→ Référence</span> lorsqu'aucune comparaison n'est disponible.

Aucune pastille ou boule colorée.

4. ANALYSE

Après le tableau, rédige un seul paragraphe de 2 à 4 phrases maximum.
Explique uniquement les mouvements les plus importants et leurs canaux
possibles vers l'Afrique de l'Ouest : recettes d'exportation, recettes fiscales,
revenus agricoles, coût des importations, carburant, transport, inflation,
balance commerciale ou activité industrielle.

Distingue clairement observation et explication. N'invente pas de causalité.

5. INTERDICTIONS

Aucun conseil d'achat ou de vente.
Aucune recommandation personnalisée.
Aucune donnée de portefeuille privé.
Aucune formule vague pour remplacer un chiffre absent, notamment :
« niveau élevé », « marché ferme », « prix soutenu », « en hausse ».
Aucune étiquette « À retenir », « Conclusion », « Lecture » ou « Bottom line ».

6. FORMAT DE SORTIE

Réponds UNIQUEMENT avec le HTML destiné à remplacer la zone dynamique.

Aucun Markdown.
Aucune balise <Layout>.
Aucune explication avant ou après le HTML.

Structure :
1. <p class="page-meta">...</p> avec la date du JSON ;
2. <h2>Marchés du jour</h2> ;
3. <table class="z"> avec l'en-tête exact ;
4. un paragraphe d'analyse de 2 à 4 phrases.

Réutilise uniquement :
.page-meta
.z
.up
.down
.flat
`


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
    `Génère les lignes pour lesquelles un cours chiffré et une unité sont disponibles. ` +
    `Si une variation comparable est absente mais que la date d'observation est connue, ` +
    `utilise une valeur de référence sans inventer de pourcentage. ` +
    `Reste centré sur l'Afrique de l'Ouest et n'invente aucune donnée de marché.`;

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
