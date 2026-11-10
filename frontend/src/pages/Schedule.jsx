import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useBulk, useProfile, useRemove, useRows, useSave } from '../hooks/useData';
import { useAsk } from '../components/confirm';
import { DAY_LABELS, hhmm } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Chips, Empty, ErrorNote, Field, Input, Loading, Sheet } from '../components/ui';

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const KINDS = [['cours', 'Cours'], ['travail', 'Travail'], ['autre', 'Autre']];

/** Emploi du temps : ce qui occupe déjà mes semaines. Davina en déduit mes vrais créneaux libres. */
export default function Schedule() {
  const { data: blocks = [], isLoading } = useRows('schedule_blocks', { build: (q) => q.order('weekday').order('start_time') });
  const { data: profile } = useProfile();
  const saveProfile = useSave('profiles');
  const [sheet, setSheet] = useState(null);
  const [rise, setRise] = useState(null);

  if (isLoading) return <Loading />;
  const wake = rise?.wake ?? hhmm(profile?.wake_time) ?? '05:00';
  const bed = rise?.bed ?? hhmm(profile?.bed_time) ?? '22:30';
  const saveHours = (fields) => saveProfile.mutate({ id: profile.id, ...fields }, { onSuccess: () => toast('Enregistré ✓') });

  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Menu</Link>
      <PageHeader title="Mon emploi du temps" sub="Cours, travail, engagements fixes. Saisis-les une fois." action={<Button size="sm" icon={Plus} onClick={() => setSheet({})}>Ajouter</Button>} />

      <section className="card mb-5 p-4">
        <p className="mb-2 font-semibold">Mes journées</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Réveil"><Input type="time" value={wake} onChange={(e) => setRise({ wake: e.target.value, bed })} onBlur={() => wake && wake !== hhmm(profile?.wake_time) && saveHours({ wake_time: wake })} /></Field>
          <Field label="Coucher"><Input type="time" value={bed} onChange={(e) => setRise({ wake, bed: e.target.value })} onBlur={() => bed && bed !== hhmm(profile?.bed_time) && saveHours({ bed_time: bed })} /></Field>
        </div>
        <p className="mt-2 text-xs text-muted">Les créneaux libres se calculent entre ces deux heures.</p>
      </section>

      {blocks.length === 0 ? (
        <Empty title="Aucun cours saisi" action={<Button icon={Plus} onClick={() => setSheet({})}>Ajouter un cours</Button>}>
          Avec ton emploi du temps, Davina voit tes trous et y place sport, anglais, création de contenu…
        </Empty>
      ) : ORDER.map((d) => {
        const list = blocks.filter((b) => b.weekday === d);
        if (!list.length) return null;
        return (
          <section key={d} className="mb-4">
            <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wider text-muted">{DAY_LABELS[d]}</h2>
            <ul className="space-y-1.5">
              {list.map((b) => (
                <li key={b.id}>
                  <button type="button" className="card flex w-full min-h-14 items-center gap-3 p-3 text-left" onClick={() => setSheet({ block: b })}>
                    <span className="w-24 shrink-0 font-bold num">{hhmm(b.start_time)}–{hhmm(b.end_time)}</span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{b.title}</span>{b.location && <span className="block truncate text-sm text-muted">{b.location}</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <BlockSheet sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function BlockSheet({ sheet, onClose }) {
  const b = sheet?.block;
  const [f, setF] = useState({ title: '', days: [1], start: '08:00', end: '10:00', kind: 'cours', location: '' });
  const [key, setKey] = useState(null);
  const [error, setError] = useState(null);
  const bulk = useBulk('schedule_blocks');
  const save = useSave('schedule_blocks');
  const remove = useRemove('schedule_blocks');
  const ask = useAsk();
  const cur = sheet ? (b?.id || 'new') : null;
  if (cur !== key) {
    setKey(cur); setError(null);
    if (sheet) setF(b ? { title: b.title, days: [b.weekday], start: hhmm(b.start_time), end: hhmm(b.end_time), kind: b.kind, location: b.location } : { title: '', days: [1], start: '08:00', end: '10:00', kind: 'cours', location: '' });
  }
  const toggle = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] });

  const submit = async (e) => {
    e.preventDefault();
    if (f.end <= f.start) { setError({ message: 'La fin doit être après le début.' }); return; }
    if (!f.days.length) { setError({ message: 'Choisis au moins un jour.' }); return; }
    const row = { title: f.title.trim(), start_time: f.start, end_time: f.end, kind: f.kind, location: f.location.trim() };
    try {
      if (b) await save.mutateAsync({ id: b.id, ...row, weekday: f.days[0] });
      else await bulk.mutateAsync({ rows: f.days.map((weekday) => ({ ...row, weekday })) });
      toast('Enregistré ✓');
      onClose();
    } catch (err) { setError(err); }
  };

  return (
    <Sheet open={!!sheet} onClose={onClose} title={b ? 'Modifier' : 'Nouveau cours'}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Quoi"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={80} placeholder="Droit des obligations" autoFocus /></Field>
        <div>
          <span className="field-label">{b ? 'Jour' : 'Jours (plusieurs possibles)'}</span>
          <div className="flex gap-1">
            {ORDER.map((d) => (
              <button key={d} type="button" aria-pressed={f.days.includes(d)} aria-label={DAY_LABELS[d]} className="chip min-h-11 flex-1 justify-center !px-0"
                onClick={() => (b ? setF({ ...f, days: [d] }) : toggle(d))}>{DAY_LABELS[d].slice(0, 1).toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début"><Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></Field>
          <Field label="Fin"><Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} required /></Field>
        </div>
        <Chips options={KINDS} value={f.kind} onChange={(v) => setF({ ...f, kind: v || 'cours' })} />
        <Field label="Lieu" hint="Facultatif"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} maxLength={80} /></Field>
        <ErrorNote error={error} />
        <div className="flex gap-2">
          {b && <Button variant="danger" size="lg" onClick={() => ask({ title: 'Supprimer ce créneau ?', confirm: 'Supprimer', onConfirm: () => remove.mutate(b.id, { onSuccess: () => { toast('Supprimé'); onClose(); } }) })}>Supprimer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending || bulk.isPending} disabled={!f.title.trim()}>Enregistrer</Button>
        </div>
      </form>
    </Sheet>
  );
}
