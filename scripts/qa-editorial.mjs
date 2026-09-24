import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/pages');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(full);
  }
}
walk(root);

const errors = [];
const warnings = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file);

  // Espaces manquants autour des emphases inline : ex. "de<b>6,6 %" ou "</b>du".
  const badBefore = [...source.matchAll(/[\p{L}\p{N}](?:<b>|<strong>)/gu)];
  const badAfter = [...source.matchAll(/<\/(?:b|strong)>[\p{L}\p{N}]/gu)];
  if (badBefore.length || badAfter.length) {
    errors.push(`${rel}: espace manquant autour d'une balise de gras`);
  }

  // Corps d'article trop chargé en gras : signal éditorial, sans bloquer les fiches de données.
  const paragraphs = [...source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  paragraphs.forEach((m, i) => {
    const count = (m[1].match(/<(?:b|strong)>/gi) || []).length;
    if (count > 2) warnings.push(`${rel}: paragraphe ${i + 1} contient ${count} emphases`);
  });
}

if (warnings.length) {
  console.warn('\nQA éditorial — à relire :');
  warnings.forEach(x => console.warn('• ' + x));
}

if (errors.length) {
  console.error('\nQA éditorial — déploiement bloqué :');
  errors.forEach(x => console.error('• ' + x));
  process.exit(1);
}

console.log(`QA éditorial OK — ${files.length} pages vérifiées.`);
