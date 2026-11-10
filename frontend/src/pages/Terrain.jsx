import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { shortDate, today } from '../lib/dates';
import Head from '../components/Head';
import { toast } from '../components/toast';
import { useAsk } from '../components/confirm';
import { Button, Empty, Field, Input, Loading, Sheet, Textarea } from '../components/ui';

const EMPTY = { day: '', place: '', who: '', problems: '', solutions: '', learned: '' };

/** Carnet de terrain : écouter avant de parler. Des rôles et des lieux, jamais des noms. */
export default function Terrain({ embedded }) {
  const { data: notes = [], isLoading } = useRows('field_notes', { build: (q) => q.order('day', { ascending: false }).order('created_at', { ascending: false }).limit(100) });
  const [sheet, setSheet] = useState(null);

  if (isLoading) return <Loading />;
  return (
    <>
      <Head embedded={embedded} title="Carnet de terrain" sub="Écoute, observe, note. Ne dis pas aux gens ce qu'ils doivent penser." action={<Button size="sm" icon={Plus} onClick={() => setSheet({})}>Rencontre</Button>} />
      {notes.length === 0 ? (
        <Empty title="Aucune rencontre notée" action={<Button icon={Plus} onClick={() => setSheet({})}>Noter une rencontre</Button>}>
          Une journée avec un agriculteur, un échange avec un commerçant ou des étudiants : note les problèmes qui reviennent et les solutions déjà trouvées sur place.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" className="card w-full p-3 text-left" onClick={() => setSheet({ note: n })}>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{shortDate(n.day)} {n.day.slice(0, 4)}{n.place && ` · ${n.place}`}{n.who && ` · ${n.who}`}</span>
                {n.problems && <span className="mt-1 block text-sm"><b>Problèmes :</b> <span className="line-clamp-2">{n.problems}</span></span>}
                {n.solutions && <span className="block text-sm"><b>Solutions locales :</b> <span className="line-clamp-2">{n.solutions}</span></span>}
                {n.learned && <span className="block text-sm"><b>Retenu :</b> <span className="line-clamp-2">{n.learned}</span></span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <NoteSheet sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function NoteSheet({ sheet, onClose }) {
  const note = sheet?.note;
  const [f, setF] = useState(EMPTY);
  const [key, setKey] = useState(null);
  const save = useSave('field_notes');
  const remove = useRemove('field_notes');
  const ask = useAsk();
  const cur = sheet ? (note?.id || 'new') : null;
  if (cur !== key) {
    setKey(cur);
    if (sheet) setF(note ? { day: note.day, place: note.place, who: note.who, problems: note.problems, solutions: note.solutions, learned: note.learned } : { ...EMPTY, day: today() });
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await save.mutateAsync({ ...(note ? { id: note.id } : {}), day: f.day, place: f.place.trim(), who: f.who.trim(), problems: f.problems.trim(), solutions: f.solutions.trim(), learned: f.learned.trim() });
    toast('Enregistré ✓');
    onClose();
  };

  return (
    <Sheet open={!!sheet} onClose={onClose} title={note ? 'Ma rencontre' : 'Nouvelle rencontre'} wide>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={f.day} onChange={set('day')} required /></Field>
          <Field label="Lieu"><Input value={f.place} onChange={set('place')} maxLength={80} placeholder="Ex. Bouaké" /></Field>
        </div>
        <Field label="Avec qui ?" hint="Un rôle, pas un nom (ex. « artisan »)."><Input value={f.who} onChange={set('who')} maxLength={80} /></Field>
        <Field label="Les problèmes qui reviennent"><Textarea value={f.problems} onChange={set('problems')} rows={3} /></Field>
        <Field label="Les solutions déjà trouvées sur place"><Textarea value={f.solutions} onChange={set('solutions')} rows={3} /></Field>
        <Field label="Ce que j'en retiens"><Textarea value={f.learned} onChange={set('learned')} rows={3} /></Field>
        <div className="flex gap-2">
          {note && <Button variant="danger" size="lg" onClick={() => ask({ title: 'Supprimer cette rencontre ?', confirm: 'Supprimer', onConfirm: () => remove.mutate(note.id, { onSuccess: () => { toast('Rencontre supprimée'); onClose(); } }) })}>Supprimer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Sheet>
  );
}
