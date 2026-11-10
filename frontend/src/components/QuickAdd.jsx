import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Droplet, Feather, HandHeart, HeartHandshake, Lightbulb, Mic, NotebookPen, Plus, Siren, Square, Timer } from 'lucide-react';
import { useRows, useSave } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { useJourneys } from '../hooks/useJourneys';
import { DOMAIN, KINDS } from '../data/domains';
import { addDays, today } from '../lib/dates';
import { toast } from './toast';
import { Button, Chips, Field, Input, Sheet, Textarea } from './ui';

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

/**
 * Bouton + flottant : capturer en deux taps, où que l'on soit dans l'app.
 * Les captures rapides s'écrivent directement ; les actions plus longues mènent à leur écran.
 */
const ACTIONS = [
  { key: 'idee', label: 'Une idée', icon: Lightbulb },
  { key: 'mot', label: 'Un mot', icon: Feather },
  { key: 'priere', label: 'Sujet de prière', icon: HandHeart },
  { key: 'devoir', label: 'Un devoir', icon: NotebookPen },
  { key: 'eau', label: '+1 verre d\'eau', icon: Droplet },
  { key: 'sos', label: 'SOS envie', icon: Siren, to: '/corps?onglet=sucre&sos=1' },
  { key: 'lecture', label: 'Pages lues', icon: BookOpen },
  { key: 'rencontre', label: 'Une rencontre', icon: HeartHandshake, to: '/service?onglet=terrain' },
  { key: 'focus', label: 'Étudier', icon: Timer, to: '/etudes?onglet=plan' },
];

export default function QuickAdd() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const { data: log } = useRows('day_logs', { key: [today()], build: (q) => q.eq('day', today()) });
  const saveLog = useSave('day_logs', { onConflict: 'user_id,day' });
  const close = () => { setOpen(false); setForm(null); };

  const pick = (a) => {
    if (a.to) { close(); navigate(a.to); return; }
    if (a.key === 'eau') {
      const water = Math.min(50, (log?.[0]?.water || 0) + 1);
      saveLog.mutate({ day: today(), water });
      toast(`${water} verre${water > 1 ? 's' : ''} d'eau aujourd'hui`);
      close();
      return;
    }
    setForm(a.key);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Ajouter rapidement"
        data-tour="plus"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rouge text-white shadow-[0_4px_14px_rgba(200,16,46,0.4)] transition active:scale-95 md:bottom-8 md:right-8"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <Sheet open={open} onClose={close} title={form ? ACTIONS.find((a) => a.key === form).label : 'Ajouter rapidement'}>
        {!form && (
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <button key={a.key} type="button" onClick={() => pick(a)} className="card flex min-h-24 flex-col items-center justify-center gap-2 px-1 py-4 text-center text-sm font-semibold transition active:scale-[0.97]">
                <a.icon className="h-6 w-6 text-rouge" />
                {a.label}
              </button>
            ))}
          </div>
        )}
        {form === 'idee' && <NoteForm onDone={close} />}
        {form === 'mot' && <QuickForm table="cards" fields={[['front', 'Le mot'], ['back', 'Sa définition']]} extra={{ deck: 'mots' }} done="Mot ajouté à ton carnet" onDone={close} />}
        {form === 'priere' && <QuickForm table="prayer_requests" fields={[['title', 'Je prie pour…']]} extra={{}} done="Sujet ajouté" onDone={close} />}
        {form === 'devoir' && <QuickForm table="assignments" fields={[['title', 'Quoi'], ['due_on', 'À rendre le', 'date']]} extra={{ est_min: 60 }} defaults={{ due_on: addDays(today(), 7) }} done="Devoir ajouté" onDone={close} />}
        {form === 'lecture' && <PagesForm onDone={close} />}
      </Sheet>
    </>
  );
}

function QuickForm({ table, fields, extra, defaults = {}, done, onDone }) {
  const save = useSave(table);
  const [v, setV] = useState(() => Object.fromEntries(fields.map(([k]) => [k, defaults[k] || ''])));
  const first = fields[0][0];
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      if (!v[first].trim()) return;
      save.mutate({ ...extra, ...v, [first]: v[first].trim() }, { onSuccess: () => { toast(done); onDone(); } });
    }}>
      {fields.map(([k, label, type], i) => (
        <Field key={k} label={label}><Input type={type || 'text'} value={v[k]} autoFocus={i === 0} maxLength={200} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
      ))}
      <Button type="submit" size="lg" className="w-full" loading={save.isPending} disabled={!v[first].trim()}>Garder</Button>
    </form>
  );
}

/** Pages lues : on choisit le livre en cours et on dit combien de pages. */
function PagesForm({ onDone }) {
  const navigate = useNavigate();
  const { data: books = [] } = useRows('books', { key: ['en-cours'], build: (q) => q.eq('status', 'reading').order('created_at', { ascending: false }) });
  const save = useSave('reading_logs', { also: ['books'] });
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState('10');
  const chosen = book || books[0]?.id;
  const n = Math.round(Number(pages));

  if (!books.length) {
    return (
      <div className="space-y-3">
        <p className="text-muted">Tu n'as pas de livre en cours. Ajoute-en un, puis note tes pages ici.</p>
        <Button size="lg" className="w-full" onClick={() => { onDone(); navigate('/lecture'); }}>Ouvrir mes lectures</Button>
      </div>
    );
  }
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      if (!(n > 0 && n < 5000)) return;
      save.mutate({ book_id: chosen, day: today(), pages: n }, { onSuccess: () => { toast(`+${n} pages ✓`); onDone(); } });
    }}>
      {books.length > 1 && <Chips options={books.map((b) => [b.id, b.title])} value={chosen} onChange={(v) => v && setBook(v)} />}
      {books.length === 1 && <p className="font-semibold">{books[0].title}</p>}
      <div className="grid grid-cols-4 gap-2">{[5, 10, 20, 30].map((x) => <Button key={x} type="button" variant="secondary" size="sm" onClick={() => setPages(String(x))}>+{x}</Button>)}</div>
      <Field label="Pages lues"><Input type="number" inputMode="numeric" min="1" max="4999" value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
      <Button type="submit" size="lg" className="w-full" loading={save.isPending} disabled={!(n > 0 && n < 5000)}>Garder</Button>
    </form>
  );
}

/** Une note libre : l'idée, la leçon, la victoire du moment. Type, domaine, parcours sont facultatifs. */
function NoteForm({ onDone }) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState(null);
  const [domain, setDomain] = useState(null);
  const [shared, setShared] = useState(false);
  const [journey, setJourney] = useState(null);
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const save = useSave('entries');
  const { data: domains = [] } = useUserDomains();
  const { data: journeys = [] } = useJourneys();
  const mine = domains.filter((d) => d.active);
  const running = journeys.filter((j) => j.status === 'active');

  useEffect(() => () => rec.current?.stop(), []);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    rec.current?.stop();
    await save.mutateAsync({ body: body.trim(), kind: kind || 'note', domain, shared, journey_id: journey });
    toast('Noté ✓');
    onDone();
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
    <form onSubmit={submit} className="space-y-3">
      <Textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="Une idée, une leçon, une victoire…" aria-label="Ce que je veux noter" enterKeyHint="done" />
      <div><span className="field-label">Type (facultatif)</span><Chips options={KINDS} value={kind} onChange={setKind} /></div>
      {mine.length > 0 && <div><span className="field-label">Domaine (facultatif)</span><Chips options={mine.map((d) => [d.domain, DOMAIN[d.domain].name])} value={domain} onChange={setDomain} /></div>}
      {running.length > 0 && <div><span className="field-label">Parcours (facultatif)</span><Chips options={running.map((j) => [j.id, j.title.split(' — ')[0]])} value={journey} onChange={setJourney} /></div>}
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
  );
}
