/**
 * Briques d'interface communes, reunies dans un fichier pour rester
 * coherentes. Le vocabulaire visuel (pagne, ciel, herbe) est decrit dans index.css.
 */
import clsx from 'clsx';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

const BTN = { primary: 'btn-primary', ink: 'btn-ink', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger' };

export function Button({ variant = 'primary', size = 'md', loading, icon: Ico, className, children, ...props }) {
  return (
    <button
      type="button"
      className={clsx('btn', BTN[variant], `btn-${size}`, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Ico ? <Ico className="h-4 w-4" strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Ico, label, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted transition hover:bg-paper-2 hover:text-ink', className)}
      {...props}
    >
      <Ico className="h-5 w-5" />
    </button>
  );
}

export function Card({ domain, className, children, ...props }) {
  return (
    <section className={clsx('card', domain && `card-${domain}`, className)} {...props}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, action, className }) {
  return (
    <div className={clsx('mb-2 flex items-end justify-between gap-3', className)}>
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input className="input" {...props} />;
export const Textarea = (props) => <textarea className="input" {...props} />;
export function Select({ options, ...props }) {
  return (
    <select className="input" {...props}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} className="tab" onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Choix exclusif en pastilles (types, categories, niveaux). */
export function Chips({ options, value, onChange, className }) {
  return (
    <div className={clsx('flex flex-wrap gap-1.5', className)}>
      {options.map(([v, l]) => (
        <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Note de 1 a 5 en cases, sobre et rapide au pouce. */
export function Scale({ value, onChange, labels, tone = 'ink' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={labels?.[n - 1]}
          className={clsx(
            'h-10 flex-1 rounded-sm border text-sm font-bold num transition',
            value !== n && 'border-line bg-paper text-muted',
          )}
          style={value === n ? { background: `var(--${tone})`, borderColor: `var(--${tone})`, color: tone === 'ink' ? 'var(--on-ink)' : '#fff' } : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/** Panneau qui monte du bas de l'ecran (mobile) ou s'affiche centre (bureau). */
export function Sheet({ open, onClose, title, children, wide }) {
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={clsx('sheet-in max-h-[92vh] w-full overflow-y-auto border-t-4 border-rouge bg-paper md:rounded-sm', wide ? 'md:max-w-2xl' : 'md:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-4 py-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <IconButton icon={X} label="Fermer" onClick={onClose} />
        </div>
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="border border-dashed border-line px-4 py-8 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display text-2xl font-extrabold num leading-tight" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Barre de progression plate, segmentee si la cible est petite (2/3, 3/3…). */
export function Gauge({ done, target, min, tone = 'rouge' }) {
  if (target <= 7) {
    return (
      <div className="flex gap-1" aria-label={`${done} sur ${target}`}>
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[1px]"
            style={{
              background: i < done ? `var(--${tone})` : 'transparent',
              border: `1px ${min && i >= min ? 'dashed' : 'solid'} ${i < done ? `var(--${tone})` : 'var(--line)'}`,
            }}
          />
        ))}
      </div>
    );
  }
  const pct = target ? Math.min(100, (done / target) * 100) : 0;
  return (
    <div className="h-2 w-full border border-line">
      <div className="h-full" style={{ width: `${pct}%`, background: `var(--${tone})` }} />
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-10 text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <p className="mt-2 border-l-4 border-rouge bg-rouge-soft px-3 py-2 text-sm">{error.message || String(error)}</p>;
}
