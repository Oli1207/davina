import { useEffect, useState } from 'react';
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
 * page sans disparaître. Ouverte d'office au premier lancement.
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

/** Premier élément visible parmi une liste de sélecteurs (la nav existe en double : mobile et bureau). */
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
const same = (a, b) => a && b && ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 2);

/**
 * Visite guidée dans la vraie app : elle navigue de page en page, éclaire
 * l'élément dont on parle (le reste s'assombrit) et l'explique dans une bulle.
 *
 * La bulle est ancrée en CSS en haut ou en bas de l'écran (jamais calée en pixels) :
 * sur mobile, la zone visible bouge quand les barres du navigateur apparaissent ou
 * disparaissent, et une bulle qui bouge sous le doigt rend les boutons impossibles à toucher.
 */
export default function Tour({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);
  const [place, setPlace] = useState('center');
  const step = GUIDED_TOUR[i];
  const last = i === GUIDED_TOUR.length - 1;
  useScrollLock();

  const here = `${location.pathname}${location.search}`;

  // Aller sur la bonne page, attendre que l'élément apparaisse, le montrer.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setRect(null);
    setPlace('center');
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
        // Un grand élément se montre en haut ; un petit au centre.
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.4;
        el.scrollIntoView({ block: tall ? 'start' : 'center' });
        // On laisse la page se stabiliser (polices, données) avant de fixer l'emplacement de la bulle.
        setTimeout(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect(r);
          setPlace(r.top + r.height / 2 < window.innerHeight / 2 ? 'bottom' : 'top');
          setReady(true);
        }, 350);
      } else if (Date.now() - started < 2500) {
        setTimeout(poll, 100);
      } else {
        setReady(true); // élément absent (ex. données vides) : bulle centrée
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [i, here]); // eslint-disable-line react-hooks/exhaustive-deps

  // Garder le halo collé à l'élément si la page bouge ou change de taille. La bulle, elle, ne bouge pas.
  useEffect(() => {
    if (!step.target || !ready) return undefined;
    const sync = () => {
      const el = findTarget(step.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect((old) => (same(old, r) ? old : r));
    };
    const t = setInterval(sync, 400);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => { clearInterval(t); window.removeEventListener('resize', sync); window.removeEventListener('scroll', sync, true); };
  }, [step, ready]);

  const close = () => { markSeen(); onClose(); };
  const go = (n) => { if (n >= 0 && n < GUIDED_TOUR.length) setI(n); };
  const finish = () => { close(); navigate('/'); };

  const anchor = place === 'bottom'
    ? 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
    : place === 'top' ? 'top-[calc(env(safe-area-inset-top)+1rem)]' : 'top-1/2 -translate-y-1/2';

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Visite guidée" style={{ touchAction: 'manipulation' }}>
      {/* Le voile : un trou net autour de l'élément. Il ne capte jamais les touches. */}
      {rect ? (
        <div
          className="pointer-events-none fixed"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: '0 0 0 9999px rgba(28,18,19,0.74)', outline: '2px solid #fff', borderRadius: 8 }}
        />
      ) : <div className="pointer-events-none fixed inset-0 bg-[rgba(28,18,19,0.74)]" />}

      {ready && (
        <div className={`fixed inset-x-4 z-10 mx-auto max-w-[22.5rem] rounded-[var(--radius)] border-t-[3px] border-rouge bg-paper p-4 text-ink shadow-[0_12px_40px_rgba(28,18,19,0.45)] ${anchor}`} key={step.key}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-rouge">{step.kicker || 'Visite'}</span>
            <span className="text-xs text-muted num">{i + 1}/{GUIDED_TOUR.length}</span>
          </div>
          <p className="font-display text-xl font-extrabold leading-tight">{step.title}</p>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{step.text}</p>
          <div className="mt-4 flex items-center gap-2">
            {!last && <button type="button" className="mr-auto min-h-11 px-1 text-sm font-semibold text-muted" onClick={close}>Passer</button>}
            {i > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(i - 1)}>Retour</button>}
            <button type="button" className={`btn btn-primary btn-sm ${last ? 'flex-1' : ''}`} onClick={() => (last ? finish() : go(i + 1))}>{last ? 'Commencer' : 'Suivant'}</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
