/**
 * Le cerveau de Davina : ce qui est au programme d'un jour, où placer une
 * séance, la fidélité à un rendez-vous. Fonctions pures, sans appel réseau.
 * Un pointage a deux niveaux : « full » (complet) ou « min » (version 2 minutes).
 */
import { addDays, diffDays, nowMin, toMin, toTime, today, weekday } from './dates';

/** Action « certains jours » prévue ce jour-là ? (0 = dimanche). Les actions « N fois par semaine » n'ont pas de jour fixe. */
export const isWeekly = (h) => h.per_week != null;
export const dueOn = (habit, day) => !isWeekly(habit) && (habit.days || [0, 1, 2, 3, 4, 5, 6]).includes(weekday(day));

/**
 * Le programme d'un jour.
 *  timed   : rendez-vous à heure fixe, séances placées et cours, triés par heure ;
 *  untimed : actions du jour sans heure ;
 *  weekly  : actions « N fois par semaine » non placées aujourd'hui.
 */
export function agenda(day, habits = [], planned = [], blocks = []) {
  const wd = weekday(day);
  const timed = [];
  const untimed = [];
  const plannedToday = new Set(planned.filter((p) => p.day === day).map((p) => p.habit_id));
  for (const h of habits) {
    if (h.archived) continue;
    if (isWeekly(h)) continue;
    if (!(h.days || []).includes(wd)) continue;
    if (h.at_time) timed.push({ id: `h-${h.id}`, type: 'habit', habit: h, at: toMin(h.at_time) });
    else untimed.push({ id: `h-${h.id}`, type: 'habit', habit: h, at: null });
  }
  for (const p of planned) {
    if (p.day !== day) continue;
    const h = habits.find((x) => x.id === p.habit_id);
    if (h && !h.archived) timed.push({ id: `p-${p.id}`, type: 'habit', habit: h, at: toMin(p.at_time), planned: p });
  }
  for (const b of blocks) {
    if (b.weekday === wd) timed.push({ id: `b-${b.id}`, type: 'block', block: b, at: toMin(b.start_time), end: toMin(b.end_time) });
  }
  timed.sort((a, b) => a.at - b.at);
  const weekly = habits.filter((h) => !h.archived && isWeekly(h) && !plannedToday.has(h.id));
  return { timed, untimed, weekly };
}

/** Retard en minutes si on pointe maintenant un rendez-vous qui finit à `endAt` (aujourd'hui seulement). */
export function lateness(day, endAt) {
  if (endAt == null || day !== today()) return null;
  return Math.max(0, nowMin() - endAt);
}

/** Etat visuel d'un pointage : full, min, late (complet mais hors marge), ou rien. */
export function stateOf(checkin, habit) {
  if (!checkin) return null;
  if (checkin.level === 'full' && habit?.at_time && (checkin.late_min ?? 0) > (habit.grace_min ?? 15)) return 'late';
  return checkin.level;
}

// ─── Série, encouragements, roue ───────────────────────────────────────────

/**
 * Série de jours tenus, indulgente : on tolère 1 jour manqué par fenêtre de 7 jours.
 * Le jour d'aujourd'hui ne casse jamais la série tant qu'il n'est pas fini.
 */
export function streak(doneDays, today_) {
  let count = 0;
  const misses = [];
  for (let i = 0; i < 400; i += 1) {
    const day = addDays(today_, -i);
    if (doneDays.has(day)) count += 1;
    else if (i === 0) continue;
    else {
      if (misses.filter((m) => m - i < 7).length >= 1) break;
      misses.push(i);
    }
  }
  return count;
}

export function cheer(done, total) {
  if (!total) return 'Choisis une première action : une seule suffit pour commencer.';
  if (done === 0) return 'Commence par la plus petite. Deux minutes comptent.';
  if (done < total) return `Encore ${total - done} : tu es déjà en mouvement.`;
  return 'Journée tenue. Tu peux t\'arrêter là, ou aller plus loin.';
}

export function wheelAverage(domains) {
  const s = domains.map((d) => d.score).filter(Boolean);
  return s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : null;
}

// ─── Fidélité et progression ───────────────────────────────────────────────

/** Jours où l'action était due entre `from` et `to` inclus. */
function dueDays(habit, from, to, planned = []) {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isWeekly(habit)) {
      if (planned.some((p) => p.habit_id === habit.id && p.day === d)) days.push(d);
    } else if ((habit.days || []).includes(weekday(d))) days.push(d);
  }
  return days;
}

/** Pour une semaine : fait / attendu, et pour les rendez-vous à heure fixe la part à l'heure. */
export function weekProgress(habit, checkins, monday, until = today()) {
  const end = addDays(monday, 6) < until ? addDays(monday, 6) : until;
  const mine = checkins.filter((c) => c.habit_id === habit.id && c.day >= monday && c.day <= addDays(monday, 6));
  const done = mine.filter((c) => c.level === 'full' || c.level === 'min');
  // Les jours de repos (maladie, voyage) sont dispensés : ils sortent de l'objectif.
  const rest = mine.filter((c) => c.level === 'rest').length;
  if (isWeekly(habit)) return { done: done.length, target: habit.per_week, min: habit.per_week_min || habit.per_week };
  const target = Math.max(0, dueDays(habit, monday, addDays(monday, 6)).length - rest);
  const onTime = habit.at_time ? done.filter((c) => c.level === 'full' && (c.late_min ?? 0) <= (habit.grace_min ?? 15)).length : null;
  return { done: done.length, target, elapsed: dueDays(habit, monday, end).length, onTime };
}

/** Fidélité sur les 14 derniers jours (hors aujourd'hui). */
export function fidelity(habit, checkins, days = 14) {
  const end = addDays(today(), -1);
  const from = addDays(end, -(days - 1));
  const excused = new Set(checkins.filter((c) => c.habit_id === habit.id && c.level === 'rest').map((c) => c.day));
  const due = dueDays(habit, from, end).filter((d) => !excused.has(d));
  if (!due.length) return null;
  const mine = checkins.filter((c) => c.habit_id === habit.id && due.includes(c.day) && (c.level === 'full' || c.level === 'min'));
  const onTime = mine.filter((c) => c.level === 'full' && (c.late_min ?? 0) <= (habit.grace_min ?? 15)).length;
  return { due: due.length, kept: mine.length, onTime, rate: mine.length / due.length, onTimeRate: onTime / due.length };
}

// ─── Créneaux libres et placement automatique ──────────────────────────────

/** Occupations d'un jour, en minutes : cours, rendez-vous fixes, séances déjà placées. */
export function busyRanges(day, { blocks = [], habits = [], planned = [] }) {
  const wd = weekday(day);
  const ranges = [];
  blocks.filter((b) => b.weekday === wd).forEach((b) => ranges.push([toMin(b.start_time), toMin(b.end_time)]));
  habits.filter((h) => h.at_time && !h.archived && !isWeekly(h) && (h.days || []).includes(wd))
    .forEach((h) => ranges.push([toMin(h.at_time), toMin(h.at_time) + Math.max(h.duration_min, 10)]));
  planned.filter((p) => p.day === day).forEach((p) => {
    const h = habits.find((x) => x.id === p.habit_id);
    ranges.push([toMin(p.at_time), toMin(p.at_time) + (h?.duration_min || 30)]);
  });
  return ranges.sort((a, b) => a[0] - b[0]);
}

/** Trous d'au moins `minLen` minutes entre le réveil et le coucher. */
export function freeSlots(day, ctx, profile, minLen = 15) {
  let start = toMin(profile?.wake_time || '05:00') + 30;
  const end = toMin(profile?.bed_time || '22:30') - 15;
  if (day === today()) start = Math.max(start, Math.ceil(nowMin() / 5) * 5);
  const slots = [];
  let cursor = start;
  for (const [a, b] of busyRanges(day, ctx)) {
    if (a - cursor >= minLen) slots.push([cursor, Math.min(a, end)]);
    cursor = Math.max(cursor, b);
    if (cursor >= end) break;
  }
  if (end - cursor >= minLen) slots.push([cursor, end]);
  return slots.filter(([a, b]) => b - a >= minLen);
}

const MAX_DAY_LOAD = 150;
const PREFERRED = { sport: 17 * 60 + 30, anglais: 19 * 60, contenu: 13 * 60, oral: 19 * 60 + 30, argument: 16 * 60, finance: 16 * 60, libre: 15 * 60 };

/**
 * Propose un placement des séances « N fois par semaine » restantes sur les jours à venir.
 * Les séances d'une même action sont espacées au maximum ; le sport évite les jours de jeûne.
 */
export function autoPlace({ days, habits, planned, checkins, blocks, profile, fasts = [] }) {
  const upcoming = days.filter((d) => d >= today());
  const placed = [...planned];
  const proposals = [];
  const fastDays = new Set();
  fasts.forEach((f) => {
    for (let d = f.starts_at.slice(0, 10); d <= f.ends_at.slice(0, 10); d = addDays(d, 1)) fastDays.add(d);
  });

  for (const h of habits.filter((x) => isWeekly(x) && !x.archived)) {
    const doneCount = checkins.filter((c) => c.habit_id === h.id && days.includes(c.day)).length;
    const already = placed.filter((p) => p.habit_id === h.id && days.includes(p.day));
    let need = h.per_week - Math.max(doneCount, already.length);
    const chosen = already.map((p) => p.day);
    while (need > 0) {
      const candidates = upcoming.filter((d) => !chosen.includes(d) && !(h.kind === 'sport' && fastDays.has(d)));
      if (!candidates.length) break;
      const spread = (d) => (chosen.length ? Math.min(3, ...chosen.map((c) => Math.abs(diffDays(d, c)))) : 3);
      const load = (d) => placed.filter((p) => p.day === d).reduce((sum, p) => sum + (habits.find((x) => x.id === p.habit_id)?.duration_min || 30), 0);
      candidates.sort((a, b) => spread(b) - spread(a) || load(a) - load(b) || (a < b ? -1 : 1));
      const len = Math.max(h.duration_min || 30, 15);
      let done = false;
      for (const d of candidates) {
        if (load(d) + len > MAX_DAY_LOAD) continue;
        const slots = freeSlots(d, { blocks, habits, planned: placed }, profile, len);
        if (!slots.length) continue;
        const pref = PREFERRED[h.kind] ?? PREFERRED.libre;
        const best = slots.map(([a, b]) => [Math.min(Math.max(pref, a), b - len), a, b]).sort((x, y) => Math.abs(x[0] - pref) - Math.abs(y[0] - pref))[0];
        const row = { habit_id: h.id, day: d, at_time: toTime(Math.round(best[0] / 5) * 5) };
        placed.push(row);
        proposals.push(row);
        chosen.push(d);
        done = true;
        break;
      }
      if (!done) break;
      need -= 1;
    }
  }
  return proposals;
}

/** Le sommeil et les rendez-vous du matin : « ton heure de coucher décide de tes matins ». */
export function sleepInsight(habits, checkins, dayLogs) {
  const early = habits.filter((h) => h.at_time && toMin(h.at_time) < 8 * 60 && !isWeekly(h));
  if (!early.length) return null;
  const rows = dayLogs.filter((l) => l.sleep_hours != null).map((l) => {
    const due = early.filter((h) => h.days.includes(weekday(l.day)));
    const ok = due.filter((h) => checkins.some((c) => c.habit_id === h.id && c.day === l.day && c.level === 'full' && (c.late_min ?? 0) <= h.grace_min));
    return { short: Number(l.sleep_hours) < 6.5, rate: due.length ? ok.length / due.length : null };
  }).filter((r) => r.rate != null);
  const avg = (a) => a.reduce((s, r) => s + r.rate, 0) / a.length;
  const short = rows.filter((r) => r.short);
  const long = rows.filter((r) => !r.short);
  if (short.length < 2 || long.length < 2) return null;
  const a = avg(short);
  const b = avg(long);
  if (b - a < 0.25) return null;
  return `Après une nuit de moins de 6 h 30, tu tiens tes rendez-vous du matin ${Math.round(a * 100)} % du temps, contre ${Math.round(b * 100)} % quand tu dors assez. Ton heure de coucher décide de tes matins.`;
}
