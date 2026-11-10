import { create } from 'zustand';
import { createPortal } from 'react-dom';
import { Check, TriangleAlert } from 'lucide-react';

/**
 * Petites confirmations en bas d'ecran (« Enregistré », « Annuler »).
 * Un retour visible apres chaque action : on sait que c'est pris en compte.
 */
const useToasts = create((set) => ({
  list: [],
  push(t) {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ list: [...s.list.slice(-2), { id, ...t }] }));
    setTimeout(() => set((s) => ({ list: s.list.filter((x) => x.id !== id) })), t.action ? 5000 : 2600);
  },
  dismiss: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}));

export const toast = (message, opts = {}) => useToasts.getState().push({ message, ...opts });
export const useToast = () => toast;

export function Toaster() {
  const { list, dismiss } = useToasts();
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {list.map((t) => (
        <div key={t.id} role="status" className="sheet-in pointer-events-auto flex w-full max-w-sm items-center gap-3 bg-ink px-4 py-3 text-sm text-on-ink shadow-lg">
          {t.tone === 'error' ? <TriangleAlert className="h-4 w-4 shrink-0 text-rouge" /> : <Check className="h-4 w-4 shrink-0 text-rouge" />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button type="button" className="font-bold text-rouge underline-offset-4 hover:underline" onClick={() => { t.action.onClick(); dismiss(t.id); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}
