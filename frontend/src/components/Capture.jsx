import { useEffect, useRef, useState } from 'react';
import { Mic, Plus, Square } from 'lucide-react';
import { useSave } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { useJourneys } from '../hooks/useJourneys';
import { DOMAIN, KINDS } from '../data/domains';
import { toast } from './toast';
import { Button, Chips, Sheet, Textarea } from './ui';

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

/**
 * Capture en un tap : un bouton toujours visible, une zone de texte, c'est tout.
 * Type et domaine sont facultatifs : une idée non classée se range plus tard.
 */
export default function Capture() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [kind, setKind] = useState(null);
  const [domain, setDomain] = useState(null);
  const [shared, setShared] = useState(false);
  const [journey, setJourney] = useState(null);
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const save = useSave('entries');
  const { data: domains = [] } = useUserDomains();
  const mine = domains.filter((d) => d.active);
  const { data: journeys = [] } = useJourneys();
  const running = journeys.filter((j) => j.status === 'active');

  useEffect(() => () => rec.current?.stop(), []);

  const close = () => {
    rec.current?.stop();
    setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    await save.mutateAsync({ body: body.trim(), kind: kind || 'note', domain, shared, journey_id: journey });
    toast('Noté ✓');
    setBody(''); setKind(null); setDomain(null); setShared(false); setJourney(null);
    close();
  };

  // Dictée vocale quand le navigateur la propose ; sinon le bouton n'apparaît pas.
  const dictate = () => {
    if (listening) { rec.current?.stop(); return; }
    const r = new Recognition();
    r.lang = 'fr-FR';
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (ev) => {
      const text = Array.from(ev.results).slice(ev.resultIndex).map((x) => x[0].transcript).join(' ');
      setBody((b) => `${b}${b && !/\s$/.test(b) ? ' ' : ''}${text.trim()}`);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Noter une idée"
        data-tour="capture"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rouge text-white shadow-[0_4px_14px_rgba(200,16,46,0.4)] transition active:scale-95 md:bottom-8 md:right-8"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <Sheet open={open} onClose={close} title="Noter">
        <form onSubmit={submit} className="space-y-3">
          <Textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Une idée, une leçon, une victoire…"
            aria-label="Ce que je veux noter"
            enterKeyHint="done"
          />
          <div>
            <span className="field-label">Type (facultatif)</span>
            <Chips options={KINDS} value={kind} onChange={setKind} />
          </div>
          {mine.length > 0 && (
            <div>
              <span className="field-label">Domaine (facultatif)</span>
              <Chips options={mine.map((d) => [d.domain, DOMAIN[d.domain].name])} value={domain} onChange={setDomain} />
            </div>
          )}
          {running.length > 0 && (
            <div>
              <span className="field-label">Parcours (facultatif)</span>
              <Chips options={running.map((j) => [j.id, j.title.split(' — ')[0]])} value={journey} onChange={setJourney} />
            </div>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            Partager avec mon binôme
          </label>
          <div className="flex gap-2">
            {Recognition && (
              <Button variant={listening ? 'primary' : 'secondary'} size="lg" icon={listening ? Square : Mic} onClick={dictate} aria-label={listening ? 'Arrêter la dictée' : 'Dicter'}>
                {listening ? 'Stop' : 'Dicter'}
              </Button>
            )}
            <Button type="submit" size="lg" className="flex-1" loading={save.isPending} disabled={!body.trim()}>Enregistrer</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
