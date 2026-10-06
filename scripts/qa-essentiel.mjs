// scripts/qa-essentiel.mjs
// Contrôle qualité automatique de L'Essentiel avec OpenAI, fournisseur IA unique.

import fs from 'node:fs';
import path from 'node:path';
import { PROVIDERS } from './providers.mjs';

const PAGE_PATH = path.join(process.cwd(),'src','pages','essentiel.astro');

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

Toutes les variations chiffrées, dans les bandeaux, les tableaux et le texte,
doivent garder le même code visuel :
▲ +x,xx % en vert avec la classe .up pour une hausse ;
▼ −x,xx % en rouge avec la classe .down pour une baisse ;
→ 0,00 % en noir avec la classe .flat pour une stabilité réelle.
Une valeur sans comparaison s'affiche « Référence » sans flèche de hausse ou baisse.
Le signe, les chiffres et le symbole % restent sur la même ligne. Les colonnes
de variation sont alignées à droite. Vérifie le rendu CSS : la règle générale
du texte noir ne doit jamais écraser le vert ou le rouge des variations.

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


async function main() {
  console.log('\n======================================');
  console.log('🔎 CONTRÔLE QUALITÉ — L’ESSENTIEL');
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
  if(!page.trim()){
    console.error('❌ Le fichier essentiel.astro est vide.');
    process.exit(1);
  }

  let raw;
  try {
    raw=await PROVIDERS.chatgpt.call(
      QA_PROMPT,
      'Contrôle cette édition avant publication :\n\n'+page
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
  console.log('✅ Édition validée pour publication éditoriale.');
}

main().catch(err=>{console.error('❌ Échec du contrôle qualité :',err?.message||err);process.exit(1);});
