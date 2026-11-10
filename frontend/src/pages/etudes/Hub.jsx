import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Brain, ChevronRight, Coins, Feather, Languages, Lightbulb, Mic, Play, Sparkles } from 'lucide-react';
import { useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { addDays, diffDays, shortDate, today } from '../../lib/dates';
import { bestFocusTime, dueLabel, firstSeen, heatmap, streakBy, studyNext } from '../../lib/study';
import { Button, Card, SectionTitle, Stat } from '../../components/ui';
import Ring from '../../components/Ring';
import FocusSession from '../../components/FocusSession';
import RecallSession from '../../components/RecallSession';
import { toast } from '../../components/toast';

const DAILY_GOAL = 90; // minutes d'étude visées par jour

const MODULES = [
  ['/revision', 'Cartes de révision', Feather], ['/lecture', 'Lecture', BookOpen], ['/etudes?onglet=oral', 'Prise de parole', Mic],
  ['/etudes?onglet=argument', 'Argumenter', Brain], ['/etudes?onglet=anglais', 'Anglais', Languages], ['/etudes?onglet=finance', 'Finance', Coins], ['/etudes?onglet=contenu', 'Contenu', Lightbulb],
];

/** Tableau de bord d'etude : quoi faire maintenant, ce qui arrive, et la regularite. */
export default function Hub({ onTab }) {
  const { data: courses = [] } = useRows('courses', { build: (q) => q.order('position') });
  const { data: chapters = [] } = useRows('chapters', { build: (q) => q.order('position') });
  const { data: assignments = [] } = useRows('assignments', { build: (q) => q.eq('done', false).order('due_on') });
  const { data: sessions = [] } = useRows('focus_sessions', { key: ['84j'], build: (q) => q.gte('started_at', addDays(today(), -83)) });
  const saveChapter = useSave('chapters');
  const saveAssignment = useSave('assignments');
  const autoCheck = useAutoCheck();
  const [focus, setFocus] = useState(null);
  const [recall, setRecall] = useState(null);

  const study = sessions.filter((s) => s.kind === 'etude');
  const todayMin = study.filter((s) => s.started_at.slice(0, 10) === today()).reduce((a, s) => a + s.minutes, 0);
  const target = DAILY_GOAL;
  const next = studyNext({ courses, chapters, assignments });
  const exams = courses.filter((c) => c.exam_on && c.exam_on >= today()).sort((a, b) => (a.exam_on < b.exam_on ? -1 : 1));
  const days = new Set(study.map((s) => s.started_at.slice(0, 10)));
  const studyStreak = streakBy((d) => days.has(d));
  const best = bestFocusTime(study);
  const week = study.filter((s) => s.started_at.slice(0, 10) >= addDays(today(), -6)).reduce((a, s) => a + s.minutes, 0);

  const start = (item) => {
    if (item.type === 'review') setRecall(item.chapter);
    else setFocus(item);
  };
  const afterFocus = (item, res) => {
    autoCheck('etude', todayMin + res.minutes);
    if (item?.type === 'learn' && res.reached === 'oui') {
      saveChapter.mutate(firstSeen(item.chapter));
      toast(`Chapitre vu. Premier rappel actif ${dueLabel(addDays(today(), 1))}.`);
    }
    if (item?.type === 'assignment' && res.reached === 'oui') {
      saveAssignment.mutate({ id: item.assignment.id, done: true });
      toast('Devoir terminé.');
    }
  };

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:space-y-0">
      <div className="space-y-5">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Ring value={todayMin / target} size={92}>
              <span className="text-sm font-bold num">{todayMin}<span className="text-[0.6rem] text-muted">/{target}</span></span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-rouge">Quoi étudier maintenant ?</p>
              {next[0] ? (
                <>
                  <p className="font-display text-xl font-bold leading-tight">{next[0].title}</p>
                  <p className="text-sm text-muted">{next[0].sub}</p>
                </>
              ) : <p className="font-display text-lg font-bold leading-tight">Rien d'urgent. Ajoute tes matières et tes devoirs pour que je t'aide à choisir.</p>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="lg" icon={Play} onClick={() => (next[0] ? start(next[0]) : setFocus({}))}>{next[0] ? 'Commencer' : 'Session libre'}</Button>
            <Button size="lg" variant="secondary" onClick={() => onTab(next[0] ? 'matieres' : 'matieres')}>Mes matières</Button>
          </div>
        </Card>

        {next.length > 1 && (
          <div>
            <SectionTitle>Ensuite</SectionTitle>
            <ul className="divide-y divide-line border-y border-line">
              {next.slice(1, 6).map((item) => (
                <li key={item.key}>
                  <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => start(item)}>
                    <span className="h-9 w-1.5 shrink-0" style={{ background: item.type === 'review' ? 'var(--rouge)' : item.type === 'assignment' ? 'var(--ink)' : 'var(--rouge-soft)' }} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.title}</span><span className="block truncate text-xs text-muted">{item.sub}</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted">Les révisions dues passent en premier, et je fais alterner les matières : c'est ce qui fixe le mieux.</p>
          </div>
        )}

        <Card className="p-4">
          <SectionTitle>Ta régularité <span className="font-normal text-muted">· 12 semaines</span></SectionTitle>
          <Heatmap sessions={study} />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Série" value={`${studyStreak} j`} tone="rouge" />
            <Stat label="7 jours" value={`${Math.floor(week / 60)} h ${String(week % 60).padStart(2, '0')}`} />
            <Stat label="Meilleur moment" value={best ? best[0].split(' ')[0] : '—'} sub={best ? `concentration ${best[1].toFixed(1).replace('.', ',')}/5` : 'après quelques sessions'} />
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        {exams.length > 0 && (
          <div>
            <SectionTitle>Examens</SectionTitle>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
              {exams.map((c) => {
                const list = chapters.filter((ch) => ch.course_id === c.id);
                const ok = list.filter((ch) => ch.status !== 'a_voir').length;
                return (
                  <div key={c.id} className="red-block min-w-[10rem] p-3">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white">{shortDate(c.exam_on)}</p>
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="font-display text-2xl font-extrabold num">J−{diffDays(c.exam_on, today())}</p>
                    <p className="text-xs opacity-80">{ok}/{list.length} chapitres vus</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <SectionTitle action={<button type="button" className="text-sm font-semibold text-rouge" onClick={() => onTab('devoirs')}>Tout voir</button>}>À rendre</SectionTitle>
          {!assignments.length ? <p className="text-sm text-muted">Aucun devoir en attente.</p> : (
            <ul className="space-y-1.5">
              {assignments.slice(0, 4).map((a) => (
                <li key={a.id} className="card flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate font-semibold">{a.title}</span>
                  <span className={diffDays(a.due_on, today()) <= 1 ? 'shrink-0 font-semibold text-rouge' : 'shrink-0 text-muted'}>{dueLabel(a.due_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card className="p-4">
          <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-rouge" />Ce qui marche vraiment</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li><b>Se tester</b> plutôt que relire : questions, page blanche.</li>
            <li><b>Espacer</b> : revoir à J+1, J+3, J+7, J+14, J+30.</li>
            <li><b>Alterner</b> les matières d'une session à l'autre.</li>
            <li className="text-muted">Relire et surligner donnent l'impression de savoir, sans faire retenir.</li>
          </ul>
        </Card>

        <div>
          <SectionTitle>Passion</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {MODULES.map(([to, label, Ico]) => (
              <Link key={to} to={to} className="card flex items-center gap-2 p-3 text-sm font-semibold transition hover:border-ink">
                <Ico className="h-4 w-4 text-rouge" />{label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {focus && (
        <FocusSession
          open
          courses={courses}
          preset={{ course_id: focus.course_id, goal: focus.type === 'learn' ? `Comprendre et résumer : ${focus.chapter.title}` : focus.type === 'assignment' ? `Avancer : ${focus.assignment.title}` : '', minutes: focus.minutes >= 45 ? 45 : 25 }}
          onClose={() => setFocus(null)}
          onDone={(res) => afterFocus(focus, res)}
        />
      )}
      {recall && <RecallSession chapter={recall} course={courses.find((c) => c.id === recall.course_id)} onClose={() => { setRecall(null); autoCheck('etude', todayMin + 20); }} />}
    </div>
  );
}

/** Carte de chaleur facon GitHub : une case par jour, plus foncee quand on a plus etudie. */
function Heatmap({ sessions }) {
  const cells = heatmap(sessions, 12);
  const shade = (m) => (m === 0 ? 'var(--paper-2)' : m < 30 ? 'color-mix(in srgb, var(--rouge) 30%, var(--paper))' : m < 90 ? 'color-mix(in srgb, var(--rouge) 65%, var(--paper))' : 'var(--rouge)');
  const weeks = Array.from({ length: 12 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  return (
    <div className="flex gap-[3px]" role="img" aria-label="Minutes d'étude par jour sur 12 semaines">
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-1 flex-col gap-[3px]">
          {w.map((c) => <span key={c.d} title={`${shortDate(c.d)} : ${c.m} min`} className="aspect-square w-full" style={{ background: shade(c.m), outline: c.d === today() ? '1.5px solid var(--ink)' : undefined }} />)}
        </div>
      ))}
    </div>
  );
}
