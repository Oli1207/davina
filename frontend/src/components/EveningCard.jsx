import { useEffect, useState } from 'react';
import { ChevronDown, Moon } from 'lucide-react';
import { useSave } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { toast } from './toast';
import { Field, Textarea } from './ui';

/**
 * Bilan du soir, en 1 minute : sucre et sel (si le domaine Corps est actif),
 * gratitude, victoire, leçon. Tout est facultatif et s'enregistre à la sortie du champ.
 */
export default function EveningCard({ day, log }) {
  const save = useSave('day_logs', { onConflict: 'user_id,day' });
  const { data: domains = [] } = useUserDomains();
  const body = domains.some((d) => d.domain === 'corps' && d.active);
  const [open, setOpen] = useState(new Date().getHours() >= 17);
  const [v, setV] = useState({ gratitude: '', victory: '', lesson: '' });
  useEffect(() => { if (log) setV({ gratitude: log.gratitude || '', victory: log.victory || '', lesson: log.lesson || '' }); }, [log]);

  const patch = (fields, msg) => save.mutate({ day, ...fields }, { onSuccess: () => msg && toast(msg) });
  const text = (k) => {
    if ((log?.[k] || '') !== v[k].trim()) patch({ [k]: v[k].trim() }, 'Enregistré ✓');
  };
  const tri = (field, label) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex gap-1">
        {[[true, 'Tenu'], [false, 'Écart']].map(([val, l]) => (
          <button key={l} type="button" aria-pressed={log?.[field] === val} onClick={() => patch({ [field]: log?.[field] === val ? null : val })}
            className="chip min-h-11 min-w-16 justify-center">{l}</button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card mt-5">
      <button type="button" className="flex min-h-14 w-full items-center justify-between px-4" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="flex items-center gap-2 font-bold"><Moon className="h-4 w-4 text-rouge" />Mon bilan du soir</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {body && (
            <>
              {tri('sugar_free', 'Sans sucre ajouté')}
              {tri('salt_free', 'Sans sel ni cube')}
            </>
          )}
          <Field label="Merci pour…"><Textarea rows={2} value={v.gratitude} onChange={(e) => setV({ ...v, gratitude: e.target.value })} onBlur={() => text('gratitude')} placeholder="Une chose précise." /></Field>
          <Field label="Ma victoire du jour"><Textarea rows={2} value={v.victory} onChange={(e) => setV({ ...v, victory: e.target.value })} onBlur={() => text('victory')} placeholder="Même petite." /></Field>
          <Field label="Demain je ferai mieux…"><Textarea rows={2} value={v.lesson} onChange={(e) => setV({ ...v, lesson: e.target.value })} onBlur={() => text('lesson')} placeholder="Sans te juger." /></Field>
        </div>
      )}
    </section>
  );
}
