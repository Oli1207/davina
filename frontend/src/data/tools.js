import { Activity, BookOpen, CircleHelp, CalendarClock, Coins, GraduationCap, Languages, Lightbulb, Mic, Scale, CalendarRange, Flame, Footprints, Layers, MapPinned, Settings, Sprout, UserRoundCheck, Users } from 'lucide-react';

/** Tous les outils de l'app, rangés par domaine. Plus et les pages de domaine s'en servent. */
export const TOOLS = [
  { domain: 'esprit', to: '/esprit', icon: Flame, title: 'Esprit', sub: 'Méditation, prière, jeûne, versets, intercession' },
  { domain: 'corps', to: '/corps', icon: Activity, title: 'Corps', sub: 'Séances guidées, sucre et sel (SOS envie), repas, poids' },
  { domain: 'savoir', to: '/etudes', icon: GraduationCap, title: 'Études', sub: 'Matières, chapitres, examens, devoirs, concentration' },
  { domain: 'savoir', to: '/etudes?onglet=anglais', icon: Languages, title: 'Anglais', sub: '3 séances par semaine, 5 compétences en rotation' },
  { domain: 'argent', to: '/etudes?onglet=finance', icon: Coins, title: 'Culture financière', sub: 'Un thème par semaine pendant 9 semaines' },
  { domain: 'expression', to: '/etudes?onglet=oral', icon: Mic, title: 'Prise de parole', sub: 'M\'enregistrer, me réécouter, m\'évaluer' },
  { domain: 'expression', to: '/etudes?onglet=argument', icon: Scale, title: 'Atelier d\'argumentation', sub: 'Thèse, arguments, objection, réponse' },
  { domain: 'expression', to: '/etudes?onglet=contenu', icon: Lightbulb, title: 'Création de contenu', sub: 'Idées, pipeline, micro-créneaux de 15 minutes' },
  { domain: 'savoir', to: '/lecture', icon: BookOpen, title: 'Mes lectures', sub: 'Mes livres, mes pages, mes fiches de synthèse' },
  { domain: 'savoir', to: '/revision', icon: Layers, title: 'Cartes de révision', sub: 'Vocabulaire, versets, idées : je révise au bon moment' },
  { domain: 'mission', to: '/terrain', icon: MapPinned, title: 'Carnet de terrain', sub: 'Mes rencontres : problèmes observés, solutions locales' },
  { domain: 'mission', to: '/impact', icon: Sprout, title: 'Mon impact', sub: 'Les personnes qui progressent grâce à mon action' },
  { domain: 'relations', to: '/cercle', icon: UserRoundCheck, title: 'Mon cercle', sub: 'Mes mentors et mes contradicteurs' },
];

export const TOOLS_BY_DOMAIN = (key) => TOOLS.filter((t) => t.domain === key);

export const MY_TRACKING = [
  { to: '/semaine', icon: CalendarRange, title: 'Ma semaine', sub: 'Mes actions de la semaine et mon bilan en 3 questions' },
  { to: '/emploi-du-temps', icon: CalendarClock, title: 'Mon emploi du temps', sub: 'Cours, travail, réveil et coucher : pour calculer mes vrais créneaux libres' },
  { to: '/chemin', icon: Footprints, title: 'Mon chemin', sub: 'Ma progression, mois après mois, année après année' },
  { to: '/binome', icon: Users, title: 'Binôme', sub: 'Avancer avec quelqu\'un, en choisissant ce qu\'on partage' },
  { to: '/guide', icon: CircleHelp, title: 'Guide', sub: 'Tout ce que l\'app sait faire, et la visite guidée' },
  { to: '/reglages', icon: Settings, title: 'Réglages', sub: 'Prénom, rappel du matin, apparence, mes données' },
];
