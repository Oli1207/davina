import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useRows, useSave } from '../hooks/useData';
import { useJourneys } from '../hooks/useJourneys';
import { STATUS, SUGGESTIONS } from '../data/books';
import { today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Chips, Empty, ErrorNote, Field, Gauge, Input, Loading, Sheet } from '../components/ui';

export const BookRow = ({ b }) => (
  <Link to={`/lecture/${b.id}`} className="card block min-h-16 p-3">
    <span className="block font-semibold">{b.title}</span>
    <span className="block truncate text-sm text-muted">{b.author || 'Auteur non précisé'}</span>
    {b.status === 'reading' && b.total_pages && (
      <span className="mt-2 block"><Gauge done={b.pages_read} target={b.total_pages} tone="rouge" /><span className="mt-1 block text-xs text-muted num">{b.pages_read} / {b.total_pages} pages</span></span>
    )}
    {b.status === 'reading' && !b.total_pages && <span className="mt-1 block text-xs text-muted num">{b.pages_read} pages lues</span>}
  </Link>
);

export default function Library() {
  const { data: books = [], isLoading } = useRows('books', { build: (q) => q.order('created_at', { ascending: false }) });
  const save = useSave('books');
  const [open, setOpen] = useState(false);

  if (isLoading) return <Loading />;
  const have = new Set(books.map((b) => b.title.toLowerCase()));
  const ideas = SUGGESTIONS.filter((s) => !have.has(s.title.toLowerCase()));
  const groups = [['En cours', 'reading'], ['À lire', 'to_read'], ['Terminés', 'done'], ['Abandonnés', 'dropped']]
    .map(([label, st]) => [label, books.filter((b) => b.status === st)]).filter(([, l]) => l.length);

  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Menu</Link>
      <PageHeader title="Mes lectures" sub="Lire peu, mais en profondeur : une fiche de synthèse par livre." action={<Button size="sm" icon={Plus} onClick={() => setOpen(true)}>Ajouter</Button>} />

      {books.length === 0 && <Empty title="Ta bibliothèque est vide" action={<Button icon={Plus} onClick={() => setOpen(true)}>Ajouter un livre</Button>}>Ajoute le livre que tu lis en ce moment, ou pars d'une idée ci-dessous.</Empty>}
      {groups.map(([label, list]) => (
        <section key={label} className="mb-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{label}</h2>
          <ul className="space-y-2">{list.map((b) => <li key={b.id}><BookRow b={b} /></li>)}</ul>
        </section>
      ))}

      {ideas.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Idées de lecture</h2>
          <ul className="space-y-2">
            {ideas.map((s) => (
              <li key={s.title} className="card flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1"><span className="block font-semibold">{s.title}</span><span className="block text-sm text-muted">{s.author}</span><span className="block text-sm">{s.note}</span></span>
                <Button variant="secondary" size="sm" aria-label={`Ajouter ${s.title}`} onClick={() => save.mutate({ title: s.title, author: s.author, domain: s.domain }, { onSuccess: () => toast('Ajouté à ma liste ✓') })}>Ajouter</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddSheet({ open, onClose }) {
  const [f, setF] = useState({ title: '', author: '', pages: '', reading: true, journey: null });
  const [error, setError] = useState(null);
  const save = useSave('books');
  const { data: journeys = [] } = useJourneys();
  const running = journeys.filter((j) => j.status === 'active');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const pages = f.pages === '' ? null : Math.round(Number(f.pages));
    if (pages !== null && !(pages > 0 && pages < 10000)) { setError({ message: 'Nombre de pages invalide.' }); return; }
    try {
      await save.mutateAsync({
        title: f.title.trim(), author: f.author.trim(), total_pages: pages, domain: 'savoir', journey_id: f.journey,
        status: f.reading ? 'reading' : 'to_read', started_on: f.reading ? today() : null,
      });
      toast('Livre ajouté ✓');
      setF({ title: '', author: '', pages: '', reading: true, journey: null }); setError(null); onClose();
    } catch (err) { setError(err); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter un livre">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Titre"><Input value={f.title} onChange={set('title')} required maxLength={120} autoFocus /></Field>
        <Field label="Auteur" hint="Facultatif"><Input value={f.author} onChange={set('author')} maxLength={120} autoComplete="off" /></Field>
        <Field label="Nombre de pages" hint="Facultatif : permet de calculer ta date de fin"><Input type="number" inputMode="numeric" min="1" max="9999" value={f.pages} onChange={set('pages')} /></Field>
        <Chips options={[['reading', 'Je le lis déjà'], ['later', 'Plus tard']]} value={f.reading ? 'reading' : 'later'} onChange={(v) => setF({ ...f, reading: v !== 'later' })} />
        {running.length > 0 && (
          <div><span className="field-label">Parcours (facultatif)</span><Chips options={running.map((j) => [j.id, j.title.split(' — ')[0]])} value={f.journey} onChange={(v) => setF({ ...f, journey: v })} /></div>
        )}
        <ErrorNote error={error} />
        <Button type="submit" size="lg" className="w-full" loading={save.isPending} disabled={!f.title.trim()}>Ajouter</Button>
      </form>
    </Sheet>
  );
}
