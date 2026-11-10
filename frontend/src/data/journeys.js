import { addDays } from '../lib/dates';

/**
 * Modèles de parcours. `from`/`to` sont des jours depuis le début (0 = le premier).
 * `about` : une ligne par point travaillé. Les actions proposées sont rattachées
 * au parcours, pour retrouver plus tard tout ce qu'il a produit.
 */
export const TEMPLATES = [
  {
    key: 'batisseur',
    name: 'Bâtisseur — 12 mois',
    tagline: 'Se former pour contribuer à transformer son pays.',
    domain: 'mission',
    days: 360,
    intention: 'Devenir quelqu\'un dont les idées, les réalisations et le caractère méritent d\'être étudiés. Former des personnes autonomes, pas des disciples : la crédibilité plutôt que la popularité.',
    steps: [
      {
        title: 'Comprendre', from: 0, to: 89,
        about: 'Histoire des civilisations (Chine, Japon, Corée, Singapour, expériences africaines)\nHistoire de la Côte d\'Ivoire\nPsychologie et sociologie\nPremières lectures économiques',
        deliverables: ['Mon diagnostic de la Côte d\'Ivoire'],
      },
      {
        title: 'Structurer sa pensée', from: 90, to: 179,
        about: 'Économie du développement\nInstitutions et gouvernance\nPhilosophie et éthique\nArt oratoire et rédaction',
        deliverables: ['« La Côte d\'Ivoire que nous pouvons construire » : mon document de vision'],
      },
      {
        title: 'Aller sur le terrain', from: 180, to: 269,
        about: 'Rencontrer des jeunes de différents milieux\nOrganiser des discussions\nIdentifier les problèmes réels\nExpérimenter des ateliers\nRéunir un premier groupe de travail',
        deliverables: ['Mon premier programme expérimental pour 15 à 30 jeunes'],
      },
      {
        title: 'Construire', from: 270, to: 359,
        about: 'Évaluer les résultats du programme\nAméliorer les méthodes pédagogiques\nConstituer une petite équipe\nPublier mes premières analyses',
        deliverables: ['Un mouvement pilote : vision, méthode, résultats mesurables', 'Ma stratégie sur 5 ans'],
      },
    ],
    habits: [
      { domain: 'savoir', title: 'Lire et apprendre', full: '60 minutes de lecture (histoire, économie, philosophie…)', min: '10 minutes ou 5 pages' },
      { domain: 'expression', title: 'Réfléchir et écrire', full: '30 minutes pour résumer et construire mes arguments', min: '3 phrases' },
      { domain: 'expression', title: 'Parler devant la caméra', full: '20 minutes : expliquer une idée sans notes', min: '1 minute' },
      { domain: 'mission', title: 'Construire', full: '60 minutes sur mon projet ou une compétence', min: '10 minutes' },
      { domain: 'relations', title: 'Écouter quelqu\'un', full: 'Une vraie conversation, sans expliquer ce qu\'il doit penser', min: 'Poser une question à quelqu\'un' },
    ],
  },
  {
    key: 'forme',
    name: 'Remise en forme — 12 semaines',
    tagline: 'Un corps solide, à un rythme qu\'on peut tenir.',
    domain: 'corps',
    days: 84,
    intention: 'Retrouver de l\'énergie et de la force, sans me punir.',
    steps: [
      { title: 'Poser les bases', from: 0, to: 27, about: 'Noter mon point de départ\nBouger 3 fois par semaine, même peu\nBoire assez d\'eau', deliverables: ['Mon point de départ (poids, taille, énergie)'] },
      { title: 'Prendre le rythme', from: 28, to: 55, about: 'Allonger les séances\nRégler mon heure de coucher\nManger plus simple', deliverables: ['Trois semaines de sport tenues d\'affilée'] },
      { title: 'Tenir et mesurer', from: 56, to: 83, about: 'Garder le rythme les jours difficiles\nComparer avec mon point de départ', deliverables: ['Mon bilan à 12 semaines'] },
    ],
    habits: [
      { domain: 'corps', title: 'Bouger', full: '30 minutes de sport', min: '10 minutes de marche' },
      { domain: 'corps', title: 'Eau', full: '8 verres d\'eau', min: '3 verres d\'eau' },
      { domain: 'corps', title: 'Coucher à l\'heure', full: 'Au lit à l\'heure prévue, écran coupé', min: 'Écran coupé 15 min avant' },
    ],
  },
  {
    key: 'finances',
    name: 'Finances saines — 3 mois',
    tagline: 'Voir clair, mettre de côté, faire grandir.',
    domain: 'argent',
    days: 90,
    intention: 'Savoir où va mon argent et en mettre de côté chaque mois.',
    steps: [
      { title: 'Voir clair', from: 0, to: 29, about: 'Noter chaque dépense\nListe de mes revenus et de mes dettes', deliverables: ['Mon budget du mois'] },
      { title: 'Mettre de côté', from: 30, to: 59, about: 'Choisir un montant d\'épargne\nL\'automatiser', deliverables: ['Mon épargne en place'] },
      { title: 'Faire grandir', from: 60, to: 89, about: 'Fixer un objectif à un an\nApprendre une façon de faire fructifier', deliverables: ['Mon plan financier à un an'] },
    ],
    habits: [
      { domain: 'argent', title: 'Noter mes dépenses', full: 'Noter toutes mes dépenses du jour', min: 'Noter la plus grosse dépense' },
    ],
  },
  {
    key: 'spirituel',
    name: 'Vie spirituelle — 90 jours',
    tagline: 'Fidélité, profondeur, fruit.',
    domain: 'esprit',
    days: 90,
    intention: 'Faire de mon temps avec Dieu un rendez-vous qui ne dépend pas de mon humeur.',
    steps: [
      { title: 'Fidélité', from: 0, to: 29, about: 'Un rendez-vous chaque jour\nUn plan de lecture simple', deliverables: ['Mon plan de lecture choisi'] },
      { title: 'Profondeur', from: 30, to: 59, about: 'Méditer un passage (écriture, observation, application, prière)\nPrier pour des personnes précises', deliverables: ['Quatre semaines de journal de méditation'] },
      { title: 'Fruit', from: 60, to: 89, about: 'Mettre en pratique\nPartager ce que j\'ai reçu', deliverables: ['Un témoignage écrit de ces 90 jours'] },
    ],
    habits: [
      { domain: 'esprit', title: 'Temps avec Dieu', full: 'Lire un passage, prier 20 minutes', min: 'Un verset et une phrase de prière' },
    ],
  },
  {
    key: 'libre',
    name: 'Parcours libre',
    tagline: 'Je pars de zéro : mon titre, ma durée.',
    domain: null,
    days: 90,
    intention: '',
    steps: [{ title: 'Étape 1', from: 0, to: 89, about: '', deliverables: [] }],
    habits: [],
  },
];

export const TEMPLATE = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

/** Lignes prêtes à insérer pour un parcours démarré le jour `start`. */
export function buildJourney(tpl, { start, title, previousId = null, withHabits = true }) {
  return {
    journey: {
      title: title || tpl.name,
      template: tpl.key,
      domain: tpl.domain,
      intention: tpl.intention,
      starts_on: start,
      ends_on: addDays(start, tpl.days - 1),
      previous_id: previousId,
    },
    steps: tpl.steps.map((s, i) => ({
      position: i, title: s.title, about: s.about,
      starts_on: addDays(start, s.from), ends_on: addDays(start, s.to),
      deliverables: s.deliverables,
    })),
    habits: withHabits ? tpl.habits : [],
  };
}
