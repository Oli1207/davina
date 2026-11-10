import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { useJourneys, useStartJourney } from '../hooks/useJourneys';
import { TEMPLATES } from '../data/journeys';
import { DOMAIN } from '../data/domains';
import { longDate, shortDate, today } from '../lib/dates';
import Head from '../components/Head';
import { toast } from '../components/toast';
import { Button, Empty, ErrorNote, Field, Input, Loading, Sheet } from '../components/ui';

const range = (j) => `${shortDate(j.starts_on)} ${j.starts_on.slice(0, 4)}${j.ends_on ? ` → ${shortDate(j.ends_on)} ${j.ends_on.slice(0, 4)}` : ''}`;

export default function Journeys({ embedded }) {
  const { data: journeys = [], isLoading } = useJourneys();
  const [open, setOpen] = useState(false);
  const groups = [
    ['En cours', journeys.filter((j) => j.status === 'active')],
    ['En pause', journeys.filter((j) => j.status === 'paused')],
    ['Terminés', journeys.filter((j) => j.status === 'done')],
  ];

  if (isLoading) return <Loading />;
  return (
    <>
      <Head embedded={embedded} back={null}
        help="parcours"
        title="Mes parcours"
        sub="Des chapitres de vie, avec des étapes et des livrables. Tu peux en mener plusieurs, et les enchaîner toute ta vie."
        action={<Button size="sm" icon={Plus} data-tour="nouveau-parcours" onClick={() => setOpen(true)}>Nouveau</Button>}
      />
      {journeys.length === 0 && (
        <Empty title="Aucun parcours pour l'instant" action={<Button icon={Plus} onClick={() => setOpen(true)}>Choisir un parcours</Button>}>
          Un parcours donne un cap à tes actions : on voit où l'on va, et plus tard tout ce qu'il a produit.
        </Empty>
      )}
      {groups.map(([label, list]) => list.length > 0 && (
        <section key={label} className="mb-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{label}</h2>
          <ul className="space-y-2">
            {list.map((j) => {
              const Icon = DOMAIN[j.domain]?.icon;
              return (
                <li key={j.id}>
                  <Link to={`/parcours/${j.id}`} className="card flex min-h-16 items-center gap-3 p-3">
                    {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rouge-soft text-rouge"><Icon className="h-5 w-5" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{j.title}</span>
                      <span className="block truncate text-sm text-muted">{range(j)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <StartSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Choisir un modèle, régler la date de début : deux écrans, c'est tout. */
export function StartSheet({ open, onClose, previousId = null }) {
  const nav = useNavigate();
  const start = useStartJourney();
  const [tpl, setTpl] = useState(null);
  const [form, setForm] = useState({ title: '', start: today(), withHabits: false });
  const [error, setError] = useState(null);

  const close = () => { setTpl(null); setError(null); onClose(); };
  const go = async () => {
    setError(null);
    try {
      const j = await start.mutateAsync({ tpl, start: form.start, title: form.title.trim(), previousId, withHabits: form.withHabits });
      toast('Parcours démarré ✓');
      close();
      nav(`/parcours/${j.id}`);
    } catch (e) { setError(e); }
  };

  return (
    <Sheet open={open} onClose={close} title={tpl ? tpl.name : 'Choisir un parcours'} wide>
      {!tpl ? (
        <ul className="space-y-2">
          {TEMPLATES.map((t) => {
            const Icon = DOMAIN[t.domain]?.icon;
            return (
              <li key={t.key}>
                <button type="button" className="card flex w-full min-h-16 items-center gap-3 p-3 text-left" onClick={() => { setTpl(t); setForm({ title: '', start: today(), withHabits: false }); }}>
                  {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rouge-soft text-rouge"><Icon className="h-5 w-5" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block text-sm text-muted">{t.tagline}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-3">
          <p className="text-muted">{tpl.tagline}</p>
          {tpl.steps.length > 1 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {tpl.steps.map((s) => <li key={s.title}><b>{s.title}</b>{s.deliverables[0] && <span className="text-muted"> — {s.deliverables[0]}</span>}</li>)}
            </ol>
          )}
          {tpl.key === 'libre' && <Field label="Titre du parcours"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="Ex. Apprendre l'anglais" autoFocus /></Field>}
          <Field label="Début" hint={form.start ? longDate(form.start) : ''}><Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
          {tpl.habits.length > 0 && (
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--rouge)]" checked={form.withHabits} onChange={(e) => setForm({ ...form, withHabits: e.target.checked })} />
              <span>Ajouter les {tpl.habits.length} actions proposées à mes journées <span className="text-muted">({tpl.habits.map((h) => h.title).join(', ')})</span></span>
            </label>
          )}
          <ErrorNote error={error} />
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setTpl(null)}>Retour</Button>
            <Button size="lg" className="flex-1" loading={start.isPending} disabled={!form.start || (tpl.key === 'libre' && !form.title.trim())} onClick={go}>Commencer ce parcours</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
