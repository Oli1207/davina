import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSave } from '../hooks/useData';
import { Button, Chips, Field, Input, Scale, Select, Sheet } from './ui';
import Timer from './Timer';

/**
 * Session de concentration en trois temps :
 * 1. annoncer un objectif precis (on se concentre mieux sur un but nomme) ;
 * 2. travailler, en « garant » les pensees parasites au lieu de les suivre ;
 * 3. noter sa concentration et si l'objectif est atteint.
 * Les notes de concentration servent ensuite a trouver ses meilleures heures.
 */
export default function FocusSession({ open, onClose, courses = [], preset = {}, kind = 'etude', onDone }) {
  const save = useSave('focus_sessions');
  const [step, setStep] = useState('setup');
  const [course, setCourse] = useState(preset.course_id || '');
  const [goal, setGoal] = useState(preset.goal || '');
  const [minutes, setMinutes] = useState(preset.minutes || 25);
  const [parked, setParked] = useState([]);
  const [thought, setThought] = useState('');
  const [result, setResult] = useState({ minutes: 0, focus: null, reached: null });

  if (!open) return null;
  const close = () => { setStep('setup'); setParked([]); onClose(); };
  const finish = () => {
    save.mutate({
      kind, minutes: result.minutes, course_id: course || null, goal, focus: result.focus,
      distractions: parked.join('\n'),
    }, { onSuccess: () => { onDone?.({ ...result, course_id: course }); close(); } });
  };

  return (
    <Sheet open onClose={close} title="Session de concentration">
      {step === 'setup' && (
        <div className="space-y-4">
          {courses.length > 0 && (
            <Field label="Matière"><Select value={course} onChange={(e) => setCourse(e.target.value)} options={[['', 'Sans matière'], ...courses.map((c) => [c.id, c.name])]} /></Field>
          )}
          <Field label="Mon objectif précis" hint="Pas « réviser le droit », mais « faire les 10 questions du chapitre 3 de tête ».">
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="À la fin de cette session, j'aurai…" />
          </Field>
          <Field label="Durée">
            <Chips options={[[15, '15 min'], [25, '25 min'], [45, '45 min'], [50, '50 min']]} value={minutes} onChange={(v) => v && setMinutes(v)} />
          </Field>
          <ul className="space-y-1 text-sm text-muted">
            <li>— Téléphone face contre table, notifications coupées.</li>
            <li>— Un verre d'eau à côté de toi.</li>
            <li>— Ferme le cours dès que possible : se tester vaut mieux que relire.</li>
          </ul>
          <Button size="lg" className="w-full" onClick={() => setStep('run')}>C'est parti</Button>
        </div>
      )}

      {step === 'run' && (
        <div className="space-y-5">
          {goal && <p className="border-l-4 border-rouge pl-3 text-sm font-semibold">{goal}</p>}
          <Timer storageKey={`focus-${kind}`} minutes={minutes} onStop={(m) => { setResult({ ...result, minutes: m }); setStep('end'); }} />
          <div>
            <p className="field-label">Une pensée parasite ? Gare-la ici, et reviens au travail</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (thought.trim()) { setParked([...parked, thought.trim()]); setThought(''); } }}>
              <Input value={thought} onChange={(e) => setThought(e.target.value)} placeholder="Appeler maman, acheter du pain…" />
              <Button type="submit" variant="secondary" icon={Plus} aria-label="Garer" />
            </form>
            {parked.length > 0 && <ul className="mt-2 space-y-0.5 text-sm text-muted">{parked.map((p) => <li key={p}>· {p}</li>)}</ul>}
          </div>
        </div>
      )}

      {step === 'end' && (
        <div className="space-y-4">
          <p className="font-display text-2xl font-extrabold">{result.minutes} min de travail.</p>
          <Field label="Ma concentration">
            <Scale value={result.focus} onChange={(v) => setResult({ ...result, focus: v })} tone="rouge" labels={['Dispersée', 'Moyenne', 'Correcte', 'Bonne', 'Totale']} />
          </Field>
          {goal && (
            <Field label="Objectif atteint ?">
              <Chips options={[['oui', 'Oui'], ['partiel', 'En partie'], ['non', 'Non']]} value={result.reached} onChange={(v) => setResult({ ...result, reached: v })} />
            </Field>
          )}
          {parked.length > 0 && <p className="text-sm text-muted">Tes pensées garées : {parked.join(', ')}. Tu peux t'en occuper maintenant.</p>}
          <p className="text-sm">Pause de 5 minutes : lève-toi, bois, regarde au loin. Pas d'écran.</p>
          <Button className="w-full" disabled={!result.focus} loading={save.isPending} onClick={finish}>Enregistrer la session</Button>
        </div>
      )}
    </Sheet>
  );
}
