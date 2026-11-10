import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check, ChevronRight, Droplet, Flame, GraduationCap, LayoutGrid, Plus, Siren, Sparkles, Zap } from 'lucide-react';
import { useProfile, useRows, useSave } from '../hooks/useData';
import { lateFor, useToday, useToggleCheck } from '../hooks/useLife';
import { stateOf } from '../lib/engine';
import { addDays, clock, hhmm, longDate, minutesLabel, nowMin, toTime, today, weekday } from '../lib/dates';
import { setBadge } from '../lib/push';
import { DOMAIN } from '../data/domains';
import HabitSheet from '../components/HabitSheet';
import EveningCard from '../components/EveningCard';
import WordCard from '../components/WordCard';
import InstallCard from '../components/InstallCard';
import Soleil from '../components/Soleil';
import { PageHeader } from '../components/Layout';
import { Button, Card, Empty, Gauge, IconButton, Loading, Scale, SectionTitle, Sheet } from '../components/ui';

const SLEEP = [4, 5, 6, 6.5, 7, 7.5, 8, 9];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function Today() {
  const { data: profile } = useProfile();
  const t = useToday();
  const toggle = useToggleCheck();
  const saveLog = useSave('day_logs', { onConflict: 'user_id,day' });
  const [menu, setMenu] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [, refresh] = useState(0);
  const day = t.day;
  const { data: fasts = [] } = useRows('fasts', { key: ['actifs'], build: (q) => q.is('ended_at', null).order('starts_at') });
  const { data: dueChapters = [] } = useRows('chapters', { key: ['dus', day], build: (q) => q.lte('next_review', day).neq('status', 'revise') });
  const { data: urgent = [] } = useRows('assignments', { key: ['urgents', day], build: (q) => q.eq('done', false).lte('due_on', addDays(day, 2)).order('due_on') });

  // L'heure avance : la ligne « maintenant » et les retards se recalculent chaque minute.
  useEffect(() => {
    const id = setInterval(() => refresh((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const light = t.log?.mode === 'leger';
  const rows = [...t.timed, ...t.untimed].filter((i) => i.type === 'habit');
  const remaining = rows.filter((i) => !i.checkin).length;
  useEffect(() => { setBadge(remaining); }, [remaining]);

  const patch = (fields) => saveLog.mutate({ day, ...fields });
  const activeFast = fasts.find((f) => new Date(f.starts_at) <= new Date());

  const set = (h, checkin, level) => toggle.mutate({ habitId: h.id, day, level, current: null, late: checkin?.late_min ?? lateFor(h, day) });
  const tap = (item) => {
    const h = item.habit;
    if (item.checkin) { setMenu(item); return; }
    toggle.mutate({ habitId: h.id, day, level: light && !h.sacred && h.min_version ? 'min' : 'full', current: null, late: lateFor(h, day) });
    navigator.vibrate?.(15);
  };
  const clear = (h, checkin) => toggle.mutate({ habitId: h.id, day, level: checkin.level, current: checkin.level });

  if (t.loading) return <Loading />;

  const now = nowMin();
  let nowPlaced = false;
  const firstId = [...t.timed, ...t.untimed].find((i) => i.type === 'habit')?.id;

  return (
    <div>
      <PageHeader
        help="jour"
        kicker={longDate(day).replace(/^./, (c) => c.toUpperCase())}
        title={`${greeting()}${profile?.display_name ? `, ${profile.display_name}` : ''}`}
        action={<Link to="/plus" aria-label="Menu : roue, journal, binôme, réglages…" className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-muted hover:bg-paper-2"><LayoutGrid className="h-5 w-5" /></Link>}
      />

      <InstallCard />

      {activeFast && <FastBanner fast={activeFast} />}

      {t.log?.energy == null ? <MorningCheckin onSave={patch} /> : (
        <div className="mb-5 flex items-center gap-4" data-tour="avancee">
          <Soleil value={t.total ? t.done / t.total : 0} size={104} petals={24}>
            <span className="font-display text-2xl font-extrabold num">{t.done}/{t.total}</span>
          </Soleil>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {['plein', 'leger'].map((m) => (
                <button key={m} type="button" className="chip min-h-11" aria-pressed={(t.log.mode || 'plein') === m} onClick={() => patch({ mode: m })}>
                  {m === 'plein' ? 'Jour plein' : 'Jour léger'}
                </button>
              ))}
              {t.streak > 0 && <span className="chip min-h-11 text-rouge" title="Jours d'affilée (1 oubli par semaine toléré)"><Flame className="h-3.5 w-3.5" />{t.streak} j</span>}
            </div>
            <p className="mt-2 text-sm text-muted">
              {light
                ? 'Versions « 2 minutes » affichées. Faire un peu compte : on ne casse pas la chaîne.'
                : `Énergie ${t.log.energy}/5${t.log.sleep_hours ? ` · ${String(t.log.sleep_hours).replace('.', ',')} h de sommeil` : ''}.`}
            </p>
          </div>
        </div>
      )}

      {weekday(day) === 0 && (
        <Link to="/semaine?onglet=bilan" className="mb-4 flex min-h-14 items-center justify-between rounded-sm border-2 border-rouge px-4 font-semibold text-rouge">
          Dimanche : mon bilan de la semaine <span aria-hidden>→</span>
        </Link>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <SectionTitle>Ton jour</SectionTitle>
          {!t.timed.length && <p className="mb-4 text-sm text-muted">Aucun rendez-vous à heure fixe aujourd'hui.</p>}
          <ol className="mb-6 border-l-2 border-ink" data-tour="frise">
            {t.timed.map((item) => {
              const marker = !nowPlaced && item.at > now;
              if (marker) nowPlaced = true;
              return (
                <li key={item.id}>
                  {marker && <NowLine />}
                  {item.type === 'block' ? <BlockRow item={item} /> : <HabitRow first={item.id === firstId} item={item} light={light} onTap={() => tap(item)} onEdit={() => setSheet({ habit: item.habit })} />}
                </li>
              );
            })}
            {!nowPlaced && t.timed.length > 0 && <li><NowLine /></li>}
          </ol>

          {t.untimed.length > 0 && (
            <>
              <SectionTitle>Dans la journée</SectionTitle>
              <div className="mb-6 divide-y divide-line border-y border-line">
                {t.untimed.map((item) => <HabitRow key={item.id} first={item.id === firstId} item={item} light={light} flat onTap={() => tap(item)} onEdit={() => setSheet({ habit: item.habit })} />)}
              </div>
            </>
          )}

          {t.weekly.length > 0 && (
            <>
              <SectionTitle action={<Link to="/semaine?onglet=planning" className="text-sm font-semibold text-rouge">Placer mes séances</Link>}>Cette semaine</SectionTitle>
              <ul className="mb-6 space-y-2.5">
                {t.weekly.map((w) => <WeeklyRow key={w.habit.id} w={w} light={light} onTap={() => (w.checkin ? setMenu(w) : toggle.mutate({ habitId: w.habit.id, day, level: light && w.habit.min_version ? 'min' : 'full', current: null, late: null }))} onEdit={() => setSheet({ habit: w.habit })} />)}
              </ul>
            </>
          )}
          <Button variant="ghost" icon={Plus} className="mb-6 w-full" onClick={() => setSheet({})}>Ajouter une action</Button>
          {t.total === 0 && t.weekly.length === 0 && <Empty title="Rien de prévu aujourd'hui">Une seule petite action suffit pour commencer.</Empty>}
        </div>

        <aside>
          {(dueChapters.length > 0 || urgent.length > 0) && (
            <Link to="/etudes?onglet=plan" className="card mb-4 block p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rouge">Études</p>
              {dueChapters.length > 0 && <p className="font-semibold">{dueChapters.length} rappel{dueChapters.length > 1 ? 's' : ''} actif{dueChapters.length > 1 ? 's' : ''} à faire</p>}
              {urgent.map((a) => <p key={a.id} className="text-sm">{a.title} · <span className={a.due_on <= day ? 'font-semibold text-rouge' : 'text-muted'}>{a.due_on < day ? 'en retard' : a.due_on === day ? "aujourd'hui" : 'bientôt'}</span></p>)}
              <p className="mt-1 text-sm font-semibold text-rouge">Ouvrir le tableau de bord →</p>
            </Link>
          )}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link to="/corps?onglet=sucre&sos=1" className="red-block flex min-h-16 items-center gap-3 p-4">
              <Siren className="h-6 w-6 shrink-0" />
              <div className="flex-1">
                <p className="font-display text-lg font-bold">SOS envie</p>
                <p className="text-sm opacity-90">Sucre ou sel : 10 minutes pour la laisser passer.</p>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Link>
            <Water value={t.log?.water || 0} onChange={(water) => patch({ water })} />
          </div>
          <WordCard day={day} log={t.log} />
          <EveningCard day={day} log={t.log} />
        </aside>
      </div>

      <CheckMenu item={menu} onClose={() => setMenu(null)}
        onSet={(level) => { set(menu.habit, menu.checkin, level); setMenu(null); }}
        onClear={() => { clear(menu.habit, menu.checkin); setMenu(null); }} />
      <HabitSheet open={!!sheet} onClose={() => setSheet(null)} habit={sheet?.habit} />
    </div>
  );
}

function NowLine() {
  return (
    <div className="relative -ml-[5px] flex items-center gap-2 py-1">
      <span className="pulse-dot h-2 w-2 rounded-full bg-rouge" />
      <span className="h-px flex-1 bg-rouge" />
      <span className="pr-1 text-[0.65rem] font-bold uppercase tracking-wider text-rouge">maintenant</span>
    </div>
  );
}

function BlockRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-4 text-muted">
      <span className="w-11 shrink-0 text-sm font-semibold num">{toTime(item.at)}</span>
      <div className="flex flex-1 items-center gap-2 border-l-4 border-line bg-paper-2 px-3 py-2 text-sm">
        <GraduationCap className="h-4 w-4 shrink-0" />
        <span className="min-w-0"><span className="font-semibold text-ink">{item.block.title}</span> · jusqu'à {toTime(item.end)}{item.block.location ? ` · ${item.block.location}` : ''}</span>
      </div>
    </div>
  );
}

function CheckDot({ habit, checkin, onTap, tour }) {
  const state = stateOf(checkin, habit);
  const level = checkin?.level;
  return (
    <button type="button" className="check" data-state={level || undefined} data-tour={tour ? 'check' : undefined} onClick={onTap}
      aria-label={checkin ? `Modifier ${habit.title}` : `Marquer « ${habit.title} » comme fait`}>
      {level === 'full' && <Check className="h-5 w-5" strokeWidth={3} />}
      {level === 'min' && <Zap className="h-5 w-5" />}
      {level === 'rest' && <span className="text-[0.6rem] font-bold">repos</span>}
      {state === 'late' && <span className="sr-only">rattrapé</span>}
    </button>
  );
}

function HabitRow({ item, light, onTap, onEdit, flat, first }) {
  const h = item.habit;
  const c = item.checkin;
  const state = stateOf(c, h);
  const Icon = DOMAIN[h.domain]?.icon;
  const version = light && !h.sacred && h.min_version ? h.min_version : (h.full_version || h.min_version);
  return (
    <div className={clsx('flex items-center gap-3 py-2.5', !flat && 'pl-4')}>
      {!flat && <span className="w-11 shrink-0 text-sm font-bold num">{item.at != null ? toTime(item.at) : ''}</span>}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit} aria-label={`Modifier ${h.title}`}>
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-rouge" />}
          <span className={clsx('truncate font-semibold', c && c.level !== 'miss' && 'text-muted line-through')}>{h.title}</span>
          {h.sacred && <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider text-rouge">sacré</span>}
          {item.planned && <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider text-muted">placé</span>}
        </span>
        {version && <span className="block truncate text-sm text-muted">{version}</span>}
        {state === 'late' && <span className="block text-xs font-semibold text-rouge">Rattrapé avec {minutesLabel(c.late_min)} de retard</span>}
        {c?.level === 'miss' && <span className="block text-xs font-semibold text-muted">Manqué : demain on reprend</span>}
      </button>
      <CheckDot habit={h} checkin={c} onTap={onTap} tour={first} />
    </div>
  );
}

function WeeklyRow({ w, light, onTap, onEdit }) {
  const h = w.habit;
  const Icon = DOMAIN[h.domain]?.icon;
  const p = w.progress;
  return (
    <li className="card p-3">
      <div className="flex items-center gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit} aria-label={`Modifier ${h.title}`}>
          <span className="flex items-center gap-1.5 font-semibold">{Icon && <Icon className="h-4 w-4 shrink-0 text-rouge" />}<span className="truncate">{h.title}</span></span>
          <span className="block text-sm text-muted num">{p.done}/{p.target} cette semaine{p.done >= p.min && p.done < p.target ? ' · objectif tenu' : ''}</span>
        </button>
        <CheckDot habit={h} checkin={w.checkin} onTap={onTap} />
      </div>
      <div className="mt-2"><Gauge done={Math.min(p.done, p.target)} target={p.target} min={p.min} tone="rouge" /></div>
    </li>
  );
}

function Water({ value, onChange }) {
  const goal = 8;
  return (
    <div className="card flex items-center gap-3 p-4">
      <Droplet className="h-6 w-6 shrink-0 text-rouge" />
      <div className="flex-1">
        <p className="font-semibold">Eau <span className="num text-muted">{value}/{goal} verres</span></p>
        <div className="mt-1.5 flex gap-1">
          {Array.from({ length: goal }, (_, i) => (
            <button key={i} type="button" aria-label={`${i + 1} verres`} onClick={() => onChange(value === i + 1 ? i : i + 1)}
              className="h-7 flex-1 rounded-[3px] border border-rouge" style={{ background: i < value ? 'var(--rouge)' : 'transparent' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MorningCheckin({ onSave }) {
  const [sleep, setSleep] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [mood, setMood] = useState(null);
  const save = () => onSave({ sleep_hours: sleep, energy, mood, mode: energy <= 2 ? 'leger' : 'plein' });
  return (
    <Card className="mb-6 p-4" data-tour="checkin">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-rouge" /><h2 className="text-lg font-bold">Check-in du matin</h2></div>
      <p className="mb-3 text-sm text-muted">10 secondes pour que la journée s'adapte à toi.</p>
      <p className="field-label">Sommeil</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SLEEP.map((h) => <button key={h} type="button" className="chip num min-h-11" aria-pressed={sleep === h} onClick={() => setSleep(h)}>{String(h).replace('.', ',')} h</button>)}
      </div>
      <p className="field-label">Énergie</p>
      <Scale value={energy} onChange={setEnergy} tone="rouge" labels={['Vidée', 'Basse', 'Correcte', 'Bonne', 'Pleine']} />
      <p className="field-label mt-3">Humeur</p>
      <Scale value={mood} onChange={setMood} tone="rouge" labels={['Lourde', 'Moyenne', 'Neutre', 'Bien', 'Joyeuse']} />
      {energy != null && energy <= 2 && (
        <p className="mt-3 rounded-sm border-l-4 border-rouge bg-rouge-soft px-3 py-2 text-sm">Énergie basse : je te propose un <b>jour léger</b>. Tes rendez-vous sacrés restent, le reste passe en version « 2 minutes ».</p>
      )}
      <Button size="lg" className="mt-4 w-full" disabled={!energy} onClick={save}>Commencer ma journée</Button>
    </Card>
  );
}

function FastBanner({ fast }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(fast.starts_at).getTime();
  const end = new Date(fast.ends_at).getTime();
  const now = Date.now();
  return (
    <Link to="/esprit?onglet=jeune" className="red-block mb-5 flex items-center gap-4 p-4">
      <Soleil value={(now - start) / (end - start)} size={64} petals={16} tones={['paper', 'paper']}><Flame className="h-4 w-4 text-rouge" /></Soleil>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider opacity-90">Jeûne en cours</p>
        <p className="font-display text-2xl font-extrabold num">{now < end ? clock((end - now) / 1000) : 'Terminé'}</p>
        <p className="truncate text-sm opacity-90">{now < end ? `Rupture à ${hhmm(new Date(end).toTimeString())}` : 'Tu peux rompre ton jeûne.'}{fast.intention ? ` · ${fast.intention}` : ''}</p>
      </div>
    </Link>
  );
}

function CheckMenu({ item, onClose, onSet, onClear }) {
  const h = item?.habit;
  const c = item?.checkin;
  return (
    <Sheet open={!!item} onClose={onClose} title={h?.title || ''}>
      {c?.late_min != null && <p className="mb-3 text-sm text-muted">Pointé avec {minutesLabel(c.late_min)} d'écart sur l'heure prévue.</p>}
      <div className="grid gap-2">
        <Button size="lg" onClick={() => onSet('full')}>Fait en entier</Button>
        {!h?.sacred && h?.min_version && <Button variant="secondary" size="lg" onClick={() => onSet('min')}>Version « 2 minutes » : {h.min_version}</Button>}
        <Button variant="secondary" size="lg" onClick={() => onSet('miss')}>Manqué</Button>
        <Button variant="secondary" size="lg" onClick={() => onSet('rest')}>Jour de repos (maladie, voyage) : ne casse pas la série</Button>
        <Button variant="ghost" size="lg" onClick={onClear}>Effacer le pointage</Button>
      </div>
    </Sheet>
  );
}
