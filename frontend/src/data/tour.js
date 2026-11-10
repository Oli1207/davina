/**
 * La visite guidée : un parcours dans la vraie app. Chaque étape ouvre une page
 * (`route`), éclaire un élément (`target` : sélecteurs data-tour par ordre de
 * préférence) et l'explique. Sans cible trouvée, la bulle s'affiche au centre.
 */
export const GUIDED_TOUR = [
  {
    key: 'bienvenue', route: '/', kicker: 'Bienvenue',
    title: 'On fait le tour ensemble ?',
    text: 'Deux minutes pour découvrir Davina là où tu vas t\'en servir. Je te montre chaque endroit, tu n\'as rien à toucher.',
  },
  {
    key: 'checkin', route: '/', target: ['[data-tour="checkin"]', '[data-tour="avancee"]'], kicker: 'Ton jour',
    title: 'Le check-in du matin',
    text: 'Un tap pour ton énergie : 10 secondes. Si elle est basse, Davina passe en jour léger et te laisse cocher la version 2 minutes de chaque action.',
  },
  {
    key: 'avancee', route: '/', target: ['[data-tour="avancee"]'], kicker: 'Ton jour',
    title: 'Ton avancée',
    text: 'Combien d\'actions tenues aujourd\'hui, et ta série de jours d\'affilée. Un oubli par semaine est toléré : la chaîne ne casse pas pour un seul jour.',
  },
  {
    key: 'cocher', route: '/', target: ['[data-tour="check"]', '[data-tour="avancee"]'], kicker: 'Ton jour',
    title: 'Cocher',
    text: 'Touche ce rond quand c\'est fait. Une action avec une heure fixe cochée en retard est « rattrapée » : jamais punie.',
  },
  {
    key: 'deuxmin', route: '/', target: ['[data-tour="deuxmin"]'], kicker: 'Ton jour',
    title: 'La version 2 minutes',
    text: 'Pas le courage aujourd\'hui ? Ce bouton coche la version minimale. Elle compte comme tenue : tu ne repars jamais de zéro.',
  },
  {
    key: 'plus', route: '/', target: ['[data-tour="capture"]'], kicker: 'Partout',
    title: 'Le bouton +',
    text: 'Sur chaque écran : noter une idée, une leçon, une victoire, à l\'écrit ou à la voix. Deux taps, et tu continues ta journée.',
  },
  {
    key: 'roue', route: '/roue', target: ['[data-tour="roue"]'], kicker: 'Roue',
    title: 'Ta roue de vie',
    text: 'Dix domaines, une note de 1 à 10 chacun. Une fois par mois, « Faire le point » dessine ton équilibre. Touche un domaine pour l\'ouvrir.',
  },
  {
    key: 'parcours', route: '/parcours', target: ['[data-tour="nouveau-parcours"]'], kicker: 'Parcours',
    title: 'Tes chapitres de vie',
    text: 'Un parcours a des étapes et des livrables (Bâtisseur 12 mois, Remise en forme…). Tu peux en mener plusieurs et les enchaîner toute ta vie.',
  },
  {
    key: 'journal', route: '/journal', target: ['[data-tour="recherche"]'], kicker: 'Journal',
    title: 'Tout ce que tu notes',
    text: 'Chaque note du bouton + arrive ici. Cherche par mot, filtre par domaine, et relis dans des mois ou des années.',
  },
  {
    key: 'plus-page', route: '/plus', target: ['[data-tour="outils"]'], kicker: 'Plus',
    title: 'Les outils',
    text: 'Esprit, Corps, Études, lectures, cartes de révision, carnet de terrain, impact, cercle de mentors, culture financière… rangés par domaine.',
  },
  {
    key: 'semaine', route: '/semaine?onglet=planning', target: ['[data-tour="placer"]'], kicker: 'Semaine',
    title: 'Le dimanche, tu places ta semaine',
    text: 'Ce bouton range tes séances « plusieurs fois par semaine » dans tes vrais créneaux libres, calculés depuis ton emploi du temps. Tu ajustes, puis tu valides.',
  },
  {
    key: 'binome', route: '/binome', target: ['[data-tour="binome"]'], kicker: 'Binôme',
    title: 'Avancer à deux',
    text: 'Invite quelqu\'un avec un code. Tu choisis, action par action, ce qui est partagé : il ou elle ne voit que ce que tu coches.',
  },
  {
    key: 'fin', route: '/', kicker: 'À toi',
    title: 'C\'est tout.',
    text: 'Commence par une seule petite action aujourd\'hui. Le guide complet est dans Plus → Guide, et tu peux refaire cette visite quand tu veux.',
  },
];
