// scripts/qa-commodities.mjs
//
// Contrôle qualité automatique de la zone dynamique de Matières premières
// avant publication.
//
// Modèle principal : Gemini 3.6 Flash
// Fallback : Gemini 3.5 Flash-Lite
//
// Gemini ne réécrit rien : il contrôle et rend PASS / FAIL.

import fs from 'node:fs';
import path from 'node:path';

const PAGE_PATH = path.join(
  process.cwd(),
  'src',
  'pages',
  'matieres-premieres.astro'
);

const ZONE_START = '<!-- ZONE-DYNAMIQUE-DEBUT';
const ZONE_END = '<!-- ZONE-DYNAMIQUE-FIN -->';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY manquante.');
  process.exit(1);
}

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

const MAX_RETRIES = 3;

const QA_PROMPT = `
Tu es le contrôleur qualité indépendant d'ECONOZONE pour la zone
« Marchés du jour » de la page Matières premières.

Tu ne réécris rien. Tu rends uniquement PASS ou FAIL avec des motifs précis.

Vérifie :
- prix chiffré et unité pour chaque ligne ;
- signe de la variation cohérent avec ▲ ou ▼ ;
- classe CSS .up pour ▲, .down pour ▼, .flat pour → ;
- période/date de comparaison lorsqu'une variation est affichée ;
- si la variation manque, autorise → Référence uniquement si une date
  d'observation est fournie ; ne l'interprète pas comme 0,00 % ;
- cohérence entre matière première, pays ouest-africains exposés et incidence régionale ;
- absence de conseil d'investissement ;
- absence de donnée privée ;
- absence de Markdown et de balise <Layout> ;
- absence de texte conversationnel ou d'instruction interne ;
- absence de formule vague utilisée à la place d'un prix ;
- absence de pastilles ou boules colorées pour représenter la tendance.

L'en-tête doit être exactement :
Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

Retourne FAIL uniquement pour une erreur susceptible de rendre l'information
trompeuse, incohérente ou techniquement impropre à la publication.
Les préférences stylistiques mineures vont dans warnings.

Réponds uniquement avec un objet JSON valide :

{
  "status": "PASS" ou "FAIL",
  "critical_errors": [],
  "warnings": [],
  "summary": "..."
}

Aucun texte avant ou après le JSON.
`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return [
    429,
    500,
    502,
    503,
    504
  ].includes(status);
}

async function callGeminiOnce(model, content) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: QA_PROMPT
          }
        ]
      },

      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Contrôle cette zone avant publication :\n\n${content}`
            }
          ]
        }
      ],

      generationConfig: {
        maxOutputTokens: 2000,
        responseMimeType: 'application/json'
      }
    })
  });

  const responseText = await res.text();

  if (!res.ok) {
    const error = new Error(
      `Gemini QA API: ${res.status} ${responseText}`
    );

    error.status = res.status;

    throw error;
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      'Gemini QA : réponse API illisible.'
    );
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      ?.join('')
      ?.trim();

  if (!text) {
    throw new Error(
      `Gemini QA (${model}) : aucune réponse exploitable.`
    );
  }

  return text;
}

async function callGeminiWithRetry(model, content) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      console.log(
        `→ ${model} — tentative ${attempt}/${MAX_RETRIES}`
      );

      return await callGeminiOnce(
        model,
        content
      );

    } catch (err) {
      lastError = err;

      console.error(
        `⚠️ ${model} — tentative ${attempt} échouée :`
      );

      console.error(
        err.message || err
      );

      if (
        !isRetryableStatus(err.status) ||
        attempt === MAX_RETRIES
      ) {
        break;
      }

      const waitTime =
        attempt === 1
          ? 5000
          : attempt === 2
            ? 10000
            : 15000;

      console.log(
        `→ Nouvelle tentative dans ${waitTime / 1000} secondes...`
      );

      await sleep(waitTime);
    }
  }

  throw lastError;
}

async function callGemini(content) {
  try {
    console.log('');
    console.log(
      `→ Contrôle principal avec ${PRIMARY_MODEL}`
    );

    return {
      text: await callGeminiWithRetry(
        PRIMARY_MODEL,
        content
      ),
      model: PRIMARY_MODEL
    };

  } catch (primaryError) {
    console.error('');
    console.error(
      `⚠️ ${PRIMARY_MODEL} reste indisponible.`
    );

    console.log(
      `→ Bascule sur ${FALLBACK_MODEL}...`
    );

    try {
      return {
        text: await callGeminiWithRetry(
          FALLBACK_MODEL,
          content
        ),
        model: FALLBACK_MODEL
      };

    } catch (fallbackError) {
      console.error('');
      console.error(
        '❌ Les deux modèles Gemini ont échoué.'
      );

      throw new Error(
        `Principal : ${primaryError.message}\n` +
        `Fallback : ${fallbackError.message}`
      );
    }
  }
}

async function main() {
  console.log('');
  console.log('======================================');
  console.log('🔎 CONTRÔLE QUALITÉ — MATIÈRES PREMIÈRES');
  console.log('======================================');

  if (!fs.existsSync(PAGE_PATH)) {
    console.error(
      `❌ Fichier introuvable : ${PAGE_PATH}`
    );

    process.exit(1);
  }

  const page = fs.readFileSync(
    PAGE_PATH,
    'utf-8'
  );

  const startIdx =
    page.indexOf(ZONE_START);

  const endIdx =
    page.indexOf(ZONE_END);

  if (
    startIdx === -1 ||
    endIdx === -1 ||
    endIdx <= startIdx
  ) {
    console.error(
      '❌ Marqueurs ZONE-DYNAMIQUE introuvables ou incohérents.'
    );

    process.exit(1);
  }

  const zoneContent =
    page.slice(
      startIdx,
      endIdx + ZONE_END.length
    );

  let geminiResponse;

  try {
    geminiResponse =
      await callGemini(zoneContent);

  } catch (err) {
    console.error('');
    console.error(
      '❌ Impossible d’effectuer le contrôle qualité Gemini.'
    );

    console.error(
      err.message || err
    );

    process.exit(1);
  }

  let result;

  try {
    result =
      JSON.parse(geminiResponse.text);

  } catch {
    console.error(
      '❌ Gemini n’a pas retourné un JSON valide.'
    );

    console.error(
      geminiResponse.text
    );

    process.exit(1);
  }

  console.log('');
  console.log(
    `Modèle QA utilisé : ${geminiResponse.model}`
  );

  console.log(
    `Décision Gemini : ${result.status}`
  );

  if (
    Array.isArray(result.warnings) &&
    result.warnings.length > 0
  ) {
    console.log('');
    console.log('⚠️ Avertissements :');

    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.summary) {
    console.log('');
    console.log(
      `Résumé : ${result.summary}`
    );
  }

  if (result.status !== 'PASS') {
    console.error('');
    console.error(
      '❌ PUBLICATION AUTOMATIQUE BLOQUÉE'
    );

    if (
      Array.isArray(result.critical_errors) &&
      result.critical_errors.length > 0
    ) {
      console.error('');
      console.error(
        'Erreurs critiques :'
      );

      for (
        const error
        of result.critical_errors
      ) {
        console.error(
          `- ${error}`
        );
      }
    }

    process.exit(1);
  }

  console.log('');
  console.log(
    '✅ Contrôle qualité réussi.'
  );

  console.log(
    '✅ Zone Matières premières validée pour publication.'
  );

  console.log(
    '======================================'
  );
}

main().catch((err) => {
  console.error(
    '❌ Échec du contrôle qualité :',
    err?.message || err
  );

  process.exit(1);
});
