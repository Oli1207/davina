import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Check, ChevronLeft, Flag, Pause, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRows, useSave } from '../hooks/useData';
import { journeyProgress, useJourneyParts } from '../hooks/useJourneys';
import { DOMAIN, KIND } from '../data/domains';
import { shortDate, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Gauge, Loading, Sheet, Textarea } from '../components/ui';
import { StartSheet } from './Journeys';
import { BookRow } from './Library';

export default function JourneyPage() {
  const { id } = useParams();
  const { data: journey, isLoading, isFetched } = useQuery({
    queryKey: ['journeys', 'one', id],
    queryFn: async () => unwrap(await supabase.from('journeys').select('*').eq('id', id).maybeSingle()),
  });
  const { data: previous } = useQuery({
    queryKey: ['journeys', 'prev', journey?.previous_id],
    enabled: !!journey?.previous_id,
    queryFn: async () => unwrap(await supabase.from('journeys').select('id,title').eq('id', journey.previous_id).maybeSingle()),
  });
  const parts = useJourneyParts(id);
  const { data: books = [] } = useRows('books', { key: ['journey', id], build: (q) => q.eq('journey_id', id) });
  const save = useSave('journeys', { also: ['journeys'] });
  const saveDel = useSave('deliverables');
  const [del, setDel] = useState(null);
  const [finish, setFinish] = useState(false);
  const [next, setNext] = useState(false);
  const now = today();

  if (isLoading) return <Loading />;
  if (isFetched && !journey) return <Navigate to="/semaine?onglet=parcours" replace />;

  const steps = parts.steps.data || [];
  const dels = parts.deliverables.data || [];
  const habits = parts.habits.data || [];
  const entries = parts.entries.data || [];
  const p = journeyProgress(journey, dels, now);
  const current = steps.find((s) => s.starts_on <= now && s.ends_on >= now);
  const Icon = DOMAIN[journey.domain]?.icon;

  const toggleDeliverable = (d) => saveDel.mutate(
    { id: d.id, done_on: d.done_on ? null : now },
    { onSuccess: () => !d.done_on && toast('Livrable accompli ✓') },
  );
  const setStatus = (status) => save.mutate({ id: journey.id, status }, { onSuccess: () => toast(status === 'paused' ? 'Parcours en pause' : 'Parcours repris') });

  return (
    <>
      <Link to="/semaine?onglet=parcours" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Parcours</Link>
      <PageHeader
        kicker={journey.status === 'done' ? 'Terminé' : journey.status === 'paused' ? 'En pause' : 'En cours'}
        title={journey.title}
        sub={`${shortDate(journey.starts_on)} ${journey.starts_on.slice(0, 4)}${journey.ends_on ? ` → ${shortDate(journey.ends_on)} ${journey.ends_on.slice(0, 4)}` : ''}`}
        action={Icon && <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rouge-soft text-rouge"><Icon className="h-5 w-5" /></span>}
      />
      {previous && <p className="-mt-3 mb-4 text-sm text-muted">Suite de <Link className="font-semibold text-rouge" to={`/parcours/${previous.id}`}>{previous.title}</Link></p>}

      {journey.intention && <p className="mb-4 border-l-4 border-rouge bg-rouge-soft px-3 py-2.5 text-sm">{journey.intention}</p>}

      <section className="red-block mb-5 p-4">
        <p className="font-display text-3xl font-extrabold num">{p.done}<span className="text-lg opacity-70">/{p.total} livrables</span></p>
        {p.total > 0 && <div className="mt-2"><Gauge done={p.done} target={p.total} tone="white" /></div>}
        {p.time != null && journey.status === 'active' && <p className="mt-2 text-sm opacity-90">{p.time} % du temps écoulé{p.time - p.pct > 25 && p.total > 0 ? ' : tu prends du retard, ajuste sans te juger.' : ''}</p>}
      </section>

      {steps.map((s) => {
        const sd = dels.filter((d) => d.step_id === s.id);
        const isNow = current?.id === s.id;
        return (
          <section key={s.id} className={clsx('card mb-3 p-4', isNow && 'border-rouge')}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold">{s.title}</h2>
              {isNow && <span className="shrink-0 rounded-full bg-rouge px-2 py-0.5 text-xs font-bold text-white">En ce moment</span>}
            </div>
            {s.starts_on && <p className="text-xs text-muted">{shortDate(s.starts_on)} → {shortDate(s.ends_on)}</p>}
            {s.about && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{s.about.split('\n').filter(Boolean).map((l) => <li key={l}>{l}</li>)}</ul>}
            {sd.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <p className="field-label !mb-0">Livrable{sd.length > 1 ? 's' : ''}</p>
                {sd.map((d) => (
                  <div key={d.id} className="flex items-center gap-3">
                    <button type="button" className="check !h-9 !w-9" data-state={d.done_on ? 'full' : undefined} aria-label={d.done_on ? `Rouvrir « ${d.title} »` : `Marquer « ${d.title} » comme accompli`} onClick={() => toggleDeliverable(d)}>
                      {d.done_on && <Check className="h-4 w-4" strokeWidth={3} />}
                    </button>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDel(d)}>
                      <span className={clsx('block font-semibold', d.done_on && 'text-muted')}>{d.title}</span>
                      <span className="block truncate text-sm text-muted">{d.done_on ? `Accompli le ${shortDate(d.done_on)}` : d.note || 'Touche pour ajouter une note'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {habits.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-lg font-bold">Mes actions de ce parcours</h2>
          <ul className="space-y-1.5">{habits.map((h) => <li key={h.id} className="card p-3"><span className="font-semibold">{h.title}</span><span className="block text-sm text-muted">{h.full_version}</span></li>)}</ul>
        </section>
      )}

      {books.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-lg font-bold">Mes lectures de ce parcours</h2>
          <ul className="space-y-1.5">{books.map((b) => <li key={b.id}><BookRow b={b} /></li>)}</ul>
        </section>
      )}

      {entries.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-lg font-bold">Ce que j'ai noté</h2>
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li key={e.id} className="card p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{KIND[e.kind]} · {shortDate(e.day)}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{e.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {journey.status === 'done' && journey.conclusion && (
        <section className="card mb-4 p-4"><p className="field-label">Mon bilan</p><p className="whitespace-pre-wrap">{journey.conclusion}</p></section>
      )}

      <div className="mt-6 space-y-2">
        {journey.status !== 'done' && <Button size="lg" icon={Flag} className="w-full" onClick={() => setFinish(true)}>Terminer ce parcours</Button>}
        {journey.status === 'active' && <Button variant="secondary" size="lg" icon={Pause} className="w-full" onClick={() => setStatus('paused')}>Mettre en pause</Button>}
        {journey.status === 'paused' && <Button variant="secondary" size="lg" icon={Play} className="w-full" onClick={() => setStatus('active')}>Reprendre</Button>}
        {journey.status === 'done' && <Button size="lg" className="w-full" onClick={() => setNext(true)}>Commencer la suite</Button>}
      </div>

      <DeliverableSheet d={del} onClose={() => setDel(null)} />
      <FinishSheet open={finish} onClose={() => setFinish(false)} journey={journey} onDone={() => { setFinish(false); setNext(true); }} />
      <StartSheet open={next} onClose={() => setNext(false)} previousId={journey.id} />
    </>
  );
}

function DeliverableSheet({ d, onClose }) {
  const [note, setNote] = useState(null);
  const save = useSave('deliverables');
  const value = note ?? d?.note ?? '';
  const close = () => { setNote(null); onClose(); };
  return (
    <Sheet open={!!d} onClose={close} title={d?.title || ''}>
      <p className="mb-2 text-sm text-muted">Écris ici un résumé, ou colle le lien du document produit.</p>
      <Textarea value={value} onChange={(e) => setNote(e.target.value)} rows={6} aria-label="Note du livrable" />
      <Button size="lg" className="mt-3 w-full" loading={save.isPending} onClick={() => save.mutate({ id: d.id, note: value.trim() }, { onSuccess: () => { toast('Enregistré ✓'); close(); } })}>Enregistrer</Button>
    </Sheet>
  );
}

function FinishSheet({ open, onClose, journey, onDone }) {
  const [text, setText] = useState('');
  const save = useSave('journeys', { also: ['journeys'] });
  return (
    <Sheet open={open} onClose={onClose} title="Terminer ce parcours">
      <p className="mb-2 text-sm text-muted">Dans quelques années, c'est ce que tu liras en premier. Qu'est-ce qui a changé en toi ? Qu'as-tu appris ?</p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label="Mon bilan" autoFocus />
      <Button size="lg" className="mt-3 w-full" loading={save.isPending}
        onClick={() => save.mutate({ id: journey.id, status: 'done', conclusion: text.trim(), finished_on: today() }, { onSuccess: () => { toast('Parcours terminé ✓'); setText(''); onDone(); } })}>
        Terminer et choisir la suite
      </Button>
    </Sheet>
  );
}
