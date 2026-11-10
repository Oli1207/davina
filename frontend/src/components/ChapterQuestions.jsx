import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { toast } from './toast';
import { Button, Field, IconButton, Input, Textarea } from './ui';

/** Les questions d'un chapitre (comme celles de l'examen) : elles servent au rappel actif. */
export default function ChapterQuestions({ courseId, chapterId }) {
  const { data: cards = [] } = useRows('cards', { key: ['cours', courseId, chapterId], build: (q) => q.eq('deck', 'cours').eq('chapter_id', chapterId).order('created_at') });
  const save = useSave('cards');
  const remove = useRemove('cards');
  const [f, setF] = useState({ front: '', back: '' });
  const add = (e) => {
    e.preventDefault();
    if (!f.front.trim()) return;
    save.mutate({ deck: 'cours', course_id: courseId, chapter_id: chapterId, front: f.front.trim(), back: f.back.trim() }, { onSuccess: () => { setF({ front: '', back: '' }); toast('Question ajoutée ✓'); } });
  };
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line border-y border-line">
        {cards.map((c) => (
          <li key={c.id} className="flex items-start gap-2 py-2">
            <span className="min-w-0 flex-1"><span className="block font-semibold break-words">{c.front}</span><span className="block text-sm text-muted break-words">{c.back || '—'}</span></span>
            <IconButton icon={Trash2} label="Supprimer la question" className="!h-11 !w-11" onClick={() => remove.mutate(c.id)} />
          </li>
        ))}
        {!cards.length && <li className="py-3 text-sm text-muted">Aucune question pour ce chapitre.</li>}
      </ul>
      <form onSubmit={add} className="space-y-2">
        <Field label="Question"><Input value={f.front} onChange={(e) => setF({ ...f, front: e.target.value })} maxLength={300} /></Field>
        <Field label="Réponse"><Textarea rows={2} value={f.back} onChange={(e) => setF({ ...f, back: e.target.value })} maxLength={1000} /></Field>
        <Button type="submit" variant="secondary" icon={Plus} className="w-full" disabled={!f.front.trim()}>Ajouter la question</Button>
      </form>
    </div>
  );
}
