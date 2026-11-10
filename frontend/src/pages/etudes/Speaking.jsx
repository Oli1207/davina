import { useEffect, useRef, useState } from 'react';
import { Mic, Shuffle, Square, Trash2 } from 'lucide-react';
import { useRemove, useRows, useSave } from '../../hooks/useData';
import { useAutoCheck } from '../../hooks/useLife';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/auth';
import { clock, shortDate } from '../../lib/dates';
import { SPEECH_CRITERIA, SPEECH_KINDS, SPEECH_PROMPTS } from '../../data/savoir';
import { Button, Card, Chips, ErrorNote, Field, IconButton, Scale, SectionTitle, Textarea } from '../../components/ui';
import { LineChart } from '../../components/Chart';

/**
 * Prise de parole : s'enregistrer, se reecouter, s'evaluer sur 6 criteres.
 * L'audio part dans le bucket prive « paroles », un dossier par utilisatrice.
 */
export default function Speaking() {
  const { data: speeches = [] } = useRows('speeches', { build: (q) => q.order('created_at', { ascending: false }).limit(60) });
  const save = useSave('speeches');
  const remove = useRemove('speeches');
  const autoCheck = useAutoCheck();
  const userId = useAuth((s) => s.session?.user.id);
  const [topic, setTopic] = useState(SPEECH_PROMPTS[0]);
  const [kind, setKind] = useState('impro');
  const [recording, setRecording] = useState(null); // { blob, url, sec }
  const [scores, setScores] = useState({});
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [criterion, setCriterion] = useState('clarity');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let audio_path = null;
      if (recording?.blob) {
        const ext = recording.blob.type.includes('mp4') ? 'm4a' : 'webm';
        audio_path = `${userId}/${Date.now()}.${ext}`;
        const { error: e } = await supabase.storage.from('paroles').upload(audio_path, recording.blob, { contentType: recording.blob.type });
        if (e) throw e;
      }
      await save.mutateAsync({ topic, kind, duration_sec: recording?.sec || null, audio_path, note, ...scores });
      autoCheck('oral', null);
      setRecording(null);
      setScores({});
      setNote('');
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  };

  const scored = [...speeches].reverse().filter((s) => s[criterion] != null);
  const avg = (k) => {
    const v = speeches.slice(0, 5).map((s) => s[k]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const weakest = SPEECH_CRITERIA.map(([k, l]) => [k, l, avg(k)]).filter(([, , v]) => v != null).sort((a, b) => a[2] - b[2])[0];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Field label="Sujet" className="flex-1"><Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} /></Field>
          <IconButton icon={Shuffle} label="Autre sujet" className="mt-5" onClick={() => setTopic(SPEECH_PROMPTS[Math.floor(Math.random() * SPEECH_PROMPTS.length)])} />
        </div>
        <Chips className="mt-2" options={SPEECH_KINDS} value={kind} onChange={(v) => setKind(v || 'impro')} />
        {weakest && <p className="mt-3 text-sm">Point à travailler en ce moment : <b>{weakest[1]}</b> ({weakest[2].toFixed(1).replace('.', ',')}/5). {SPEECH_CRITERIA.find(([k]) => k === weakest[0])[2]}</p>}
        <div className="mt-4">
          <Recorder value={recording} onChange={setRecording} />
        </div>
      </Card>

      {recording && (
        <Card className="p-4">
          <SectionTitle>Je me réécoute et je m'évalue</SectionTitle>
          <div className="space-y-3">
            {SPEECH_CRITERIA.map(([k, label, hint]) => (
              <Field key={k} label={label} hint={hint}>
                <Scale value={scores[k]} onChange={(v) => setScores({ ...scores, [k]: v })} tone="rouge" />
              </Field>
            ))}
            <Field label="Ce que je change la prochaine fois"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
            <ErrorNote error={error} />
            <Button className="w-full" loading={busy} onClick={submit}>Enregistrer ma prise de parole</Button>
          </div>
        </Card>
      )}

      {speeches.length > 1 && (
        <Card className="p-4">
          <SectionTitle>Ma progression</SectionTitle>
          <Chips options={SPEECH_CRITERIA.map(([k, l]) => [k, l])} value={criterion} onChange={(v) => setCriterion(v || 'clarity')} />
          <div className="mt-3"><LineChart points={scored.map((s) => ({ d: s.day, v: s[criterion] }))} tone="rouge" height={140} /></div>
        </Card>
      )}

      {speeches.length > 0 && (
        <div>
          <SectionTitle>Mes enregistrements</SectionTitle>
          <ul className="divide-y divide-line border-y border-line">
            {speeches.map((s) => <SpeechRow key={s.id} speech={s} onDelete={() => {
              if (s.audio_path) supabase.storage.from('paroles').remove([s.audio_path]);
              remove.mutate(s.id);
            }} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Recorder({ value, onChange }) {
  const [rec, setRec] = useState(null);
  const [sec, setSec] = useState(0);
  const [error, setError] = useState(null);
  const chunks = useRef([]);
  const started = useRef(0);

  useEffect(() => {
    if (!rec) return undefined;
    const t = setInterval(() => setSec(Math.round((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [rec]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari (iPhone) enregistre en mp4, Chrome en webm.
      const type = ['audio/webm', 'audio/mp4'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        onChange({ blob, url: URL.createObjectURL(blob), sec: Math.round((Date.now() - started.current) / 1000) });
      };
      started.current = Date.now();
      setSec(0);
      mr.start();
      setRec(mr);
    } catch {
      setError({ message: "Micro inaccessible. Autorise le micro pour Davina dans les réglages du téléphone." });
    }
  };
  const stop = () => { rec.stop(); setRec(null); };

  return (
    <div className="space-y-2">
      {!rec && !value && <Button size="lg" className="w-full" icon={Mic} onClick={start}>M'enregistrer</Button>}
      {rec && (
        <Button size="lg" variant="primary" className="w-full" icon={Square} onClick={stop}>
          <span className="pulse-dot mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rouge" /> {clock(sec)} — Arrêter
        </Button>
      )}
      {value && (
        <div className="space-y-2">
          <audio controls src={value.url} className="w-full" />
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>Recommencer</Button>
        </div>
      )}
      <ErrorNote error={error} />
      {!rec && !value && <p className="text-center text-xs text-muted">Sans enregistrement, tu peux aussi juste t'évaluer après une prise de parole en vrai.</p>}
      {!rec && !value && <button type="button" className="mx-auto block text-sm font-semibold text-rouge underline" onClick={() => onChange({ blob: null, url: null, sec: null })}>J'ai parlé en public, je m'évalue</button>}
    </div>
  );
}

function SpeechRow({ speech, onDelete }) {
  const [url, setUrl] = useState(null);
  const play = async () => {
    const { data } = await supabase.storage.from('paroles').createSignedUrl(speech.audio_path, 3600);
    setUrl(data?.signedUrl);
  };
  const scores = SPEECH_CRITERIA.map(([k]) => speech[k]).filter((x) => x != null);
  return (
    <li className="py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{speech.topic}</p>
          <p className="text-xs text-muted">
            {shortDate(speech.day)}{speech.duration_sec ? ` · ${clock(speech.duration_sec)}` : ''}
            {scores.length ? ` · moyenne ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1).replace('.', ',')}/5` : ''}
          </p>
          {speech.note && <p className="text-sm text-muted">{speech.note}</p>}
        </div>
        {speech.audio_path && !url && <Button size="sm" variant="secondary" onClick={play}>Écouter</Button>}
        <IconButton icon={Trash2} label="Supprimer" className="!h-11 !w-11" onClick={onDelete} />
      </div>
      {url && <audio controls autoPlay src={url} className="mt-2 w-full" />}
    </li>
  );
}

