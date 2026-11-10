import { create } from 'zustand';
import { Button, Sheet } from './ui';

/** Confirmation avant une action destructive (jamais window.confirm). */
const useConfirm = create((set) => ({ ask: null, open: (ask) => set({ ask }), close: () => set({ ask: null }) }));

export const useAsk = () => useConfirm((s) => s.open);

export function ConfirmHost() {
  const { ask, close } = useConfirm();
  return (
    <Sheet open={!!ask} onClose={close} title={ask?.title || ''}>
      {ask?.body && <p className="mb-4 text-muted">{ask.body}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" size="lg" className="flex-1" onClick={close}>Annuler</Button>
        <Button size="lg" className="flex-1" onClick={() => { ask.onConfirm(); close(); }}>{ask?.confirm || 'Confirmer'}</Button>
      </div>
    </Sheet>
  );
}
