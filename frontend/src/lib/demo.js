/**
 * Mode demo (npm run demo) : un faux client Supabase en memoire, sauvegarde
 * dans localStorage. Il imite le petit sous-ensemble de supabase-js dont
 * l'app se sert, pour montrer Davina sans backend. Jamais utilise en production.
 */
import { addDays, today } from './dates';

const KEY = 'davina-demo-db-v1';
const uid = 'demo-user';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// Charge a la premiere requete (les constantes du module doivent exister avant le seed).
let db = null;
const getDb = () => (db ||= load());

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return seed();
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };

/** Valeurs par defaut des colonnes, comme dans le schema SQL. */
const DEFAULTS = {
  schedule_blocks: () => ({ kind: 'cours', location: '' }),
  planned_sessions: () => ({}),
  habits: () => ({ duration_min: 0, grace_min: 15, sacred: false, notify: true, per_week: null, per_week_min: null, kind: null, archived: false, days: [0, 1, 2, 3, 4, 5, 6], full_version: '', min_version: '', shared: false, position: 0, at_time: null }),
  entries: () => ({ kind: 'note', domain: null, day: today(), shared: false }),
  user_domains: () => ({ active: false, vision: '', score: null, shared: false }),
  day_logs: () => ({ mode: 'plein', word_used: null, energy: null, mood: null, gratitude: '', water: 0, sugar_free: null, salt_free: null, victory: '', lesson: '' }),
  reviews: () => ({ learned: '', did: '', change: '' }),
  books: () => ({ status: 'to_read', pages_read: 0, author: '', total_pages: null, domain: null, journey_id: null, started_on: null, finished_on: null }),
  reading_logs: () => ({ day: today() }),
  book_summaries: () => ({ learned: '', disagree: '', country: '', apply: '' }),
  courses: () => ({ exam_on: null, position: 0 }),
  chapters: () => ({ status: 'a_voir', planned_on: null, review_step: 0, next_review: null, confidence: null, explanation: '', position: 0 }),
  assignments: () => ({ done: false, est_min: 60, priority: 2, course_id: null }),
  focus_sessions: () => ({ started_at: new Date().toISOString(), kind: 'etude', course_id: null, skill: null, goal: '', focus: null, distractions: '', note: '' }),
  finance_progress: () => ({ action_done: false, notes: '', takeaways: '' }),
  arguments: () => ({ thesis: '', args: [], objection: '', rebuttal: '', conclusion: '' }),
  speeches: () => ({ day: today(), kind: 'impro', duration_sec: null, audio_path: null, note: '' }),
  content_items: () => ({ pillar: 'instagram', details: '', status: 'idee', due_on: null, position: 0 }),
  weigh_ins: () => ({ day: today(), waist_cm: null }),
  workouts: () => ({ day: today(), routine: '', effort: null, note: '' }),
  cravings: () => ({ at: new Date().toISOString(), trigger: '', resisted: null, note: '' }),
  meals: () => ({ day: today(), sugar: false, salt: false, note: '' }),
  bible_plans: () => ({ active: true, current: 1 }),
  devotions: () => ({ day: today(), passage: '', verse: '', observation: '', application: '', prayer: '' }),
  prayer_requests: () => ({ status: 'en_cours', category: 'personnel', details: '', testimony: '', answered_on: null }),
  fasts: () => ({ intention: '', journal: '', ended_at: null, completed: null }),
  intercession_targets: () => ({ active: true, notes: '', category: '', weekday: null, last_prayed_on: null }),
  cards: () => ({ deck: 'mots', box: 1, due_on: today(), back: '', example: '' }),
  field_notes: () => ({ day: today(), place: '', who: '', problems: '', solutions: '', learned: '' }),
  mentors: () => ({ role: '', kind: 'mentor', last_met_on: null, challenge: '' }),
  impact_logs: () => ({ day: today(), people: 1, body: '' }),
  journeys: () => ({ status: 'active', conclusion: '', intention: '', ends_on: null, finished_on: null, previous_id: null, template: null, domain: null }),
  journey_steps: () => ({ about: '', starts_on: null, ends_on: null, position: 0 }),
  deliverables: () => ({ note: '', done_on: null, position: 0, step_id: null }),
};

function withDefaults(table, row) {
  return { id: uuid(), user_id: uid, created_at: new Date().toISOString(), ...(DEFAULTS[table]?.() || {}), ...row };
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.op = 'select';
  }
  select() { if (this.op === 'select') this.op = 'select'; this.returning = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = rows; return this; }
  update(fields) { this.op = 'update'; this.payload = fields; return this; }
  upsert(rows, opts = {}) { this.op = 'upsert'; this.payload = rows; this.conflict = opts.onConflict; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] != null && r[c] >= v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] != null && r[c] <= v); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  match(o) { Object.entries(o).forEach(([c, v]) => this.eq(c, v)); return this; }
  order(c, { ascending = true } = {}) { this.orders.push([c, ascending]); return this; }
  limit(n) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  run() {
    const rows = (getDb()[this.table] ||= []);
    const match = (r) => this.filters.every((f) => f(r));
    let out;
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p) => {
        const keys = this.conflict ? this.conflict.split(',') : ['id'];
        const existing = rows.find((r) => keys.every((k) => (k === 'user_id' ? true : p[k] !== undefined && r[k] === p[k])));
        if (existing && (this.op === 'upsert' || p.id)) return Object.assign(existing, p);
        const row = withDefaults(this.table, p);
        rows.push(row);
        return row;
      });
      out = list;
    } else if (this.op === 'update') {
      out = rows.filter(match);
      out.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === 'delete') {
      out = rows.filter(match);
      getDb()[this.table] = rows.filter((r) => !match(r));
    } else {
      out = rows.filter(match);
    }
    if (this.op !== 'select' && this.table === 'reading_logs') {
      // Imite le declencheur SQL sync_pages_read.
      const d = getDb();
      (d.books || []).forEach((b) => { b.pages_read = Math.max(0, (d.reading_logs || []).filter((l) => l.book_id === b.id).reduce((n, l) => n + l.pages, 0)); });
    }
    if (this.op !== 'select') persist();
    out = out.map((r) => ({ ...r }));
    for (const [c, asc] of [...this.orders].reverse()) {
      out.sort((a, b) => ((a[c] ?? '') < (b[c] ?? '') ? -1 : (a[c] ?? '') > (b[c] ?? '') ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.max) out = out.slice(0, this.max);
    if (this.one === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'Aucune ligne' } };
    if (this.one === 'maybe') return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
  then(resolve, reject) {
    // Un brin de latence, comme un vrai reseau.
    return new Promise((r) => setTimeout(r, 60)).then(() => this.run()).then(resolve, reject);
  }
}

const session = { user: { id: uid, email: 'demo@davina.app' }, access_token: 'demo' };

/** Imite les fonctions SQL appelees par l'app. */
function rpc(name) {
  if (name === 'partner_overview') return [];
  if (name !== 'progress_by_month') return null;
  const db = getDb(); const out = {};
  const at = (m) => (out[m] ||= { month: m, days: new Set(), actions: 0, notes: 0 });
  (db.checkins || []).forEach((c) => { const r = at(`${c.day.slice(0, 7)}-01`); r.days.add(c.day); r.actions += 1; });
  (db.entries || []).forEach((e) => { at(`${e.day.slice(0, 7)}-01`).notes += 1; });
  return Object.values(out).sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((r) => ({ month: r.month, active_days: r.days.size, actions: r.actions, notes: r.notes }));
}

export function createDemoClient() {
  return {
    from: (t) => new Query(t),
    rpc: async (name) => ({ data: rpc(name), error: null }),
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { session }, error: null }),
      signUp: async () => ({ data: { session }, error: null }),
      signOut: async () => { localStorage.removeItem(KEY); location.reload(); },
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: null } }),
        remove: async () => ({ error: null }),
      }),
    },
  };
}

// ─── Donnees de demonstration ──────────────────────────────────────────────

function seed() {
  const t = today();
  const keys = ['esprit', 'corps', 'coeur', 'relations', 'savoir', 'travail', 'argent', 'mission', 'expression', 'joie'];
  const active = ['esprit', 'corps', 'savoir'];
  const scores = [7, 5, 6, 6, 4, 6, 3, 5, 4, 5];
  const habits = [
    withDefaults('habits', { domain: 'esprit', kind: 'meditation', at_time: '05:30:00', duration_min: 20, sacred: true, title: 'Temps avec Dieu', full_version: 'Lire un passage, prier 20 minutes', min_version: 'Un verset et une phrase de prière', position: 1 }),
    withDefaults('habits', { domain: 'corps', kind: 'sport', title: 'Bouger', per_week: 3, per_week_min: 2, duration_min: 30, full_version: '30 minutes de sport', min_version: '10 minutes de marche', position: 2 }),
    withDefaults('habits', { domain: 'savoir', title: 'Lire', full_version: "Lire 60 minutes et noter ce que j'apprends", min_version: 'Lire 5 pages', position: 3, shared: true }),
  ];
  const checkins = [];
  for (let i = 1; i <= 9; i += 1) {
    if (i === 4) continue;
    checkins.push(withDefaults('checkins', { habit_id: habits[0].id, day: addDays(t, -i), level: i % 3 === 0 ? 'min' : 'full' }));
  }
  return {
    profiles: [{ id: uid, wake_time: '05:00:00', bed_time: '22:30:00', weigh_day: 6, height_cm: null, start_weight: null, target_weight: null, display_name: 'Léa', timezone: 'Africa/Abidjan', reminder_time: '08:00:00', reminder_on: true, onboarded: true }],
    user_domains: keys.map((k, i) => withDefaults('user_domains', { domain: k, active: active.includes(k), score: scores[i], vision: k === 'esprit' ? 'Une intimité profonde avec Dieu, chaque jour.' : '' })),
    habits,
    checkins,
    day_logs: [],
    entries: [
      withDefaults('entries', { domain: 'savoir', kind: 'lecon', body: 'Les institutions comptent plus que la bonne volonté : Why Nations Fail, chap. 1.', day: addDays(t, -1) }),
      withDefaults('entries', { domain: null, kind: 'idee', body: 'Un atelier gratuit pour apprendre aux jeunes à faire un budget.', day: addDays(t, -2) }),
    ],
    cards: [
      withDefaults('cards', { front: 'Prolixe', back: 'Qui parle ou écrit trop longuement.', example: 'Sois concise, pas prolixe.' }),
      withDefaults('cards', { front: 'Éloquence', back: 'Art de bien parler, de persuader.' }),
    ],
    field_notes: [], mentors: [], impact_logs: [],
    schedule_blocks: [1, 2, 3, 4, 5].map((wd) => withDefaults('schedule_blocks', { title: 'Cours', weekday: wd, start_time: '08:00:00', end_time: '12:00:00', location: 'Université' })),
    planned_sessions: [],
    finance_progress: [], arguments: [], speeches: [], content_items: [],
    courses: [], chapters: [], assignments: [], focus_sessions: [],
    weigh_ins: [], workouts: [], cravings: [], meals: [],
    bible_plans: [], devotions: [], prayer_requests: [], fasts: [], intercession_targets: [],
    wheel_scores: keys.flatMap((k, i) => [[-120, -2], [-60, -1], [0, 0]].map(([d, off]) => withDefaults('wheel_scores', { domain: k, month: `${addDays(t, d).slice(0, 7)}-01`, score: Math.max(1, Math.min(10, scores[i] + off)) }))),
    journeys: [
      withDefaults('journeys', { title: 'Vie spirituelle — 90 jours', template: 'spirituel', domain: 'esprit', starts_on: addDays(t, -400), ends_on: addDays(t, -311), status: 'done', finished_on: addDays(t, -311), conclusion: 'Ma fidélité est devenue un rendez-vous, plus une humeur.' }),
    ],
    journey_steps: [],
    deliverables: [],
    reviews: [],
    pairs: [],
    push_subscriptions: [],
  };
}
