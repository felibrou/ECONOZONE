// scripts/qa-commodities.mjs
//
// Contrôle qualité automatique de la zone dynamique de Matières premières avant
// publication. Même principe que qa-essentiel.mjs : Gemini ne réécrit rien, il
// vérifie et rend une décision PASS/FAIL structurée en JSON.

import fs from 'node:fs';
import path from 'node:path';

const PAGE_PATH = path.join(process.cwd(), 'src', 'pages', 'matieres-premieres.astro');
const ZONE_START = '<!-- ZONE-DYNAMIQUE-DEBUT';
const ZONE_END = '<!-- ZONE-DYNAMIQUE-FIN -->';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY manquante.');
  process.exit(1);
}

const MODEL = 'gemini-3.6-flash';

const QA_PROMPT = `
Tu es le contrôleur qualité éditorial et technique du média économique et financier
ouest-africain ECONOZONE. Tu contrôles la zone "Marchés du jour" de la page Matières
premières — pas la page entière, seulement le tableau de cours et sa courte analyse.

IMPORTANT : tu ne dois PAS réécrire le contenu. Tu vérifies uniquement s'il peut être
publié automatiquement. Sois exigeant sur les erreurs factuelles ou techniques, mais ne
bloque pas pour de simples préférences stylistiques.

CONTRÔLES À EFFECTUER
- Cohérence des signes + / - et du codage couleur (🟢 hausse, 🔴 baisse).
- Présence de l'unité pour chaque cours (dollars/baril, dollars/once, dollars/tonne...).
- Présence d'une période ou date de comparaison pour chaque variation.
- Cohérence entre les pays exposés cités et l'incidence régionale décrite.
- Absence de comparaison graphique directe de matières premières en unités incompatibles.
- Absence de donnée absente du contexte fourni mais présentée comme certaine.
- Absence de conseil d'achat/vente personnalisé, de position privée, de portefeuille individuel.
- Aucune balise Markdown accidentelle, aucune balise <Layout> imbriquée.
- Absence de phrases du type "voici", "vous avez raison", "comme demandé", "je peux également".
- En-tête de tableau exact : Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale.

RÈGLE DE DÉCISION
Retourne FAIL uniquement si tu détectes une anomalie susceptible de provoquer une
information financière trompeuse, une incohérence importante, une erreur de structure,
une donnée privée, ou une confusion factuelle importante. Les imperfections mineures de
style ne bloquent pas la publication.

FORMAT DE RÉPONSE OBLIGATOIRE — JSON uniquement, rien avant ni après :
{
  "status": "PASS",
  "critical_errors": [],
  "warnings": ["..."],
  "summary": "..."
}
ou
{
  "status": "FAIL",
  "critical_errors": ["description précise de l'erreur"],
  "warnings": ["..."],
  "summary": "..."
}
`;

async function callGemini(content) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: QA_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `Contrôle cette zone avant publication :\n\n${content}` }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini QA API: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '')?.join('')?.trim();

  if (!text) {
    throw new Error('Gemini QA : aucune réponse exploitable.');
  }

  return text;
}

async function main() {
  console.log('');
  console.log('======================================');
  console.log('🔎 CONTRÔLE QUALITÉ — MATIÈRES PREMIÈRES');
  console.log('======================================');

  if (!fs.existsSync(PAGE_PATH)) {
    console.error(`❌ Fichier introuvable : ${PAGE_PATH}`);
    process.exit(1);
  }

  const page = fs.readFileSync(PAGE_PATH, 'utf-8');
  const startIdx = page.indexOf(ZONE_START);
  const endIdx = page.indexOf(ZONE_END);

  if (startIdx === -1 || endIdx === -1) {
    console.error('❌ Marqueurs ZONE-DYNAMIQUE introuvables — impossible de cibler le contrôle.');
    process.exit(1);
  }

  const zoneContent = page.slice(startIdx, endIdx + ZONE_END.length);

  console.log(`→ Analyse avec Gemini ${MODEL}...`);

  const response = await callGemini(zoneContent);

  let result;
  try {
    result = JSON.parse(response);
  } catch {
    console.error('❌ Gemini n\u2019a pas retourné un JSON valide.');
    console.error(response);
    process.exit(1);
  }

  console.log('');
  console.log(`Décision Gemini : ${result.status}`);

  if (Array.isArray(result.warnings) && result.warnings.length > 0) {
    console.log('');
    console.log('⚠️ Avertissements :');
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.summary) {
    console.log('');
    console.log(`Résumé : ${result.summary}`);
  }

  if (result.status !== 'PASS') {
    console.error('');
    console.error('❌ PUBLICATION AUTOMATIQUE BLOQUÉE');

    if (Array.isArray(result.critical_errors) && result.critical_errors.length > 0) {
      console.error('');
      console.error('Erreurs critiques :');
      for (const error of result.critical_errors) {
        console.error(`- ${error}`);
      }
    }

    process.exit(1);
  }

  console.log('');
  console.log('✅ Contrôle qualité réussi.');
  console.log('✅ Publication automatique autorisée.');
  console.log('======================================');
}

main().catch((err) => {
  console.error('❌ Échec du contrôle qualité :', err.message || err);
  process.exit(1);
});
