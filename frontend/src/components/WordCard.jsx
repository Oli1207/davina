import { useRows, useSave } from '../hooks/useData';
import { diffDays } from '../lib/dates';

/** Le « mot à placer » du jour, tiré du paquet Vocabulaire : à utiliser dans une vraie conversation. */
export default function WordCard({ day, log }) {
  const { data: words = [] } = useRows('cards', { key: ['mots'], build: (q) => q.eq('deck', 'mots').order('created_at') });
  const save = useSave('day_logs', { onConflict: 'user_id,day' });
  if (!words.length) return null;
  const word = words[diffDays(day, '2026-01-01') % words.length];
  return (
    <section className="card mb-4 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-rouge">Mot à placer aujourd'hui</p>
      <p className="mt-1 font-display text-2xl font-extrabold break-words">{word.front}</p>
      <p className="text-sm text-muted">{word.back}</p>
      <label className="mt-2 flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={!!log?.word_used} onChange={(e) => save.mutate({ day, word_used: e.target.checked })} />
        Je l'ai placé dans une vraie conversation
      </label>
    </section>
  );
}
