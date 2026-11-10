/**
 * Moteur d'etude. Il s'appuie sur ce que la recherche valide le mieux
 * (Dunlosky et al., 2013) :
 *  - le rappel actif (se tester plutot que relire) ;
 *  - l'espacement (revoir a J+1, J+3, J+7, J+14, J+30 plutot que bachoter) ;
 *  - l'entrelacement (alterner les matieres d'une session a l'autre).
 * Relire et surligner donnent une illusion de maitrise : l'app ne les propose pas.
 */
import { addDays, diffDays, today } from './dates';

export const SPACING = [1, 3, 7, 14, 30];

/** Premier passage sur un chapitre : la premiere revision tombe demain. */
export function firstSeen(chapter) {
  return { id: chapter.id, status: 'vu', review_step: 0, next_review: addDays(today(), SPACING[0]) };
}

/**
 * Apres une seance de rappel actif. Confiance >= 3 : on passe a l'intervalle
 * suivant. En dessous : on revoit demain, sans perdre l'etape.
 * Apres J+30 reussi, le chapitre est maitrise.
 */
export function afterReview(chapter, confidence) {
  if (confidence < 3) return { id: chapter.id, confidence, next_review: addDays(today(), 1) };
  const step = (chapter.review_step || 0) + 1;
  if (step >= SPACING.length) return { id: chapter.id, confidence, review_step: step, status: 'revise', next_review: null };
  return { id: chapter.id, confidence, review_step: step, next_review: addDays(today(), SPACING[step]) };
}

export const stepLabel = (c) => {
  if (c.status === 'revise') return 'Maîtrisé';
  if (c.status === 'a_voir') return 'À voir';
  return `Révision ${Math.min((c.review_step || 0) + 1, SPACING.length)}/${SPACING.length}`;
};

/** Pression d'une matiere : chapitres pas encore maitrises par jour restant avant l'examen. */
export function pressure(course, chapters) {
  const left = chapters.filter((c) => c.course_id === course.id && c.status !== 'revise').length;
  if (!course.exam_on || !left) return left ? left / 30 : 0;
  return left / Math.max(1, diffDays(course.exam_on, today()));
}

/**
 * « Quoi etudier maintenant ? » : une liste ordonnee de propositions.
 * 1. revisions espacees arrivees a echeance (le rappel actif d'abord) ;
 * 2. devoirs a rendre sous 2 jours ;
 * 3. chapitres prevus aujourd'hui par le plan d'examen ;
 * 4. la matiere sous la plus forte pression.
 * Deux propositions de suite ne visent jamais la meme matiere (entrelacement).
 */
export function studyNext({ courses = [], chapters = [], assignments = [] }) {
  const t = today();
  const name = (id) => courses.find((c) => c.id === id)?.name || '';
  const list = [];
  chapters.filter((c) => c.next_review && c.next_review <= t && c.status !== 'revise')
    .sort((a, b) => (a.next_review < b.next_review ? -1 : 1))
    .forEach((c) => list.push({
      key: `r-${c.id}`, type: 'review', course_id: c.course_id, chapter: c,
      title: `Rappel actif : ${c.title}`, sub: `${name(c.course_id)} · ${c.next_review < t ? 'en retard' : 'prévu aujourd\'hui'} · ${stepLabel(c)}`, minutes: 20,
    }));
  assignments.filter((a) => !a.done && diffDays(a.due_on, t) <= 2)
    .sort((a, b) => (a.due_on < b.due_on ? -1 : 1))
    .forEach((a) => list.push({
      key: `a-${a.id}`, type: 'assignment', course_id: a.course_id, assignment: a,
      title: a.title, sub: `À rendre ${dueLabel(a.due_on)} · ~${a.est_min} min`, minutes: Math.min(a.est_min, 50),
    }));
  chapters.filter((c) => c.status === 'a_voir' && c.planned_on && c.planned_on <= t)
    .forEach((c) => list.push({
      key: `p-${c.id}`, type: 'learn', course_id: c.course_id, chapter: c,
      title: `Découvrir : ${c.title}`, sub: `${name(c.course_id)} · prévu par ton plan d'examen`, minutes: 45,
    }));
  const top = [...courses].sort((a, b) => pressure(b, chapters) - pressure(a, chapters))[0];
  if (top && pressure(top, chapters) > 0) {
    const next = chapters.filter((c) => c.course_id === top.id && c.status === 'a_voir').sort((a, b) => a.position - b.position)[0];
    if (next && !list.some((x) => x.chapter?.id === next.id)) {
      list.push({
        key: `n-${next.id}`, type: 'learn', course_id: top.id, chapter: next,
        title: `Avancer : ${next.title}`, sub: `${top.name}${top.exam_on ? ` · examen ${dueLabel(top.exam_on)}` : ''}`, minutes: 45,
      });
    }
  }
  // Entrelacement : on evite deux fois de suite la meme matiere.
  const out = [];
  const pool = [...list];
  while (pool.length) {
    const prev = out[out.length - 1]?.course_id;
    const i = pool.findIndex((x) => !prev || x.course_id !== prev);
    out.push(pool.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return out;
}

export function dueLabel(day) {
  const d = diffDays(day, today());
  if (d < 0) return `en retard de ${-d} j`;
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'demain';
  return `dans ${d} j`;
}

/** Minutes etudiees par jour sur `weeks` semaines (carte de chaleur). */
export function heatmap(sessions, weeks = 12) {
  const start = addDays(today(), -(weeks * 7 - 1));
  const byDay = {};
  sessions.forEach((s) => {
    const d = s.started_at.slice(0, 10);
    if (d >= start) byDay[d] = (byDay[d] || 0) + s.minutes;
  });
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = addDays(start, i);
    return { d, m: byDay[d] || 0 };
  });
}

/** Moments de la journee ou elle se concentre le mieux (note de concentration moyenne). */
export function bestFocusTime(sessions) {
  const buckets = { matin: [], 'début d\'après-midi': [], 'fin d\'après-midi': [], soir: [] };
  sessions.filter((s) => s.focus).forEach((s) => {
    const h = new Date(s.started_at).getHours();
    const k = h < 12 ? 'matin' : h < 15 ? 'début d\'après-midi' : h < 18 ? 'fin d\'après-midi' : 'soir';
    buckets[k].push(s.focus);
  });
  const ranked = Object.entries(buckets).filter(([, v]) => v.length >= 2)
    .map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1]);
  return ranked.length >= 2 ? ranked[0] : null;
}

/** Charge des devoirs par jour d'echeance, pour reperer les semaines qui debordent. */
export function workload(assignments, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today(), i);
    return { d, m: assignments.filter((a) => !a.done && a.due_on === d).reduce((s, a) => s + a.est_min, 0) };
  });
}

// Cartes de révision (boîtes de Leitner) : intervalle en jours selon la boîte atteinte.
export const BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/** Mise à jour d'une carte après réponse : bonne = boîte suivante, ratée = retour en boîte 1. */
export function reviewCard(card, ok) {
  const box = ok ? Math.min(5, card.box + 1) : 1;
  return { id: card.id, box, due_on: addDays(today(), BOX_DAYS[box]) };
}

/** Répartit les chapitres « à voir » entre aujourd'hui et l'examen. */
export function revisionPlan(chapters, examOn) {
  const todo = chapters.filter((c) => c.status !== 'revise').sort((a, b) => a.position - b.position);
  if (!examOn || !todo.length) return [];
  const span = Math.max(1, diffDays(examOn, today()));
  return todo.map((c, i) => ({ id: c.id, planned_on: addDays(today(), Math.min(span - 1, Math.floor((i * span) / todo.length))) }));
}

/** Série de jours consécutifs où `ok(jour)` est vrai (aujourd'hui compte s'il est tenu, sinon on part d'hier). */
export function streakBy(ok, max = 400) {
  let d = today();
  if (!ok(d)) d = addDays(d, -1);
  let n = 0;
  while (n < max && ok(d)) { n += 1; d = addDays(d, -1); }
  return n;
}
