import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { BookMarked, Check, ChevronDown, ChevronLeft, Flame, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import PrayerMode from '../components/PrayerMode';
import Ring from '../components/Ring';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { useAutoCheck, useRecentChecks } from '../hooks/useLife';
import { fidelity } from '../lib/engine';
import { addDays, clock, DAY_LABELS, diffDays, duration, hhmm, longDate, shortDate, today, weekday } from '../lib/dates';
import { ACTS, BIBLE_BOOKS, FAST_KINDS, PRAYER_CATS } from '../data/esprit';
import { toast } from '../components/toast';
import { Button, Card, Chips, Empty, Field, IconButton, Input, SectionTitle, Select, Sheet, Stat, Tabs, Textarea } from '../components/ui';
import { PageHeader } from '../components/Layout';

const TABS = [['meditation', 'Méditation'], ['priere', 'Prière'], ['jeune', 'Jeûne'], ['versets', 'Versets'], ['intercession', 'Intercession']];

export default function Esprit() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') || 'meditation';
  const { data: habits = [] } = useRows('habits', { build: (q) => q.eq('archived', false).eq('domain', 'esprit').not('at_time', 'is', null) });
  const { data: checks = [] } = useRecentChecks();
  return (
    <div>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Plus</Link>
      <PageHeader kicker="Intimité avec Dieu" title="Esprit" sub="Méditer, prier, jeûner, retenir, intercéder." />
      {habits.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {habits.map((h) => {
            const f = fidelity(h, checks);
            return (
              <Card key={h.id} className="p-3">
                <p className="text-sm font-semibold">{h.title} <span className="num text-muted">{hhmm(h.at_time)}</span></p>
                <p className="font-display text-2xl font-extrabold num">{f ? `${f.onTime}/${f.due}` : '—'}</p>
                <p className="text-xs text-muted">à l'heure sur 14 jours</p>
              </Card>
            );
          })}
        </div>
      )}
      <Tabs tabs={TABS} value={tab} onChange={(v) => setParams({ onglet: v }, { replace: true })} />
      <div className="mt-5">
        {tab === 'meditation' && <Meditation />}
        {tab === 'priere' && <Prayer />}
        {tab === 'jeune' && <Fasting />}
        {tab === 'versets' && <Verses />}
        {tab === 'intercession' && <Intercession />}
      </div>
    </div>
  );
}

// ─── Méditation ────────────────────────────────────────────────────────────

const EMPTY_DEVOTION = { passage: '', verse: '', observation: '', application: '', prayer: '' };

function Meditation() {
  const { data: plans = [] } = useRows('bible_plans', { build: (q) => q.eq('active', true).order('created_at', { ascending: false }) });
  const { data: devotions = [] } = useRows('devotions', { build: (q) => q.order('day', { ascending: false }).order('created_at', { ascending: false }).limit(60 ) });
  const saveDevotion = useSave('devotions');
  const savePlan = useSave('bible_plans');
  const saveCard = useSave('cards');
  const autoCheck = useAutoCheck();
  const plan = plans[0];
  const todays = devotions.find((d) => d.day === today());
  const [form, setForm] = useState(EMPTY_DEVOTION);
  const [planOpen, setPlanOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [memorized, setMemorized] = useState(false);

  useEffect(() => {
    if (plan && !form.passage) setForm((f) => ({ ...f, passage: `${plan.book} ${Math.min(plan.current, plan.chapters)}` }));
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = () => saveDevotion.mutate(form, {
    onSuccess: () => {
      autoCheck('meditation');
      if (plan && form.passage.startsWith(plan.book) && plan.current <= plan.chapters) savePlan.mutate({ id: plan.id, current: plan.current + 1 });
      setForm(EMPTY_DEVOTION);
      toast('Méditation enregistrée ✓');
    },
  });
  const memorize = (d) => saveCard.mutate(
    { deck: 'versets', front: d.passage, back: d.verse, example: d.application.slice(0, 200) },
    { onSuccess: () => { setMemorized(true); toast('Ajouté à tes versets ✓'); } },
  );
  const days = new Set(devotions.map((d) => d.day));
  let streak = 0;
  for (let d = days.has(today()) ? today() : addDays(today(), -1); days.has(d); d = addDays(d, -1)) streak += 1;

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-4 p-4">
        {plan ? (
          <>
            <Ring value={(plan.current - 1) / plan.chapters} size={84}><span className="text-[0.7rem] font-bold num">{plan.current - 1}/{plan.chapters}</span></Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-rouge">Plan de lecture</p>
              <p className="font-display text-xl font-bold">{plan.current > plan.chapters ? `${plan.book} terminé` : `${plan.book} ${plan.current}`}</p>
              <p className="text-sm text-muted">{streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} de suite dans la Parole` : 'Un chapitre par jour.'}</p>
            </div>
          </>
        ) : <p className="flex-1 text-sm text-muted">Choisis un livre : l'app prépare chaque matin le chapitre suivant.</p>}
        <Button variant="secondary" size="sm" onClick={() => setPlanOpen(true)}>{plan ? 'Changer' : 'Choisir'}</Button>
      </Card>

      {todays ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-rouge"><Check className="h-5 w-5" /><p className="font-semibold">Méditation du jour écrite</p></div>
          <p className="mt-2 font-display text-lg font-bold">{todays.passage}</p>
          {todays.verse && <blockquote className="mt-1 border-l-4 border-rouge pl-3 italic">{todays.verse}</blockquote>}
          {todays.verse && !memorized && <Button className="mt-3" size="sm" variant="secondary" icon={BookMarked} onClick={() => memorize(todays)}>Mémoriser ce verset</Button>}
          {memorized && <p className="mt-3 text-sm font-semibold text-rouge">Ajouté à tes versets à mémoriser.</p>}
        </Card>
      ) : (
        <Card className="p-4">
          <SectionTitle>Journal É.O.A.P.</SectionTitle>
          <div className="space-y-3">
            <Field label="Passage"><Input value={form.passage} onChange={set('passage')} placeholder="Jean 15" /></Field>
            <Field label="É — Écriture" hint="Le verset qui te parle, recopié."><Textarea value={form.verse} onChange={set('verse')} rows={2} /></Field>
            <Field label="O — Observation" hint="Que dit le texte ? À qui, dans quel contexte ?"><Textarea value={form.observation} onChange={set('observation')} rows={3} /></Field>
            <Field label="A — Application" hint="Qu'est-ce que ça change concrètement aujourd'hui ?"><Textarea value={form.application} onChange={set('application')} rows={3} /></Field>
            <Field label="P — Prière" hint="Réponds à Dieu avec tes mots."><Textarea value={form.prayer} onChange={set('prayer')} rows={3} /></Field>
            <Button size="lg" className="w-full" loading={saveDevotion.isPending} disabled={!form.passage.trim()} onClick={submit}>Enregistrer ma méditation</Button>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle>Mes méditations</SectionTitle>
        {!devotions.length && <Empty title="Ton journal commence ici">Chaque méditation écrite reste : tu pourras relire ce que Dieu t'a dit au fil des années.</Empty>}
        <ul className="divide-y divide-line border-y border-line">
          {devotions.map((d) => (
            <li key={d.id}>
              <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 py-2.5 text-left" onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                <span><span className="font-semibold">{d.passage}</span> <span className="text-sm text-muted">· {longDate(d.day)}</span></span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${openId === d.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === d.id && (
                <div className="space-y-2 pb-3 text-sm">
                  {d.verse && <blockquote className="border-l-4 border-rouge pl-3 italic">{d.verse}</blockquote>}
                  {d.observation && <p><b>Observation.</b> {d.observation}</p>}
                  {d.application && <p><b>Application.</b> {d.application}</p>}
                  {d.prayer && <p><b>Prière.</b> {d.prayer}</p>}
                  {d.verse && <Button size="sm" variant="ghost" icon={BookMarked} onClick={() => memorize(d)}>Mémoriser</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} current={plan} />
    </div>
  );
}

function PlanSheet({ open, onClose, current }) {
  const save = useSave('bible_plans');
  const [book, setBook] = useState('Psaumes');
  const [from, setFrom] = useState(1);
  const chapters = BIBLE_BOOKS.find(([b]) => b === book)?.[1] || 1;
  const start = async () => {
    if (current) await save.mutateAsync({ id: current.id, active: false });
    save.mutate({ book, chapters, current: Math.min(Math.max(1, Math.round(Number(from)) || 1), chapters) }, { onSuccess: onClose });
  };
  return (
    <Sheet open={open} onClose={onClose} title="Plan de lecture">
      <div className="space-y-3">
        <Field label="Livre"><Select value={book} onChange={(e) => setBook(e.target.value)} options={BIBLE_BOOKS.map(([b, n]) => [b, `${b} (${n} ch.)`])} /></Field>
        <Field label="Commencer au chapitre"><Input type="number" inputMode="numeric" min={1} max={chapters} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <p className="text-sm text-muted">À un chapitre par jour : environ {Math.max(0, chapters - (Math.round(Number(from)) || 1) + 1)} jours.</p>
        <Button size="lg" className="w-full" onClick={start} loading={save.isPending}>Commencer ce plan</Button>
      </div>
    </Sheet>
  );
}

// ─── Prière ────────────────────────────────────────────────────────────────

function Prayer() {
  const autoCheck = useAutoCheck();
  const [praying, setPraying] = useState(false);
  const { data: requests = [] } = useRows('prayer_requests', { build: (q) => q.order('created_at', { ascending: false }) });
  const save = useSave('prayer_requests');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('personnel');
  const [answering, setAnswering] = useState(null);
  const [guide, setGuide] = useState(false);
  const open = requests.filter((r) => r.status === 'en_cours');
  const answered = requests.filter((r) => r.status === 'exauce').sort((a, b) => (a.answered_on < b.answered_on ? 1 : -1));

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    save.mutate({ title: title.trim(), category: cat || 'personnel' }, { onSuccess: () => { setTitle(''); toast('Sujet ajouté ✓'); } });
  };

  return (
    <div className="space-y-5">
      <Button size="lg" icon={Play} className="w-full" onClick={() => setPraying(true)}>Mode prière</Button>
      {praying && (
        <PrayerMode
          title="Prière"
          items={[
            ...ACTS.map((a) => ({ id: a.k, kicker: `${a.k} · ${a.t}`, title: a.t, body: a.q })),
            ...open.map((r) => ({ id: r.id, kicker: PRAYER_CATS.find(([k]) => k === r.category)?.[1] || 'Sujet', title: r.title, body: r.details, hint: `Tu portes ce sujet depuis le ${shortDate(r.created_at.slice(0, 10))}.` })),
          ]}
          onFinish={() => autoCheck('priere')}
          onClose={() => setPraying(false)}
        />
      )}
      <Card className="p-4">
        <button type="button" className="flex min-h-11 w-full items-center justify-between" onClick={() => setGuide(!guide)}>
          <span className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-rouge" /> Guide A.C.T.S.</span>
          <ChevronDown className={`h-4 w-4 transition ${guide ? 'rotate-180' : ''}`} />
        </button>
        {guide && (
          <ol className="mt-3 space-y-2">
            {ACTS.map((a) => (
              <li key={a.k} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-rouge font-display font-extrabold text-white">{a.k}</span>
                <span className="text-sm"><b>{a.t}.</b> {a.q}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <form onSubmit={add} className="space-y-2">
        <SectionTitle>Mes sujets de prière</SectionTitle>
        <div className="flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nouveau sujet…" maxLength={200} />
          <Button type="submit" icon={Plus} aria-label="Ajouter" />
        </div>
        <Chips options={PRAYER_CATS} value={cat} onChange={setCat} />
      </form>

      {!open.length && <Empty title="Aucun sujet en cours">Écris ce que tu portes. Tu verras un jour la réponse s'écrire en face.</Empty>}
      <ul className="divide-y divide-line border-y border-line">
        {open.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">{r.title}</p>
              <p className="text-xs text-muted">{PRAYER_CATS.find(([k]) => k === r.category)?.[1]} · depuis le {shortDate(r.created_at.slice(0, 10))}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setAnswering(r)}>Exaucé</Button>
          </li>
        ))}
      </ul>

      <div>
        <SectionTitle>Mur des exaucements <span className="font-normal text-muted">({answered.length})</span></SectionTitle>
        {!answered.length && <p className="text-sm text-muted">Chaque prière exaucée viendra s'afficher ici : un rappel de sa fidélité pour les jours de doute.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {answered.map((r) => (
            <div key={r.id} className="red-block p-4">
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">{shortDate(r.answered_on)} · après {Math.max(0, Math.round((new Date(r.answered_on) - new Date(r.created_at)) / 86400000))} j</p>
              <p className="mt-1 font-display text-lg font-bold break-words">{r.title}</p>
              {r.testimony && <p className="mt-1 text-sm opacity-90">{r.testimony}</p>}
            </div>
          ))}
        </div>
      </div>

      <AnswerSheet request={answering} onClose={() => setAnswering(null)} onSave={(fields) => save.mutate({ id: answering.id, status: 'exauce', ...fields }, { onSuccess: () => { setAnswering(null); toast('Gloire à Dieu ✓'); } })} />
    </div>
  );
}

function AnswerSheet({ request, onClose, onSave }) {
  const [testimony, setTestimony] = useState('');
  const [date, setDate] = useState(today());
  return (
    <Sheet open={!!request} onClose={onClose} title="Gloire à Dieu">
      <p className="mb-3 font-semibold">{request?.title}</p>
      <div className="space-y-3">
        <Field label="Exaucé le"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Mon témoignage" hint="Comment c'est arrivé. Tu le reliras."><Textarea value={testimony} onChange={(e) => setTestimony(e.target.value)} /></Field>
        <Button size="lg" className="w-full" onClick={() => { onSave({ testimony: testimony.trim(), answered_on: date }); setTestimony(''); }}>Ajouter au mur</Button>
      </div>
    </Sheet>
  );
}

// ─── Jeûne ─────────────────────────────────────────────────────────────────

function Fasting() {
  const { data: fasts = [] } = useRows('fasts', { build: (q) => q.order('starts_at', { ascending: false }).limit(40) });
  const save = useSave('fasts');
  const autoCheck = useAutoCheck();
  const [planning, setPlanning] = useState(false);
  const [, tick] = useState(0);
  const [journal, setJournal] = useState('');
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const current = fasts.find((f) => !f.ended_at && new Date(f.starts_at).getTime() <= now);
  const upcoming = fasts.filter((f) => !f.ended_at && new Date(f.starts_at).getTime() > now).reverse();
  const past = fasts.filter((f) => f.ended_at);
  const totalHours = past.reduce((s, f) => s + (new Date(f.ended_at) - new Date(f.starts_at)) / 3600000, 0);

  const breakFast = () => {
    const end = new Date();
    const completed = end >= new Date(current.ends_at) - 5 * 60000;
    save.mutate({ id: current.id, ended_at: end.toISOString(), completed, journal }, {
      onSuccess: () => { if (completed) autoCheck('jeune'); setJournal(''); },
    });
  };

  return (
    <div className="space-y-5">
      {current ? (() => {
        const s = new Date(current.starts_at).getTime();
        const e = new Date(current.ends_at).getTime();
        const done = now >= e;
        return (
          <div className="red-block p-5">
            <div className="flex items-center gap-5">
              <Ring value={(now - s) / (e - s)} size={112} stroke={9} tone="#fff" track="rgba(255,255,255,.3)"><Flame className="h-6 w-6" /></Ring>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Jeûne {FAST_KINDS[current.kind].label.toLowerCase()} en cours</p>
                <p className="font-display text-4xl font-extrabold num">{done ? 'Accompli' : clock((e - now) / 1000)}</p>
                <p className="text-sm opacity-80">{clock((now - s) / 1000)} écoulées · rupture à {hhmm(new Date(e).toTimeString())}</p>
              </div>
            </div>
            {current.intention && <p className="mt-4 border-l-4 border-white/70 pl-3 italic">{current.intention}</p>}
            {current.kind === 'sec' && <p className="mt-3 text-sm font-semibold">Jeûne sec : arrête si tu as des vertiges, et réhydrate-toi doucement à la rupture.</p>}
            <textarea className="input mt-4 !border-white/40 !bg-white/10 !text-white placeholder:!text-white/70" rows={2} placeholder="Ce que Dieu t'a montré pendant ce jeûne…" value={journal} onChange={(ev) => setJournal(ev.target.value)} />
            <button type="button" className="btn btn-lg mt-3 w-full bg-white font-bold text-rouge" onClick={breakFast}>{done ? 'Rompre mon jeûne' : 'Arrêter avant la fin'}</button>
          </div>
        );
      })() : (
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-display text-lg font-bold">Pas de jeûne en cours</p>
            <p className="text-sm text-muted">{upcoming[0] ? `Prochain : ${longDate(upcoming[0].starts_at.slice(0, 10))} à ${hhmm(new Date(upcoming[0].starts_at).toTimeString())}` : 'Planifie le prochain avec son intention.'}</p>
          </div>
          <Button icon={Plus} onClick={() => setPlanning(true)}>Planifier</Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Accomplis" value={past.filter((f) => f.completed).length} tone="rouge" />
        <Stat label="Heures offertes" value={Math.round(totalHours)} />
        <Stat label="Prévus" value={upcoming.length} />
      </div>

      {upcoming.length > 0 && (
        <div>
          <SectionTitle>À venir</SectionTitle>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {upcoming.map((f) => (
              <li key={f.id} className="py-2">
                <b>{longDate(f.starts_at.slice(0, 10))}</b> · {FAST_KINDS[f.kind].label} · {hhmm(new Date(f.starts_at).toTimeString())} → {hhmm(new Date(f.ends_at).toTimeString())}
                {f.intention && <p className="text-muted">{f.intention}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionTitle>Mes jeûnes</SectionTitle>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {past.map((f) => (
              <li key={f.id} className="py-2">
                <div className="flex justify-between gap-2">
                  <span><b>{shortDate(f.starts_at.slice(0, 10))}</b> · {FAST_KINDS[f.kind].label} · {duration((new Date(f.ended_at) - new Date(f.starts_at)) / 1000)}</span>
                  <span className={f.completed ? 'font-semibold text-rouge' : 'text-muted'}>{f.completed ? 'Accompli' : 'Interrompu'}</span>
                </div>
                {f.intention && <p className="text-muted">{f.intention}</p>}
                {f.journal && <p className="mt-1 italic">{f.journal}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <PlanFast open={planning} onClose={() => setPlanning(false)} onSave={(row) => save.mutate(row, { onSuccess: () => { setPlanning(false); toast('Jeûne planifié ✓'); } })} />
    </div>
  );
}

function PlanFast({ open, onClose, onSave }) {
  const [kind, setKind] = useState('partiel');
  const [day, setDay] = useState(addDays(today(), 1));
  const [from, setFrom] = useState('06:00');
  const [to, setTo] = useState('15:00');
  const [endDay, setEndDay] = useState(null);
  const [intention, setIntention] = useState('');
  const start = new Date(`${day}T${from}`);
  const end = new Date(`${endDay || day}T${to}`);
  const hours = (end - start) / 3600000;
  const tooLong = kind === 'sec' && hours > 24;
  return (
    <Sheet open={open} onClose={onClose} title="Planifier un jeûne">
      <div className="space-y-3">
        <Chips options={Object.entries(FAST_KINDS).map(([k, v]) => [k, v.label])} value={kind} onChange={(k) => {
          if (!k) return;
          setKind(k);
          if (k === 'total') { setFrom('18:00'); setTo('18:00'); setEndDay(addDays(day, 1)); } else { setEndDay(null); setFrom('06:00'); setTo(k === 'daniel' ? '20:00' : '15:00'); }
        }} />
        <p className="text-sm text-muted">{FAST_KINDS[kind].hint}</p>
        <Field label="Jour"><Input type="date" value={day} onChange={(e) => { setDay(e.target.value); if (endDay) setEndDay(addDays(e.target.value, 1)); }} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début"><Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label={endDay ? `Fin (${shortDate(endDay)})` : 'Rupture'}><Input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Field label="Intention" hint="Pour quoi, pour qui tu jeûnes."><Textarea value={intention} onChange={(e) => setIntention(e.target.value)} rows={2} /></Field>
        {hours > 0 && <p className="text-sm">Durée : <b className="num">{Math.round(hours * 10) / 10} h</b></p>}
        {tooLong && <p className="border-l-4 border-rouge bg-rouge-soft px-3 py-2 text-sm">Un jeûne sec ne doit pas dépasser 24 heures.</p>}
        <Button size="lg" className="w-full" disabled={!(hours > 0) || tooLong} onClick={() => onSave({ kind, starts_at: start.toISOString(), ends_at: end.toISOString(), intention: intention.trim() })}>Planifier</Button>
      </div>
    </Sheet>
  );
}

// ─── Versets ───────────────────────────────────────────────────────────────

function Verses() {
  const { data: cards = [] } = useRows('cards', { key: ['versets'], build: (q) => q.eq('deck', 'versets').order('created_at', { ascending: false }) });
  const due = cards.filter((c) => c.due_on <= today()).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Les versets à garder dans le cœur. Ils reviennent de moins en moins souvent à mesure que tu les sais. Mémorise-les depuis ta méditation.</p>
      <Link to="/revision" className="btn btn-primary btn-lg w-full">{due ? `Réviser mes cartes (${due} à voir)` : 'Voir mes cartes de révision'}</Link>
      {!cards.length && <Empty title="Aucun verset à mémoriser">Écris une méditation puis touche « Mémoriser ce verset ».</Empty>}
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id} className="card p-3"><p className="font-semibold">{c.front}</p><blockquote className="mt-1 border-l-4 border-rouge pl-3 italic">{c.back}</blockquote></li>
        ))}
      </ul>
    </div>
  );
}

// ─── Intercession tournante ────────────────────────────────────────────────

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** La liste du jour : les sujets du jour de la semaine, plus les deux oubliés depuis le plus longtemps. */
function todaysList(targets) {
  const wd = weekday(today());
  const base = targets.filter((t) => t.weekday == null || t.weekday === wd);
  const forgotten = targets
    .filter((t) => !base.includes(t) && (!t.last_prayed_on || diffDays(today(), t.last_prayed_on) >= 10))
    .sort((a, b) => ((a.last_prayed_on || '') < (b.last_prayed_on || '') ? -1 : 1))
    .slice(0, 2);
  return [...base, ...forgotten.map((t) => ({ ...t, forgotten: true }))];
}

function Intercession() {
  const { data: targets = [] } = useRows('intercession_targets', { build: (q) => q.eq('active', true).order('name') });
  const save = useSave('intercession_targets');
  const remove = useRemove('intercession_targets');
  const autoCheck = useAutoCheck();
  const [adding, setAdding] = useState(false);
  const [praying, setPraying] = useState(false);
  const todays = todaysList(targets);
  const prayed = todays.filter((t) => t.last_prayed_on === today()).length;

  const mark = (t, on = true) => save.mutate({ id: t.id, last_prayed_on: on ? today() : null });
  const toggle = (t) => {
    const done = t.last_prayed_on === today();
    mark(t, !done);
    if (!done && prayed + 1 === todays.length) autoCheck('intercession');
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Aujourd'hui, {DAY_LABELS[weekday(today())]}</h2>
          <span className="text-sm num text-muted">{prayed}/{todays.length}</span>
        </div>
        <p className="mb-3 text-sm text-muted">Une liste courte chaque jour, plus ceux que tu n'as pas portés depuis longtemps.</p>
        {todays.length > 0 && <Button className="mb-3 w-full" icon={Play} onClick={() => setPraying(true)}>Mode prière</Button>}
        {!todays.length && <p className="text-sm text-muted">Personne pour aujourd'hui. Ajoute des personnes ou des causes ci-dessous.</p>}
        <ul className="space-y-1.5">
          {todays.map((t) => {
            const done = t.last_prayed_on === today();
            return (
              <li key={t.id}>
                <button type="button" onClick={() => toggle(t)} className={clsx('flex min-h-14 w-full items-center gap-3 rounded-sm border p-3 text-left transition', done ? 'border-rouge bg-rouge-soft' : 'border-line bg-paper')}>
                  <span className="check !h-8 !w-8" data-state={done ? 'full' : undefined}>{done && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t.name}</span>
                    {t.forgotten && <span className="block text-xs font-semibold text-rouge">Pas porté depuis {t.last_prayed_on ? `${diffDays(today(), t.last_prayed_on)} jours` : 'longtemps'}</span>}
                    {t.notes && <span className="block text-sm text-muted">{t.notes}</span>}
                  </span>
                  {t.category && <span className="chip">{t.category}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div>
        <SectionTitle action={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Ajouter</Button>}>Ma rotation</SectionTitle>
        {[null, ...WEEK_ORDER].map((d) => {
          const list = targets.filter((t) => t.weekday === d);
          if (!list.length) return null;
          return (
            <div key={String(d)} className="mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{d == null ? 'Tous les jours' : DAY_LABELS[d]}</h3>
              <ul className="divide-y divide-line border-b border-line">
                {list.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 text-sm">{t.name}{t.notes && <span className="text-muted"> — {t.notes}</span>}</span>
                    <IconButton icon={Trash2} label={`Retirer ${t.name}`} className="!h-11 !w-11" onClick={() => remove.mutate(t.id, { onSuccess: () => toast('Retiré') })} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <AddTarget open={adding} onClose={() => setAdding(false)} onSave={(row) => save.mutate(row, { onSuccess: () => { setAdding(false); toast('Ajouté ✓'); } })} />
      {praying && (
        <PrayerMode
          title="Intercession"
          items={todays.map((t) => ({ id: t.id, kicker: t.category || 'Intercession', title: t.name, body: t.notes, hint: t.forgotten ? 'Tu ne l\'as pas porté depuis longtemps.' : undefined }))}
          onPrayed={(it) => mark(it)}
          onFinish={() => autoCheck('intercession')}
          onClose={() => setPraying(false)}
        />
      )}
    </div>
  );
}

function AddTarget({ open, onClose, onSave }) {
  const [f, setF] = useState({ name: '', category: '', weekday: String(weekday(today())), notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter à ma rotation">
      <div className="space-y-3">
        <Field label="Personne ou cause"><Input value={f.name} onChange={set('name')} autoFocus maxLength={100} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jour"><Select value={f.weekday} onChange={set('weekday')} options={[['', 'Tous les jours'], ...WEEK_ORDER.map((d) => [String(d), DAY_LABELS[d]])]} /></Field>
          <Field label="Cercle"><Input value={f.category} onChange={set('category')} placeholder="Famille, Église…" maxLength={40} /></Field>
        </div>
        <Field label="Ce que je demande pour elle / lui"><Textarea value={f.notes} onChange={set('notes')} rows={2} /></Field>
        <Button size="lg" className="w-full" disabled={!f.name.trim()} onClick={() => {
          onSave({ name: f.name.trim(), category: f.category.trim(), notes: f.notes.trim(), weekday: f.weekday === '' ? null : Number(f.weekday) });
          setF({ ...f, name: '', notes: '' });
        }}>Ajouter</Button>
      </div>
    </Sheet>
  );
}
