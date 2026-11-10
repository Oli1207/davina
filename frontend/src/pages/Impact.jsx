import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { useJourneys } from '../hooks/useJourneys';
import { shortDate, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { useAsk } from '../components/confirm';
import { Button, Chips, Empty, ErrorNote, Field, Input, Loading, Sheet, Textarea } from '../components/ui';

const KINDS = [['competence', 'Compétence apprise'], ['projet', 'Projet lancé'], ['amelioration', 'Environnement amélioré']];
const LABEL = Object.fromEntries(KINDS);

/** Impact : on mesure des personnes qui progressent, pas des abonnés ni des vues. */
export default function Impact() {
  const { data: logs = [], isLoading } = useRows('impact_logs', { build: (q) => q.order('day', { ascending: false }).order('created_at', { ascending: false }).limit(200) });
  const [sheet, setSheet] = useState(null);
  const totals = useMemo(() => Object.fromEntries(KINDS.map(([k]) => [k, logs.filter((l) => l.kind === k).reduce((n, l) => n + l.people, 0)])), [logs]);

  if (isLoading) return <Loading />;
  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Plus</Link>
      <PageHeader title="Mon impact" sub="Des personnes qui acquièrent des compétences, créent des projets, améliorent leur environnement." action={<Button size="sm" icon={Plus} onClick={() => setSheet({})}>Ajouter</Button>} />
      <section className="mb-5 grid grid-cols-3 gap-2">
        {KINDS.map(([k, l]) => (
          <div key={k} className="card p-3"><p className="font-display text-3xl font-extrabold num text-rouge">{totals[k]}</p><p className="text-xs text-muted">personnes : {l.toLowerCase()}</p></div>
        ))}
      </section>
      {logs.length === 0 ? (
        <Empty title="Rien noté pour l'instant" action={<Button icon={Plus} onClick={() => setSheet({})}>Noter un résultat</Button>}>
          Quand quelqu'un que tu accompagnes apprend, lance ou améliore quelque chose, note-le : c'est ça qui compte.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id}>
              <button type="button" className="card w-full p-3 text-left" onClick={() => setSheet({ l })}>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{shortDate(l.day)} {l.day.slice(0, 4)} · {l.people} personne{l.people > 1 ? 's' : ''}</span>
                <span className="block font-semibold">{LABEL[l.kind]}</span>
                {l.body && <span className="block text-sm text-muted line-clamp-2">{l.body}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <LogSheet sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function LogSheet({ sheet, onClose }) {
  const l = sheet?.l;
  const [f, setF] = useState({ day: today(), kind: 'competence', people: '1', body: '', journey: null });
  const [key, setKey] = useState(null);
  const [error, setError] = useState(null);
  const save = useSave('impact_logs');
  const remove = useRemove('impact_logs');
  const ask = useAsk();
  const { data: journeys = [] } = useJourneys();
  const running = journeys.filter((j) => j.status === 'active');
  const cur = sheet ? (l?.id || 'new') : null;
  if (cur !== key) {
    setKey(cur); setError(null);
    if (sheet) setF(l ? { day: l.day, kind: l.kind, people: String(l.people), body: l.body, journey: l.journey_id } : { day: today(), kind: 'competence', people: '1', body: '', journey: null });
  }

  const submit = async (e) => {
    e.preventDefault();
    const people = Math.round(Number(f.people));
    if (!(people >= 0 && people <= 100000)) { setError({ message: 'Nombre de personnes invalide.' }); return; }
    await save.mutateAsync({ ...(l ? { id: l.id } : {}), day: f.day, kind: f.kind, people, body: f.body.trim(), journey_id: f.journey });
    toast('Enregistré ✓');
    onClose();
  };

  return (
    <Sheet open={!!sheet} onClose={onClose} title={l ? 'Modifier' : 'Noter un résultat'}>
      <form onSubmit={submit} className="space-y-3">
        <Chips options={KINDS} value={f.kind} onChange={(v) => setF({ ...f, kind: v || 'competence' })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Combien de personnes ?"><Input type="number" inputMode="numeric" min="0" max="100000" value={f.people} onChange={(e) => setF({ ...f, people: e.target.value })} required /></Field>
          <Field label="Date"><Input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} required /></Field>
        </div>
        <Field label="Quoi exactement ?"><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={3} placeholder="Ex. 12 jeunes savent maintenant faire un budget" /></Field>
        {running.length > 0 && <div><span className="field-label">Parcours (facultatif)</span><Chips options={running.map((j) => [j.id, j.title.split(' — ')[0]])} value={f.journey} onChange={(v) => setF({ ...f, journey: v })} /></div>}
        <ErrorNote error={error} />
        <div className="flex gap-2">
          {l && <Button variant="danger" size="lg" onClick={() => ask({ title: 'Supprimer ?', confirm: 'Supprimer', onConfirm: () => remove.mutate(l.id, { onSuccess: () => { toast('Supprimé'); onClose(); } }) })}>Supprimer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Sheet>
  );
}
