// scripts/qa-commodities.mjs
// Contrôle qualité automatique de la zone dynamique Matières premières.
// OpenAI est l'unique fournisseur IA utilisé par ECONOZONE.

import fs from 'node:fs';
import path from 'node:path';
import { PROVIDERS } from './providers.mjs';

const PAGE_PATH = path.join(process.cwd(),'src','pages','matieres-premieres.astro');
const ZONE_START = '<!-- ZONE-DYNAMIQUE-DEBUT';
const ZONE_END = '<!-- ZONE-DYNAMIQUE-FIN -->';

const QA_PROMPT = `
Tu es le contrôleur qualité d'ECONOZONE pour la zone « Marchés du jour »
de la page Matières premières.

Tu ne réécris rien. Tu rends uniquement PASS ou FAIL avec des motifs précis.

Vérifie :
- prix chiffré et unité pour chaque ligne ;
- signe de la variation cohérent avec ▲ ou ▼ ;
- classe CSS .up pour ▲, .down pour ▼, .flat pour → ;
- période/date de comparaison lorsqu'une variation est affichée ;
- si la variation manque, autorise → Référence uniquement si une date d'observation est fournie ;
- cohérence entre matière première, pays ouest-africains exposés et incidence régionale ;
- absence de conseil d'investissement et de donnée privée ;
- absence de Markdown, de balise <Layout>, de texte conversationnel ou d'instruction interne ;
- absence de formule vague utilisée à la place d'un prix ;
- absence de pastilles ou boules colorées pour représenter la tendance.

L'en-tête doit être exactement :
Matière première | Cours / variation | Pays particulièrement exposés | Incidence régionale

Retourne FAIL uniquement pour une erreur susceptible de rendre l'information
trompeuse, incohérente ou techniquement impropre à la publication.
Les préférences stylistiques mineures vont dans warnings.

Réponds uniquement avec un objet JSON valide :
{"status":"PASS ou FAIL","critical_errors":[],"warnings":[],"summary":"..."}
Aucun texte avant ou après le JSON.
`;

async function main() {
  console.log('\n======================================');
  console.log('🔎 CONTRÔLE QUALITÉ — MATIÈRES PREMIÈRES');
  console.log('======================================');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY manquante.');
    process.exit(1);
  }
  if (!fs.existsSync(PAGE_PATH)) {
    console.error(`❌ Fichier introuvable : ${PAGE_PATH}`);
    process.exit(1);
  }

  const page=fs.readFileSync(PAGE_PATH,'utf8');
  const startIdx=page.indexOf(ZONE_START);
  const endIdx=page.indexOf(ZONE_END);
  if(startIdx===-1 || endIdx===-1 || endIdx<=startIdx){
    console.error('❌ Marqueurs ZONE-DYNAMIQUE introuvables ou incohérents.');
    process.exit(1);
  }

  const zoneContent=page.slice(startIdx,endIdx+ZONE_END.length);
  let raw;
  try {
    raw=await PROVIDERS.chatgpt.call(
      QA_PROMPT,
      'Contrôle cette zone avant publication :\n\n'+zoneContent
    );
  } catch(err) {
    console.error('❌ Impossible d’effectuer le contrôle qualité OpenAI.');
    console.error(err?.message || err);
    process.exit(1);
  }

  let result;
  try {
    result=JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g,''));
  } catch {
    console.error('❌ OpenAI n’a pas retourné un JSON valide.');
    console.error(raw);
    process.exit(1);
  }

  console.log(`Décision OpenAI : ${result.status}`);
  if(Array.isArray(result.warnings)) for(const w of result.warnings) console.log('⚠️ '+w);
  if(result.summary) console.log('Résumé : '+result.summary);

  if(result.status!=='PASS'){
    console.error('❌ PUBLICATION AUTOMATIQUE BLOQUÉE');
    if(Array.isArray(result.critical_errors)) for(const e of result.critical_errors) console.error('- '+e);
    process.exit(1);
  }

  console.log('✅ Contrôle qualité OpenAI réussi.');
}

main().catch(err=>{console.error('❌ Échec du contrôle qualité :',err?.message||err);process.exit(1);});
