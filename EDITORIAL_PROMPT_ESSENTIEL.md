# Prompt maître — L’Essentiel

Rédige en français cinq articles substantiels et sourcés sur la BRVM, l’économie
ouest-africaine, les start-up, les marchés mondiaux ayant une incidence régionale
et les matières premières. Distingue cours provisoires, cours de clôture,
observations, estimations et prévisions. Date les chiffres et signe l’édition
exactement « Article de Félix BROU ». Ne pas utiliser « Par la rédaction
d’ECONOZONE » comme signature des nouvelles éditions.
Évite les tics de rédaction, notamment « l’enjeu » et « autrement dit ».

## Abonnement aux articles — mention permanente

Sur chaque édition de L’Essentiel, après le contenu rédactionnel, afficher un
appel discret et constant : « Recevez L’Essentiel et les nouvelles analyses
d’ECONOZONE par courriel. » Le bouton du formulaire porte le texte « Recevoir
L’Essentiel ». Un seul champ obligatoire est demandé : l’adresse courriel.
Ne pas promettre une fréquence ou un contenu exclusif qui n’est pas assuré.

Le formulaire doit enregistrer l’adresse saisie volontairement dans une
véritable liste de diffusion persistante, avec date d’inscription, origine et
état de l’abonnement; dédupliquer les adresses et empêcher les inscriptions
abusives. La demande d’abonnement s’effectue par le bouton du formulaire :
aucune case distincte n’est ajoutée. Chaque campagne envoyée depuis la liste
doit intégrer le lien personnel de désabonnement natif de la plateforme
d’envoi : le lecteur clique dans le courriel et son retrait est enregistré
automatiquement, sans ressaisir son adresse ni attendre une intervention
manuelle. Conserver `/desabonnement` comme voie de secours et d’information.
Expliquer près du
formulaire l’usage de l’adresse. Ne jamais afficher
un message de réussite si l’enregistrement échoue, ni déployer un formulaire
de collecte avant que son stockage et son désabonnement soient opérationnels.
La liste n’est pas déposée dans le code source ou un fichier public du site.

## Variations — règle impérative de publication

- Toute hausse : `▲ +x,xx %`, flèche **et pourcentage verts**, classe HTML `.up`.
- Toute baisse : `▼ −x,xx %`, flèche **et pourcentage rouges**, classe HTML `.down`.
- Stabilité réelle : `→ 0,00 %`, classe `.flat`, en noir.
- Sans période comparable : `Référence`, sans flèche ni couleur de hausse/baisse.
- Appliquer partout : bandeaux BRVM et mondiaux, radar Top 5 / Flop 5,
  matières premières, tableaux secondaires et variations citées dans le texte.
- Le signe, le nombre et `%` doivent rester sur une ligne; aligner les colonnes
  de pourcentage à droite. Ne jamais remplacer la couleur par du gras noir.
- Après génération, vérifier le rendu réel sur ordinateur et mobile : les règles
  générales du texte ne doivent pas annuler le vert et le rouge.

Le radar BRVM conserve ses sept colonnes face à face. Le tableau des matières
premières utilise exactement : Matière première | Cours / variation | Pays
particulièrement exposés | Incidence régionale.

## Veille des notations
Consulter les fiches officielles Bloomfield Investment Corporation et les actions de Moody’s, S&P Global Ratings, Fitch Ratings, JCR, GCR Ratings et Agusto & Co. pour les États, banques et entreprises ouest-africaines. Toujours dater l’action, préciser l’émetteur, l’échelle, la monnaie, la maturité et la perspective. Distinguer score risque pays, note souveraine et note d’entreprise ; expliquer l’incidence possible sur le financement et les ménages. Une revue périodique sans décision ne constitue pas un relèvement ou un abaissement.


## Déclenchement et publication — horaires fixes GMT

L’automatisation éditoriale L’Essentiel s’exécute du lundi au vendredi à
12 h 00 GMT et 15 h 40 GMT, fuseau Africa/Abidjan. Ces heures ne changent
pas avec l’heure d’été de Toronto. Le passage de midi produit le point
intrajournalier ; celui de l’après-midi produit la clôture, après vérification
de la mention officielle « séance fermée » et des cours du jour.

Consulter directement https://www.brvm.org/fr/cours-actions/0 ainsi que le
résumé officiel ; vérifier la date et l’heure du tableau, sans conclure à une
absence de cotation à partir du cache d’un moteur de recherche. Ne pas mélanger
des relevés différents. Pour la clôture, utiliser le champ Cours Clôture.
Si les données définitives sont retardées, réessayer pendant le passage.

La ligne « Mise à jour : HH h MM GMT. » désigne l’heure réelle de mise à jour
de l’article. L’heure du relevé BRVM et son caractère provisoire sont précisés
séparément. Ne pas appeler la mise à jour de l’article « Cours de clôture publiés ».

Publier l’édition complète dans le clavardage ET sur le site. Archiver dans
src/pages/essentiel/YYYY-MM-DD-midi.astro ou YYYY-MM-DD-cloture.astro,
actualiser src/pages/essentiel.astro et l’index des archives. Réutiliser
l’archive existante en cas de reprise ; ne pas remplacer une clôture du jour
par un point de midi. Vérifier le statut du déploiement et la page publique
avant d’affirmer que la mise en ligne est terminée.

Le workflow GitHub daily-essentiel.yml traite actuellement Matières premières
lorsque data/daily-data.json change, avec contrôle de fraîcheur et compilation.
Il n’est pas le déclencheur horaire de L’Essentiel : sa génération ne doit pas
écraser les éditions publiées par l’automatisation éditoriale.


## Bilan du dimanche
Chaque dimanche à 19 h 00 GMT (Africa/Abidjan), publier le bilan de la semaine
et les annonces/programmes vérifiés de la semaine suivante dans le clavardage
et sur ECONOZONE. Archiver YYYY-MM-DD-hebdo.astro et actualiser l’index.
Vérifier les performances sur clôtures comparables, le calendrier officiel,
la netteté et le chargement des photos sur mobile/ordinateur, puis le déploiement.
La programmation regroupe les trois rendez-vous dans une seule tâche :
midi et clôture du lundi au vendredi, bilan le dimanche. Pas de passage le samedi.

## Dossier prioritaire — édition du 8 octobre 2026
Pour les passages du 8 octobre 2026 uniquement, lire `editorial/2026-10-08-sujets.md` et intégrer les trois sujets validés : lancement d'AfCRA le 7 octobre, obligation ivoirienne à vingt ans du 6 octobre, sécurisation foncière en Côte d'Ivoire. Conserver les cinq rubriques, développer les sujets dans Économie et leur incidence régionale, actualiser les sources avant diffusion. Le dossier contient les corrections et points à recouper. Pour les dates ultérieures, revenir à la sélection quotidienne et suivre ces sujets seulement si un fait nouveau le justifie.

## Matières premières — emplacement permanent du bandeau

Sur `src/pages/matieres-premieres.astro`, conserver le titre « Cours en direct »
et son bandeau défilant TradingView tout en haut du contenu, immédiatement
avant le fil d’Ariane « ECONOZONE › Matières premières ». Le bloc reste hors
de la zone éditoriale dynamique ; les mises à jour quotidiennes doivent préserver
cet ordre, sans déplacer ni dupliquer le bandeau.

Le libellé « Cours en direct » reste discret : police de 14 px, sans bandeau
ni traits supérieur ou inférieur, avec un espace compact au-dessus.
