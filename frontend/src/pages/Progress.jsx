import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRows } from '../hooks/useData';
import { useJourneys } from '../hooks/useJourneys';
import { DOMAINS } from '../data/domains';
import { shortDate } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { Chips, Empty, Loading } from '../components/ui';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthIdx = (m) => Number(m.slice(5, 7)) - 1;

/**
 * « Mon chemin » : la vue sur toute la vie. Les chiffres sont calculés par la base,
 * mois par mois, pour rester légers même après des années d'usage.
 */
export default function Progress() {
  const { data: months = [], isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: async () => unwrap(await supabase.rpc('progress_by_month')),
  });
  const { data: journeys = [] } = useJourneys();
  const { data: scores = [] } = useRows('wheel_scores', { key: ['all'], build: (q) => q.order('month') });
  const { data: doneBooks = [] } = useRows('books', { key: ['done'], build: (q) => q.eq('status', 'done') });
  const [domain, setDomain] = useState(null);

  const years = useMemo(() => {
    const by = {};
    months.forEach((m) => { (by[m.month.slice(0, 4)] ||= []).push(m); });
    return Object.entries(by).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [months]);

  const totals = useMemo(() => ({
    days: months.reduce((s, m) => s + m.active_days, 0),
    actions: months.reduce((s, m) => s + m.actions, 0),
    notes: months.reduce((s, m) => s + m.notes, 0),
    done: journeys.filter((j) => j.status === 'done').length,
    since: months[0]?.month,
  }), [months, journeys]);

  if (isLoading) return <Loading />;
  if (!months.length && !journeys.length) {
    return (
      <>
        <PageHeader title="Mon chemin" />
        <Empty title="Ton chemin commence aujourd'hui">Coche une action ou note une idée : dans quelques mois, tu verras ici ta progression.</Empty>
      </>
    );
  }
  const max = Math.max(1, ...months.map((m) => m.active_days));

  return (
    <>
      <PageHeader title="Mon chemin" sub={totals.since ? `Depuis ${MONTHS[monthIdx(totals.since)]} ${totals.since.slice(0, 4)}` : undefined} />

      <section className="mb-5 grid grid-cols-2 gap-2">
        {[[totals.days, 'jours actifs'], [totals.actions, 'actions tenues'], [totals.notes, 'notes écrites'], [totals.done, 'parcours terminés'], [doneBooks.length, 'livres terminés'], [doneBooks.reduce((n, b) => n + (b.total_pages || 0), 0), 'pages de livres finis']].map(([n, l]) => (
          <div key={l} className="card p-3"><p className="font-display text-3xl font-extrabold num text-rouge">{n}</p><p className="text-sm text-muted">{l}</p></div>
        ))}
      </section>

      <h2 className="mb-2 text-lg font-bold">Mes mois</h2>
      {years.map(([year, list]) => (
        <section key={year} className="card mb-3 p-4">
          <h3 className="mb-2 font-display text-xl font-extrabold">{year}</h3>
          <ul className="space-y-1.5">
            {[...list].reverse().map((m) => (
              <li key={m.month} className="grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
                <span className="font-semibold text-muted">{MONTHS[monthIdx(m.month)]}</span>
                <span className="h-3 rounded-full bg-rouge-soft"><span className="block h-full rounded-full bg-rouge" style={{ width: `${Math.round((m.active_days / max) * 100)}%` }} /></span>
                <span className="num text-xs text-muted">{m.active_days} j · {m.notes} notes</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {scores.length > 0 && <Evolution scores={scores} domain={domain} setDomain={setDomain} />}

      {journeys.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-lg font-bold">Mes parcours</h2>
          <ol className="relative space-y-3 border-l-2 border-line pl-4">
            {[...journeys].sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1)).map((j) => (
              <li key={j.id} className="relative">
                <span className={clsx('absolute -left-[1.45rem] top-1.5 h-3 w-3 rounded-full border-2 border-rouge', j.status === 'done' ? 'bg-rouge' : 'bg-paper')} />
                <Link to={`/parcours/${j.id}`} className="block">
                  <span className="block font-semibold">{j.title}</span>
                  <span className="block text-sm text-muted">{shortDate(j.starts_on)} {j.starts_on.slice(0, 4)}{j.finished_on ? ` → ${shortDate(j.finished_on)} ${j.finished_on.slice(0, 4)}` : ' → en cours'}</span>
                  {j.conclusion && <span className="mt-0.5 block text-sm italic">« {j.conclusion} »</span>}
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

/** Courbe de la roue dans le temps : la moyenne, ou un domaine à choisir. */
function Evolution({ scores, domain, setDomain }) {
  const points = useMemo(() => {
    const by = {};
    scores.filter((s) => !domain || s.domain === domain).forEach((s) => { (by[s.month] ||= []).push(s.score); });
    return Object.entries(by).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, v]) => ({ month, v: v.reduce((a, b) => a + b, 0) / v.length }));
  }, [scores, domain]);
  const W = 300; const H = 120; const pad = 12;
  const x = (i) => (points.length < 2 ? W / 2 : pad + (i * (W - 2 * pad)) / (points.length - 1));
  const y = (v) => H - pad - ((v - 1) / 9) * (H - 2 * pad);
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-lg font-bold">Ma roue dans le temps</h2>
      <Chips className="mb-3" options={DOMAINS.map((d) => [d.key, d.name])} value={domain} onChange={setDomain} />
      <div className="card p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution des notes">
          {[1, 5, 10].map((v) => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="var(--line)" />)}
          {points.length > 1 && <polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke="var(--rouge)" strokeWidth="2.5" strokeLinejoin="round" />}
          {points.map((p, i) => <circle key={p.month} cx={x(i)} cy={y(p.v)} r="4" fill="var(--rouge)" />)}
        </svg>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{points[0] && `${MONTHS[monthIdx(points[0].month)]} ${points[0].month.slice(0, 4)} : ${Math.round(points[0].v * 10) / 10}`}</span>
          <span>{points.length > 1 && `${MONTHS[monthIdx(points.at(-1).month)]} ${points.at(-1).month.slice(0, 4)} : ${Math.round(points.at(-1).v * 10) / 10}`}</span>
        </div>
      </div>
    </section>
  );
}
