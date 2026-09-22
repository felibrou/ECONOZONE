// scripts/generate-commodities.mjs
// Lit data/daily-data.json (champ "matieres_premieres"), appelle OpenAI pour écrire
// UNIQUEMENT la zone dynamique de src/pages/matieres-premieres.astro (tableau "Marchés
// du jour" + brève analyse) — le reste de la page (grille de lecture, cartes pays,
// avertissement) reste du contenu stable, jamais régénéré.
//
// Gemini intervient séparément dans qa-commodities.mjs comme contrôleur qualité
// indépendant, sur le même modèle que qa-essentiel.mjs.
//
// Usage local : node scripts/generate-commodities.mjs
// Usage CI     : appelé par .github/workflows/daily-essentiel.yml

import fs from 'node:fs';
import path from 'node:path';
import { PROVIDERS } from './providers.mjs';

const DATA_PATH = path.join(process.cwd(), 'data', 'daily-data.json');
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'pages', 'matieres-premieres.astro');
const ZONE_START = '<!-- ZONE-DYNAMIQUE-DEBUT';
const ZONE_END = '<!-- ZONE-DYNAMIQUE-FIN -->';

const SYSTEM_PROMPT = `Tu rédiges UNIQUEMENT la section "Marchés du jour" de la page Matières premières d'ECONOZONE, un média économique et financier ouest-africain — pas la page entière.

RÈGLES STRICTES
- Utilise exclusivement les données du JSON fourni (champ "matieres_premieres") — n'invente aucun chiffre, aucune matière première absente du JSON.
- N'écris ni grille de lecture générale, ni cartes pays, ni avertissement légal — ces blocs existent déjà ailleurs sur la page et ne doivent pas être dupliqués.
- Reste bref : un tableau des cours du jour, puis 2 à 4 phrases d'analyse maximum, uniquement sur les mouvements réellement significatifs, avec priorité à l'incidence sur l'Afrique de l'Ouest.
- Codage couleur : 🟢 pour une hausse, 🔴 pour une baisse, jamais de flèche ou symbole noir.
- N'utilise jamais "Lecture" ou "Pourquoi cela compte" comme étiquette. N'adresse aucun commentaire au propriétaire du site.

RÈGLES OBLIGATOIRES POUR LE TABLEAU DES MATIÈRES PREMIÈRES

Chaque ligne publiée doit obligatoirement contenir les quatre éléments suivants :

1. Matière première
2. Cours / variation
3. Pays particulièrement exposés
4. Incidence régionale

Aucune ligne ne doit être publiée si l'un de ces éléments manque.

Pour "Cours / variation" :

- indique toujours un cours numérique précis ;
- indique toujours l'unité ;
- indique toujours la variation en pourcentage lorsqu'elle est disponible ;
- indique toujours la période ou la date de comparaison.

Exemples acceptables :

Or | 3 742,50 $/once · +0,8 % sur la séance
Brent | 71,25 $/baril · -1,2 % depuis la clôture précédente
Cacao | 6 850 $/tonne · +2,1 % sur 24 heures

Exemples interdits :

"niveau élevé"
"en hausse"
"prix ferme"
"marché stable"
"cours non précisé"

Ne remplace jamais une donnée chiffrée manquante par une appréciation qualitative.

Pour "Pays particulièrement exposés" :

cite uniquement les pays d'Afrique de l'Ouest réellement concernés par cette matière première.

Exemples :

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

Pour "Incidence régionale" :

explique en une phrase courte le canal économique principal :
recettes d'exportation, recettes fiscales, revenus agricoles,
coût des importations, carburant, transport, inflation,
balance commerciale ou investissement.

Si le cours, l'unité, la période de comparaison ou les données régionales
ne sont pas disponibles dans le contexte fourni, ne publie pas cette ligne.

N'invente jamais une valeur manquante.

FORMAT DE SORTIE
Réponds UNIQUEMENT avec le HTML suivant, sans rien avant ni après :
1. Une ligne <p class="page-meta"> indiquant la date/heure de mise à jour (utilise le champ "date" du JSON).
2. <h2>Marchés du jour</h2>
3. Un tableau <table class="z"> avec l'en-tête exact : Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale — une ligne par matière première du JSON, avec la classe up ou down sur la cellule de variation.
4. Un court paragraphe <p> d'analyse (2 à 4 phrases), sans étiquette.
Réutilise exactement les classes déjà définies sur le site (.page-meta, .z, .up, .down) — n'en invente pas de nouvelles.`;

async function main() {
  const provider = PROVIDERS.chatgpt;

  console.log('');
  console.log('==========================================');
  console.log('✍️  RÉDACTION MATIÈRES PREMIÈRES — OPENAI');
  console.log('==========================================');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY est absente des secrets GitHub.');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Fichier de données introuvable : ${DATA_PATH}`);
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Impossible de lire data/daily-data.json :', err.message || err);
    process.exit(1);
  }

  if (!data.matieres_premieres || data.matieres_premieres.length === 0) {
    console.log('ℹ️ Aucune donnée "matieres_premieres" dans daily-data.json — page inchangée.');
    return;
  }

  const userMessage = `Date : ${data.date}\n\nDonnées matières premières (JSON) :\n${JSON.stringify(data.matieres_premieres, null, 2)}\n\nGénère la zone dynamique. N'invente aucune donnée absente ou non vérifiable.`;

const userMessage =
  `Voici les données disponibles pour les matières premières :\n\n` +
  `${JSON.stringify(data, null, 2)}\n\n` +
  `Génère uniquement les lignes pour lesquelles un cours chiffré, une unité, ` +
  `une période de comparaison et une incidence ouest-africaine sont disponibles. ` +
  `N'utilise jamais une expression qualitative telle que "niveau élevé" ` +
  `à la place d'un prix numérique.`;
  
  console.log(`→ Données chargées pour le ${data.date}`);
  console.log(`→ Génération via ${provider.label}...`);

  let newZoneHtml;
  try {
    newZoneHtml = await provider.call(SYSTEM_PROMPT, userMessage);
  } catch (err) {
    console.error('');
    console.error(`❌ Échec de la rédaction avec ${provider.label} :`);
    console.error(err?.message || String(err));
    process.exit(1);
  }

  if (!newZoneHtml || !String(newZoneHtml).trim()) {
    console.error('❌ OpenAI a retourné une réponse vide.');
    process.exit(1);
  }

  newZoneHtml = String(newZoneHtml).trim();

  if (newZoneHtml.startsWith('```html') || newZoneHtml.startsWith('```')) {
    console.error('❌ OpenAI a retourné du Markdown au lieu du HTML attendu.');
    process.exit(1);
  }

  if (newZoneHtml.includes('<Layout') || newZoneHtml.includes('</Layout>')) {
    console.error('❌ OpenAI a retourné une balise <Layout>.');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_PATH)) {
    console.error(`❌ Fichier introuvable : ${OUTPUT_PATH}`);
    process.exit(1);
  }

  const pageContent = fs.readFileSync(OUTPUT_PATH, 'utf-8');
  const startIdx = pageContent.indexOf(ZONE_START);
  const endIdx = pageContent.indexOf(ZONE_END);

  if (startIdx === -1 || endIdx === -1) {
    console.error('❌ Marqueurs ZONE-DYNAMIQUE introuvables dans matieres-premieres.astro — abandon (fichier probablement modifié manuellement).');
    process.exit(1);
  }

  const zoneStartLine = pageContent.slice(startIdx, pageContent.indexOf('\n', startIdx) + 1);
  const before = pageContent.slice(0, startIdx);
  const after = pageContent.slice(endIdx);
  const newPageContent = `${before}${zoneStartLine}${newZoneHtml}\n    ${after}`;

  try {
    fs.writeFileSync(OUTPUT_PATH, newPageContent, 'utf-8');
  } catch (err) {
    console.error("❌ Impossible d'écrire matieres-premieres.astro :", err.message || err);
    process.exit(1);
  }

  console.log('');
  console.log(`✅ ${OUTPUT_PATH} — zone dynamique régénérée pour le ${data.date}.`);
  console.log(`✅ Rédacteur automatique : ${provider.label}`);
  console.log('→ Étape suivante : contrôle qualité indépendant par Gemini.');
  console.log('==========================================');
}

main().catch((err) => {
  console.error('❌ Échec général de la génération :', err?.message || err);
  process.exit(1);
});
