import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, RotateCcw } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { addDays, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { useAsk } from '../components/confirm';
import { Button, Chips, Empty, Field, Input, Loading, Sheet, Tabs, Textarea } from '../components/ui';

export const DECKS = [['mots', 'Vocabulaire'], ['anglais', 'Anglais'], ['versets', 'Versets'], ['autre', 'Autre']];
// Intervalle (jours) avant la prochaine révision, selon la boîte atteinte.
const SPACING = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
const SESSION = 15;

export default function Cards() {
  const [tab, setTab] = useState('revise');
  const day = today();
  const { data: cards = [], isLoading } = useRows('cards', { build: (q) => q.neq('deck', 'cours').order('created_at', { ascending: false }).limit(500) });
  const due = useMemo(() => cards.filter((c) => c.due_on <= day), [cards, day]);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <Loading />;
  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Menu</Link>
      <PageHeader title="Cartes de révision" sub="Un mot ou une idée revient juste avant que tu l'oublies." action={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Carte</Button>} />
      <Tabs tabs={[['revise', `À réviser (${due.length})`], ['all', `Mes cartes (${cards.length})`]]} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === 'revise' ? <Session due={due} total={cards.length} onAdd={() => setAdding(true)} /> : <List cards={cards} />}
      </div>
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/** Révision : on voit la question, on réfléchit, puis on dit si on savait. */
function Session({ due, total, onAdd }) {
  const save = useSave('cards');
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const queue = due.slice(0, SESSION);
  const card = queue[0];

  if (!card) {
    return total === 0
      ? <Empty title="Aucune carte pour l'instant" action={<Button icon={Plus} onClick={onAdd}>Créer ma première carte</Button>}>Un mot nouveau, un verset, une idée à retenir : une carte, c'est 10 secondes.</Empty>
      : <Empty title={done ? `Bravo, ${done} carte${done > 1 ? 's' : ''} révisée${done > 1 ? 's' : ''}` : 'Rien à réviser aujourd\'hui'}>Reviens demain : tes prochaines cartes arrivent à leur date.</Empty>;
  }

  const answer = (ok) => {
    const box = ok ? Math.min(5, card.box + 1) : 1;
    save.mutate({ id: card.id, box, due_on: addDays(today(), SPACING[box]) });
    setShown(false); setDone(done + 1);
  };

  return (
    <div>
      <p className="mb-2 text-sm text-muted num">{done + 1} / {Math.min(SESSION, done + due.length)}</p>
      <div className="card flex min-h-48 flex-col justify-center p-5 text-center">
        <p className="font-display text-2xl font-extrabold break-words">{card.front}</p>
        {shown && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="whitespace-pre-wrap break-words">{card.back || '—'}</p>
            {card.example && <p className="mt-2 text-sm italic text-muted">{card.example}</p>}
          </div>
        )}
      </div>
      <div className="mt-3">
        {!shown ? (
          <Button size="lg" className="w-full" onClick={() => setShown(true)}>Voir la réponse</Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" icon={RotateCcw} onClick={() => answer(false)}>À revoir</Button>
            <Button size="lg" onClick={() => answer(true)}>Je savais</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function List({ cards }) {
  const [deck, setDeck] = useState(null);
  const [edit, setEdit] = useState(null);
  const shown = deck ? cards.filter((c) => c.deck === deck) : cards;
  return (
    <>
      <Chips options={DECKS} value={deck} onChange={setDeck} className="mb-3" />
      {shown.length === 0 ? <Empty title="Aucune carte ici" /> : (
        <ul className="space-y-2">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" className="card w-full p-3 text-left" onClick={() => setEdit(c)}>
                <span className="block font-semibold break-words">{c.front}</span>
                <span className="block truncate text-sm text-muted">{c.back || '—'}</span>
                <span className="mt-1 block text-xs text-muted num">Boîte {c.box}/5 · prochaine révision {c.due_on === today() ? 'aujourd\'hui' : c.due_on}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddSheet open={!!edit} card={edit} onClose={() => setEdit(null)} />
    </>
  );
}

function AddSheet({ open, onClose, card }) {
  const [f, setF] = useState({ deck: 'mots', front: '', back: '', example: '' });
  const [loaded, setLoaded] = useState(null);
  const save = useSave('cards');
  const remove = useRemove('cards');
  const ask = useAsk();
  if (open && loaded !== (card?.id || 'new')) {
    setLoaded(card?.id || 'new');
    setF(card ? { deck: card.deck, front: card.front, back: card.back, example: card.example } : { deck: 'mots', front: '', back: '', example: '' });
  }
  if (!open && loaded) setLoaded(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await save.mutateAsync({ ...(card ? { id: card.id } : {}), ...f, front: f.front.trim(), back: f.back.trim(), example: f.example.trim() });
    toast(card ? 'Carte modifiée ✓' : 'Carte ajoutée ✓');
    if (card) onClose(); else setF({ ...f, front: '', back: '', example: '' });
  };

  return (
    <Sheet open={open} onClose={onClose} title={card ? 'Modifier la carte' : 'Nouvelle carte'}>
      <form onSubmit={submit} className="space-y-3">
        <Chips options={DECKS} value={f.deck} onChange={(v) => setF({ ...f, deck: v || 'mots' })} />
        <Field label="Recto (la question, le mot)"><Input value={f.front} onChange={set('front')} required maxLength={200} autoFocus /></Field>
        <Field label="Verso (la réponse)"><Textarea value={f.back} onChange={set('back')} rows={3} maxLength={1000} /></Field>
        <Field label="Exemple" hint="Facultatif"><Input value={f.example} onChange={set('example')} maxLength={300} /></Field>
        <div className="flex gap-2">
          {card && <Button variant="danger" size="lg" onClick={() => ask({ title: 'Supprimer cette carte ?', confirm: 'Supprimer', onConfirm: () => remove.mutate(card.id, { onSuccess: () => { toast('Carte supprimée'); onClose(); } }) })}>Supprimer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending} disabled={!f.front.trim()}>{card ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Sheet>
  );
}
