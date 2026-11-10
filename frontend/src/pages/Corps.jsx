import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, Pause, Play, Plus, SkipForward, Siren } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile, useRows, useSave } from '../hooks/useData';
import { useAutoCheck } from '../hooks/useLife';
import { addDays, capitalize, clock, DAY_LABELS, longDate, shortDate, today, weekStart, weekday } from '../lib/dates';
import { supabase, unwrap } from '../lib/supabase';
import { cravingInsights, HIDDEN_SOURCES, MEALS, MILESTONES, QUALITY, ROUTINES, routineMinutes, SOS_ALTERNATIVES, TRIGGERS } from '../data/corps';
import { toast } from '../components/toast';
import Ring from '../components/Ring';
import { LineChart } from '../components/Chart';
import { PageHeader } from '../components/Layout';
import { Button, Card, Chips, Field, Gauge, Input, Scale, SectionTitle, Sheet, Stat, Tabs } from '../components/ui';

/** Série de jours consécutifs où `ok(jour)` est vrai (aujourd'hui compte s'il est déjà tenu, sinon on part d'hier). */
function streakBy(ok, max = 400) {
  let d = today();
  if (!ok(d)) d = addDays(d, -1);
  let n = 0;
  while (n < max && ok(d)) { n += 1; d = addDays(d, -1); }
  return n;
}

export default function Corps() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') || 'seances';
  return (
    <div>
      <PageHeader kicker="Santé physique" title="Corps" sub="Bouger, manger simple, couper le sucre et le sel. Prendre soin de moi." />
      <Tabs tabs={[['seances', 'Séances'], ['sucre', 'Sucre & sel'], ['repas', 'Repas'], ['poids', 'Poids']]} value={tab} onChange={(v) => setParams({ onglet: v }, { replace: true })} />
      <div className="mt-5">
        {tab === 'seances' && <Workouts />}
        {tab === 'sucre' && <SugarSalt sosOpen={params.get('sos') === '1'} onSosClose={() => setParams({ onglet: 'sucre' }, { replace: true })} />}
        {tab === 'repas' && <Meals />}
        {tab === 'poids' && <Weight />}
      </div>
    </div>
  );
}

// ─── Séances guidées ───────────────────────────────────────────────────────

function Workouts() {
  const monday = weekStart();
  const { data: workouts = [] } = useRows('workouts', { build: (q) => q.order('day', { ascending: false }).order('created_at', { ascending: false }).limit(40) });
  const { data: habits = [] } = useRows('habits', { key: ['sport'], build: (q) => q.eq('kind', 'sport').eq('archived', false) });
  const save = useSave('workouts');
  const autoCheck = useAutoCheck();
  const [routine, setRoutine] = useState(null);
  const [manual, setManual] = useState(false);
  const week = workouts.filter((w) => w.day >= monday && w.day <= addDays(monday, 6)).length;
  const target = habits[0]?.days?.length || 3;
  const min = Math.max(1, target - 1);
  const month = workouts.filter((w) => w.day >= addDays(today(), -29));

  const record = (row) => save.mutate(row, { onSuccess: () => { autoCheck('sport'); setRoutine(null); setManual(false); toast('Séance enregistrée ✓'); } });

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Cette semaine</h2>
          <span className="num text-muted">{week}/{target} séances</span>
        </div>
        <Gauge done={Math.min(week, target)} target={target} min={min} tone="rouge" />
        <p className="mt-2 text-sm text-muted">
          {week >= target ? 'Semaine complète. Repos mérité.' : week >= min ? 'Objectif tenu. La suivante est un bonus.' : `Encore ${min - week} pour tenir ton objectif.`}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {ROUTINES.map((r) => (
          <button key={r.key} type="button" onClick={() => setRoutine(r)} className="card flex min-h-24 flex-col p-4 text-left transition active:bg-rouge-soft">
            <span className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold">{r.title}</span>
              <span className="text-sm num text-muted">{routineMinutes(r)} min</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-rouge">{r.level}</span>
            <span className="mt-1 text-sm text-muted">{r.note}</span>
          </button>
        ))}
      </div>
      <Button variant="secondary" icon={Plus} className="w-full" onClick={() => setManual(true)}>J'ai bougé autrement (marche, danse, foot…)</Button>

      <div>
        <SectionTitle>Historique <span className="font-normal text-muted">· {month.length} séances en 30 jours</span></SectionTitle>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {workouts.map((w) => (
            <li key={w.id} className="flex justify-between gap-2 py-2">
              <span><b>{w.routine}</b> · {w.minutes} min{w.effort ? ` · effort ${w.effort}/5` : ''}</span>
              <span className="shrink-0 text-muted">{shortDate(w.day)}</span>
            </li>
          ))}
        </ul>
      </div>

      {routine && <Player routine={routine} onClose={() => setRoutine(null)} onDone={(effort, minutes) => record({ routine: routine.title, minutes, effort })} />}
      <ManualWorkout open={manual} onClose={() => setManual(false)} onSave={record} />
    </div>
  );
}

/** Lecteur de séance : enchaîne les exercices, vibre au changement, garde l'écran allumé. */
function Player({ routine, onClose, onDone }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(routine.steps[0].sec);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [effort, setEffort] = useState(null);
  const startedAt = useRef(null);
  const lock = useRef(null);
  const step = routine.steps[i];
  const next = routine.steps[i + 1];

  useEffect(() => {
    if (!running) return undefined;
    navigator.wakeLock?.request('screen').then((l) => { lock.current = l; }).catch(() => {});
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => { clearInterval(t); lock.current?.release?.(); };
  }, [running]);

  useEffect(() => {
    if (left > 0) return;
    if (i + 1 >= routine.steps.length) { setRunning(false); setFinished(true); navigator.vibrate?.([400, 150, 400]); return; }
    navigator.vibrate?.(routine.steps[i + 1].rest ? 150 : [200, 80, 200]);
    setI(i + 1);
    setLeft(routine.steps[i + 1].sec);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSec = routine.steps.reduce((s, x) => s + x.sec, 0);
  const doneSec = routine.steps.slice(0, i).reduce((s, x) => s + x.sec, 0) + (step.sec - left);
  const minutes = Math.max(1, Math.round((startedAt.current ? (Date.now() - startedAt.current) / 1000 : doneSec) / 60));

  return (
    <Sheet open onClose={onClose} title={routine.title} wide>
      {finished ? (
        <div className="space-y-4 text-center">
          <p className="font-display text-3xl font-extrabold">Séance terminée</p>
          <Field label="Effort ressenti"><Scale value={effort} onChange={setEffort} tone="rouge" labels={['Facile', 'Modéré', 'Soutenu', 'Dur', 'Maximal']} /></Field>
          <Button size="lg" className="w-full" onClick={() => onDone(effort, minutes)}>Enregistrer ma séance</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{step.round ? `Tour ${step.round} · ` : ''}étape {i + 1}/{routine.steps.length}</p>
          <Ring value={1 - left / step.sec} size={200} stroke={12} tone={step.rest ? 'var(--ink)' : 'var(--rouge)'}>
            <span className="font-display text-5xl font-extrabold num">{clock(left)}</span>
          </Ring>
          <p className={clsx('font-display text-3xl font-extrabold', !step.rest && 'text-rouge')}>{step.name}</p>
          {step.cue && <p className="max-w-sm text-muted">{step.cue}</p>}
          {next && <p className="text-sm">Ensuite : <b>{next.name}</b></p>}
          <div className="h-1.5 w-full rounded-full bg-rouge-soft"><div className="h-full rounded-full bg-rouge" style={{ width: `${(doneSec / totalSec) * 100}%` }} /></div>
          <div className="flex gap-2">
            <Button size="lg" variant={running ? 'secondary' : 'primary'} icon={running ? Pause : Play} onClick={() => { if (!startedAt.current) startedAt.current = Date.now(); setRunning(!running); }}>
              {running ? 'Pause' : i === 0 && left === step.sec ? 'Commencer' : 'Reprendre'}
            </Button>
            <Button size="lg" variant="ghost" icon={SkipForward} onClick={() => setLeft(0)}>Passer</Button>
          </div>
          {i > 0 && <button type="button" className="min-h-11 text-sm text-muted underline" onClick={() => { setRunning(false); setFinished(true); }}>Terminer maintenant</button>}
        </div>
      )}
    </Sheet>
  );
}

function ManualWorkout({ open, onClose, onSave }) {
  const [f, setF] = useState({ routine: 'Marche', minutes: '30', effort: null, day: today() });
  const minutes = Math.round(Number(f.minutes));
  return (
    <Sheet open={open} onClose={onClose} title="Autre activité">
      <div className="space-y-3">
        <Chips options={['Marche', 'Danse', 'Course', 'Foot', 'Corde à sauter', 'Natation', 'Autre'].map((x) => [x, x])} value={f.routine} onChange={(v) => setF({ ...f, routine: v || 'Autre' })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutes"><Input type="number" inputMode="numeric" min={1} max={600} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
          <Field label="Jour"><Input type="date" value={f.day} max={today()} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
        </div>
        <Field label="Effort"><Scale value={f.effort} onChange={(v) => setF({ ...f, effort: v })} tone="rouge" /></Field>
        <Button size="lg" className="w-full" disabled={!(minutes >= 1 && minutes <= 600)} onClick={() => onSave({ routine: f.routine, minutes, effort: f.effort, day: f.day })}>Enregistrer</Button>
      </div>
    </Sheet>
  );
}

// ─── Sucre et sel ──────────────────────────────────────────────────────────

function SugarSalt({ sosOpen, onSosClose }) {
  const { data: logs = [] } = useRows('day_logs', { key: ['90j'], build: (q) => q.gte('day', addDays(today(), -90)) });
  const { data: cravings = [] } = useRows('cravings', { build: (q) => q.gte('at', addDays(today(), -60)).order('at', { ascending: false }) });
  const [sos, setSos] = useState(sosOpen);
  useEffect(() => { if (sosOpen) setSos(true); }, [sosOpen]);
  const byDay = useMemo(() => Object.fromEntries(logs.map((l) => [l.day, l])), [logs]);
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => setSos(true)} className="red-block flex min-h-20 w-full items-center gap-3 p-4 text-left">
        <Siren className="h-7 w-7 shrink-0" />
        <span className="flex-1">
          <span className="block font-display text-xl font-bold">SOS envie</span>
          <span className="block text-sm opacity-90">Une envie dure rarement plus de 10 minutes. On la laisse passer ensemble.</span>
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {[['sucre', 'sugar_free'], ['sel', 'salt_free']].map(([k, field]) => {
          const n = streakBy((d) => byDay[d]?.[field] === true);
          return (
            <Card key={k} className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rouge">Sans {k}</p>
              <p className="font-display text-4xl font-extrabold num">{n}<span className="text-base font-semibold text-muted"> jour{n > 1 ? 's' : ''}</span></p>
              <Milestone n={n} />
              <div className="mt-2 flex gap-[3px]" aria-label="14 derniers jours">
                {last14.map((d) => (
                  <span key={d} title={shortDate(d)} className={clsx('h-4 flex-1 rounded-[2px]', byDay[d]?.[field] === true ? 'bg-rouge' : byDay[d]?.[field] === false ? 'border border-rouge bg-rouge-soft' : 'bg-paper-2')} />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">Chaque soir, indique « tenu » ou « écart » dans le bilan du soir (écran Aujourd'hui) : les séries se calculent seules.</p>

      {['sucre', 'sel'].map((k) => {
        const ins = cravingInsights(cravings, k);
        return ins.length > 0 && (
          <Card key={k} className="p-4">
            <SectionTitle>Tes envies de {k}</SectionTitle>
            <ul className="space-y-1 text-sm">{ins.map((s) => <li key={s}>• {s}</li>)}</ul>
          </Card>
        );
      })}

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(HIDDEN_SOURCES).map(([k, list]) => (
          <Card key={k} className="p-4">
            <p className="mb-2 font-bold">Où se cache le {k}</p>
            <ul className="space-y-1 text-sm text-muted">{list.map((s) => <li key={s}>— {s}</li>)}</ul>
          </Card>
        ))}
      </div>

      {cravings.length > 0 && (
        <div>
          <SectionTitle>Dernières envies</SectionTitle>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {cravings.slice(0, 12).map((c) => (
              <li key={c.id} className="flex justify-between gap-2 py-2">
                <span><b className="capitalize">{c.kind}</b>{c.trigger && ` · ${c.trigger}`}</span>
                <span className={c.resisted ? 'font-semibold text-rouge' : 'text-muted'}>{c.resisted ? 'Tenu' : c.resisted === false ? 'Cédé' : '—'} · {shortDate(c.at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sos && <SosFlow onClose={() => { setSos(false); onSosClose(); }} />}
    </div>
  );
}

function SosFlow({ onClose }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState('sucre');
  const [trigger, setTrigger] = useState(null);
  const [step, setStep] = useState(0);
  const [id, setId] = useState(null);
  const [left, setLeft] = useState(600);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step !== 1) return undefined;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => { if (step === 1 && left === 0) navigator.vibrate?.([300, 100, 300]); }, [left, step]);

  // L'envie est enregistrée dès le début : même si on ferme l'app, on garde le déclencheur.
  const start = async () => {
    setBusy(true);
    try {
      const row = unwrap(await supabase.from('cravings').insert({ kind, trigger: trigger || '' }).select().single());
      setId(row.id);
      setStep(1);
    } catch (e) { toast(e.message, { tone: 'error' }); }
    setBusy(false);
  };
  const finish = async (resisted) => {
    if (id) await supabase.from('cravings').update({ resisted }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['cravings'] });
    setStep(resisted ? 2 : 3);
  };

  return (
    <Sheet open onClose={onClose} title="SOS envie">
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Envie de"><Chips options={[['sucre', 'Sucre'], ['sel', 'Salé']]} value={kind} onChange={(v) => setKind(v || 'sucre')} /></Field>
          <Field label="Qu'est-ce qui l'a déclenchée ?"><Chips options={TRIGGERS.map((t) => [t, t])} value={trigger} onChange={setTrigger} /></Field>
          <Button size="lg" className="w-full" loading={busy} onClick={start}>Lancer les 10 minutes</Button>
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Ring value={1 - left / 600} size={190} stroke={12}><span className="font-display text-4xl font-extrabold num">{clock(left)}</span></Ring>
          <p className="font-semibold">{left ? 'Pendant ce temps, choisis une de ces actions :' : 'Les 10 minutes sont passées. Alors ?'}</p>
          <ul className="w-full space-y-1.5 text-left">{SOS_ALTERNATIVES[kind].map((a) => <li key={a} className="rounded-sm border border-line bg-paper px-3 py-2 text-sm">{a}</li>)}</ul>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => finish(false)}>J'ai cédé</Button>
            <Button size="lg" onClick={() => finish(true)}>J'ai tenu</Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3 text-center">
          <p className="font-display text-3xl font-extrabold text-rouge">Tenu.</p>
          <p className="text-muted">Chaque envie surmontée rend la suivante plus faible. Ton corps se réhabitue au vrai goût des aliments.</p>
          <Button size="lg" className="w-full" onClick={onClose}>Fermer</Button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3 text-center">
          <p className="font-display text-2xl font-extrabold">Ce n'est pas un échec.</p>
          <p className="text-muted">C'est une information. Le déclencheur est noté : on verra ce qui revient et comment l'anticiper. Le prochain repas est un nouveau départ.</p>
          <Button size="lg" className="w-full" onClick={onClose}>Fermer</Button>
        </div>
      )}
    </Sheet>
  );
}

/** Prochain palier de la série : de petites victoires visibles. */
function Milestone({ n }) {
  const next = MILESTONES.find((m) => m > n);
  const prev = [...MILESTONES].reverse().find((m) => m <= n) || 0;
  if (!next) return <p className="text-xs font-semibold text-rouge">Tous les paliers franchis.</p>;
  return (
    <div className="mt-1">
      <div className="h-1 rounded-full bg-rouge-soft"><div className="h-full rounded-full bg-rouge" style={{ width: `${((n - prev) / (next - prev)) * 100}%` }} /></div>
      <p className="mt-0.5 text-[0.65rem] text-muted">Prochain palier : {next} jours{prev ? ` · ${prev} j franchis` : ''}</p>
    </div>
  );
}

// ─── Repas ─────────────────────────────────────────────────────────────────

function Meals() {
  const [day, setDay] = useState(today());
  const { data: meals = [] } = useRows('meals', { key: ['14j'], build: (q) => q.gte('day', addDays(today(), -13)) });
  const save = useSave('meals', { onConflict: 'user_id,day,meal' });
  const todays = meals.filter((m) => m.day === day);
  const week = meals.filter((m) => m.day >= addDays(today(), -6));
  const balanced = week.filter((m) => m.quality === 1).length;

  const set = (meal, fields) => {
    const cur = todays.find((m) => m.meal === meal);
    save.mutate({ day, meal, quality: cur?.quality || 2, sugar: cur?.sugar || false, salt: cur?.salt || false, ...fields });
  };

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-4 p-4">
        <Plate />
        <div className="text-sm">
          <p className="font-display text-lg font-bold">La règle de l'assiette</p>
          <p><b>½ légumes</b> (gombo, épinards, aubergine, salade, crudités)</p>
          <p><b>¼ protéines</b> (poisson, poulet, œufs, haricots)</p>
          <p><b>¼ féculents</b> (attiéké, riz, igname, banane, foutou)</p>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{day === today() ? "Aujourd'hui" : capitalize(longDate(day))}</h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDay(addDays(day, -1))}>Veille</Button>
          {day !== today() && <Button size="sm" variant="ghost" onClick={() => setDay(addDays(day, 1))}>Suivant</Button>}
        </div>
      </div>
      <div className="space-y-2">
        {MEALS.map(([key, label]) => {
          const m = todays.find((x) => x.meal === key);
          return (
            <div key={key} className="card p-3">
              <p className="mb-2 font-semibold">{label}</p>
              <div className="grid grid-cols-3 gap-1">
                {QUALITY.map(([q, l]) => (
                  <button key={q} type="button" aria-pressed={m?.quality === q} onClick={() => set(key, { quality: q })}
                    className="min-h-11 rounded-sm border border-line text-sm font-semibold transition aria-pressed:border-rouge aria-pressed:bg-rouge aria-pressed:text-white">{l}</button>
                ))}
              </div>
              {m && (
                <div className="mt-2 flex gap-1.5">
                  <button type="button" className="chip" aria-pressed={m.sugar} onClick={() => set(key, { sugar: !m.sugar })}>+ sucre</button>
                  <button type="button" className="chip" aria-pressed={m.salt} onClick={() => set(key, { salt: !m.salt })}>+ sel / cube</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Stat label="Repas équilibrés sur 7 jours" value={`${balanced} / ${week.length}`} tone="rouge" />
    </div>
  );
}

/** L'assiette coupée en trois, aplats sans dégradé. */
function Plate() {
  return (
    <svg viewBox="0 0 100 100" width="92" height="92" aria-hidden="true" className="shrink-0">
      <circle cx="50" cy="50" r="48" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M50 50 L50 8 A42 42 0 0 0 50 92 Z" fill="var(--rouge)" />
      <path d="M50 50 L50 8 A42 42 0 0 1 92 50 Z" fill="color-mix(in srgb, var(--rouge) 55%, var(--paper))" />
      <path d="M50 50 L92 50 A42 42 0 0 1 50 92 Z" fill="var(--rouge-soft)" />
    </svg>
  );
}

// ─── Poids ─────────────────────────────────────────────────────────────────

const num = (x) => (x === '' || x == null ? null : parseFloat(String(x).replace(',', '.')));

function Weight() {
  const { data: profile } = useProfile();
  const { data: weighIns = [] } = useRows('weigh_ins', { build: (q) => q.order('day') });
  const save = useSave('weigh_ins', { onConflict: 'user_id,day' });
  const saveProfile = useSave('profiles');
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [goals, setGoals] = useState(false);
  const last = weighIns[weighIns.length - 1];
  const start = profile?.start_weight ?? weighIns[0]?.weight_kg;
  const target = profile?.target_weight;
  const lost = start && last ? Number(start) - Number(last.weight_kg) : null;
  const weighDay = profile?.weigh_day ?? 6;
  const fmt = (v) => String(v).replace('.', ',');
  const wv = num(w);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Actuel" value={last ? `${fmt(last.weight_kg)} kg` : '—'} />
        <Stat label="Depuis le début" value={lost != null ? `${lost > 0 ? '−' : '+'}${fmt(Math.abs(lost).toFixed(1))} kg` : '—'} tone={lost > 0 ? 'rouge' : undefined} />
        <Stat label="Objectif" value={target ? `${fmt(target)} kg` : '—'} sub={target && last ? `encore ${fmt(Math.max(0, last.weight_kg - target).toFixed(1))} kg` : undefined} />
      </div>
      <Card className="p-4">
        <LineChart points={weighIns.map((x) => ({ d: x.day, v: Number(x.weight_kg) }))} target={target ? Number(target) : null} avg={3} format={fmt} />
        <p className="mt-1 text-xs text-muted">Trait rouge : moyenne sur 3 pesées. Pointillé : ton objectif.</p>
      </Card>
      <Card className="p-4">
        <SectionTitle>{weekday(today()) === weighDay ? "C'est le jour de la pesée" : `Pesée du ${DAY_LABELS[weighDay]}`}</SectionTitle>
        <p className="mb-3 text-sm text-muted">Une fois par semaine, le matin, à jeun. Les variations d'un jour à l'autre (eau, cycle, sel) ne veulent rien dire.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poids (kg)"><Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></Field>
          <Field label="Tour de taille (cm)"><Input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="facultatif" /></Field>
        </div>
        <Button size="lg" className="mt-3 w-full" disabled={!(wv >= 20 && wv <= 400)} loading={save.isPending} onClick={() => save.mutate(
          { day: today(), weight_kg: wv, waist_cm: num(waist) >= 20 ? num(waist) : null },
          { onSuccess: () => { setW(''); setWaist(''); toast('Pesée enregistrée ✓'); } },
        )}>Enregistrer</Button>
        <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-muted underline" onClick={() => setGoals(true)}>Mon point de départ et mon objectif</button>
      </Card>

      {weighIns.some((x) => x.waist_cm) && (
        <Card className="p-4">
          <SectionTitle>Tour de taille</SectionTitle>
          <LineChart points={weighIns.filter((x) => x.waist_cm).map((x) => ({ d: x.day, v: Number(x.waist_cm) }))} />
        </Card>
      )}
      <GoalsSheet open={goals} profile={profile} onClose={() => setGoals(false)} onSave={(f) => saveProfile.mutate({ id: profile.id, ...f }, { onSuccess: () => { setGoals(false); toast('Enregistré ✓'); } })} />
    </div>
  );
}

function GoalsSheet({ open, profile, onClose, onSave }) {
  const [f, setF] = useState(null);
  if (!open || !profile) return null;
  const v = f || { height_cm: profile.height_cm || '', start_weight: profile.start_weight || '', target_weight: profile.target_weight || '', weigh_day: profile.weigh_day ?? 6 };
  const ok = (x, lo, hi) => num(x) == null || (num(x) >= lo && num(x) <= hi);
  const valid = ok(v.height_cm, 50, 260) && ok(v.start_weight, 20, 400) && ok(v.target_weight, 20, 400);
  return (
    <Sheet open onClose={onClose} title="Point de départ et objectif">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Taille (cm)"><Input inputMode="decimal" value={v.height_cm} onChange={(e) => setF({ ...v, height_cm: e.target.value })} /></Field>
          <Field label="Départ (kg)"><Input inputMode="decimal" value={v.start_weight} onChange={(e) => setF({ ...v, start_weight: e.target.value })} /></Field>
          <Field label="Objectif (kg)"><Input inputMode="decimal" value={v.target_weight} onChange={(e) => setF({ ...v, target_weight: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-muted">Un rythme sain : 0,5 à 1 kg par semaine au maximum.</p>
        <Field label="Jour de pesée">
          <select className="input" value={v.weigh_day} onChange={(e) => setF({ ...v, weigh_day: Number(e.target.value) })}>
            {DAY_LABELS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Field>
        {!valid && <p className="text-sm text-rouge">Une valeur est hors limites.</p>}
        <Button size="lg" className="w-full" disabled={!valid} onClick={() => onSave({ height_cm: num(v.height_cm), start_weight: num(v.start_weight), target_weight: num(v.target_weight), weigh_day: v.weigh_day })}>Enregistrer</Button>
      </div>
    </Sheet>
  );
}
