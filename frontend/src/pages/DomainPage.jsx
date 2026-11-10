import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Zap } from 'lucide-react';
import { useRows } from '../hooks/useData';
import { useSaveDomain, useUserDomains } from '../hooks/useLife';
import { DOMAIN, KIND } from '../data/domains';
import { TOOLS_BY_DOMAIN } from '../data/tools';
import { shortDate } from '../lib/dates';
import HabitSheet from '../components/HabitSheet';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Empty, Loading, Textarea } from '../components/ui';

export default function DomainPage() {
  const { key } = useParams();
  const meta = DOMAIN[key];
  const { data: rows = [], isLoading } = useUserDomains();
  const row = rows.find((r) => r.domain === key);
  const save = useSaveDomain();
  const { data: habits = [] } = useRows('habits', { key: [key], build: (q) => q.eq('domain', key).eq('archived', false).order('position') });
  const { data: entries = [] } = useRows('entries', { key: [key], build: (q) => q.eq('domain', key).order('created_at', { ascending: false }).limit(20) });
  const [vision, setVision] = useState('');
  const [sheet, setSheet] = useState(null);

  useEffect(() => { setVision(row?.vision || ''); }, [row?.vision]);

  if (!meta) return <Navigate to="/semaine?onglet=roue" replace />;
  if (isLoading) return <Loading />;

  const patch = (fields, msg) => save.mutate({ domain: key, ...fields }, { onSuccess: () => msg && toast(msg) });

  return (
    <>
      <Link to="/semaine?onglet=roue" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Roue</Link>
      <PageHeader title={meta.name} sub={meta.about} />

      <section className="card mb-4 p-4">
        <label className="field-label" htmlFor="vision">Ma vision, en une phrase</label>
        <Textarea
          id="vision"
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          onBlur={() => vision !== (row?.vision || '') && patch({ vision: vision.trim() }, 'Enregistré ✓')}
          placeholder="Où je veux être dans ce domaine, dans un an ?"
          rows={2}
        />
        <div className="mt-4">
          <p className="field-label">Où j'en suis : <b className="text-rouge num">{row?.score ?? '–'}</b>/10</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={row?.score === n}
                onClick={() => patch({ score: n })}
                className="min-h-11 rounded-sm border border-line text-sm font-bold num aria-pressed:border-rouge aria-pressed:bg-rouge aria-pressed:text-white"
              >{n}</button>
            ))}
          </div>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={!!row?.active} onChange={(e) => patch({ active: e.target.checked }, e.target.checked ? 'Domaine réveillé ✓' : 'Domaine en veille')} />
          Je travaille ce domaine en ce moment
        </label>
      </section>

      {TOOLS_BY_DOMAIN(key).length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-bold">Outils</h2>
          <ul className="space-y-2">
            {TOOLS_BY_DOMAIN(key).map((t) => (
              <li key={t.to}><Link to={t.to} className="card flex min-h-14 items-center gap-3 p-3"><t.icon className="h-5 w-5 shrink-0 text-rouge" /><span className="min-w-0"><span className="block font-semibold">{t.title}</span><span className="block text-sm text-muted">{t.sub}</span></span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-2 text-lg font-bold">Mes actions</h2>
      {habits.length === 0 ? (
        <Empty title="Aucune action ici" action={<Button icon={Plus} onClick={() => setSheet({})}>Ajouter une action</Button>}>
          Commence petit : une action de 2 minutes suffit.
        </Empty>
      ) : (
        <>
          <ul className="space-y-2">
            {habits.map((h) => (
              <li key={h.id}>
                <button type="button" className="card flex w-full min-h-16 flex-col items-start p-3 text-left" onClick={() => setSheet({ habit: h })}>
                  <span className="font-semibold">{h.title}{h.shared && <span className="ml-2 text-xs font-medium text-rouge">partagée</span>}</span>
                  <span className="text-sm text-muted">{h.full_version || '—'}</span>
                  {h.min_version && <span className="flex items-center gap-1 text-sm text-muted"><Zap className="h-3.5 w-3.5 text-rouge" />{h.min_version}</span>}
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" icon={Plus} className="mt-3 w-full" onClick={() => setSheet({})}>Ajouter une action</Button>
        </>
      )}

      {entries.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-lg font-bold">Dans mon journal</h2>
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="card p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{KIND[e.kind]} · {shortDate(e.day)}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{e.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <HabitSheet open={!!sheet} onClose={() => setSheet(null)} habit={sheet?.habit} domain={key} />
    </>
  );
}
