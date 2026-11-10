import { useState } from 'react';
import { ChevronDown, Shuffle } from 'lucide-react';
import { useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { shortDate } from '../../lib/dates';
import { DEBATE_TOPICS } from '../../data/savoir';
import { Button, Card, Field, IconButton, Input, SectionTitle, Textarea } from '../../components/ui';

const EMPTY = { topic: '', thesis: '', args: ['', '', ''], objection: '', rebuttal: '', conclusion: '' };

/**
 * Atelier d'argumentation : la structure classique d'un argumentaire, a
 * remplir en 30 minutes. L'objection la plus forte est obligatoire : c'est
 * elle qui fait progresser.
 */
export default function Argument() {
  const { data: list = [] } = useRows('arguments', { build: (q) => q.order('created_at', { ascending: false }).limit(100) });
  const save = useSave('arguments');
  const autoCheck = useAutoCheck();
  const [f, setF] = useState({ ...EMPTY, topic: DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)] });
  const [openId, setOpenId] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setArg = (i) => (e) => setF({ ...f, args: f.args.map((a, j) => (i === j ? e.target.value : a)) });
  const complete = f.thesis.trim() && f.args.filter((a) => a.trim()).length >= 2 && f.objection.trim();

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-start gap-2">
          <Field label="Sujet" className="flex-1"><Textarea value={f.topic} onChange={set('topic')} rows={2} /></Field>
          <IconButton icon={Shuffle} label="Autre sujet" className="mt-5" onClick={() => setF({ ...f, topic: DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)] })} />
        </div>
        <div className="mt-3 space-y-3">
          <Field label="1. Ma thèse" hint="Ta position, en une phrase claire."><Input value={f.thesis} onChange={set('thesis')} /></Field>
          {f.args.map((a, i) => (
            <Field key={i} label={`${i + 2}. Argument ${i + 1}`} hint={i === 0 ? 'Une idée + un exemple concret ou un chiffre.' : undefined}>
              <Textarea value={a} onChange={setArg(i)} rows={2} />
            </Field>
          ))}
          <Field label="5. L'objection la plus forte" hint="Ce que dirait quelqu'un d'intelligent qui n'est pas d'accord."><Textarea value={f.objection} onChange={set('objection')} rows={2} /></Field>
          <Field label="6. Ma réponse"><Textarea value={f.rebuttal} onChange={set('rebuttal')} rows={2} /></Field>
          <Field label="7. Conclusion" hint="Reprends la thèse et ouvre."><Textarea value={f.conclusion} onChange={set('conclusion')} rows={2} /></Field>
          <Button className="w-full" disabled={!complete} loading={save.isPending} onClick={() => save.mutate(
            { ...f, args: f.args.filter((a) => a.trim()) },
            { onSuccess: () => { autoCheck('argument', null); setF({ ...EMPTY, topic: DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)] }); } },
          )}>Enregistrer l'argumentaire</Button>
          <p className="text-center text-xs text-muted">Ensuite, défends-le à voix haute dans l'onglet Oral.</p>
        </div>
      </Card>

      {list.length > 0 && (
        <div>
          <SectionTitle>Mes argumentaires</SectionTitle>
          <ul className="divide-y divide-line border-y border-line">
            {list.map((a) => (
              <li key={a.id}>
                <button type="button" className="flex w-full items-center justify-between gap-2 py-2.5 text-left" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                  <span><span className="font-semibold">{a.topic}</span> <span className="text-xs text-muted">{shortDate(a.created_at.slice(0, 10))}</span></span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${openId === a.id ? 'rotate-180' : ''}`} />
                </button>
                {openId === a.id && (
                  <div className="space-y-1.5 pb-3 text-sm">
                    <p><b>Thèse.</b> {a.thesis}</p>
                    {a.args.map((x, i) => <p key={i}><b>Argument {i + 1}.</b> {x}</p>)}
                    <p><b>Objection.</b> {a.objection}</p>
                    {a.rebuttal && <p><b>Réponse.</b> {a.rebuttal}</p>}
                    {a.conclusion && <p><b>Conclusion.</b> {a.conclusion}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
