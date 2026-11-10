/**
 * Le guide : toutes les fonctions de Davina, pas à pas, et l'aide de chaque page.
 * Écrit au tutoiement, sans jargon. La visite guidée est dans tour.js.
 */
export const GUIDE = [
  {
    key: 'demarrer',
    title: 'Bien démarrer (10 minutes, une seule fois)',
    intro: 'Ces réglages rendent tout le reste intelligent. Rien n\'est obligatoire : commence petit.',
    steps: [
      ['Installe l\'app', 'Sur iPhone : Safari → Partager → « Sur l\'écran d\'accueil ». Sur Android : menu du navigateur → « Installer l\'application ». Ouvre-la ensuite depuis son icône.'],
      ['Choisis 3 domaines', 'À l\'accueil, prends les 3 domaines par lesquels tu veux commencer. Les 7 autres attendent : tu les réveilleras quand tu veux, dans la Roue.'],
      ['Garde une action par domaine', 'Chaque action a une version « 2 minutes ». Les jours difficiles, elle compte quand même : ta chaîne ne casse jamais.'],
      ['Active le rappel', 'Plus → Réglages → Activer les notifications. Tu reçois un rappel le matin, et l\'heure exacte des actions auxquelles tu as mis une heure.'],
      ['Saisis ton emploi du temps', 'Plus → Mon emploi du temps : tes cours et engagements, une fois. Davina en déduit tes vrais créneaux libres.'],
    ],
    tips: ['Ne remplis pas tout d\'un coup. Trois actions suffisent pour commencer ; ajoute le reste quand ces trois sont devenues faciles.'],
  },
  {
    key: 'jour',
    title: 'L\'écran Aujourd\'hui',
    intro: 'Ton point de départ, matin, midi et soir.',
    steps: [
      ['Le check-in du matin', 'Un tap pour ton énergie, un autre pour tes heures de sommeil. 10 secondes. Si l\'énergie est à 1 ou 2, Davina passe en jour léger.'],
      ['Cocher', 'Touche le rond à gauche d\'une action : il devient rouge. Touche-le encore pour décocher.'],
      ['La version 2 minutes', 'Le bouton « 2 min » coche l\'action en version minimale (rond rose avec un éclair). Elle compte comme tenue.'],
      ['Jour léger', 'Quand ton énergie est basse, un tap sur le rond coche directement la version 2 minutes. Les rendez-vous sacrés restent entiers.'],
      ['Heure fixe et « rattrapé »', 'Une action peut avoir une heure. Cochée après la marge, elle est « rattrapée » : jamais punie. Au fil des semaines, tu vois à quel point tu tiens tes heures.'],
      ['La série', 'Le nombre de jours d\'affilée. Un oubli par semaine est toléré : la série ne se casse pas pour un seul jour.'],
      ['Le bilan du soir', 'En bas de l\'écran : eau, sucre et sel (si le domaine Corps est actif), merci, victoire du jour, ce que tu feras mieux. Tout est facultatif.'],
      ['Le mot du jour', 'Si tu as un paquet « Vocabulaire », un mot t\'est proposé chaque jour : place-le dans une vraie conversation.'],
    ],
  },
  {
    key: 'capture',
    title: 'Noter en un tap (le bouton rouge +)',
    intro: 'Toujours visible, sur tous les écrans.',
    steps: [
      ['Écrire ou dicter', 'Touche le +, écris ou touche « Dicter » (si ton navigateur le permet) et parle.'],
      ['Classer, si tu veux', 'Type (idée, leçon, victoire…), domaine et parcours sont facultatifs. Une note non classée se range plus tard dans le Journal.'],
      ['Partager', 'Coche « Partager avec mon binôme » pour qu\'il ou elle voie cette note. Sinon, elle reste privée.'],
      ['Retrouver', 'Plus tard, dans l\'onglet Journal : recherche par mot, filtre par domaine.'],
    ],
  },
  {
    key: 'roue',
    title: 'La Roue et les domaines',
    intro: 'Dix domaines pour voir ta vie entière d\'un coup d\'œil.',
    steps: [
      ['Les dix domaines', 'Esprit, Corps, Cœur, Relations, Savoir, Travail, Argent, Mission, Expression, Joie. Chacun a une vision en une phrase et une note de 1 à 10.'],
      ['Faire le point', 'Une fois par mois : « Faire le point », dix curseurs, 30 secondes. Le radar se dessine, et Mon chemin garde l\'évolution.'],
      ['Réveiller un domaine', 'Ouvre un domaine et coche « Je travaille ce domaine en ce moment ». Remets-le en veille quand tu veux : rien n\'est perdu.'],
      ['Les outils du domaine', 'Chaque domaine propose ses outils (Esprit : prière, jeûne… ; Corps : séances, SOS envie…).'],
    ],
  },
  {
    key: 'parcours',
    title: 'Les parcours : tes chapitres de vie',
    intro: 'Un parcours a un début, des étapes et des livrables. Tu peux en mener plusieurs, et les enchaîner toute ta vie.',
    steps: [
      ['Choisir un modèle', 'Bâtisseur 12 mois, Remise en forme, Finances saines, Vie spirituelle, ou un parcours libre.'],
      ['Étapes et livrables', 'Chaque étape a ses points de travail et son livrable. Quand tu l\'as produit, coche-le et note un résumé ou un lien.'],
      ['Relier tes actions et tes notes', 'Dans une action ou une note, choisis le parcours : tout ce qu\'il a produit se retrouve sur sa page.'],
      ['Terminer et enchaîner', 'En terminant un parcours, tu écris un bilan. Tu peux ensuite commencer « la suite » : la vie devient une chaîne de parcours.'],
      ['Mon chemin', 'Plus → Mon chemin : jours actifs, actions, notes, livres lus, évolution de la roue, frise de tes parcours. Pour voir comment tu as progressé sur des années.'],
    ],
  },
  {
    key: 'outils',
    title: 'Les outils par domaine',
    intro: 'Dans l\'onglet Plus, ou dans la page d\'un domaine.',
    steps: [
      ['Esprit', 'Plan de lecture, journal de méditation É.O.A.P., mode prière, mur des exaucements, jeûne avec compte à rebours, versets à mémoriser, intercession par jour.'],
      ['Corps', 'Séances guidées avec minuteur, SOS envie (10 minutes pour laisser passer), sucre et sel, repas, poids hebdomadaire.'],
      ['Savoir', 'Études (matières, chapitres, examens, devoirs, concentration), lectures avec fiches de synthèse, cartes de révision, anglais.'],
      ['Expression', 'Prise de parole avec enregistrement et auto-évaluation, atelier d\'argumentation, création de contenu.'],
      ['Mission et Relations', 'Carnet de terrain pour écouter et noter, impact (les personnes qui progressent), cercle de mentors et de contradicteurs.'],
      ['Argent', 'Culture financière : un thème par semaine pendant 9 semaines, avec une action concrète.'],
      ['Se cocher toutes seules', 'Dans une action, « Se coche toute seule avec… » : écrire ta méditation, finir une séance ou une prière coche l\'action pour toi.'],
    ],
  },
  {
    key: 'semaine',
    title: 'La semaine et le bilan',
    intro: 'Plus → Ma semaine.',
    steps: [
      ['Progrès', 'Une case par jour et par action : rouge plein pour fait, rose pour la version 2 minutes, contour pour rattrapé. Les rendez-vous fragiles sont signalés.'],
      ['Planning', 'Les actions « plusieurs fois par semaine » se placent dans tes trous : « Placer automatiquement », puis tu valides ou tu ajustes.'],
      ['Bilan, le dimanche', 'Trois questions : ce que j\'ai appris, ce que j\'ai fait, ce que je change. Plus ta vigilance : te croire indispensable, chercher qu\'on te suive toi, mépriser un avis contraire.'],
      ['Le sommeil', 'Si tu notes tes heures de sommeil, le bilan peut te dire quand une nuit courte fait rater tes rendez-vous du matin.'],
    ],
  },
  {
    key: 'binome',
    title: 'Le binôme',
    intro: 'Avancer avec quelqu\'un, en gardant la main sur ce qui est partagé.',
    steps: [
      ['Inviter', 'Plus → Binôme → « Inviter quelqu\'un » : tu obtiens un code à usage unique, à envoyer à la personne.'],
      ['Rejoindre', 'La personne entre ton code dans « J\'ai reçu un code ».'],
      ['Choisir ce qu\'on partage', 'Chaque action, note ou domaine a son interrupteur « partagé ». Le binôme voit seulement ce qui est coché, et pour une action, seulement si elle est faite ou non.'],
      ['Plusieurs binômes', 'Tu peux en avoir plusieurs, et en quitter un à tout moment.'],
    ],
    tips: ['Ton journal, tes méditations, ton poids et tes notes ne sont jamais visibles, sauf si tu les partages une par une.'],
  },
  {
    key: 'donnees',
    title: 'Notifications, sécurité, mes données',
    steps: [
      ['iPhone', 'Les notifications ne marchent que si l\'app est installée sur l\'écran d\'accueil (iOS 16.4 ou plus) et ouverte depuis l\'icône.'],
      ['Mes données', 'Plus → Réglages → « Exporter mes données » : un fichier avec tout ce que tu as écrit. Tes données t\'appartiennent.'],
      ['Sans connexion', 'L\'app garde en mémoire tes dernières données : tu peux les consulter sans réseau.'],
    ],
  },
];
