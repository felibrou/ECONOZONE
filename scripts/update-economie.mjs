// Veille quotidienne de la rubrique Économie. Publication seulement après
// recherche sourcée, vérification du lien et contrôle indépendant Gemini.
import fs from 'node:fs/promises';
import { PROVIDERS } from './providers.mjs';

const PAGE = 'src/pages/economie.astro';
const START = '<!-- VEILLE-ECONOMIE-DEBUT -->';
const END = '<!-- VEILLE-ECONOMIE-FIN -->';
// Rotation équilibrée entre les huit pays UEMOA et deux économies voisines.
const countries = ['Bénin','Burkina Faso','Côte d’Ivoire','Guinée-Bissau','Mali','Niger','Sénégal','Togo','Ghana','Nigeria'];
const allowed = [
  'bceao.int','boad.org','uemoa.int','ecowas.int','brvm.org','montagegold.com',
  'financialafrik.com','afrimag.net','agenceecofin.com','sikafinance.com',
  'africanews.com','rfi.fr','tv5monde.com','forbesafrique.com',
  'ecomnewsafrique.com','afriqueeconomie.net','lanation.bj',
  'worldbank.org','imf.org','afdb.org','jeuneafrique.com',
  'bloomfield-investment.com','moodys.com','spglobal.com','fitchratings.com',
  'jcr.co.jp','gcrratings.com','agusto.com',
  'africaintelligence.fr','lesafriques.com','lanouvelletribune.info','digital-africa.tech'
];
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFR = d => new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(d);
const hostOK = host => allowed.some(d => host === d || host.endsWith('.'+d)) ||
  /(^|\.)(gov|gouv)\.[a-z.]+$/.test(host);

function ensureManagedZone(page) {
  const hasStart=page.includes(START), hasEnd=page.includes(END);
  if(hasStart && hasEnd) return page;
  if(hasStart !== hasEnd) throw Error('Zone de veille Économie incomplète : un seul marqueur est présent');

  const emptyZone='\n'+START+'\n'+END+'\n';
  const economySection=/<section\s+id=["']economie["'][^>]*>[\s\S]*?<\/section>/i;
  if(economySection.test(page)) {
    return page.replace(economySection, match => match+emptyZone);
  }
  if(page.includes('</article>')) {
    return page.replace('</article>', emptyZone+'</article>');
  }
  throw Error('Impossible d’initialiser la zone de veille Économie : structure de page inconnue');
}

async function openAI(instructions,input) {
  const res = await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Content-Type':'application/json',
    Authorization:'Bearer '+process.env.OPENAI_API_KEY},
    body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      tools:[{type:'web_search'}],instructions,input,max_output_tokens:4000})
  });
  if(!res.ok) throw Error('Recherche OpenAI : '+res.status+' '+(await res.text()).slice(0,400));
  const json=await res.json();
  return (json.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text')
    .map(c=>c.text).join('\n');
}
async function main() {
  if(!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY)
    throw Error('OPENAI_API_KEY et GEMINI_API_KEY sont nécessaires');
  const now=new Date(), today=now.toISOString().slice(0,10);
  const country=countries[Math.floor(now.getTime()/86400000)%countries.length];
  const sources=await fs.readFile('ECONOMIE_SOURCES.md','utf8');
  let page=await fs.readFile(PAGE,'utf8');
  const normalizedPage=ensureManagedZone(page);
  const zoneWasInitialized=normalizedPage!==page;
  page=normalizedPage;
  const previous=page.slice(page.indexOf(START),page.indexOf(END));
  const research=await openAI(
    'Tu es documentaliste économique de l’Afrique de l’Ouest. Recherche les sources en ligne. Retourne UNIQUEMENT un JSON valide : {"items":[{"kind":"focus_macro|focus_social|company|news","title":"titre précis","summary":"2 à 4 phrases analytiques dont les chiffres sont dans la source","url":"URL directe","source":"nom","published":"AAAA-MM-JJ","event_date":"AAAA-MM-JJ","data_period":"année/trimestre des données si focus"}]}. Fournis exactement un focus_macro (PIB, inflation, crédit, dette ou comptes extérieurs) ET un focus_social (emploi, revenu par habitant, pauvreté, santé, éducation, coût de la vie ou données microéconomiques d’entreprises et ménages) pour le pays imposé, idéalement des sources primaires comparables et avec période explicite. Ces données de fond peuvent être anciennes mais doivent être les dernières disponibles. Ajoute 1 à 2 nouvelles d’entreprises des sept derniers jours, priorité aux sociétés cotées à la BRVM, puis grandes entreprises publiques et privées non cotées, avec résultat publié, investissement, contrat, financement ou décision vérifiable ; précise explicitement si elles sont cotées à la BRVM. Si possible, une entreprise du pays du jour. Cherche le Bulletin officiel de la cote et les communiqués des émetteurs. Ajoute éventuellement une nouvelle économique récente. Vérifie les nouvelles notations de crédit souveraines et d’entreprises auprès de Bloomfield Investment Corporation, Moody’s, S&P Global Ratings, Fitch Ratings, JCR, GCR Ratings et Agusto & Co. Précise agence, émetteur, échelle, monnaie, maturité, note, perspective et date. Un score de risque pays sur 10 n’est pas une note souveraine internationale. Ne reprends aucune note si la fiche originale ou un dépôt officiel n’est pas accessible. N’invente ni valeurs ni événements. Exclure les faits déjà traités. Si une catégorie n’a aucune source solide, omets-la. Les médias servent de veille ; préférer communiqué officiel et rapport daté.',
    'Date UTC : '+today+' ; pays du jour : '+country+'\nSources : '+sources+'\nÉviter les redites : '+previous.slice(0,7000)
  );
  let items;
  try { items=JSON.parse(research.replace(/^\`\`\`(?:json)?\s*|\s*\`\`\`$/g,'')).items; }
  catch { throw Error('Réponse de recherche non JSON : publication interrompue'); }
  if(!Array.isArray(items) || !items.length) {
    if(zoneWasInitialized) {
      await fs.writeFile(PAGE,page);
      console.log('Zone de veille initialisée. Aucun fait vérifiable à publier.');
    } else {
      console.log('Aucun fait vérifiable. Page inchangée.');
    }
    return;
  }
  const checked=[];
  for(const item of items.slice(0,7)) {
    if(!item.title||!item.summary||!item.url||!item.published||!item.event_date) continue;
    if(!['focus_macro','focus_social','company','news'].includes(item.kind)) continue;
    if(item.kind.startsWith('focus_') && !item.data_period) continue;
    const pub=new Date(item.published+'T00:00:00Z');
    if(!Number.isFinite(pub.getTime()) || pub>now) continue;
    if(!item.kind.startsWith('focus_') && now-pub>(item.kind==='company'?8:4)*86400000) continue;
    let url;
    try {url=new URL(item.url);} catch {continue;}
    if(url.protocol!=='https:'||!hostOK(url.hostname)) continue;
    let sourceText;
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(12000),
        headers:{'User-Agent':'ECONOZONE editorial research/1.0'}});
      if(!response.ok) continue;
      sourceText=(await response.text()).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,18000);
      if(sourceText.length<500) continue;
    } catch {continue;}
    const verdict=await PROVIDERS.gemini.call(
      'Contrôle éditorial indépendant. Réponds exactement PASS ou FAIL. PASS uniquement si la source fournie soutient le titre, les chiffres, la date, le statut (annonce, approbation, réalisation) et le résumé, et si l’incidence ouest-africaine est prudente. Pour focus_macro et focus_social, vérifier que le fait concerne bien le pays du jour et que la période de la donnée est affichée. Pour company, vérifier l’entreprise, son statut coté ou non, et distinguer une annonce d’un résultat réalisé. Une source imprécise, contradictoire ou inaccessible impose FAIL.',
      JSON.stringify({country,item,sourceText})
    );
    if(verdict.trim()==='PASS') checked.push(item);
  }
  const macro=checked.find(i=>i.kind==='focus_macro');
  const social=checked.find(i=>i.kind==='focus_social');
  const focused=macro && social ? [macro,social] : [];
  const businesses=checked.filter(i=>i.kind==='company').slice(0,2);
  const news=checked.filter(i=>i.kind==='news').slice(0,2);
  if(!focused.length && !businesses.length && !news.length) {
    if(zoneWasInitialized) {
      await fs.writeFile(PAGE,page);
      console.log('Zone de veille initialisée. Aucun sujet validé à publier.');
    } else {
      console.log('Aucun sujet validé. Page inchangée.');
    }
    return;
  }
  const date=dateFR(now);
  const article=i=>'    <h3>'+esc(i.title)+'</h3>\n'+
    '    <p>'+esc(i.summary)+'</p>\n'+
    '    <p class="source-line"><a href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">'+
    esc(i.source||new URL(i.url).hostname)+' — '+esc(i.published)+'</a>'+
    (i.data_period?' · Donnée : '+esc(i.data_period):'')+'</p>';
  const zone=START+'\n  <section class="highlight" aria-label="Actualités économiques récentes">\n'+
    '    <p class="edition-meta">Actualité du '+esc(date)+'</p>\n'+
    (focused.length?'    <h2>'+esc(country)+' : croissance et conditions de vie</h2>\n'+
      '<p>Indicateurs macroéconomiques et conditions de vie, avec périodes distinctes.</p>\n'+
      focused.map(article).join('\n'):'')+
    (businesses.length?'\n    <h2>Résultats, investissements et décisions des entreprises</h2>\n'+
      businesses.map(article).join('\n'):'')+
    (news.length?'\n    <h3>Autres décisions économiques</h3>\n'+
      news.map(article).join('\n'):'')+
    '\n  </section>\n  '+END;
  let next=page.slice(0,page.indexOf(START))+zone+page.slice(page.indexOf(END)+END.length);
  next=next.replace(/<time datetime="[^"]+">\s*[^<]+\s*<\/time>/,
    '<time datetime="'+now.toISOString()+'">'+date+' à '+
    new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}).format(now).replace(':',' h ')+' GMT</time>');
  await fs.writeFile(PAGE,next);
  const archivePath='src/pages/economie/'+today+'.astro';
  const existed=await fs.access(archivePath).then(()=>true,()=>false);
  if(existed) {
    const current=await fs.readFile(archivePath,'utf8');
    if(current.includes(START) && current.includes(END)) {
      await fs.writeFile(archivePath,current.slice(0,current.indexOf(START))+zone+
        current.slice(current.indexOf(END)+END.length));
    }
  } else {
    const archive='---\nimport Layout from \'../../layouts/Layout.astro\';\n---\n'+
      '<Layout title="ECONOZONE — Économie du '+esc(date)+'">\n'+
      '<p class="breadcrumb"><a href="/economie">Économie</a> &rsaquo; <a href="/economie/archives">Archives</a></p>\n'+
      '<h1>Économie ouest-africaine — '+esc(date)+'</h1>\n'+zone+'\n</Layout>\n';
    await fs.writeFile(archivePath,archive);
    const indexPath='src/pages/economie/archives.astro';
    const index=await fs.readFile(indexPath,'utf8');
    const entry="  { date: '"+today+"', label: '"+date+"', title: 'Actualités économiques ouest-africaines', href: '/economie/"+today+"' },";
    await fs.writeFile(indexPath,index.replace('const analyses = [','const analyses = [\n'+entry));
  }
  console.log(checked.length+' actualité(s) vérifiée(s) publiée(s) dans Économie');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
