// scripts/qa-essentiel.mjs
//
// Contrôle qualité automatique de L'Essentiel avant publication.
//
// Modèle principal : Gemini 3.6 Flash
// Fallback : Gemini 3.5 Flash-Lite
//
// Le script :
// 1. lit src/pages/essentiel.astro
// 2. contrôle le contenu avec Gemini
// 3. retente automatiquement en cas de panne temporaire
// 4. bascule sur Flash-Lite si nécessaire
// 5. autorise ou bloque la publication avec PASS / FAIL

import fs from 'node:fs';
import path from 'node:path';

const PAGE_PATH = path.join(
  process.cwd(),
  'src',
  'pages',
  'essentiel.astro'
);

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY manquante.');
  process.exit(1);
}

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

const MAX_RETRIES = 3;

const QA_PROMPT = `
Tu es le contrôleur qualité éditorial et technique indépendant d'ECONOZONE.

Tu contrôles une édition de :
« L'ESSENTIEL | BRVM • ÉCONOMIE • MARCHÉS ».

Tu ne réécris jamais l'article. Tu vérifies s'il est prêt à être publié.

1. QUALITÉ ÉDITORIALE
L'édition doit être substantielle, contextualisée, pédagogique et centrée sur
l'Afrique de l'Ouest. Elle ne doit pas être une succession de chiffres sans
explication. Les faits doivent être distingués des analyses et hypothèses.

N'accepte pas une édition manifestement squelettique lorsqu'elle prétend être
une édition complète de clôture.

2. BRVM
Vérifie la cohérence entre :
- date de séance ;
- BRVM Composite ;
- BRVM 30 ;
- BRVM Prestige ;
- transactions ;
- Top / Flop lorsqu'ils sont présents ;
- commentaires associés ;
- dividendes, opérations sur titres et faits corporate.

Les variations doivent utiliser :
▲ + classe .up pour une hausse ;
▼ + classe .down pour une baisse ;
→ + classe .flat pour stabilité ou référence.

Aucune recommandation d'achat, vente, renforcement ou allègement.

3. SOURCES
Les données BRVM doivent privilégier les sources officielles BRVM.
Pour la macro régionale, privilégier BCEAO, UEMOA, CEDEAO, FMI, Banque mondiale,
BAD et institutions publiques compétentes.

Bloomfield Investment Corporation est une source de référence pour les
notations financières/crédit des États ouest-africains et des sociétés cotées
lorsqu'une notation est disponible. Lorsqu'une notation Bloomfield est citée,
vérifie la présence de la note, de la perspective si disponible, de la date
et d'un lien source.

Bridge Securities peut être utilisé comme source complémentaire de contenu
pour données de marché, volumes, matières premières, émissions souveraines,
actualités corporate et macro-régionales.

Les médias financiers de référence peuvent compléter le contexte, mais ne
doivent pas remplacer une source primaire disponible pour un fait officiel.

Vérifie l'absence de liens manifestement incomplets, de source inventée,
de placeholder « URL ici » ou de note interne.

4. AFRIQUE DE L'OUEST
Un sujet international ne doit être conservé que si le canal de transmission
vers l'Afrique de l'Ouest est expliqué : énergie, dollar, taux, financement,
commerce, recettes d'exportation, inflation, flux de capitaux ou autre canal
économique concret.

5. VISUELS ET GRAPHIQUES
Les commentaires HTML du type :
<!-- PHOTO: ... -->
<!-- GRAPHIQUE: ... -->
ne sont PAS des visuels publiables et constituent une erreur critique s'ils
restent dans une édition destinée au public.

Une édition complète doit comporter au moins un véritable visuel intégré,
par exemple une balise <img> avec alt descriptif ou un graphique SVG réel,
lorsque l'actualité s'y prête.

Un graphique doit être fondé sur des données explicites, datées et sourcées.
N'accepte pas un Sankey ou autre graphique fabriqué à partir de données
insuffisantes.

6. STRUCTURE
La structure cible est :
- masthead / titre et date ;
- chapô ;
- BRVM et sociétés cotées ;
- économie/finance UEMOA ou CEDEAO ;
- start-up, innovation, high-tech ou infrastructures si actualité pertinente ;
- marchés internationaux seulement avec incidence régionale ;
- matières premières pertinentes ;
- sources ;
- note de la rédaction.

Les rubriques « Les repères à retenir » et « Repères de séance » sont
définitivement interdites car redondantes.

7. MATIÈRES PREMIÈRES
Vérifie prix, unité, variation ou référence datée, pays exposés et incidence
régionale. Ne pas accepter une comparaison graphique de séries aux unités
incompatibles sauf normalisation explicite.

8. CONTENU PRIVÉ
FAIL immédiat si l'article contient des quantités détenues, coûts moyens,
gains/pertes privés, ordres autorisés, zones personnelles d'achat, décisions
issues d'un moteur privé ou toute donnée personnelle non destinée au public.

9. HTML / ASTRO
Vérifie :
- absence de Markdown accidentel ;
- structure HTML cohérente ;
- aucune balise <Layout> imbriquée dans une autre ;
- aucune phrase conversationnelle IA (« voici votre article », « comme demandé »,
  « vous avez raison », etc.) ;
- aucune instruction interne publiée.

10. DÉCISION
Retourne FAIL pour :
- information financière trompeuse ou contradiction importante ;
- date de marché manifestement incohérente ;
- contenu privé ;
- structure cassée ;
- placeholder de photo/graphique ;
- édition de clôture manifestement squelettique ;
- rubrique « Repères » interdite ;
- source manifestement problématique.

Les imperfections mineures de style vont dans warnings.

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
                `Contrôle cette édition avant publication :\n\n${content}`
            }
          ]
        }
      ],

      generationConfig: {
        maxOutputTokens: 3000,
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
      'Gemini QA : réponse HTTP valide mais JSON API illisible.'
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
  console.log('🔎 CONTRÔLE QUALITÉ — L’ESSENTIEL');
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

  if (!page.trim()) {
    console.error(
      '❌ Le fichier essentiel.astro est vide.'
    );

    process.exit(1);
  }

  let geminiResponse;

  try {
    geminiResponse =
      await callGemini(page);

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
      console.error('Erreurs critiques :');

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
    '✅ Édition validée pour publication éditoriale.'
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
