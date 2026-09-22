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
