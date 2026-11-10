/**
 * Dates en heure locale du telephone. On manipule des chaines ISO « AAAA-MM-JJ »
 * pour les jours (comme les colonnes `date` de Postgres) et des minutes depuis
 * minuit pour les heures.
 */

const pad = (n) => String(n).padStart(2, '0');

export function iso(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const today = () => iso(new Date());

export function parseDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function diffDays(a, b) {
  return Math.round((parseDay(a) - parseDay(b)) / 86400000);
}
/** 0 = dimanche, comme Date.getDay() et la colonne habits.days. */
export const weekday = (s) => parseDay(s).getDay();

/** Lundi de la semaine du jour donne. */
export function weekStart(s = today()) {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}
export const weekDays = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function toTime(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
export const hhmm = (t) => (t ? t.slice(0, 5) : '');
export const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_COURTS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  .map((m) => m.replace('fevrier', 'février').replace('aout', 'août').replace('decembre', 'décembre'));

export const dayName = (s) => JOURS[weekday(s)];
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayShort = (wd) => JOURS_COURTS[wd];
export const DAY_LABELS = JOURS;
export function longDate(s) {
  const d = parseDay(s);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function shortDate(s) {
  const d = parseDay(s);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}
export function duration(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${pad(m)}`;
  return `${m} min`;
}
/** 45 -> « 45 min », 734 -> « 12 h 14 ». */
export function minutesLabel(min) {
  const m = Math.round(min);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}
export function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
