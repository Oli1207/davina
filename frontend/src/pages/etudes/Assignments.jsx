import { useState } from 'react';
import clsx from 'clsx';
import { Check, Play, Plus, Trash2 } from 'lucide-react';
import { useRemove, useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { addDays, diffDays, dayShort, shortDate, today, weekday } from '../../lib/dates';
import { dueLabel, workload } from '../../lib/study';
import { Button, Chips, Empty, Field, IconButton, Input, SectionTitle, Select, Sheet } from '../../components/ui';
import FocusSession from '../../components/FocusSession';
import { toast } from '../../components/toast';

/**
 * Devoirs, exposes, TD : la charge a venir jour par jour, pour voir venir les
 * semaines qui debordent et commencer tot ce qui est gros.
 */
export default function Assignments() {
  const { data: courses = [] } = useRows('courses', { build: (q) => q.order('position') });
  const { data: items = [] } = useRows('assignments', { build: (q) => q.order('due_on') });
  const save = useSave('assignments');
  const remove = useRemove('assignments');
  const autoCheck = useAutoCheck();
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(null);
  const open = items.filter((a) => !a.done);
  const load = workload(open, 14);
  const max = Math.max(60, ...load.map((x) => x.m));
  const groups = [
    ['En retard', open.filter((a) => a.due_on < today())],
    ['Cette semaine', open.filter((a) => a.due_on >= today() && diffDays(a.due_on, today()) <= 7)],
    ['Plus tard', open.filter((a) => diffDays(a.due_on, today()) > 7)],
  ];
  const big = open.filter((a) => a.est_min >= 180 && diffDays(a.due_on, today()) <= 10);

  const toggle = (a) => {
    save.mutate({ id: a.id, done: !a.done });
    if (!a.done) toast('Devoir terminé', { action: { label: 'Annuler', onClick: () => save.mutate({ id: a.id, done: false }) } });
  };

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <SectionTitle action={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Devoir</Button>}>Charge des 14 jours</SectionTitle>
        <div className="flex h-24 items-end gap-1" role="img" aria-label="Minutes de travail à rendre par jour">
          {load.map((x) => (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full" style={{ height: `${(x.m / max) * 72}px`, minHeight: x.m ? 4 : 1, background: x.m >= 180 ? 'var(--rouge)' : x.m ? 'color-mix(in srgb, var(--rouge) 45%, var(--paper))' : 'var(--line)' }} title={`${shortDate(x.d)} : ${x.m} min`} />
              <span className={clsx('text-[0.55rem] num', x.d === today() ? 'font-bold text-ink' : 'text-muted')}>{dayShort(weekday(x.d)).slice(0, 1)}</span>
            </div>
          ))}
        </div>
        {big.length > 0 && <p className="mt-3 text-sm"><b>À découper :</b> {big.map((a) => a.title).join(', ')}. Les gros travaux se commencent tôt, par sessions de 45 min.</p>}
      </div>

      {!items.length && <Empty title="Aucun devoir">Note chaque devoir dès qu'il est donné, avec sa date et le temps que tu penses y passer.</Empty>}
      {groups.map(([label, list]) => list.length > 0 && (
        <div key={label}>
          <SectionTitle>{label}</SectionTitle>
          <ul className="space-y-1.5">
            {list.map((a) => (
              <li key={a.id} className="card flex items-center gap-3 p-3">
                <button type="button" className="check h-8 w-8" onClick={() => toggle(a)} aria-label="Marquer fait" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.priority === 1 && <span className="mr-1 text-rouge">●</span>}{a.title}</p>
                  <p className="text-xs text-muted">{courses.find((c) => c.id === a.course_id)?.name || 'Sans matière'} · ~{a.est_min} min · {dueLabel(a.due_on)}</p>
                </div>
                <IconButton icon={Play} label="Travailler dessus" onClick={() => setWorking(a)} />
                <IconButton icon={Trash2} label="Supprimer" className="h-8 w-8" onClick={() => remove.mutate(a.id)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {items.some((a) => a.done) && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-muted">Terminés ({items.filter((a) => a.done).length})</summary>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {items.filter((a) => a.done).map((a) => <li key={a.id} className="flex items-center gap-2"><Check className="h-4 w-4 text-rouge" />{a.title}</li>)}
          </ul>
        </details>
      )}

      <AddAssignment open={adding} courses={courses} onClose={() => setAdding(false)} onSave={(row) => save.mutate(row, { onSuccess: () => { setAdding(false); toast('Devoir ajouté'); } })} />
      {working && (
        <FocusSession open courses={courses} preset={{ course_id: working.course_id, goal: `Avancer : ${working.title}`, minutes: 45 }}
          onClose={() => setWorking(null)}
          onDone={(res) => { autoCheck('etude', res.minutes); if (res.reached === 'oui') save.mutate({ id: working.id, done: true }); }} />
      )}
    </div>
  );
}

function AddAssignment({ open, courses, onClose, onSave }) {
  const [f, setF] = useState({ title: '', course_id: '', due_on: addDays(today(), 7), est_min: 60, priority: 2 });
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau devoir">
      <div className="space-y-3">
        <Field label="Quoi"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Exposé, TD, dissertation…" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matière"><Select value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })} options={[['', '—'], ...courses.map((c) => [c.id, c.name])]} /></Field>
          <Field label="À rendre le"><Input type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
        </div>
        <Field label="Temps estimé"><Chips options={[[30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h'], [480, '1 jour']]} value={f.est_min} onChange={(v) => v && setF({ ...f, est_min: v })} /></Field>
        <Field label="Priorité"><Chips options={[[1, 'Haute'], [2, 'Normale'], [3, 'Basse']]} value={f.priority} onChange={(v) => v && setF({ ...f, priority: v })} /></Field>
        <Button className="w-full" disabled={!f.title.trim()} onClick={() => { onSave({ ...f, title: f.title.trim(), course_id: f.course_id || null }); setF({ ...f, title: '' }); }}>Ajouter</Button>
      </div>
    </Sheet>
  );
}
