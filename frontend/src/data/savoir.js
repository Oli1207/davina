import { addDays, today } from '../lib/dates';

// ─── Anglais ───────────────────────────────────────────────────────────────

export const ENGLISH_SKILLS = [
  { key: 'ecoute', label: 'Écoute', idea: 'Un podcast ou une vidéo de 15 min avec sous-titres anglais, puis résumer à voix haute.' },
  { key: 'oral', label: 'Oral', idea: 'Parler 5 min d\'un sujet du jour en s\'enregistrant, puis noter les mots qui ont manqué.' },
  { key: 'vocabulaire', label: 'Vocabulaire', idea: 'Ajouter 10 mots croisés dans la semaine et réviser le paquet « Anglais » des cartes.' },
  { key: 'grammaire', label: 'Grammaire', idea: 'Un point de grammaire (temps, prépositions…) et 10 phrases à soi.' },
  { key: 'ecrit', label: 'Écrit', idea: 'Écrire 150 mots : journal de la journée ou réponse à une question ouverte.' },
];

/** Compétence la moins travaillée sur 4 semaines. */
export function nextEnglishSkill(sessions) {
  const since = addDays(today(), -28);
  const count = Object.fromEntries(ENGLISH_SKILLS.map((s) => [s.key, 0]));
  sessions.filter((s) => s.kind === 'anglais' && s.started_at.slice(0, 10) >= since)
    .forEach((s) => { if (s.skill in count) count[s.skill] += s.minutes; });
  const key = Object.entries(count).sort((a, b) => a[1] - b[1])[0][0];
  return { skill: ENGLISH_SKILLS.find((s) => s.key === key), count };
}

// ─── Culture financière : un thème par semaine, neuf semaines ──────────────

export const FINANCE_WEEKS = [
  { title: 'Mon argent aujourd\'hui', questions: ['Combien gagne-je vraiment par mois, toutes sources comprises ?', 'Où part mon argent ? Quelles dépenses me surprennent ?', 'Qu\'est-ce que je dois, et à qui ?'], action: 'Noter chaque dépense pendant 7 jours, même 100 FCFA.' },
  { title: 'Le budget', questions: ['Qu\'est-ce que la règle 50/30/20 (besoins, envies, épargne) ?', 'Qu\'est-ce qu\'un budget « à zéro » où chaque franc a un rôle ?', 'Quelles sont mes dépenses fixes et variables ?'], action: 'Faire mon budget du mois prochain sur papier ou dans un tableau.' },
  { title: 'Épargne et fonds d\'urgence', questions: ['Pourquoi un fonds d\'urgence de 3 à 6 mois de dépenses ?', 'Où garder cette épargne pour ne pas y toucher ?', 'Qu\'est-ce que « se payer en premier » ?'], action: 'Mettre en place une épargne automatique, même petite, le jour où l\'argent arrive.' },
  { title: 'Mobile money, banques et frais cachés', questions: ['Combien m\'ont coûté mes transferts et retraits le mois dernier ?', 'Quelle différence entre compte courant, compte épargne et portefeuille mobile ?', 'Quels frais bancaires paie-je sans le savoir ?'], action: 'Additionner tous mes frais du mois dernier et trouver un moyen de les réduire.' },
  { title: 'Dettes, crédit et taux', questions: ['Qu\'est-ce qu\'un taux d\'intérêt annuel ? Et le coût total d\'un crédit ?', 'Bonne dette ou mauvaise dette : quelle différence ?', 'Méthode boule de neige ou avalanche pour rembourser ?'], action: 'Lister mes dettes (même envers des proches) avec un plan de remboursement.' },
  { title: 'Intérêts composés et inflation', questions: ['Pourquoi commencer tôt change tout ?', 'Que fait l\'inflation à l\'argent qui dort ?', 'Qu\'est-ce que la règle de 72 ?'], action: 'Calculer ce que deviennent 10 000 FCFA par mois pendant 10 ans à 5 % par an.' },
  { title: 'Investir : les bases', questions: ['Action, obligation, fonds commun : c\'est quoi ?', 'Qu\'est-ce que la BRVM, la bourse régionale basée à Abidjan ?', 'Tontine, immobilier, entreprise : quels risques pour quels rendements ?'], action: 'Suivre 3 sociétés cotées à la BRVM pendant la semaine et noter ce que je comprends.' },
  { title: 'Créer des revenus', questions: ['Quelles compétences ai-je déjà qui ont de la valeur ?', 'Freelance, petit commerce, contenu : par où commencer sans capital ?', 'Comment fixer un prix juste ?'], action: 'Lister 3 idées de revenus à partir de mes talents et en tester une.' },
  { title: 'Se protéger des arnaques', questions: ['Comment reconnaître un système de Ponzi ou une promesse de gain trop belle ?', 'Quelles sont les arnaques courantes au mobile money ?', 'Comment protéger mes codes et mes comptes ?'], action: 'Vérifier la sécurité de mes comptes (codes, double validation) et en parler à un proche.' },
];

// ─── Art oratoire ──────────────────────────────────────────────────────────

export const DEBATE_TOPICS = [
  'Les réseaux sociaux rapprochent-ils ou isolent-ils ?',
  'L\'école prépare-t-elle vraiment à la vie ?',
  'Vaut-il mieux être aimé ou respecté ?',
  'La réussite se mesure-t-elle à l\'argent ?',
  'Faut-il tout pardonner ?',
  'Les jeunes Africains doivent-ils partir pour réussir ?',
  'Le français est-il un atout ou un frein pour nos langues locales ?',
  'La discipline vaut-elle mieux que le talent ?',
  'Doit-on toujours dire la vérité ?',
  'L\'intelligence artificielle menace-t-elle la créativité ?',
  'Le mariage est-il encore une priorité pour notre génération ?',
  'Faut-il rendre le service civique obligatoire ?',
  'La foi et la science s\'opposent-elles ?',
  'Un pays peut-il se développer sans industrialisation ?',
  'La jeunesse est-elle responsable de l\'avenir de son pays ?',
];

export const SPEECH_KINDS = [['impro', 'Improvisation'], ['prepare', 'Discours préparé'], ['expose', 'Exposé'], ['debat', 'Argumentaire'], ['lecture', 'Lecture à voix haute']];

export const SPEECH_PROMPTS = [
  'Présente-toi en 1 minute comme devant un jury.',
  'Raconte un moment où tu as eu peur et ce que tu en as appris.',
  'Défends ton livre préféré en 2 minutes.',
  'Explique ton projet à quelqu\'un qui n\'en a jamais entendu parler.',
  'Le mot du jour : utilise-le trois fois dans une histoire.',
  'Convaincs-moi de faire du sport cette semaine.',
  'Un verset ou une idée qui t\'habite : explique-le simplement.',
  'Décris ton quartier pour qu\'on s\'y voie.',
  'Explique un problème de ton pays et une piste pour le résoudre.',
];

export const SPEECH_CRITERIA = [
  ['clarity', 'Clarté', 'Les idées sont faciles à suivre.'],
  ['pace', 'Débit', 'Ni trop vite, ni trop lent, avec des silences.'],
  ['structure', 'Structure', 'Une intro, un fil, une conclusion.'],
  ['voice', 'Voix', 'Volume, intonation, articulation.'],
  ['presence', 'Présence', 'Assurance, conviction.'],
  ['fillers', 'Sans tics', 'Peu de « euh », « en fait », « du coup ».'],
];

// ─── Contenu ───────────────────────────────────────────────────────────────

export const BOARD_STATUSES = [['idee', 'Idées'], ['en_cours', 'En cours'], ['pret', 'Prêt'], ['fait', 'Fait']];
export const CONTENT_PLATFORMS = ['Instagram', 'TikTok', 'WhatsApp', 'Facebook', 'YouTube', 'LinkedIn', 'Autre'];
