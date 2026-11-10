import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useRows, useSave } from '../hooks/useData';
import { afterReview, reviewCard, SPACING } from '../lib/study';
import { minutesLabel, shortDate } from '../lib/dates';
import { toast } from './toast';
import { Button, Field, Input, Scale, Sheet, Textarea } from './ui';

/**
 * Seance de rappel actif sur un chapitre :
 * - s'il a des questions : on y repond de tete, puis on verifie ;
 * - sinon : « page blanche », on ecrit tout ce dont on se souvient, puis on
 *   compare au cours et on transforme les oublis en questions ;
 * - enfin, la confiance (1 a 5) fixe la prochaine revision (J+1, J+3, J+7…).
 */
export default function RecallSession({ chapter, course, onClose }) {
  const { data: cards = [] } = useRows('cards', { key: ['cours', chapter.course_id, chapter.id], build: (q) => q.eq('deck', 'cours').eq('chapter_id', chapter.id) });
  const saveCard = useSave('cards');
  const saveChapter = useSave('chapters');
  const [phase, setPhase] = useState(null); // 'cards' | 'blank' | 'gaps' | 'confidence'
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState(0);
  const [blank, setBlank] = useState('');
  const [q, setQ] = useState({ front: '', back: '' });
  const [conf, setConf] = useState(null);
  const [startedAt] = useState(Date.now());
  const current = phase || (cards.length ? 'cards' : 'blank');
  const card = cards[i];

  const answer = (ok) => {
    saveCard.mutate(reviewCard(card, ok));
    if (ok) setScore(score + 1);
    setShown(false);
    if (i + 1 >= cards.length) setPhase('confidence'); else setI(i + 1);
  };
  const addQuestion = (e) => {
    e.preventDefault();
    if (!q.front.trim()) return;
    saveCard.mutate({ deck: 'cours', course_id: chapter.course_id, chapter_id: chapter.id, front: q.front.trim(), back: q.back.trim() });
    setQ({ front: '', back: '' });
    toast('Question ajoutée');
  };
  const done = () => {
    const update = afterReview(chapter, conf);
    saveChapter.mutate(update, {
      onSuccess: () => {
        toast(update.status === 'revise' ? 'Chapitre maîtrisé.' : `Prochaine révision : ${shortDate(update.next_review)} (${minutesLabel(Math.max(1, Math.round((Date.now() - startedAt) / 60000)))} de travail)`);
        onClose();
      },
    });
  };

  return (
    <Sheet open onClose={onClose} title="Rappel actif" wide>
      <p className="text-xs font-bold uppercase tracking-wider text-rouge">{course?.name}</p>
      <h2 className="mb-4 font-display text-2xl font-extrabold leading-tight">{chapter.title}</h2>

      {current === 'cards' && card && (
        <div className="card p-5">
          <p className="mb-3 text-xs text-muted">Question {i + 1}/{cards.length} · réponds de tête, à voix haute ou par écrit</p>
          <p className="font-display text-xl font-bold">{card.front}</p>
          {shown ? (
            <>
              <p className="mt-4 border-t border-line pt-3">{card.back || '—'}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" icon={X} onClick={() => answer(false)}>Raté</Button>
                <Button variant="primary" icon={Check} onClick={() => answer(true)}>Je savais</Button>
              </div>
            </>
          ) : <Button className="mt-5 w-full" variant="secondary" onClick={() => setShown(true)}>Voir la réponse</Button>}
        </div>
      )}

      {current === 'blank' && (
        <div className="space-y-3">
          <p className="border-l-4 border-rouge bg-paper-2 p-3 text-sm"><b>La page blanche.</b> Ferme ton cours. Écris tout ce dont tu te souviens : idées clés, définitions, schémas, exemples. L'effort pour retrouver, c'est ce qui fixe la mémoire.</p>
          <Textarea rows={8} value={blank} onChange={(e) => setBlank(e.target.value)} placeholder="Tout ce qui me revient…" />
          <Button className="w-full" disabled={blank.trim().length < 10} onClick={() => setPhase('gaps')}>J'ai tout vidé, je compare au cours</Button>
        </div>
      )}

      {current === 'gaps' && (
        <div className="space-y-3">
          <p className="text-sm">Ouvre ton cours. Ce que tu avais oublié ou confondu devient une question : la prochaine fois, tu te testeras dessus.</p>
          <form onSubmit={addQuestion} className="space-y-2">
            <Field label="Question"><Input value={q.front} onChange={(e) => setQ({ ...q, front: e.target.value })} placeholder="Quelles sont les conditions de validité d'un contrat ?" /></Field>
            <Field label="Réponse"><Textarea rows={2} value={q.back} onChange={(e) => setQ({ ...q, back: e.target.value })} /></Field>
            <Button type="submit" variant="secondary" icon={Plus} className="w-full">Ajouter la question</Button>
          </form>
          <Button className="w-full" onClick={() => setPhase('confidence')}>Continuer</Button>
        </div>
      )}

      {current === 'confidence' && (
        <div className="space-y-4">
          {cards.length > 0 && <p className="font-display text-xl font-bold">{score}/{cards.length} réponses justes</p>}
          <Field label="Je maîtrise ce chapitre…">
            <Scale value={conf} onChange={setConf} tone="rouge" labels={['Pas du tout', 'Un peu', 'Moyennement', 'Bien', 'Parfaitement']} />
          </Field>
          <p className="text-xs text-muted">
            À 3 ou plus, la prochaine révision s'éloigne ({SPACING.map((d) => `J+${d}`).join(', ')}). En dessous, on revoit demain.
          </p>
          <Button className="w-full" disabled={!conf} onClick={done}>Planifier la prochaine révision</Button>
        </div>
      )}
    </Sheet>
  );
}
