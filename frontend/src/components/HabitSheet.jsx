import { useEffect, useState } from 'react';
import { useSave } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { useJourneys } from '../hooks/useJourneys';
import { DAY_LABELS, hhmm } from '../lib/dates';
import { DOMAIN, DOMAINS, LINKS } from '../data/domains';
import { toast } from './toast';
import { Button, Chips, ErrorNote, Field, Input, Sheet } from './ui';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi en premier
const EMPTY = {
  kind: null, journey_id: null, title: '', full_version: '', min_version: '', days: [0, 1, 2, 3, 4, 5, 6], shared: false,
  at_time: '', duration_min: 0, grace_min: 15, sacred: false, notify: true, per_week: null, per_week_min: null,
};

/**
 * Créer ou modifier une action. `habit` null = création (domaine imposé ou à choisir).
 * Le minimum à saisir : un titre. Tout le reste a une valeur par défaut.
 */
export default function HabitSheet({ open, onClose, habit, domain }) {
  const [form, setForm] = useState(EMPTY);
  const [dom, setDom] = useState(domain || null);
  const [error, setError] = useState(null);
  const save = useSave('habits');
  const { data: domains = [] } = useUserDomains();
  const { data: journeys = [] } = useJourneys();
  const running = journeys.filter((j) => j.status === 'active');

  useEffect(() => {
    if (!open) return;
    setForm(habit ? { ...EMPTY, ...habit, at_time: hhmm(habit.at_time) } : EMPTY);
    setDom(habit?.domain || domain || null);
    setError(null);
  }, [open, habit, domain]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleDay = (d) => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] });
  const choices = (domains.filter((d) => d.active).length ? domains.filter((d) => d.active).map((d) => d.domain) : DOMAINS.map((d) => d.key));
  const starters = dom && !habit ? DOMAIN[dom].starters : [];
  const weekly = form.per_week != null;

  const submit = async (e) => {
    e.preventDefault();
    if (!dom) { setError({ message: 'Choisis un domaine.' }); return; }
    if (!weekly && !form.days.length) { setError({ message: 'Choisis au moins un jour.' }); return; }
    try {
      const { full_version, min_version, days, shared, journey_id, kind, duration_min, grace_min, sacred, notify, per_week } = form;
      await save.mutateAsync({
        ...(habit ? { id: habit.id } : {}),
        full_version, min_version, days, shared, journey_id: journey_id || null, title: form.title.trim(), domain: dom,
        kind: LINKS[dom]?.some(([k]) => k === kind) ? kind : null,
        at_time: weekly ? null : (form.at_time || null), duration_min: Number(duration_min) || 0, grace_min: Number(grace_min) || 15,
        sacred, notify, per_week: weekly ? per_week : null, per_week_min: weekly ? Math.min(form.per_week_min || per_week, per_week) : null,
      });
      toast(habit ? 'Modifié ✓' : 'Action ajoutée ✓');
      onClose();
    } catch (err) { setError(err); }
  };

  const archive = async () => {
    await save.mutateAsync({ id: habit.id, archived: true });
    toast('Action retirée', { action: { label: 'Annuler', onClick: () => save.mutate({ id: habit.id, archived: false }) } });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={habit ? 'Modifier l\'action' : 'Nouvelle action'}>
      <form onSubmit={submit} className="space-y-3">
        {!domain && !habit && (
          <div>
            <span className="field-label">Domaine</span>
            <Chips options={choices.map((k) => [k, DOMAIN[k].name])} value={dom} onChange={setDom} />
          </div>
        )}
        {starters.length > 0 && !form.title && (
          <div>
            <span className="field-label">Idées en un tap</span>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button key={s.title} type="button" className="chip" onClick={() => setForm({ ...form, title: s.title, full_version: s.full, min_version: s.min, kind: s.kind || null })}>{s.title}</button>
              ))}
            </div>
          </div>
        )}
        <Field label="Action"><Input value={form.title} onChange={set('title')} required maxLength={80} placeholder="Ex. Lire" autoFocus /></Field>
        <Field label="Version complète" hint="Facultatif"><Input value={form.full_version} onChange={set('full_version')} maxLength={160} placeholder="Ex. Lire 60 minutes" /></Field>
        <Field label="Version 2 minutes" hint="Les jours difficiles, celle-ci compte aussi."><Input value={form.min_version} onChange={set('min_version')} maxLength={160} placeholder="Ex. Lire 5 pages" /></Field>

        <div>
          <span className="field-label">Quand ?</span>
          <Chips options={[['days', 'Certains jours'], ['week', 'Plusieurs fois par semaine']]} value={weekly ? 'week' : 'days'}
            onChange={(v) => v && setForm({ ...form, per_week: v === 'week' ? (form.per_week || 3) : null, per_week_min: null })} />
        </div>
        {weekly ? (
          <Field label="Combien de fois par semaine ?" hint="Davina les place dans les trous de ton emploi du temps (onglet Semaine → Planning).">
            <Chips options={[1, 2, 3, 4, 5, 6, 7].map((n) => [n, String(n)])} value={form.per_week} onChange={(v) => v && setForm({ ...form, per_week: v, per_week_min: Math.min(form.per_week_min || v, v) })} />
          </Field>
        ) : (
          <div>
            <span className="field-label">Jours</span>
            <div className="flex gap-1">
              {ORDER.map((d) => (
                <button key={d} type="button" aria-pressed={form.days.includes(d)} onClick={() => toggleDay(d)} className="chip min-h-11 flex-1 justify-center !px-0" aria-label={DAY_LABELS[d]}>
                  {DAY_LABELS[d].slice(0, 1).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="rounded-sm border border-line" open={!!(form.at_time || form.sacred)}>
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold">Heure fixe, durée, rendez-vous sacré</summary>
          <div className="space-y-3 border-t border-line p-3">
            {!weekly && <Field label="Heure" hint="Facultatif. Tu seras prévenu à cette heure exacte."><Input type="time" value={form.at_time} onChange={set('at_time')} /></Field>}
            <Field label="Durée"><Chips options={[[0, 'Libre'], [10, '10 min'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']]} value={Number(form.duration_min)} onChange={(v) => setForm({ ...form, duration_min: v ?? 0 })} /></Field>
            {!weekly && form.at_time && (
              <Field label="Marge d'« à l'heure »" hint="Au-delà, l'action est comptée « rattrapée » : jamais manquée."><Chips options={[[5, '5 min'], [15, '15 min'], [30, '30 min']]} value={Number(form.grace_min)} onChange={(v) => v && setForm({ ...form, grace_min: v })} /></Field>
            )}
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--rouge)]" checked={form.sacred} onChange={(e) => setForm({ ...form, sacred: e.target.checked })} />
              <span><b>Rendez-vous sacré</b> : il ne passe jamais en « version légère », même les jours de fatigue.</span>
            </label>
            {!weekly && form.at_time && (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} />
                Me rappeler à l'heure exacte
              </label>
            )}
          </div>
        </details>

        {LINKS[dom] && (
          <div>
            <span className="field-label">Se coche toute seule avec (facultatif)</span>
            <Chips options={LINKS[dom]} value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} />
          </div>
        )}
        {running.length > 0 && (
          <div>
            <span className="field-label">Parcours (facultatif)</span>
            <Chips options={running.map((j) => [j.id, j.title.split(' — ')[0]])} value={form.journey_id} onChange={(v) => setForm({ ...form, journey_id: v })} />
          </div>
        )}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} />
          Mon binôme voit si je l'ai faite
        </label>
        <ErrorNote error={error} />
        <div className="flex gap-2">
          {habit && <Button variant="danger" size="lg" onClick={archive}>Retirer</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={save.isPending}>{habit ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Sheet>
  );
}
