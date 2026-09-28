// Veille quotidienne de la rubrique Économie. Publication seulement après
// recherche sourcée, vérification du lien et contrôle indépendant Gemini.
import fs from 'node:fs/promises';
import { PROVIDERS } from './providers.mjs';

const PAGE = 'src/pages/economie.astro';
const START = '<!-- VEILLE-ECONOMIE-DEBUT -->';
const END = '<!-- VEILLE-ECONOMIE-FIN -->';
const allowed = [
  'bceao.int','boad.org','uemoa.int','ecowas.int','brvm.org','montagegold.com',
  'financialafrik.com','afrimag.net','agenceecofin.com','sikafinance.com',
  'africanews.com','rfi.fr','tv5monde.com','forbesafrique.com',
  'ecomnewsafrique.com','afriqueeconomie.net','lanation.bj',
  'worldbank.org','imf.org','afdb.org'
];
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFR = d => new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(d);
const hostOK = host => allowed.some(d => host === d || host.endsWith('.'+d)) ||
  /(^|\.)(gov|gouv)\.[a-z.]+$/.test(host);

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
  const sources=await fs.readFile('ECONOMIE_SOURCES.md','utf8');
  const page=await fs.readFile(PAGE,'utf8');
  if(!page.includes(START)||!page.includes(END)) throw Error('Marqueurs de veille absents');
  const previous=page.slice(page.indexOf(START),page.indexOf(END));
  const research=await openAI(
    'Tu es documentaliste de presse économique en Afrique de l’Ouest. Recherche le web. Réponds UNIQUEMENT en JSON valide : {"items":[{"title":"...","summary":"2 phrases factuelles et une incidence économique concrète, sans conjecture chiffrée","url":"lien direct de l’article ou communiqué","source":"organisme ou média","published":"AAAA-MM-JJ","event_date":"AAAA-MM-JJ"}]}. 1 à 3 nouvelles des dernières 72 heures ; priorité aux sources primaires. N’invente rien. Si aucune nouveauté vérifiable : {"items":[]}. Écarte les sujets déjà couverts.',
    'Date UTC : '+today+'\nSources : '+sources+'\nContenu récent à éviter : '+previous.slice(0,7000)
  );
  let items;
  try { items=JSON.parse(research.replace(/^\`\`\`(?:json)?\s*|\s*\`\`\`$/g,'')).items; }
  catch { throw Error('Réponse de recherche non JSON : publication interrompue'); }
  if(!Array.isArray(items) || !items.length) { console.log('Aucun fait nouveau vérifiable. Page inchangée.'); return; }
  const checked=[];
  for(const item of items.slice(0,3)) {
    if(!item.title||!item.summary||!item.url||!item.published||!item.event_date) continue;
    const pub=new Date(item.published+'T00:00:00Z');
    if(!Number.isFinite(pub.getTime()) || pub>now || now-pub>4*86400000) continue;
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
      'Contrôle éditorial indépendant. Réponds exactement PASS ou FAIL. PASS uniquement si la source fournie soutient le titre, les chiffres, la date, le statut (annonce, approbation, réalisation) et le résumé, et si l’incidence ouest-africaine est prudente. Une source imprécise, contradictoire ou inaccessible impose FAIL.',
      JSON.stringify({item,sourceText})
    );
    if(verdict.trim()==='PASS') checked.push(item);
  }
  if(!checked.length) {console.log('Aucun article validé. Page inchangée.'); return;}
  const date=dateFR(now);
  const zone=START+'\n  <section class="highlight" aria-label="Actualités économiques récentes">\n'+
    '    <h2>Actualités économiques — '+esc(date)+'</h2>\n'+
    checked.map(i=>'    <h3>'+esc(i.title)+'</h3>\n'+
      '    <p>'+esc(i.summary)+'</p>\n'+
      '    <p class="source-line"><a href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">'+
      esc(i.source||new URL(i.url).hostname)+' — '+esc(i.published)+'</a></p>').join('\n')+
    '\n  </section>\n  '+END;
  let next=page.slice(0,page.indexOf(START))+zone+page.slice(page.indexOf(END)+END.length);
  next=next.replace(/<time datetime="[^"]+">\s*[^<]+\s*<\/time>/,
    '<time datetime="'+now.toISOString()+'">'+date+' à '+
    new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}).format(now).replace(':',' h ')+' GMT</time>');
  await fs.writeFile(PAGE,next);
  const archivePath='src/pages/economie/'+today+'.astro';
  try {
    await fs.access(archivePath);
  } catch {
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
