import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { GUIDED_TOUR } from '../data/tour';
import { useScrollLock } from '../hooks/useScrollLock';

const KEY = 'davina-tour-v1';
export const tourSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

/**
 * La visite vit au niveau de l'app, pas d'une page : elle navigue de page en
 * page sans disparaitre. Ouverte d'office au premier lancement.
 */
export const useTour = create((set) => ({
  open: !tourSeen(),
  start: () => set({ open: true }),
  stop: () => set({ open: false }),
}));

export function TourHost() {
  const { open, stop } = useTour();
  return open ? <Tour onClose={stop} /> : null;
}

/** Premier element visible parmi une liste de selecteurs (la nav existe en double : mobile et bureau). */
function findTarget(selectors) {
  for (const sel of selectors || []) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
    }
  }
  return null;
}

const PAD = 6;

/**
 * Visite guidee dans la vraie app : elle navigue de page en page, eclaire
 * l'element dont on parle (le reste s'assombrit) et l'explique dans une bulle.
 */
export default function Tour({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);
  const [bubbleTop, setBubbleTop] = useState(null);
  const step = GUIDED_TOUR[i];
  const last = i === GUIDED_TOUR.length - 1;
  useScrollLock();

  const here = `${location.pathname}${location.search}`;

  // Aller sur la bonne page, attendre que l'element apparaisse, le centrer.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setRect(null);
    setBubbleTop(null);
    if (step.route && here !== step.route) {
      navigate(step.route);
      return undefined;
    }
    if (!step.target) { setReady(true); return undefined; }
    const started = Date.now();
    const poll = () => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) {
        // Grand element : en haut de l'ecran, pour laisser la place a la bulle dessous.
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.4;
        el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'instant' });
        if (tall) window.scrollBy({ top: -16, behavior: 'instant' });
        setTimeout(() => {
          if (cancelled) return;
          setRect(el.getBoundingClientRect());
          setReady(true);
        }, 120);
      } else if (Date.now() - started < 2500) {
        setTimeout(poll, 100);
      } else {
        setReady(true); // element absent (ex. donnees vides) : bulle centree
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [i, here]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suivre l'element si la fenetre change de taille.
  const remeasure = useCallback(() => {
    const el = findTarget(step.target);
    if (el) setRect(el.getBoundingClientRect());
  }, [step]);
  useEffect(() => {
    window.addEventListener('resize', remeasure);
    return () => window.removeEventListener('resize', remeasure);
  }, [remeasure]);

  const close = () => { markSeen(); onClose(); };
  const go = (n) => { if (n >= 0 && n < GUIDED_TOUR.length) setI(n); };
  const finish = () => { close(); navigate('/'); };

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Visite guidée">
      {/* Le voile : un trou net autour de l'element, aucun degrade. */}
      {rect ? (() => {
        // Si la bulle recouvre le bas de l'element, la zone eclairee s'arrete juste au-dessus.
        const bottom = bubbleTop != null && bubbleTop > rect.top && bubbleTop < rect.bottom + PAD
          ? bubbleTop - 10 : rect.bottom + PAD;
        return (
        <div
          className="pointer-events-none fixed"
          style={{
            left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: Math.max(24, bottom - rect.top + PAD),
            boxShadow: '0 0 0 9999px rgba(28,18,19,0.74)', outline: '2px solid #fff', borderRadius: 8,
          }}
        />
        );
      })() : <div className="fixed inset-0 bg-[rgba(28,18,19,0.74)]" />}

      {ready && (
        <Bubble
          step={step} rect={rect} index={i} total={GUIDED_TOUR.length} last={last}
          onPrev={() => go(i - 1)} onNext={() => (last ? finish() : go(i + 1))} onSkip={close} onPlace={setBubbleTop}
        />
      )}
    </div>,
    document.body,
  );
}

/** La bulle d'explication : sous l'element s'il y a la place, sinon au-dessus, sinon en bas. */
function Bubble({ step, rect, index, total, last, onPrev, onNext, onSkip, onPlace }) {
  const [box, setBox] = useState(null);
  const [style, setStyle] = useState({ opacity: 0 });
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(360, vw - 32);

  useLayoutEffect(() => {
    if (!box) return;
    const h = box.offsetHeight;
    if (!rect) {
      setStyle({ left: (vw - width) / 2, top: Math.max(16, (vh - h) / 2) });
      onPlace(null);
      return;
    }
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), vw - width - 16);
    const below = rect.bottom + PAD + 12;
    const above = rect.top - PAD - 12 - h;
    let top;
    if (below + h <= vh - 16) top = below;
    else if (above >= 16) top = above;
    else top = vh - h - 16; // element tres grand : bulle en bas de l'ecran
    setStyle({ left, top });
    onPlace(top);
  }, [box, rect, vw, vh, width, step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={setBox}
      key={step.key}
      className="fixed rounded-[var(--radius)] bg-paper p-4 text-ink shadow-[0_12px_40px_rgba(28,18,19,0.45)]"
      style={{ width, borderTop: '3px solid var(--rouge)', ...style }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-rouge">
          {step.kicker || 'Visite'}
        </span>
        <span className="text-xs text-muted num">{index + 1}/{total}</span>
      </div>
      <p className="font-display text-xl font-extrabold leading-tight">{step.title}</p>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{step.text}</p>
      <div className="mt-4 flex items-center gap-2">
        {!last && <button type="button" className="mr-auto text-sm font-semibold text-muted" onClick={onSkip}>Passer</button>}
        {index > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={onPrev}>Retour</button>}
        <button type="button" className={`btn btn-primary btn-sm ${last ? 'flex-1' : ''}`} onClick={onNext}>{last ? 'Commencer' : 'Suivant'}</button>
      </div>
    </div>
  );
}
