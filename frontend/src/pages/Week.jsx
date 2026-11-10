import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, Wand2, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useBulk, useProfile, useRemove, useRows, useSave } from '../hooks/useData';
import { useRecentChecks } from '../hooks/useLife';
import { autoPlace, dueOn, fidelity, freeSlots, isWeekly, sleepInsight, weekProgress } from '../lib/engine';
import { addDays, capitalize, dayName, dayShort, hhmm, shortDate, today, toTime, weekDays, weekStart, weekday } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Card, Empty, Field, Gauge, IconButton, Input, Loading, SectionTitle, Select, Sheet, Stat, Tabs, Textarea } from '../components/ui';

export default function Week() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') || 'progres';
  const [monday, setMonday] = useState(weekStart());
  const sunday = addDays(monday, 6);
  const days = weekDays(monday);
  const { data: profile } = useProfile();
  const { data: habits = [], isLoading } = useRows('habits', { build: (q) => q.eq('archived', false).order('position') });
  const { data: checks = [] } = useRecentChecks();
  const { data: planned = [] } = useRows('planned_sessions', { key: [monday], build: (q) => q.gte('day', monday).lte('day', sunday) });
  const { data: blocks = [] } = useRows('schedule_blocks');
  const { data: fasts = [] } = useRows('fasts', { key: ['semaine', monday], build: (q) => q.gte('ends_at', monday).lte('starts_at', `${sunday}T23:59:59`) });
  const ctx = { monday, days, habits, checks, planned, blocks, profile, fasts };

  if (isLoading) return <Loading />;
  return (
    <div>
      <PageHeader
        help="semaine"
        title="Ma semaine"
        sub={`du ${shortDate(monday)} au ${shortDate(sunday)}`}
        action={(
          <div className="flex">
            <IconButton icon={ChevronLeft} label="Semaine précédente" onClick={() => setMonday(addDays(monday, -7))} />
            <IconButton icon={ChevronRight} label="Semaine suivante" onClick={() => setMonday(addDays(monday, 7))} />
          </div>
        )}
      />
      {monday !== weekStart() && <button type="button" className="mb-3 min-h-11 text-sm font-semibold text-rouge" onClick={() => setMonday(weekStart())}>Revenir à cette semaine</button>}
      <Tabs tabs={[['progres', 'Progrès'], ['planning', 'Planning'], ['bilan', 'Bilan']]} value={tab} onChange={(v) => setParams({ onglet: v }, { replace: true })} />
      <div className="mt-5">
        {tab === 'progres' && <Progress {...ctx} />}
        {tab === 'planning' && <Planner {...ctx} />}
        {tab === 'bilan' && <Review {...ctx} />}
      </div>
    </div>
  );
}

// ─── Progrès ───────────────────────────────────────────────────────────────

function Progress({ monday, days, habits, checks }) {
  const now = today();
  const by = useMemo(() => new Map(checks.map((c) => [`${c.habit_id}|${c.day}`, c])), [checks]);
  const stats = useMemo(() => {
    let due = 0; let done = 0;
    habits.filter((h) => !isWeekly(h)).forEach((h) => days.forEach((d) => {
      if (d > now || !dueOn(h, d)) return;
      due += 1;
      if (by.has(`${h.id}|${d}`)) done += 1;
    }));
    return { due, done, pct: due ? Math.round((done / due) * 100) : 0 };
  }, [habits, days, by, now]);

  if (!habits.length) return <Empty title="Aucune action pour l'instant">Ajoute des actions depuis l'écran Aujourd'hui pour voir ta semaine.</Empty>;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{stats.due ? `${stats.done} actions tenues sur ${stats.due} prévues (${stats.pct} %).` : 'Rien de prévu pour l\'instant.'}</p>
      <section className="card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,2rem)] items-center gap-x-1 border-b border-line px-3 py-2 text-center text-[0.7rem] font-bold uppercase text-muted">
          <span />
          {days.map((d) => <span key={d} className={clsx(d === now && 'text-rouge')}>{dayShort(weekday(d)).slice(0, 1)}</span>)}
        </div>
        {habits.filter((h) => !isWeekly(h)).map((h) => {
          const f = h.at_time ? fidelity(h, checks) : null;
          return (
            <div key={h.id} className="border-b border-line px-3 py-2 last:border-b-0">
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,2rem)] items-center gap-x-1">
                <span className="truncate pr-2 text-sm font-semibold">{h.title}{h.at_time && <span className="ml-1.5 font-normal text-muted num">{hhmm(h.at_time)}</span>}</span>
                {days.map((d) => {
                  const c = by.get(`${h.id}|${d}`);
                  const off = !dueOn(h, d);
                  const late = c?.level === 'full' && (c.late_min ?? 0) > (h.grace_min ?? 15);
                  return (
                    <span key={d} aria-label={`${h.title}, ${d} : ${c ? (c.level === 'full' ? (late ? 'rattrapé' : 'fait') : '2 minutes') : off ? 'pas prévu' : 'non fait'}`}
                      className={clsx('mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-white',
                        c?.level === 'full' && (late ? 'border-rouge bg-paper text-rouge' : 'border-rouge bg-rouge'),
                        c?.level === 'min' && 'border-rouge bg-rouge-soft text-rouge',
                        !c && (off ? 'border-transparent' : d < now ? 'border-line' : 'border-dashed border-line'))}>
                      {c?.level === 'full' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      {c?.level === 'min' && <Zap className="h-3.5 w-3.5" />}
                    </span>
                  );
                })}
              </div>
              {f && f.due >= 5 && f.onTimeRate < 0.6 && <p className="mt-1 text-xs font-semibold text-rouge">Fragile : à l'heure {Math.round(f.onTimeRate * 100)} % du temps sur 14 jours.</p>}
            </div>
          );
        })}
      </section>

      {habits.some(isWeekly) && (
        <section>
          <SectionTitle>Plusieurs fois par semaine</SectionTitle>
          <div className="space-y-3">
            {habits.filter(isWeekly).map((h) => {
              const p = weekProgress(h, checks, monday);
              return (
                <div key={h.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{h.title}</span><span className="num text-muted">{p.done}/{p.target}</span></div>
                  <Gauge done={Math.min(p.done, p.target)} target={p.target} min={p.min} tone="rouge" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Planning : placer les séances dans les trous ──────────────────────────

function Planner({ monday, days, habits, checks, planned, blocks, profile, fasts }) {
  const bulk = useBulk('planned_sessions');
  const save = useSave('planned_sessions');
  const remove = useRemove('planned_sessions');
  const [proposals, setProposals] = useState(null);
  const [adding, setAdding] = useState(null);
  const weekly = habits.filter(isWeekly);
  const ctx = { blocks, habits, planned };
  const freeByDay = useMemo(
    () => Object.fromEntries(days.map((d) => [d, freeSlots(d, ctx, profile, 15)])),
    [days, blocks, habits, planned, profile], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalFree = days.filter((d) => d >= today()).reduce((s, d) => s + freeByDay[d].reduce((a, [x, y]) => a + (y - x), 0), 0);

  const propose = () => setProposals(autoPlace({ days, habits, planned, checkins: checks, blocks, profile, fasts }));
  const accept = () => bulk.mutate({ rows: proposals, onConflict: 'habit_id,day' }, { onSuccess: () => { setProposals(null); toast('Séances placées ✓'); } });

  if (!weekly.length) {
    return <Empty title="Aucune action « plusieurs fois par semaine »">Dans une action, choisis « Plusieurs fois par semaine » (sport, anglais…) : Davina la placera ici dans tes trous.</Empty>;
  }
  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Stat label="Temps libre restant cette semaine" value={`${Math.floor(totalFree / 60)} h ${String(totalFree % 60).padStart(2, '0')}`}
            sub={blocks.length ? 'Calculé à partir de ton emploi du temps.' : <Link to="/emploi-du-temps" className="font-semibold text-rouge underline">Saisis ton emploi du temps</Link>} />
          <Button icon={Wand2} data-tour="placer" onClick={propose}>Placer automatiquement</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
          {weekly.map((h) => {
            const n = planned.filter((p) => p.habit_id === h.id).length;
            return (
              <div key={h.id} className="text-sm">
                <div className="mb-1 flex justify-between gap-2"><span className="truncate">{h.title}</span><span className="num text-muted">{n}/{h.per_week}</span></div>
                <Gauge done={Math.min(n, h.per_week)} target={h.per_week} min={h.per_week_min} tone="rouge" />
              </div>
            );
          })}
        </div>
      </Card>

      {proposals && (
        <Card className="border-2 border-rouge p-4">
          <SectionTitle>Proposition</SectionTitle>
          {!proposals.length ? <p className="text-sm text-muted">Tout est déjà placé, ou il n'y a plus de créneau assez long cette semaine.</p> : (
            <ul className="mb-3 divide-y divide-line text-sm">
              {proposals.map((p) => (
                <li key={p.habit_id + p.day} className="flex justify-between py-1.5">
                  <span className="font-semibold">{habits.find((h) => h.id === p.habit_id)?.title}</span>
                  <span className="text-muted">{dayName(p.day)} · {p.at_time}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            {proposals.length > 0 && <Button onClick={accept} loading={bulk.isPending}>Valider</Button>}
            <Button variant="secondary" onClick={() => setProposals(null)}>Annuler</Button>
          </div>
        </Card>
      )}

      {days.map((d) => {
        const mine = planned.filter((p) => p.day === d).sort((a, b) => (a.at_time < b.at_time ? -1 : 1));
        const past = d < today();
        return (
          <div key={d} className={past ? 'opacity-55' : undefined}>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{capitalize(dayName(d))} <span className="text-sm font-normal text-muted">{shortDate(d)}</span></h3>
              {!past && <IconButton icon={Plus} label={`Placer une séance le ${dayName(d)}`} onClick={() => setAdding(d)} />}
            </div>
            {mine.map((p) => {
              const h = habits.find((x) => x.id === p.habit_id);
              return (
                <div key={p.id} className="mb-1 flex items-center gap-3 border-l-4 border-rouge bg-paper-2 px-3 py-2">
                  <span className="w-11 text-sm font-bold num">{hhmm(p.at_time)}</span>
                  <span className="flex-1 font-semibold">{h?.title}</span>
                  <span className="text-xs text-muted">{h?.duration_min ? `${h.duration_min} min` : ''}</span>
                  <IconButton icon={Trash2} label="Retirer" onClick={() => remove.mutate(p.id)} />
                </div>
              );
            })}
            {!past && <p className="text-xs text-muted">Libre : {freeByDay[d].length ? freeByDay[d].map(([a, b]) => `${toTime(a)}–${toTime(b)}`).join(', ') : 'aucun créneau'}</p>}
          </div>
        );
      })}
      <AddSession day={adding} habits={weekly} slots={adding ? freeByDay[adding] : []} onClose={() => setAdding(null)} onSave={(row) => save.mutate(row, { onSuccess: () => { setAdding(null); toast('Séance placée ✓'); } })} />
    </div>
  );
}

function AddSession({ day, habits, slots, onClose, onSave }) {
  const [habit, setHabit] = useState('');
  const [time, setTime] = useState('');
  const h = habits.find((x) => x.id === (habit || habits[0]?.id));
  return (
    <Sheet open={!!day} onClose={onClose} title={day ? `Placer une séance — ${dayName(day)}` : ''}>
      <div className="space-y-3">
        <Field label="Activité"><Select value={habit || habits[0]?.id} onChange={(e) => setHabit(e.target.value)} options={habits.map((x) => [x.id, x.title])} /></Field>
        <Field label="Heure"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        {slots.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {slots.filter(([a, b]) => b - a >= (h?.duration_min || 15)).map(([a]) => (
              <button key={a} type="button" className="chip num" aria-pressed={time === toTime(a)} onClick={() => setTime(toTime(a))}>{toTime(a)}</button>
            ))}
          </div>
        )}
        <Button size="lg" className="w-full" disabled={!time || !h} onClick={() => { onSave({ habit_id: h.id, day, at_time: time }); setTime(''); }}>Placer</Button>
      </div>
    </Sheet>
  );
}

// ─── Bilan ─────────────────────────────────────────────────────────────────

function Review({ monday, habits, checks }) {
  const sunday = addDays(monday, 6);
  const { data: logs = [] } = useRows('day_logs', { key: ['range', monday], build: (q) => q.gte('day', addDays(monday, -21)).lte('day', sunday) });
  const { data: saved, isLoading } = useQuery({
    queryKey: ['reviews', monday],
    queryFn: async () => unwrap(await supabase.from('reviews').select('*').eq('week_start', monday).maybeSingle()),
  });
  const save = useSave('reviews', { onConflict: 'user_id,week_start' });
  const [v, setV] = useState({ learned: '', did: '', change: '' });
  useEffect(() => { setV({ learned: saved?.learned || '', did: saved?.did || '', change: saved?.change || '' }); }, [saved]);

  const weekLogs = logs.filter((l) => l.day >= monday && l.day <= sunday);
  const avg = (k) => {
    const x = weekLogs.map((l) => l[k]).filter((n) => n != null);
    return x.length ? x.reduce((s, n) => s + Number(n), 0) / x.length : null;
  };
  const fragile = habits.filter((h) => h.at_time && !isWeekly(h)).map((h) => ({ h, f: fidelity(h, checks) })).filter(({ f }) => f && f.due >= 5)
    .sort((a, b) => a.f.onTimeRate - b.f.onTimeRate).slice(0, 2);
  const insight = sleepInsight(habits, checks, logs);
  const victories = weekLogs.filter((l) => l.victory).map((l) => l.victory);
  const fmt = (n, unit) => (n == null ? '—' : `${n.toFixed(1).replace('.', ',')}${unit}`);

  const commit = (k) => {
    if ((saved?.[k] || '') === v[k].trim()) return;
    save.mutate({ week_start: monday, [k]: v[k].trim() }, { onSuccess: () => toast('Enregistré ✓') });
  };
  // Fonction (pas composant) : un composant recréé à chaque frappe ferait perdre le curseur.
  const q = (k, label, ph) => (
    <Field label={label}><Textarea value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => commit(k)} placeholder={ph} rows={2} /></Field>
  );

  if (isLoading) return <Loading />;
  return (
    <div className="space-y-5">
      <Card className="p-4">
        <SectionTitle>Ma semaine en chiffres</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Sommeil moyen" value={fmt(avg('sleep_hours'), ' h')} />
          <Stat label="Énergie" value={fmt(avg('energy'), '/5')} />
          <Stat label="Eau / jour" value={avg('water') ? fmt(avg('water'), '') : '—'} />
        </div>
      </Card>

      {(insight || fragile.length > 0) && (
        <Card className="p-4">
          <SectionTitle>Ce que je remarque</SectionTitle>
          <ul className="space-y-2 text-sm">
            {fragile.map(({ h, f }) => <li key={h.id}>• <b>{h.title}</b> ({hhmm(h.at_time)}) : tenu {f.kept}/{f.due}, à l'heure {f.onTime}/{f.due} sur 14 jours.{f.onTimeRate < 0.5 && ' Couche-toi plus tôt la veille ou prépare tout le soir.'}</li>)}
            {insight && <li>• {insight}</li>}
          </ul>
        </Card>
      )}

      {victories.length > 0 && (
        <Card className="p-4"><SectionTitle>Mes victoires de la semaine</SectionTitle><ul className="space-y-1 text-sm">{victories.map((x, i) => <li key={i}>✦ {x}</li>)}</ul></Card>
      )}

      <section>
        <h2 className="mb-1 text-lg font-bold">Mon bilan, en 2 minutes</h2>
        <p className="mb-3 text-sm text-muted">Trois questions, quelques mots suffisent.</p>
        <div className="space-y-3">
          {q('learned', "Ce que j'ai appris", 'Une leçon, une idée, une prise de conscience')}
          {q('did', "Ce que j'ai fait", 'Ma plus belle avancée')}
          {q('change', 'Ce que je change', 'Une seule chose pour la semaine prochaine')}
        </div>
        <Guard monday={monday} on={saved?.guard || []} save={save} />
      </section>
    </div>
  );
}

const GUARDS = [
  ['sauveur', 'Je me suis cru indispensable'],
  ['culte', "J'ai cherché qu'on me suive, moi, plutôt que des principes"],
  ['intolerance', "J'ai méprisé quelqu'un qui pensait autrement"],
];

/** Vigilance : trois pièges de ceux qui veulent aider. Cocher, c'est déjà les voir. */
function Guard({ monday, on, save }) {
  const toggle = (k) => save.mutate({ week_start: monday, guard: on.includes(k) ? on.filter((x) => x !== k) : [...on, k] });
  return (
    <div className="mt-5 rounded-[var(--radius)] border border-line p-3">
      <h3 className="mb-1 font-bold">Ma vigilance de la semaine</h3>
      <p className="mb-2 text-sm text-muted">Coche ce qui t'a traversé l'esprit, sans te juger.</p>
      {GUARDS.map(([k, label]) => (
        <label key={k} className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--rouge)]" checked={on.includes(k)} onChange={() => toggle(k)} />
          {label}
        </label>
      ))}
    </div>
  );
}
