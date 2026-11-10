import { useState } from 'react';
import { Brain, ChevronDown, Eye, MessageCircleQuestion, Plus, Trash2, Wand2 } from 'lucide-react';
import { useBulk, useRemove, useRows, useSave } from '../../hooks/useData';
import { diffDays, longDate, shortDate, today } from '../../lib/dates';
import { dueLabel, firstSeen, revisionPlan, stepLabel } from '../../lib/study';
import { Button, Empty, Field, IconButton, Input, Sheet, Textarea } from '../../components/ui';
import RecallSession from '../../components/RecallSession';
import ChapterQuestions from '../../components/ChapterQuestions';
import { toast } from '../../components/toast';

/**
 * Matieres et chapitres. Chaque chapitre suit un cycle :
 * a voir -> vu (premier passage) -> rappels actifs espaces -> maitrise.
 */
export default function Courses() {
  const { data: courses = [] } = useRows('courses', { build: (q) => q.order('position').order('name') });
  const { data: chapters = [] } = useRows('chapters', { build: (q) => q.order('position') });
  const saveCourse = useSave('courses');
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{courses.length} matière{courses.length > 1 ? 's' : ''}</p>
        <Button size="sm" icon={Plus} onClick={() => setAdding(true)} data-tour="ajout-matiere">Matière</Button>
      </div>
      {!courses.length && (
        <Empty title="Ajoute ta première matière">
          Puis ses chapitres. Avec une date d'examen, Davina répartit les nouveaux chapitres jusqu'à l'examen, puis programme tes rappels actifs.
        </Empty>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} chapters={chapters.filter((ch) => ch.course_id === c.id)} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
        ))}
      </div>
      <NewCourse open={adding} onClose={() => setAdding(false)} onSave={(row) => saveCourse.mutate({ ...row, position: courses.length }, { onSuccess: () => setAdding(false) })} />
    </div>
  );
}

function CourseCard({ course, chapters, open, onToggle }) {
  const saveCourse = useSave('courses');
  const saveChapter = useSave('chapters');
  const removeChapter = useRemove('chapters');
  const removeCourse = useRemove('courses', { also: ['chapters'] });
  const bulk = useBulk('chapters');
  const [title, setTitle] = useState('');
  const [recall, setRecall] = useState(null);
  const [feynman, setFeynman] = useState(null);
  const [questions, setQuestions] = useState(null);
  const count = (s) => chapters.filter((c) => c.status === s).length;
  const due = chapters.filter((c) => c.next_review && c.next_review <= today()).length;
  const n = chapters.length || 1;

  const add = (e) => {
    e.preventDefault();
    // Plusieurs chapitres d'un coup : un par ligne ou separes par « ; ».
    title.split(/[\n;]/).map((t) => t.trim()).filter(Boolean)
      .forEach((t, i) => saveChapter.mutate({ course_id: course.id, title: t, position: chapters.length + i }));
    setTitle('');
  };
  const plan = () => {
    const rows = revisionPlan(chapters.filter((c) => c.status === 'a_voir'), course.exam_on)
      .map((r) => ({ ...r, course_id: course.id, title: chapters.find((x) => x.id === r.id).title }));
    bulk.mutate({ rows }, { onSuccess: () => toast(`${rows.length} chapitres répartis jusqu'à l'examen`) });
  };

  return (
    <div className="card self-start">
      <button type="button" className="w-full p-3 text-left" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">{course.name}</span>
          {due > 0 && <span className="chip border-rouge text-rouge">{due} à réviser</span>}
          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="mt-2 flex h-2 w-full" aria-label="Avancement">
          <span style={{ width: `${(count('revise') / n) * 100}%`, background: 'var(--rouge)' }} />
          <span style={{ width: `${(count('vu') / n) * 100}%`, background: 'color-mix(in srgb, var(--rouge) 45%, var(--paper))' }} />
          <span className="flex-1 bg-paper-2" />
        </div>
        <p className="mt-1 text-xs text-muted">
          {count('revise')} maîtrisés · {count('vu')} en révision · {count('a_voir')} à voir
          {course.exam_on && ` · examen ${dueLabel(course.exam_on)}`}
        </p>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Date d'examen" className="min-w-[10rem] flex-1"><Input type="date" value={course.exam_on || ''} onChange={(e) => saveCourse.mutate({ id: course.id, exam_on: e.target.value || null })} /></Field>
            <Button variant="secondary" icon={Wand2} disabled={!course.exam_on || !count('a_voir')} onClick={plan}>Plan d'examen</Button>
          </div>
          {course.exam_on && diffDays(course.exam_on, today()) > 0 && (
            <p className="text-xs text-muted">Le plan étale les chapitres à voir jusqu'au {longDate(course.exam_on)}. Chaque chapitre vu entre ensuite dans le cycle de rappels.</p>
          )}

          <ul className="divide-y divide-line">
            {chapters.map((ch) => (
              <li key={ch.id} className="py-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{ch.title}</span>
                    <span className="block text-xs text-muted">
                      {stepLabel(ch)}
                      {ch.next_review && ` · rappel ${dueLabel(ch.next_review)}`}
                      {ch.status === 'a_voir' && ch.planned_on && ` · prévu le ${shortDate(ch.planned_on)}`}
                      {ch.confidence && ` · confiance ${ch.confidence}/5`}
                    </span>
                  </span>
                  <IconButton icon={Trash2} label="Supprimer" className="h-8 w-8" onClick={() => removeChapter.mutate(ch.id)} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ch.status === 'a_voir'
                    ? <button type="button" className="chip" onClick={() => { saveChapter.mutate(firstSeen(ch)); toast('Vu. Premier rappel demain.'); }}><Eye className="h-3.5 w-3.5" />Je l'ai vu</button>
                    : <button type="button" className="chip" aria-pressed={!!ch.next_review && ch.next_review <= today()} onClick={() => setRecall(ch)}><Brain className="h-3.5 w-3.5" />Rappel actif</button>}
                  <button type="button" className="chip" onClick={() => setFeynman(ch)}>{ch.explanation ? '✓ ' : ''}Expliquer simplement</button>
                  <button type="button" className="chip" onClick={() => setQuestions(ch)}><MessageCircleQuestion className="h-3.5 w-3.5" />Questions</button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={add} className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapitre (plusieurs : séparés par ;)" />
            <Button type="submit" variant="ink" icon={Plus} aria-label="Ajouter" />
          </form>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeCourse.mutate(course.id)}>Supprimer la matière</Button>
        </div>
      )}

      {recall && <RecallSession chapter={recall} course={course} onClose={() => setRecall(null)} />}
      {feynman && <FeynmanSheet chapter={feynman} onClose={() => setFeynman(null)} onSave={(explanation) => saveChapter.mutate({ id: feynman.id, explanation }, { onSuccess: () => { toast('Explication gardée'); setFeynman(null); } })} />}
      {questions && (
        <Sheet open onClose={() => setQuestions(null)} title={`Questions — ${questions.title}`} wide>
          <p className="mb-3 text-sm text-muted">Écris des questions comme celles de l'examen. Elles servent au rappel actif de ce chapitre.</p>
          <ChapterQuestions courseId={course.id} chapterId={questions.id} />
        </Sheet>
      )}
    </div>
  );
}

/** Technique Feynman : si je ne sais pas l'expliquer simplement, je ne l'ai pas compris. */
function FeynmanSheet({ chapter, onClose, onSave }) {
  const [text, setText] = useState(chapter.explanation || '');
  return (
    <Sheet open onClose={onClose} title="Expliquer simplement" wide>
      <p className="mb-1 font-display text-xl font-bold">{chapter.title}</p>
      <ol className="mb-3 space-y-1 text-sm text-muted">
        <li>1. Explique-le comme à un collégien de 12 ans, sans jargon.</li>
        <li>2. Là où tu bloques ou deviens floue : c'est ce que tu n'as pas compris. Retourne au cours.</li>
        <li>3. Simplifie encore, avec un exemple ou une image.</li>
      </ol>
      <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="En gros, ce chapitre dit que…" />
      <p className="mt-1 text-xs text-muted">Astuce : explique-le à voix haute dans l'onglet Oral, ça entraîne aussi ta prise de parole.</p>
      <Button className="mt-3 w-full" disabled={!text.trim()} onClick={() => onSave(text)}>Garder mon explication</Button>
    </Sheet>
  );
}

function NewCourse({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [exam, setExam] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle matière">
      <div className="space-y-3">
        <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Date d'examen (facultatif)"><Input type="date" value={exam} onChange={(e) => setExam(e.target.value)} /></Field>
        <Button className="w-full" disabled={!name.trim()} onClick={() => { onSave({ name: name.trim(), exam_on: exam || null }); setName(''); setExam(''); }}>Ajouter</Button>
      </div>
    </Sheet>
  );
}
