import { BookOpen, Briefcase, Flame, Heart, HeartHandshake, Megaphone, PiggyBank, Smile, Target, Users } from 'lucide-react';

/**
 * Les 10 domaines de vie. Le visuel est rouge et blanc : on distingue les
 * domaines par l'icône et le nom, pas par une couleur.
 * `starters` : actions proposées en un tap (version complète / version 2 minutes).
 */
export const DOMAINS = [
  {
    key: 'esprit', name: 'Esprit', icon: Flame, about: 'Prière, méditation, jeûne, versets',
    starters: [
      { title: 'Temps avec Dieu', full: 'Lire un passage, prier 20 minutes', min: 'Un verset et une phrase de prière', kind: 'meditation' },
      { title: 'Prière', full: '20 minutes de prière', min: 'Une phrase de prière', kind: 'priere' },
      { title: 'Gratitude', full: 'Écrire 3 choses pour lesquelles je remercie', min: 'Remercier pour une chose' },
    ],
  },
  {
    key: 'corps', name: 'Corps', icon: HeartHandshake, about: 'Sport, sommeil, alimentation',
    starters: [
      { title: 'Bouger', full: '30 minutes de sport', min: '10 minutes de marche', kind: 'sport' },
      { title: 'Eau', full: '8 verres d\'eau', min: '3 verres d\'eau' },
      { title: 'Coucher à l\'heure', full: 'Au lit à l\'heure prévue, écran coupé', min: 'Écran coupé 15 min avant' },
    ],
  },
  {
    key: 'coeur', name: 'Cœur', icon: Heart, about: 'Émotions, repos, santé mentale',
    starters: [
      { title: 'Respirer', full: '10 minutes de calme, sans écran', min: '5 grandes respirations' },
      { title: 'Écrire ce que je ressens', full: 'Une page de journal', min: 'Une phrase' },
    ],
  },
  {
    key: 'relations', name: 'Relations', icon: Users, about: 'Famille, amis, couple, réseau',
    starters: [
      { title: 'Prendre des nouvelles', full: 'Appeler quelqu\'un qui compte', min: 'Envoyer un message' },
      { title: 'Rencontrer quelqu\'un de nouveau', full: 'Un échange profond avec quelqu\'un', min: 'Dire bonjour à quelqu\'un de nouveau' },
    ],
  },
  {
    key: 'savoir', name: 'Savoir', icon: BookOpen, about: 'Lectures, cours, langues',
    starters: [
      { title: 'Lire', full: 'Lire 60 minutes et noter ce que j\'apprends', min: 'Lire 5 pages' },
      { title: 'Apprendre un mot', full: 'Réviser mes cartes de vocabulaire', min: 'Un mot nouveau' },
    ],
  },
  {
    key: 'travail', name: 'Travail', icon: Briefcase, about: 'Compétences, projets, carrière',
    starters: [
      { title: 'Construire', full: '60 minutes sur mon projet', min: '10 minutes sur mon projet' },
      { title: 'Apprendre une compétence', full: '30 minutes d\'exercice', min: 'Un exercice' },
    ],
  },
  {
    key: 'argent', name: 'Argent', icon: PiggyBank, about: 'Budget, épargne, culture financière',
    starters: [
      { title: 'Noter mes dépenses', full: 'Noter toutes mes dépenses du jour', min: 'Noter la plus grosse dépense' },
      { title: 'Épargner', full: 'Mettre de côté ma part', min: 'Mettre de côté un petit montant' },
    ],
  },
  {
    key: 'mission', name: 'Mission', icon: Target, about: 'Vision, impact, service, terrain',
    starters: [
      { title: 'Avancer ma mission', full: '30 minutes sur ma vision ou mon projet d\'impact', min: 'Écrire une idée' },
      { title: 'Écouter quelqu\'un du terrain', full: 'Une vraie conversation pour comprendre sa réalité', min: 'Poser une question à quelqu\'un' },
    ],
  },
  {
    key: 'expression', name: 'Expression', icon: Megaphone, about: 'Écriture, parole, création',
    starters: [
      { title: 'Écrire', full: 'Écrire 30 minutes', min: 'Écrire 5 phrases' },
      { title: 'Parler devant la caméra', full: 'M\'enregistrer 3 minutes sans notes', min: 'M\'enregistrer 1 minute', kind: 'oral' },
    ],
  },
  {
    key: 'joie', name: 'Joie', icon: Smile, about: 'Loisirs, créativité, temps pour soi',
    starters: [
      { title: 'Un moment pour moi', full: '1 heure de loisir sans culpabilité', min: '10 minutes pour moi' },
    ],
  },
];

/** Activités qui peuvent cocher une action toute seule (voir useAutoCheck). */
export const LINKS = {
  savoir: [['etude', 'Session d\'étude'], ['anglais', 'Séance d\'anglais']],
  expression: [['oral', 'Prise de parole'], ['argument', 'Argumentaire'], ['contenu', 'Création de contenu']],
  argent: [['finance', 'Action financière de la semaine']],
  corps: [['sport', 'Séance de sport']],
  esprit: [['meditation', 'Journal de méditation'], ['priere', 'Mode prière'], ['jeune', 'Jeûne accompli'], ['intercession', 'Intercession']],
};

export const DOMAIN = Object.fromEntries(DOMAINS.map((d) => [d.key, d]));

/** Les types de notes de la capture rapide. */
export const KINDS = [
  ['idee', 'Idée'], ['lecon', 'Leçon'], ['gratitude', 'Gratitude'], ['victoire', 'Victoire'],
  ['erreur', 'Erreur'], ['rencontre', 'Rencontre'], ['lecture', 'Lecture'], ['note', 'Note'],
];
export const KIND = Object.fromEntries(KINDS);
