// scripts/qa-essentiel.mjs
//
// Contrôle qualité automatique de L'Essentiel avant publication.
//
// Ce script :
// 1. lit src/pages/essentiel.astro
// 2. envoie le contenu à Gemini
// 3. demande une décision stricte PASS / FAIL
// 4. bloque la publication si une anomalie critique est détectée
//
// Gemini ne réécrit PAS l'article.
// Il joue uniquement le rôle de contrôle qualité.

import fs from 'node:fs';
import path from 'node:path';

const PAGE_PATH = path.join(process.cwd(), 'src', 'pages', 'essentiel.astro');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY manquante.');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash';

const QA_PROMPT = `
Tu es le contrôleur qualité éditorial et technique du média économique
et financier ouest-africain ECONOZONE.

Tu contrôles une édition de :

"L'ESSENTIEL | BRVM • ÉCONOMIE • MARCHÉS"

IMPORTANT :

Tu ne dois PAS réécrire l'article.

Tu dois uniquement vérifier si le contenu peut être publié automatiquement.

Tu dois être exigeant sur les erreurs factuelles ou techniques,
mais ne bloque pas la publication pour de simples préférences stylistiques.

==================================================
1. CONTRÔLE DES DONNÉES
==================================================

Vérifie notamment :

- absence de valeurs manifestement impossibles ;
- cohérence entre les chiffres cités dans le texte et les tableaux ;
- cohérence des signes + / - ;
- cohérence entre hausse/baisse et commentaire associé ;
- présence des unités lorsqu'elles sont nécessaires ;
- présence d'une période ou d'une date pour les données de marché ;
- absence de confusion entre variation de cours et information fondamentale ;
- absence de chiffre présenté comme certain lorsqu'il est explicitement
  indiqué comme provisoire, estimation ou prévision.

Ne prétends PAS vérifier une donnée externe que tu ne peux pas vérifier
à partir du contenu fourni.

==================================================
2. CONTRÔLE BRVM
==================================================

Vérifie :

- BRVM Composite ;
- BRVM 30 ;
- BRVM Prestige ;
- cours et variations ;
- Top / Flop ;
- cohérence entre les tableaux et les commentaires ;
- aucune recommandation personnalisée d'achat ou de vente ;
- aucune information provenant d'un portefeuille privé.

Une interprétation telle que :
"prise de bénéfices", "consolidation", "pression vendeuse"
doit être présentée comme une analyse et non comme un fait certain
lorsque le texte ne fournit pas de preuve directe.

==================================================
3. AFRIQUE DE L'OUEST
==================================================

L'horizon géographique éditorial prioritaire est l'Afrique de l'Ouest.

Un événement international ne doit être retenu que si son lien avec
l'Afrique de l'Ouest est expliqué.

Vérifie que les articles sur :

- États-Unis ;
- Europe ;
- Chine ;
- marchés internationaux ;
- pétrole ;
- métaux ;
- politique monétaire internationale ;

expliquent clairement le canal de transmission vers la région lorsqu'il
n'est pas évident.

==================================================
4. MATIÈRES PREMIÈRES
==================================================

Vérifie :

- prix ;
- unité ;
- variation ;
- période de comparaison ;
- pays particulièrement exposés ;
- incidence régionale.

Ne pas accepter une comparaison graphique directe de matières premières
ayant des unités incompatibles sauf si les séries ont été normalisées
(par exemple base 100 ou variations en pourcentage).

==================================================
5. SOURCES ET LIENS
==================================================

Vérifie :

- présence de sources lorsque des faits précis sont attribués ;
- absence de liens manifestement incomplets ;
- absence de texte placeholder de type "URL ici" ;
- absence de citation de source inventée ;
- absence de notes internes destinées à la rédaction.

Les balises :

<!-- PHOTO: ... -->

sont autorisées et ne doivent PAS provoquer un échec.

==================================================
6. CONTENU PRIVÉ
==================================================

ÉCHEC IMMÉDIAT si l'article contient :

- quantité d'actions détenues ;
- prix moyen d'achat d'un investisseur individuel ;
- gain ou perte d'un portefeuille personnel ;
- ordre autorisé ;
- zone personnelle d'achat ;
- décision issue d'un moteur privé ;
- information personnelle identifiable non destinée à publication.

==================================================
7. STRUCTURE
==================================================

Vérifie que le contenu contient une structure éditoriale cohérente avec :

- titre / masthead ;
- chapô ;
- BRVM ;
- économie ou finance ouest-africaine ;
- innovation / start-up / infrastructure si l'actualité le permet ;
- marchés internationaux ayant une incidence régionale ;
- matières premières lorsque pertinent ;
- avertissement final.

Une rubrique peut être omise si aucune actualité récente et pertinente
n'est disponible.

Ne demande jamais de remplir artificiellement une rubrique.

==================================================
8. HTML / ASTRO
==================================================

Vérifie :

- aucune balise Markdown accidentelle ;
- aucune clôture de bloc Markdown ;
- aucune balise <Layout> imbriquée à l'intérieur du contenu principal ;
- HTML globalement cohérent ;
- absence de texte manifeste provenant d'une conversation IA ;
- absence de phrases comme :
  "voici votre article",
  "vous avez raison",
  "comme demandé",
  "je peux également".

==================================================
9. RÈGLE DE DÉCISION
==================================================

Retourne FAIL uniquement si tu détectes au moins une anomalie susceptible
de provoquer :

- une information financière trompeuse ;
- une contradiction importante ;
- une erreur de structure empêchant l'affichage ;
- une donnée privée ;
- une donnée manifestement incohérente ;
- une source manifestement problématique ;
- une confusion factuelle importante.

Les imperfections mineures de style ne doivent PAS bloquer la publication.

==================================================
10. FORMAT DE RÉPONSE OBLIGATOIRE
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
      contents: [{ role: 'user', parts: [{ text: `Contrôle cette édition avant publication :\n\n${content}` }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 3000,
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
  console.log('🔎 CONTRÔLE QUALITÉ — L\u2019ESSENTIEL');
  console.log('======================================');

  if (!fs.existsSync(PAGE_PATH)) {
    console.error(`❌ Fichier introuvable : ${PAGE_PATH}`);
    process.exit(1);
  }

  const page = fs.readFileSync(PAGE_PATH, 'utf-8');

  if (!page.trim()) {
    console.error('❌ Le fichier essentiel.astro est vide.');
    process.exit(1);
  }

  console.log(`→ Analyse avec Gemini ${MODEL}...`);

  const response = await callGemini(page);

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
