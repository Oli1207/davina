import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useBulk } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { wheelAverage } from '../lib/engine';
import { today } from '../lib/dates';
import { DOMAINS } from '../data/domains';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Loading, Sheet } from '../components/ui';

/** Radar des 10 domaines : plus la forme est grande et régulière, plus la vie est équilibrée. */
function Radar({ scores }) {
  const c = 170; const r = 110; const n = DOMAINS.length;
  const pt = (i, v) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * (v / 10), c + Math.sin(a) * r * (v / 10)];
  };
  const poly = DOMAINS.map((d, i) => pt(i, scores[d.key] || 0).join(',')).join(' ');
  return (
    <svg viewBox="0 0 340 340" className="mx-auto block w-full max-w-sm" role="img" aria-label="Roue de vie" data-tour="roue">
      {[2, 4, 6, 8, 10].map((v) => (
        <polygon key={v} points={DOMAINS.map((_, i) => pt(i, v).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {DOMAINS.map((d, i) => {
        const [x, y] = pt(i, 10); const [lx, ly] = pt(i, 12.6);
        return (
          <g key={d.key}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />
            <text x={lx} y={ly} fontSize="12" fontWeight="600" textAnchor="middle" dominantBaseline="middle" fill="var(--muted)">{d.name}</text>
          </g>
        );
      })}
      <polygon points={poly} fill="var(--rouge)" fillOpacity="0.18" stroke="var(--rouge)" strokeWidth="2.5" strokeLinejoin="round" />
      {DOMAINS.map((d, i) => scores[d.key] ? <circle key={d.key} cx={pt(i, scores[d.key])[0]} cy={pt(i, scores[d.key])[1]} r="4" fill="var(--rouge)" /> : null)}
    </svg>
  );
}

export default function Wheel() {
  const { data: rows = [], isLoading } = useUserDomains();
  const [open, setOpen] = useState(false);
  const by = Object.fromEntries(rows.map((r) => [r.domain, r]));
  const scores = Object.fromEntries(rows.map((r) => [r.domain, r.score]));
  const avg = wheelAverage(rows);

  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader
        help="roue" title="Ma roue de vie"
        sub={avg ? `Moyenne : ${avg}/10. Touche un domaine pour l'ouvrir.` : 'Donne une note à chaque domaine pour voir ton équilibre.'}
        action={<Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => setOpen(true)}>Faire le point</Button>}
      />
      <Radar scores={scores} />
      <ul className="mt-4 space-y-2">
        {DOMAINS.map((d) => {
          const row = by[d.key];
          return (
            <li key={d.key}>
              <Link to={`/domaine/${d.key}`} className={clsx('card flex min-h-16 items-center gap-3 p-3', !row?.active && 'opacity-70')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rouge-soft text-rouge"><d.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.name}{!row?.active && <span className="ml-2 text-xs font-medium text-muted">en veille</span>}</span>
                  <span className="block truncate text-sm text-muted">{row?.vision || d.about}</span>
                </span>
                <span className="font-display text-xl font-extrabold num text-rouge">{row?.score ?? '–'}</span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
      <PointSheet open={open} onClose={() => setOpen(false)} scores={scores} />
    </>
  );
}

/** Mise à jour mensuelle : dix curseurs, 30 secondes. */
function PointSheet({ open, onClose, scores }) {
  const [vals, setVals] = useState({});
  const userDomains = useBulk('user_domains');
  const history = useBulk('wheel_scores');
  const get = (k) => vals[k] ?? scores[k] ?? 5;

  const save = async () => {
    const month = `${today().slice(0, 7)}-01`;
    await userDomains.mutateAsync({ rows: DOMAINS.map((d) => ({ domain: d.key, score: get(d.key) })), onConflict: 'user_id,domain' });
    await history.mutateAsync({ rows: DOMAINS.map((d) => ({ domain: d.key, month, score: get(d.key) })), onConflict: 'user_id,domain,month' });
    toast('Roue mise à jour ✓');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Faire le point">
      <p className="mb-3 text-sm text-muted">De 1 (très bas) à 10 (épanouie). Va vite, fie-toi à ton premier ressenti.</p>
      <div className="space-y-3">
        {DOMAINS.map((d) => (
          <label key={d.key} className="block">
            <span className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-2"><d.icon className="h-4 w-4 text-rouge" />{d.name}</span>
              <span className="font-display text-lg font-extrabold num text-rouge">{get(d.key)}</span>
            </span>
            <input type="range" min="1" max="10" step="1" value={get(d.key)} onChange={(e) => setVals({ ...vals, [d.key]: Number(e.target.value) })} className="h-10 w-full accent-[var(--rouge)]" />
          </label>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" loading={userDomains.isPending || history.isPending} onClick={save}>Enregistrer</Button>
    </Sheet>
  );
}
