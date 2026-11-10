import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { addDays, shortDate, today, weekStart } from '../../lib/dates';
import { ENGLISH_SKILLS, nextEnglishSkill } from '../../data/savoir';
import { toast } from '../../components/toast';
import { Card, Chips, Gauge, SectionTitle, Tabs } from '../../components/ui';
import Timer from '../../components/Timer';

const GOAL = 3; // séances de 30 minutes par semaine

/** Anglais : 3 séances de 30 min par semaine, en tournant sur 5 compétences. L'app propose la moins travaillée. */
export default function English() {
  const { data: sessions = [] } = useRows('focus_sessions', { key: ['anglais'], build: (q) => q.eq('kind', 'anglais').gte('started_at', addDays(today(), -28)).order('started_at', { ascending: false }) });
  const { data: words = [] } = useRows('cards', { key: ['anglais'], build: (q) => q.eq('deck', 'anglais').order('created_at', { ascending: false }).limit(100) });
  const save = useSave('focus_sessions');
  const autoCheck = useAutoCheck();
  const [view, setView] = useState('seance');
  const [chosen, setChosen] = useState(null);
  const { skill, count } = nextEnglishSkill(sessions);
  const current = ENGLISH_SKILLS.find((s) => s.key === (chosen || skill.key));
  const monday = weekStart();
  const thisWeek = sessions.filter((s) => s.started_at.slice(0, 10) >= monday);
  const max = Math.max(1, ...Object.values(count));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Cette semaine</h2>
          <span className="num text-muted">{thisWeek.length}/{GOAL} séances</span>
        </div>
        <Gauge done={Math.min(thisWeek.length, GOAL)} target={GOAL} tone="rouge" />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {ENGLISH_SKILLS.map((s) => (
            <div key={s.key} className="text-center">
              <div className="mx-auto flex h-16 w-5 items-end rounded-sm bg-rouge-soft"><div className="w-full rounded-sm bg-rouge" style={{ height: `${(count[s.key] / max) * 100}%` }} /></div>
              <p className="mt-1 text-[0.65rem] font-semibold">{s.label}</p>
              <p className="text-[0.6rem] text-muted num">{count[s.key]} min</p>
            </div>
          ))}
        </div>
      </Card>

      <Tabs tabs={[['seance', 'Séance'], ['mots', 'Mes mots'], ['historique', 'Historique']]} value={view} onChange={setView} />

      {view === 'seance' && (
        <div className="space-y-4">
          <div>
            <p className="field-label">Compétence</p>
            <Chips options={ENGLISH_SKILLS.map((s) => [s.key, s.key === skill.key ? `${s.label} (proposée)` : s.label])} value={current.key} onChange={(v) => setChosen(v)} />
          </div>
          <p className="border-l-4 border-rouge bg-paper-2 p-3 text-sm">{current.idea}</p>
          <Timer storageKey="anglais" minutes={30} label={current.label} onStop={(minutes) => save.mutate(
            { kind: 'anglais', minutes, skill: current.key },
            { onSuccess: () => { autoCheck('anglais'); setChosen(null); toast('Séance enregistrée ✓'); } },
          )} />
        </div>
      )}
      {view === 'mots' && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Ajoute tes mots dans les <Link to="/revision" className="font-semibold text-rouge underline">cartes de révision</Link>, paquet « Anglais » : ils reviennent au bon moment.</p>
          <ul className="space-y-2">
            {words.map((w) => <li key={w.id} className="card p-3"><b>{w.front}</b><span className="block text-sm text-muted">{w.back || '—'}</span></li>)}
            {!words.length && <li className="text-sm text-muted">Aucun mot anglais pour l'instant.</li>}
          </ul>
        </div>
      )}
      {view === 'historique' && (
        <div>
          <SectionTitle>4 dernières semaines</SectionTitle>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span><b>{ENGLISH_SKILLS.find((x) => x.key === s.skill)?.label || 'Anglais'}</b> · {s.minutes} min</span>
                <span className="text-muted">{shortDate(s.started_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
