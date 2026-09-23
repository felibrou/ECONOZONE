// scripts/generate-essentiel.mjs
//
// GARDE-FOU ÉDITORIAL — L'ESSENTIEL
//
// Depuis septembre 2026, « L'Essentiel | BRVM • ÉCONOMIE • MARCHÉS »
// n'est plus rédigé ni remplacé automatiquement à partir de daily-data.json.
//
// Procédure officielle :
// 1. rédaction et recherche éditoriale dans la session ChatGPT « L'Essentiel » ;
// 2. validation humaine ;
// 3. création d'une archive datée dans src/pages/essentiel/ ;
// 4. mise à jour de src/pages/essentiel.astro ;
// 5. publication sur GitHub ; Vercel déploie ensuite le site.
//
// Ce script peut rester appelé par un ancien workflow sans danger : il termine
// avec succès et ne modifie aucun fichier. Il empêche ainsi qu'une génération
// automatique pauvre ou incomplète écrase une édition validée.

function main() {
  console.log('');
  console.log('==========================================');
  console.log("🛡️  L'ESSENTIEL — GÉNÉRATION AUTO DÉSACTIVÉE");
  console.log('==========================================');
  console.log('');
  console.log("Aucun fichier n'a été modifié.");
  console.log(
    "La rédaction et la publication de L'Essentiel sont désormais éditoriales :"
  );
  console.log(
    "ChatGPT → validation humaine → archive datée → GitHub → Vercel."
  );
  console.log('');
  console.log(
    "La page src/pages/essentiel.astro ne sera jamais écrasée par ce script."
  );
  console.log('==========================================');
}

main();
