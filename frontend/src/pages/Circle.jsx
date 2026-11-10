import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { diffDays, shortDate, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { useAsk } from '../components/confirm';
import { Button, Chips, Empty, Field, Input, Loading, Sheet, Textarea } from '../components/ui';

const KINDS = [['mentor', 'Mentor'], ['contradicteur', 'Contradicteur']];
const ROLES = ['Historien ou chercheur en sciences sociales', 'Économiste du développement', 'Entrepreneur', 'Pédagogue', 'Politiques publiques et institutions', 'Intellectuel africain'];

/** Le cercle : des personnes qui me challengent, dont certaines ne sont pas d'accord avec moi. */
export default function Circle() {
  const { data: people = [], isLoading } = useRows('mentors', { build: (q) => q.order('created_at') });
  const save = useSave('mentors');
  const [sheet, setSheet] = useState(null);
  const now = today();

  if (isLoading) return <Loading />;
  const seen = (p) => save.mutate({ id: p.id, last_met_on: now }, { onSuccess: () => toast('Noté ✓') });
  const contradictors = people.filter((p) => p.kind === 'contradicteur').length;

  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Plus</Link>
      <PageHeader title="Mon cercle" sub="Des mentors, mais aussi des personnes qui ne sont pas d'accord avec toi." action={<Button size="sm" icon={Plus} onClick={() => setSheet({})}>Ajouter</Button>} />
      {people.length > 0 && contradictors === 0 && (
        <p className="mb-4 rounded-sm border-l-4 border-rouge bg-rouge-soft px-3 py-2.5 text-sm">Ton cercle n'a encore aucun contradicteur. Cherche quelqu'un capable de te montrer où ton raisonnement est faux.</p>
      )}
      {people.length === 0 ? (
        <Empty title="Ton cercle est vide" action={<Button icon={Plus} onClick={() => setSheet({})}>Ajouter une personne</Button>}>
          Un historien, un économiste, un entrepreneur, un pédagogue… et au moins une personne qui te contredit.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => {
            const away = p.last_met_on ? diffDays(now, p.last_met_on) : null;
            return (
              <li key={p.id} className="card p-3">
                <button type="button" className="block w-full text-left" onClick={() => setSheet({ p })}>
                  <span className="block font-semibold">{p.name} <span className="text-xs font-bold uppercase tracking-wider text-rouge">{p.kind === 'contradicteur' ? 'contradicteur' : 'mentor'}</span></span>
                  {p.role && <span className="block text-sm text-muted">{p.role}</span>}
                  {p.challenge && <span className="mt-1 block text-sm italic">« {p.challenge} »</span>}
                  <span className={away === null || away > 60 ? 'mt-1 block text-xs font-semibold text-rouge' : 'mt-1 block text-xs text-muted'}>
                    {away === null ? 'Pas encore rencontré' : away === 0 ? 'Vu aujourd\'hui' : `Vu il y a ${away} jours (${shortDate(p.last_met_on)})`}
                  </span>
                </button>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => seen(p)}>On s'est vus aujourd'hui</Button>
              </li>
            );
          })}
        </ul>
      )}
      <PersonSheet sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function PersonSheet({ sheet, onClose }) {
  const p = sheet?.p;
  const [f, setF] = useState({ name: '', role: '', kind: 'mentor', challenge: '' });
  const [key, setKey] = useState(null);
  const save = useSave('mentors');
  const remove = useRemove('mentors');
  const ask = useAsk();
  const cur = sheet ? (p?.id || 'new') : null;
  if (cur !== key) {
    setKey(cur);
    if (sheet) setF(p ? { name: p.name, role: p.role, kind: p.kind, challenge: p.challenge } : { name: '', role: '', kind: 'mentor', challenge: '' });
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await save.mutateAsync({ ...(p ? { id: p.id } : {}), name: f.name.trim(), role: f.role.trim(), kind: f.kind, challenge: f.challenge.trim() });
    toast('Enregistré ✓');
    onClose();
  };

  return (
    <Sheet open={!!sheet} onClose={onClose} title={p ? p.name : 'Nouvelle personne'}>
      <form onSubmit={submit} className="space-y-3">
        <Chips options={KINDS} value={f.kind} onChange={(v) => setF({ ...f, kind: v || 'mentor' })} />
        <Field label="Nom"><Input value={f.name} onChange={set('name')} required maxLength={80} autoFocus autoComplete="off" /></Field>
        <Field label="Domaine ou rôle">
          <Input value={f.role} onChange={set('role')} maxLength={120} list="roles" />
          <datalist id="roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Ce qu'il ou elle m'a contesté" hint="Une phrase : la dernière idée que cette personne a remise en question."><Textarea value={f.challenge} onChange={set('challenge')} rows={3} /></Field>
        <div className="flex gap-2">
          {p && <Button variant="danger" size="lg" onClick={() => ask({ title: `Retirer ${p.name} ?`, confirm: 'Retirer', onConfirm: () => remove.mutate(p.id, { onSuccess: () => { toast('Personne retirée'); onClose(); } }) })}>Retirer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending} disabled={!f.name.trim()}>Enregistrer</Button>
        </div>
      </form>
    </Sheet>
  );
}
