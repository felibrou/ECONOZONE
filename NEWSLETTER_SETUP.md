# Désabonnement automatique ECONOZONE

Le formulaire `/desabonnement` demande une adresse, envoie un lien à cette
adresse, puis laisse son titulaire confirmer le retrait. Le lien expire après
30 minutes. La confirmation met `emailBlacklisted: true` dans les contacts
Brevo. Les adresses et la clé API restent hors du dépôt.

Avant de publier le formulaire, créer/configurer la liste de diffusion Brevo
utilisée pour les envois, vérifier le domaine d'envoi et ajouter dans les
variables d'environnement Vercel (Production) :

- `BREVO_API_KEY` : clé API v3 disposant des droits contacts et courriels transactionnels ;
- `BREVO_SENDER_EMAIL` : adresse d'expéditeur validée, par exemple `contact@econozone.org` ;
- `UNSUBSCRIBE_SECRET` : chaîne aléatoire longue et privée pour signer les liens.

Après le déploiement, vérifier l'envoi d'un lien à une adresse test inscrite,
le retrait après confirmation, l'absence d'envoi ultérieur et le refus d'un
lien expiré. Ajouter le lien `/desabonnement` dans chaque courriel envoyé.
Le formulaire ne doit pas être mis en ligne tant que ces vérifications ne
sont pas possibles. L'adresse saisie seule ne déclenche jamais le retrait.
