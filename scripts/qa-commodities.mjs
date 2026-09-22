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
Tu es le contrôleur qualité éditorial et technique du média économique et financier
ouest-africain ECONOZONE.

Tu contrôles uniquement la zone "Marchés du jour" de la page Matières premières :
le tableau de cours et sa courte analyse.

IMPORTANT :

Tu ne dois PAS réécrire le contenu.

Tu vérifies uniquement s'il peut être publié automatiquement.

Sois exigeant sur les erreurs factuelles ou techniques, mais ne bloque pas
pour de simples préférences stylistiques.

==================================================
CONTRÔLES À EFFECTUER
==================================================

Vérifie :

- cohérence des signes + / - ;
- cohérence du codage couleur :
  🟢 hausse
  🔴 baisse ;

- présence de l'unité pour chaque cours :
  dollars/baril,
  dollars/once,
  dollars/tonne,
  dollars/kg,
  etc. ;

- présence d'une période ou date de comparaison pour chaque variation ;

- cohérence entre les pays exposés cités et l'incidence régionale décrite ;

- cohérence entre le mouvement du prix et l'analyse associée ;

- absence de comparaison graphique directe de matières premières
  en unités incompatibles, sauf si les séries sont normalisées
  en base 100 ou en variations en pourcentage ;

- absence de donnée absente du contexte fourni mais présentée
  comme certaine ;

- absence de conseil d'achat ou de vente personnalisé ;

- absence de position privée ou de portefeuille individuel ;

- absence de balise Markdown accidentelle ;

- absence de balise <Layout> imbriquée ;

- absence de phrases conversationnelles telles que :
  "voici",
  "vous avez raison",
  "comme demandé",
  "je peux également".

L'en-tête du tableau doit être exactement :

Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

==================================================
RÈGLE DE DÉCISION
==================================================

Retourne FAIL uniquement si tu détectes une anomalie susceptible de provoquer :

- une information financière trompeuse ;
- une incohérence importante ;
- une erreur de structure ;
- une donnée privée ;
- une confusion factuelle importante.

Les imperfections mineures de style ne bloquent pas la publication.

==================================================
FORMAT DE RÉPONSE OBLIGATOIRE
==================================================

Réponds uniquement avec un objet JSON valide.

Si publication autorisée :

{
  "status": "PASS",
  "critical_errors": [],
  "warnings": ["..."],
  "summary": "..."
}

Si publication bloquée :

{
  "status": "FAIL",
  "critical_errors": [
    "description précise de l'erreur"
  ],
  "warnings": ["..."],
  "summary": "..."
}

Aucun texte avant ou après le JSON.
`;

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
    '✅ Publication automatique autorisée.'
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
