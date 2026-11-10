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
    key: 'avancee', route: '/', target: ['[data-tour="avancee"]', '[data-tour="checkin"]'], kicker: 'Ton jour',
    title: 'Ton avancée',
    text: 'Combien d\'actions tenues aujourd\'hui, ta série de jours d\'affilée, et le choix entre jour plein et jour léger. Un oubli par semaine est toléré.',
  },
  {
    key: 'cocher', route: '/', target: ['[data-tour="check"]', '[data-tour="frise"]'], kicker: 'Ton jour',
    title: 'Cocher',
    text: 'Touche ce rond quand c\'est fait. Touche-le encore pour corriger : version 2 minutes, manqué, jour de repos. Une action à heure fixe cochée en retard est « rattrapée », jamais punie.',
  },
  {
    key: 'plus', route: '/', target: ['[data-tour="plus"]'], kicker: 'Partout',
    title: 'Le bouton +',
    text: 'Sur chaque écran : noter une idée, un mot, un sujet de prière, un devoir, un verre d\'eau, tes pages lues… Deux taps, et tu continues ta journée.',
  },
  {
    key: 'barre', route: '/', target: ['[data-tour="barre"]'], kicker: 'La barre du bas',
    title: 'Six endroits, c\'est tout',
    text: 'Jour (ton programme), Semaine (suivi, planning, bilan, roue, parcours), Esprit, Service, Corps, Études. Le reste est dans le menu en haut de l\'écran Jour.',
  },
  {
    key: 'semaine', route: '/semaine?onglet=planning', target: ['[data-tour="placer"]', '[data-tour="barre"]'], kicker: 'Semaine',
    title: 'Le dimanche, tu places ta semaine',
    text: 'Ce bouton range tes séances « plusieurs fois par semaine » dans tes vrais créneaux libres, calculés depuis ton emploi du temps. Tu ajustes, puis tu valides.',
  },
  {
    key: 'roue', route: '/semaine?onglet=roue', target: ['[data-tour="roue"]'], kicker: 'Semaine › Roue',
    title: 'Ta roue de vie',
    text: 'Dix domaines, une note de 1 à 10 chacun. Une fois par mois, « Faire le point » dessine ton équilibre. Touche un domaine pour l\'ouvrir.',
  },
  {
    key: 'parcours', route: '/semaine?onglet=parcours', target: ['[data-tour="nouveau-parcours"]'], kicker: 'Semaine › Parcours',
    title: 'Tes chapitres de vie',
    text: 'Un parcours a des étapes et des livrables (Bâtisseur 12 mois, Remise en forme…). Tu peux en mener plusieurs et les enchaîner toute ta vie.',
  },
  {
    key: 'menu', route: '/plus', target: ['[data-tour="domaines"]'], kicker: 'Menu',
    title: 'Tout le reste',
    text: 'Mon chemin, journal, lectures, cartes de révision, emploi du temps, binôme, guide, réglages, et les autres domaines de ta vie.',
  },
  {
    key: 'binome', route: '/binome', target: ['[data-tour="binome"]'], kicker: 'Menu › Binôme',
    title: 'Avancer à deux',
    text: 'Invite quelqu\'un avec un code. Tu choisis, action par action, ce qui est partagé : il ou elle ne voit que ce que tu coches.',
  },
  {
    key: 'fin', route: '/', kicker: 'À toi',
    title: 'C\'est tout.',
    text: 'Commence par une seule petite action aujourd\'hui. Le guide complet est dans le menu (en haut de l\'écran Jour) → Guide, et tu peux refaire cette visite quand tu veux.',
  },
];
