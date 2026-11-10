import { supabase } from './supabase';

// Tout ce qui appartient à la personne. Sa vie entière tient dans ce fichier.
const TABLES = [
  'profiles', 'user_domains', 'wheel_scores', 'journeys', 'journey_steps', 'deliverables',
  'habits', 'checkins', 'day_logs', 'entries', 'reviews', 'books', 'reading_logs', 'book_summaries',
  'cards', 'field_notes', 'mentors', 'impact_logs',
  'bible_plans', 'devotions', 'prayer_requests', 'fasts', 'intercession_targets',
  'weigh_ins', 'workouts', 'cravings', 'meals',
  'courses', 'chapters', 'assignments', 'focus_sessions',
  'finance_progress', 'arguments', 'speeches', 'content_items',
  'schedule_blocks', 'planned_sessions',
];
const PAGE = 1000;

/** Télécharge toutes les données en un fichier JSON. Lecture par pages de 1000 lignes. */
export async function exportAll() {
  const out = { exported_at: new Date().toISOString(), app: 'davina' };
  for (const table of TABLES) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
      if (error) throw new Error(`${table} : ${error.message}`);
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    out[table] = rows;
  }
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `davina-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
