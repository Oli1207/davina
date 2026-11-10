/** Idées de lecture proposées en un tap (issues du plan « Bâtisseur »). */
export const SUGGESTIONS = [
  { title: 'Why Nations Fail', author: 'Daron Acemoglu, James A. Robinson', domain: 'savoir', note: 'Institutions, pouvoir, prospérité et pauvreté des nations.' },
  { title: 'Development as Freedom', author: 'Amartya Sen', domain: 'savoir', note: 'Développement humain, libertés et capacités.' },
  { title: 'How Asia Works', author: 'Joe Studwell', domain: 'savoir', note: 'Les mécanismes économiques derrière plusieurs transformations asiatiques.' },
  { title: 'The Narrow Corridor', author: 'Daron Acemoglu, James A. Robinson', domain: 'savoir', note: 'Équilibre entre société, pouvoir et institutions.' },
  { title: 'Pedagogy of the Oppressed', author: 'Paulo Freire', domain: 'savoir', note: 'Éducation, émancipation intellectuelle et esprit critique.' },
  { title: 'The Psychology of Money', author: 'Morgan Housel', domain: 'argent', note: 'Rapport à l\'argent, comportements et décisions.' },
  { title: 'Les Damnés de la terre', author: 'Frantz Fanon', domain: 'savoir', note: 'Colonisation, identité, construction nationale. À lire avec recul critique.' },
  { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', domain: 'savoir', note: 'Responsabilité personnelle, priorités, discipline.' },
];

export const STATUS = { to_read: 'À lire', reading: 'En cours', done: 'Terminé', dropped: 'Abandonné' };

/** Les quatre questions de la fiche de synthèse. */
export const SUMMARY_FIELDS = [
  ['learned', 'Ce que j\'ai appris', 'Les idées qui m\'ont marquée, avec mes mots'],
  ['disagree', 'Ce avec quoi je ne suis pas d\'accord', 'Un livre se discute : où l\'auteur se trompe-t-il, ou va trop vite ?'],
  ['country', 'Ce que ça m\'apprend sur mon pays', 'Que dit ce livre de la Côte d\'Ivoire, de mon quotidien ?'],
  ['apply', 'Ce que je mets en pratique', 'Une action concrète, pas dix'],
];

/** Date de fin estimée d'après le rythme des 30 derniers jours (null si trop peu de données). */
export function estimateEnd(book, logs, today, addDays) {
  if (!book.total_pages || book.status !== 'reading') return null;
  const from = addDays(today, -29);
  const recent = logs.filter((l) => l.day >= from && l.pages > 0).reduce((s, l) => s + l.pages, 0);
  if (recent < 10) return null;
  const perDay = recent / 30;
  const left = Math.max(0, book.total_pages - book.pages_read);
  return addDays(today, Math.ceil(left / perDay));
}
