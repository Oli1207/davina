import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Flame, GraduationCap, Plus, Settings, Zap } from 'lucide-react';
import { useProfile, useSave } from '../hooks/useData';
import { lateFor, useToday, useToggleCheck } from '../hooks/useLife';
import { cheer, stateOf } from '../lib/engine';
import { capitalize, hhmm, longDate, minutesLabel, weekday } from '../lib/dates';
import { setBadge } from '../lib/push';
import { DOMAIN } from '../data/domains';
import HabitSheet from '../components/HabitSheet';
import EveningCard from '../components/EveningCard';
import WordCard from '../components/WordCard';
import { PageHeader } from '../components/Layout';
import { Button, Empty, Gauge, Loading } from '../components/ui';

const ENERGY = ['Épuisée', 'Fatiguée', 'Moyenne', 'Bien', 'En forme'];
const SLEEP = [4, 5, 6, 7, 8, 9];
const MAX_SHOWN = 5;

export default function Today() {
  const { data: profile } = useProfile();
  const t = useToday();
  const toggle = useToggleCheck();
  const saveLog = useSave('day_logs', { onConflict: 'user_id,day' });
  const [sheet, setSheet] = useState(null);
  const [all, setAll] = useState(false);

  const light = t.log?.energy != null && t.log.energy <= 2;
  const rows = [...t.timed, ...t.untimed];
  const pending = rows.filter((i) => i.type === 'habit' && !i.checkin).length;
  useEffect(() => { setBadge(pending); }, [pending]);

  // Ordre fixe : une action cochée reste à sa place, rien ne bouge sous le doigt.
  let habitCount = 0;
  const hidden = rows.filter((i) => i.type === 'habit').length - MAX_SHOWN;
  const visible = rows.filter((i) => {
    if (i.type !== 'habit') return true;
    habitCount += 1;
    return all || habitCount <= MAX_SHOWN;
  });

  const press = (h, checkin, level) => toggle.mutate({
    habitId: h.id, day: t.day, level, current: checkin?.level, late: level === checkin?.level ? null : lateFor(h, t.day),
  });

  if (t.loading) return <Loading />;

  return (
    <>
      <PageHeader
        help="jour"
        kicker={capitalize(longDate(t.day))}
        title={`Bonjour${profile?.display_name ? `, ${profile.display_name}` : ''}`}
        action={<Link to="/reglages" aria-label="Réglages" className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-muted hover:bg-paper-2"><Settings className="h-5 w-5" /></Link>}
      />

      {/* Check-in du matin : un tap, facultatif */}
      {t.log?.energy == null && (
        <section className="card mb-4 p-4 fade-in" data-tour="checkin">
          <p className="mb-2 font-semibold">Comment tu te sens ce matin ?</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ENERGY.map((label, i) => (
              <button key={label} type="button" onClick={() => saveLog.mutate({ day: t.day, energy: i + 1 })}
                className="flex min-h-14 flex-col items-center justify-center rounded-sm border border-line text-[0.7rem] font-semibold leading-tight active:bg-rouge-soft">
                <span className="font-display text-lg font-extrabold num">{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {t.log?.energy != null && t.log.sleep_hours == null && (
        <section className="card mb-4 p-3 fade-in">
          <p className="mb-1.5 text-sm font-semibold">Combien d'heures as-tu dormi ?</p>
          <div className="flex gap-1.5">
            {SLEEP.map((h) => (
              <button key={h} type="button" className="chip min-h-11 flex-1 justify-center" onClick={() => saveLog.mutate({ day: t.day, sleep_hours: h })}>{h === 9 ? '9+' : h === 4 ? '≤4' : h} h</button>
            ))}
          </div>
        </section>
      )}
      {light && (
        <p className="mb-4 rounded-sm border-l-4 border-rouge bg-rouge-soft px-3 py-2.5 text-sm">
          <b>Jour léger.</b> Pas de pression : la version « 2 minutes » de chaque action suffit aujourd'hui. Les rendez-vous sacrés restent entiers, mais tu peux les raccourcir.
        </p>
      )}
      {weekday(t.day) === 0 && (
        <Link to="/semaine" className="mb-4 flex min-h-14 items-center justify-between rounded-sm border-2 border-rouge px-4 font-semibold text-rouge">
          Dimanche : mon bilan de la semaine <span aria-hidden>→</span>
        </Link>
      )}

      {/* Avancée du jour */}
      <section className="red-block mb-4 p-4" data-tour="avancee">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-4xl font-extrabold num leading-none">{t.done}<span className="text-xl opacity-60">/{t.total}</span></p>
            <p className="mt-1 text-sm opacity-80">{cheer(t.done, t.total)}</p>
          </div>
          {t.streak > 0 && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-rouge" title="Jours d'affilée (1 oubli par semaine toléré)">
              <Flame className="h-4 w-4" />{t.streak} j
            </div>
          )}
        </div>
        {t.total > 0 && <div className="mt-3"><Gauge done={t.done} target={t.total} tone="white" /></div>}
      </section>

      <WordCard day={t.day} log={t.log} />

      {t.total === 0 && t.weekly.length === 0 ? (
        <Empty title="Rien de prévu aujourd'hui" action={<Button icon={Plus} onClick={() => setSheet({})}>Ajouter une action</Button>}>
          Une seule petite action suffit pour commencer.
        </Empty>
      ) : (
        <>
          <ul className="space-y-2.5">
            {visible.map((i, n) => (i.type === 'block'
              ? <BlockRow key={i.id} item={i} />
              : <Row key={i.id} item={i} first={visible.findIndex((x) => x.type === 'habit') === n} light={light} press={press} onEdit={() => setSheet({ habit: i.habit })} />))}
          </ul>
          {!all && hidden > 0 && (
            <button type="button" className="mt-2 min-h-11 w-full text-sm font-semibold text-rouge" onClick={() => setAll(true)}>Voir les {hidden} autres</button>
          )}

          {t.weekly.length > 0 && (
            <>
              <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider text-muted">Cette semaine</h2>
              <ul className="space-y-2.5">
                {t.weekly.map((w) => <WeeklyRow key={w.habit.id} w={w} press={press} onEdit={() => setSheet({ habit: w.habit })} />)}
              </ul>
            </>
          )}
          <Button variant="ghost" icon={Plus} className="mt-4 w-full" onClick={() => setSheet({})}>Ajouter une action</Button>
        </>
      )}

      <EveningCard day={t.day} log={t.log} />
      <HabitSheet open={!!sheet} onClose={() => setSheet(null)} habit={sheet?.habit} />
    </>
  );
}

function BlockRow({ item }) {
  const b = item.block;
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-line px-3 py-2.5 text-sm text-muted">
      <GraduationCap className="h-4 w-4 shrink-0" />
      <span className="w-24 shrink-0 font-semibold num">{hhmm(b.start_time)}–{hhmm(b.end_time)}</span>
      <span className="min-w-0 truncate">{b.title}{b.location && ` · ${b.location}`}</span>
    </li>
  );
}

function Row({ item, light, press, onEdit, first }) {
  const h = item.habit;
  const c = item.checkin;
  const Icon = DOMAIN[h.domain]?.icon;
  const done = !!c;
  const state = stateOf(c, h);
  // Jour léger : un tap sur le rond = version 2 minutes, sauf pour un rendez-vous sacré.
  const main = light && !h.sacred ? 'min' : 'full';
  const time = item.planned ? item.planned.at_time : h.at_time;
  return (
    <li className={clsx('card flex items-center gap-3 p-3 transition', done && 'bg-paper-2')}>
      <button type="button" className="check" data-state={c?.level || undefined} data-tour={first ? 'check' : undefined}
        aria-label={done ? `Décocher ${h.title}` : `Marquer « ${h.title} » comme fait`}
        onClick={() => press(h, c, done ? c.level : main)}>
        {c?.level === 'full' && <Check className="h-5 w-5" strokeWidth={3} />}
        {c?.level === 'min' && <Zap className="h-5 w-5" />}
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit} aria-label={`Modifier ${h.title}`}>
        <span className={clsx('flex items-center gap-1.5 font-semibold', done && 'text-muted line-through')}>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-rouge" />}
          {time && <span className="num text-rouge">{hhmm(time)}</span>}
          <span className="truncate">{h.title}</span>
        </span>
        <span className="block truncate text-sm text-muted">
          {state === 'late' ? `Rattrapé (${minutesLabel(c.late_min)} après l'heure)` : light && !h.sacred && h.min_version ? h.min_version : (h.full_version || h.min_version)}
        </span>
      </button>
      {!done && h.min_version && !(light && !h.sacred) && (
        <button type="button" className="chip shrink-0" data-tour={first ? 'deuxmin' : undefined} onClick={() => press(h, c, 'min')} aria-label={`Version 2 minutes : ${h.min_version}`}>
          <Zap className="h-3.5 w-3.5 text-rouge" />2 min
        </button>
      )}
    </li>
  );
}

function WeeklyRow({ w, press, onEdit }) {
  const h = w.habit;
  const c = w.checkin;
  const Icon = DOMAIN[h.domain]?.icon;
  const p = w.progress;
  return (
    <li className="card p-3">
      <div className="flex items-center gap-3">
        <button type="button" className="check" data-state={c?.level || undefined}
          aria-label={c ? `Décocher ${h.title}` : `Marquer « ${h.title} » fait aujourd'hui`} onClick={() => press(h, c, c ? c.level : 'full')}>
          {c?.level === 'full' && <Check className="h-5 w-5" strokeWidth={3} />}
          {c?.level === 'min' && <Zap className="h-5 w-5" />}
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit} aria-label={`Modifier ${h.title}`}>
          <span className="flex items-center gap-1.5 font-semibold">{Icon && <Icon className="h-4 w-4 shrink-0 text-rouge" />}<span className="truncate">{h.title}</span></span>
          <span className="block text-sm text-muted num">{p.done}/{p.target} cette semaine{p.done >= p.min && p.done < p.target ? ' · objectif tenu' : ''}</span>
        </button>
        {!c && h.min_version && <button type="button" className="chip shrink-0" onClick={() => press(h, c, 'min')}><Zap className="h-3.5 w-3.5 text-rouge" />2 min</button>}
      </div>
      <div className="mt-2"><Gauge done={Math.min(p.done, p.target)} target={p.target} min={p.min} tone="rouge" /></div>
    </li>
  );
}
