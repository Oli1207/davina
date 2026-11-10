import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { estimateEnd, STATUS, SUMMARY_FIELDS } from '../data/books';
import { addDays, longDate, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { useAsk } from '../components/confirm';
import { Button, Field, Gauge, Input, Loading, Textarea } from '../components/ui';

export default function BookPage() {
  const { id } = useParams();
  const { data: book, isLoading, isFetched } = useQuery({
    queryKey: ['books', 'one', id],
    queryFn: async () => unwrap(await supabase.from('books').select('*').eq('id', id).maybeSingle()),
  });
  const { data: logs = [] } = useRows('reading_logs', { key: [id], build: (q) => q.eq('book_id', id).gte('day', addDays(today(), -29)) });
  const save = useSave('books');
  const addLog = useSave('reading_logs', { also: ['books'] });
  const remove = useRemove('books');
  const ask = useAsk();
  const [page, setPage] = useState('');
  const nav = useNavigate();

  if (isLoading) return <Loading />;
  if (isFetched && !book) return <Navigate to="/lecture" replace />;

  const now = today();
  const end = estimateEnd(book, logs, now, addDays);
  const log = (delta) => addLog.mutate({ book_id: id, day: now, pages: delta }, { onSuccess: () => toast(`${delta > 0 ? '+' : ''}${delta} pages ✓`) });
  const setStatus = (status) => save.mutate({
    id, status,
    started_on: book.started_on || (status === 'reading' ? now : null),
    finished_on: status === 'done' ? now : null,
  }, { onSuccess: () => toast(status === 'done' ? 'Livre terminé ✓ Écris ta fiche ci-dessous' : `${STATUS[status]} ✓`) });

  const goToPage = (e) => {
    e.preventDefault();
    const n = Math.round(Number(page));
    if (!(n >= 0 && n < 10000) || n === book.pages_read) return;
    log(n - book.pages_read);
    setPage('');
  };

  return (
    <>
      <Link to="/lecture" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Lectures</Link>
      <PageHeader kicker={STATUS[book.status]} title={book.title} sub={book.author || undefined} />

      {book.status === 'reading' && (
        <section className="red-block mb-4 p-4">
          <p className="font-display text-3xl font-extrabold num">{book.pages_read}<span className="text-lg opacity-70">{book.total_pages ? ` / ${book.total_pages} pages` : ' pages lues'}</span></p>
          {book.total_pages && <div className="mt-2"><Gauge done={book.pages_read} target={book.total_pages} tone="white" /></div>}
          {end && <p className="mt-2 text-sm opacity-90">À ce rythme, tu finis vers le {longDate(end)}.</p>}
        </section>
      )}

      {book.status === 'reading' && (
        <section className="card mb-4 p-4">
          <p className="mb-2 font-semibold">J'ai lu aujourd'hui</p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {[5, 10, 20, 30].map((n) => <Button key={n} variant="secondary" size="sm" onClick={() => log(n)}>+{n}</Button>)}
          </div>
          <form onSubmit={goToPage} className="flex items-end gap-2">
            <Field label="Ou : je suis à la page" className="flex-1"><Input type="number" inputMode="numeric" min="0" max="9999" value={page} onChange={(e) => setPage(e.target.value)} /></Field>
            <Button type="submit" variant="secondary" disabled={page === ''}>OK</Button>
          </form>
        </section>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {book.status !== 'reading' && book.status !== 'done' && <Button onClick={() => setStatus('reading')}>Commencer</Button>}
        {book.status === 'reading' && <Button onClick={() => setStatus('done')}>J'ai terminé</Button>}
        {book.status === 'reading' && <Button variant="ghost" onClick={() => setStatus('dropped')}>Abandonner</Button>}
        {(book.status === 'done' || book.status === 'dropped') && <Button variant="secondary" onClick={() => setStatus('reading')}>Reprendre</Button>}
      </div>

      <Summary bookId={id} highlight={book.status === 'done'} />

      <Button variant="ghost" className="mt-6 w-full !text-rouge" onClick={() => ask({
        title: 'Supprimer ce livre ?', body: 'Sa fiche de synthèse et ses pages lues seront supprimées.', confirm: 'Supprimer',
        onConfirm: () => remove.mutate(id, { onSuccess: () => { toast('Livre supprimé'); nav('/lecture', { replace: true }); } }),
      })}>Supprimer ce livre</Button>
    </>
  );
}

/** Fiche de synthèse : quatre questions, enregistrées à la sortie de chaque champ. */
function Summary({ bookId, highlight }) {
  const { data: saved, isLoading } = useQuery({
    queryKey: ['book_summaries', bookId],
    queryFn: async () => unwrap(await supabase.from('book_summaries').select('*').eq('book_id', bookId).maybeSingle()),
  });
  const save = useSave('book_summaries', { onConflict: 'book_id' });
  const [v, setV] = useState({ learned: '', disagree: '', country: '', apply: '' });
  useEffect(() => { if (saved) setV({ learned: saved.learned, disagree: saved.disagree, country: saved.country, apply: saved.apply }); }, [saved]);

  const commit = (k) => {
    if ((saved?.[k] || '') === v[k].trim()) return;
    save.mutate({ book_id: bookId, [k]: v[k].trim(), updated_at: new Date().toISOString() }, { onSuccess: () => toast('Enregistré ✓') });
  };

  if (isLoading) return <Loading />;
  return (
    <section className={highlight ? 'rounded-[var(--radius)] border-2 border-rouge p-3' : ''}>
      <h2 className="mb-1 text-lg font-bold">Ma fiche de synthèse</h2>
      <p className="mb-3 text-sm text-muted">Pas une collection de citations : ta réflexion, en quelques lignes.</p>
      <div className="space-y-3">
        {SUMMARY_FIELDS.map(([k, label, hint]) => (
          <Field key={k} label={label}>
            <Textarea value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => commit(k)} placeholder={hint} rows={3} />
          </Field>
        ))}
      </div>
    </section>
  );
}
