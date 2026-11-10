import { useEffect, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { clock } from '../lib/dates';
import { Button } from './ui';
import Ring from './Ring';

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
};

/**
 * Minuteur de concentration. L'heure de départ est gardée dans localStorage :
 * verrouiller le téléphone ou changer d'onglet ne fait rien perdre.
 */
export default function Timer({ storageKey, minutes = 25, onStop, label }) {
  const key = `davina-timer-${storageKey}`;
  const [state, setState] = useState(() => read(key));
  const [, tick] = useState(0);
  const [target, setTarget] = useState(state?.target || minutes);

  useEffect(() => { if (!state) setTarget(minutes); }, [minutes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!state || state.paused) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const save = (s) => {
    setState(s);
    try { if (s) localStorage.setItem(key, JSON.stringify(s)); else localStorage.removeItem(key); } catch { /* navigation privée */ }
  };
  const elapsed = state ? state.elapsedBefore + (state.paused ? 0 : (Date.now() - state.start) / 1000) : 0;
  const total = target * 60;
  const left = total - elapsed;

  useEffect(() => {
    if (state && !state.paused && left <= 0 && !state.rang) {
      navigator.vibrate?.([300, 120, 300]);
      save({ ...state, rang: true });
    }
  });

  const start = () => save({ start: Date.now(), paused: false, elapsedBefore: 0, target });
  const pause = () => save({ ...state, paused: true, elapsedBefore: elapsed });
  const resume = () => save({ ...state, paused: false, start: Date.now() });
  const stop = () => {
    const mins = Math.round(elapsed / 60);
    save(null);
    if (mins >= 1) onStop?.(mins);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {label && <div className="text-sm font-semibold uppercase tracking-wider text-muted">{label}</div>}
      <Ring value={elapsed / total} size={200} stroke={12}>
        <span className="flex flex-col"><span className="font-display text-4xl font-extrabold num">{clock(Math.abs(left))}</span><span className="mt-1 text-xs text-muted">{left > 0 ? 'restant' : 'en plus, bravo'}</span></span>
      </Ring>
      {!state && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {[10, 15, 25, 30, 45, 50].map((m) => <button key={m} type="button" className="chip" aria-pressed={target === m} onClick={() => setTarget(m)}>{m} min</button>)}
        </div>
      )}
      <div className="flex gap-2">
        {!state && <Button size="lg" icon={Play} onClick={start}>Commencer</Button>}
        {state && !state.paused && <Button size="lg" variant="secondary" icon={Pause} onClick={pause}>Pause</Button>}
        {state?.paused && <Button size="lg" variant="secondary" icon={Play} onClick={resume}>Reprendre</Button>}
        {state && <Button size="lg" variant="ink" icon={Square} onClick={stop}>Terminer</Button>}
      </div>
    </div>
  );
}
