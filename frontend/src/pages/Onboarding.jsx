import { useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { DOMAINS } from '../data/domains';
import { Button, ErrorNote, Field, Input } from '../components/ui';

const MAX = 3;

/**
 * Deux écrans, deux minutes : on choisit 3 domaines pour commencer, puis les
 * actions proposées (la première est déjà cochée). Les autres domaines
 * restent en veille et se réveillent quand elle le décide.
 */
export default function Onboarding({ profile }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [chosen, setChosen] = useState([]);
  const [picked, setPicked] = useState({});          // "domaine:index" -> true
  const [time, setTime] = useState('08:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggleDomain = (key) => setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : c.length >= MAX ? c : [...c, key]));

  const next = () => {
    const init = {};
    chosen.forEach((k) => { init[`${k}:0`] = true; });
    setPicked(init);
    setStep(2);
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      unwrap(await supabase.from('user_domains').upsert(
        DOMAINS.map((d) => ({ domain: d.key, active: chosen.includes(d.key) })),
        { onConflict: 'user_id,domain' },
      ));
      const habits = [];
      chosen.forEach((k) => DOMAINS.find((d) => d.key === k).starters.forEach((s, i) => {
        if (picked[`${k}:${i}`]) habits.push({ domain: k, title: s.title, full_version: s.full, min_version: s.min, kind: s.kind || null, position: habits.length });
      }));
      if (habits.length) unwrap(await supabase.from('habits').insert(habits));
      unwrap(await supabase.from('profiles').update({ onboarded: true, reminder_time: time }).eq('id', profile.id));
      await qc.invalidateQueries();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-[100svh] max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-rouge">Étape {step} sur 2</p>
      {step === 1 ? (
        <>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">
            Bienvenue{profile.display_name ? `, ${profile.display_name}` : ''}. Par quoi commencer ?
          </h1>
          <p className="mt-2 text-muted">Choisis {MAX} domaines au maximum. Les autres attendent : tu les réveilleras plus tard.</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {DOMAINS.map((d) => {
              const on = chosen.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDomain(d.key)}
                  className={clsx('flex min-h-24 flex-col items-start gap-1 rounded-[var(--radius)] border-2 p-3 text-left transition', on ? 'border-rouge bg-rouge-soft' : 'border-line bg-paper')}
                >
                  <d.icon className={clsx('h-6 w-6', on ? 'text-rouge' : 'text-muted')} />
                  <span className="font-display text-lg font-bold leading-tight">{d.name}</span>
                  <span className="text-xs text-muted">{d.about}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">Une petite action par domaine</h1>
          <p className="mt-2 text-muted">Chacune a une version de 2 minutes : les jours difficiles, elle compte quand même.</p>
          <div className="mt-5 space-y-5">
            {chosen.map((k) => {
              const d = DOMAINS.find((x) => x.key === k);
              return (
                <section key={k}>
                  <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><d.icon className="h-5 w-5 text-rouge" />{d.name}</h2>
                  <div className="space-y-2">
                    {d.starters.map((s, i) => {
                      const on = !!picked[`${k}:${i}`];
                      return (
                        <button
                          key={s.title}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPicked({ ...picked, [`${k}:${i}`]: !on })}
                          className={clsx('flex w-full min-h-16 items-center gap-3 rounded-[var(--radius)] border-2 p-3 text-left', on ? 'border-rouge bg-rouge-soft' : 'border-line')}
                        >
                          <span className={clsx('check !h-8 !w-8', on && '')} data-state={on ? 'full' : undefined}>{on && <Check className="h-4 w-4" />}</span>
                          <span className="min-w-0">
                            <span className="block font-semibold">{s.title}</span>
                            <span className="block text-sm text-muted">{s.full} · <em>2 min : {s.min}</em></span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            <Field label="Mon rappel du matin" hint="Un seul rappel par jour, à cette heure. Tu pourras le changer.">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <ErrorNote error={error} />
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="mx-auto flex max-w-lg gap-2">
          {step === 2 && <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Retour</Button>}
          {step === 1
            ? <Button size="lg" className="flex-1" disabled={!chosen.length} onClick={next}>Continuer{chosen.length ? ` (${chosen.length})` : ''}</Button>
            : <Button size="lg" className="flex-1" loading={busy} onClick={finish}>Commencer</Button>}
        </div>
      </div>
    </div>
  );
}
