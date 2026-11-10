import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useProfile, useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { addDays, shortDate, weekStart } from '../../lib/dates';
import { FINANCE_WEEKS } from '../../data/savoir';
import { toast } from '../../components/toast';
import { Button, Card, Empty, Field, SectionTitle, Textarea } from '../../components/ui';

/** Culture financière : un thème par semaine pendant 9 semaines, avec ses questions, son action concrète et ses notes. */
export default function Finance() {
  const { data: profile } = useProfile();
  const { data: rows = [] } = useRows('finance_progress');
  const saveProfile = useSave('profiles');
  const save = useSave('finance_progress', { onConflict: 'user_id,week' });
  const autoCheck = useAutoCheck();
  const monday = weekStart();
  const start = profile?.finance_start;
  const weekStartOf = (n) => addDays(start, (n - 1) * 7);
  const currentN = start ? Math.min(FINANCE_WEEKS.length, Math.max(1, Math.floor((new Date(monday) - new Date(start)) / (7 * 86400000)) + 1)) : 1;
  const [selected, setSelected] = useState(null);
  const n = selected || currentN;
  const week = FINANCE_WEEKS[n - 1];
  const progress = rows.find((r) => r.week === n);
  const [notes, setNotes] = useState('');
  const [takeaways, setTakeaways] = useState('');
  useEffect(() => { setNotes(progress?.notes || ''); setTakeaways(progress?.takeaways || ''); }, [n, progress?.notes, progress?.takeaways]);

  if (!start) {
    return (
      <Empty title="Un programme de 9 semaines" action={<Button size="lg" onClick={() => saveProfile.mutate({ id: profile.id, finance_start: monday }, { onSuccess: () => toast('Programme lancé ✓') })}>Commencer cette semaine</Button>}>
        Budget, épargne, mobile money, dettes, intérêts, investir, revenus, arnaques : un thème par semaine, une question à creuser et une action concrète.
      </Empty>
    );
  }
  const done = (k) => rows.find((r) => r.week === k)?.action_done;
  const isCurrent = n === currentN;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FINANCE_WEEKS.map((w, i) => (
          <button key={w.title} type="button" aria-label={`Semaine ${i + 1}`} onClick={() => setSelected(i + 1)}
            className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border font-display font-bold num',
              i + 1 === n ? 'border-ink bg-ink text-on-ink' : 'border-line bg-paper', i + 1 === currentN && i + 1 !== n && 'border-rouge text-rouge')}>
            {done(i + 1) ? <Check className="h-4 w-4" /> : i + 1}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rouge">Semaine {n} · du {shortDate(weekStartOf(n))} au {shortDate(addDays(weekStartOf(n), 6))}{isCurrent ? ' · en cours' : ''}</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold">{week.title}</h2>
        <ol className="mt-3 space-y-1.5 text-sm">{week.questions.map((q, i) => <li key={q} className="flex gap-2"><span className="font-bold text-rouge num">{i + 1}.</span>{q}</li>)}</ol>
      </Card>

      <div className={clsx('rounded-[var(--radius)] border-2 p-4', progress?.action_done ? 'border-rouge bg-rouge-soft' : 'border-ink')}>
        <p className="text-xs font-bold uppercase tracking-wider">Action de la semaine</p>
        <p className="mt-1 font-semibold">{week.action}</p>
        <Button className="mt-3" size="sm" variant={progress?.action_done ? 'secondary' : 'primary'} icon={Check}
          onClick={() => save.mutate({ week: n, action_done: !progress?.action_done }, { onSuccess: () => { if (!progress?.action_done) { autoCheck('finance'); toast('Bravo ✓'); } } })}>
          {progress?.action_done ? 'Fait' : "Je l'ai faite"}
        </Button>
      </div>

      <div className="space-y-3">
        <SectionTitle>Mes notes</SectionTitle>
        <Field label="Ce que j'apprends (sources, chiffres, exemples)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} /></Field>
        <Field label="3 choses que je retiens"><Textarea value={takeaways} onChange={(e) => setTakeaways(e.target.value)} rows={3} /></Field>
        <Button size="lg" className="w-full" disabled={notes === (progress?.notes || '') && takeaways === (progress?.takeaways || '')} loading={save.isPending}
          onClick={() => save.mutate({ week: n, notes: notes.trim(), takeaways: takeaways.trim() }, { onSuccess: () => toast('Enregistré ✓') })}>Enregistrer</Button>
      </div>
    </div>
  );
}
