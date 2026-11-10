import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X } from 'lucide-react';
import { clock } from '../lib/dates';
import { useScrollLock } from '../hooks/useScrollLock';

/**
 * Mode prière plein écran : une carte à la fois, on glisse vers la gauche (ou
 * on touche « Amen ») pour passer à la suivante. Une liste longue devient un pas à pas.
 */
export default function PrayerMode({ title, items, onClose, onPrayed, onFinish }) {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [start] = useState(Date.now());
  const [, tick] = useState(0);
  const from = useRef(null);
  useScrollLock();
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const item = items[i];
  const next = () => {
    if (item) onPrayed?.(item);
    navigator.vibrate?.(12);
    setDx(0);
    setI(i + 1 >= items.length ? items.length : i + 1);
  };
  const end = () => { onFinish?.(Math.max(1, Math.round((Date.now() - start) / 60000))); onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-sky text-ink" data-theme="dark">
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button type="button" aria-label="Fermer" className="flex h-11 w-11 items-center justify-center" onClick={onClose}><X className="h-5 w-5" /></button>
        <p className="text-sm font-semibold opacity-70">{title} · {clock((Date.now() - start) / 1000)}</p>
        <span className="w-11 text-right text-sm num opacity-70">{Math.min(i + 1, items.length)}/{items.length}</span>
      </div>
      <div className="flex gap-1 px-4">
        {items.map((it, k) => <span key={it.id} className={`h-1 flex-1 rounded-full ${k < i ? 'bg-rouge' : k === i ? 'bg-ink' : 'bg-line'}`} />)}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-5">
        {item ? (
          <div
            className="w-full max-w-md select-none rounded-[var(--radius)] border border-line bg-paper p-6 transition-transform"
            style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transitionDuration: from.current == null ? '200ms' : '0ms', touchAction: 'pan-y' }}
            onPointerDown={(e) => { from.current = e.clientX; }}
            onPointerMove={(e) => { if (from.current != null) setDx(Math.min(0, e.clientX - from.current)); }}
            onPointerUp={() => { const d = dx; from.current = null; if (d < -90) next(); else setDx(0); }}
            onPointerCancel={() => { from.current = null; setDx(0); }}
          >
            {item.kicker && <p className="text-xs font-bold uppercase tracking-[0.14em] text-rouge">{item.kicker}</p>}
            <p className="mt-2 font-display text-3xl font-extrabold leading-tight break-words">{item.title}</p>
            {item.body && <p className="mt-4 text-lg leading-relaxed opacity-85">{item.body}</p>}
            {item.hint && <p className="mt-4 text-sm italic opacity-60">{item.hint}</p>}
          </div>
        ) : (
          <div className="text-center">
            <p className="font-display text-4xl font-extrabold text-rouge">Amen.</p>
            <p className="mt-2 opacity-70">{items.length} sujet{items.length > 1 ? 's' : ''} remis à Dieu en {clock((Date.now() - start) / 1000)}.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {item ? (
          <>
            <button type="button" aria-label="Précédent" disabled={!i} className="flex h-14 w-14 items-center justify-center rounded-sm border border-line disabled:opacity-30" onClick={() => setI(Math.max(0, i - 1))}><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" className="h-14 flex-1 rounded-sm bg-rouge font-display text-lg font-bold text-white" onClick={next}>Amen · suivant</button>
          </>
        ) : (
          <button type="button" className="h-14 flex-1 rounded-sm bg-rouge font-display text-lg font-bold text-white" onClick={end}>Terminer</button>
        )}
      </div>
      {i === 0 && item && <p className="pb-3 text-center text-xs opacity-50">Glisse la carte vers la gauche pour passer à la suivante</p>}
    </div>,
    document.body,
  );
}
