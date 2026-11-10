import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRows } from './useData';
import { buildJourney } from '../data/journeys';

export const useJourneys = () => useRows('journeys', { build: (q) => q.order('starts_on', { ascending: false }) });

/** Tout ce qui compose un parcours : étapes, livrables, actions et notes rattachées. */
export function useJourneyParts(id) {
  const by = (q) => q.eq('journey_id', id);
  return {
    steps: useRows('journey_steps', { key: [id], build: (q) => by(q).order('position') }),
    deliverables: useRows('deliverables', { key: [id], build: (q) => by(q).order('position') }),
    habits: useRows('habits', { key: ['journey', id], build: (q) => by(q).eq('archived', false).order('position') }),
    entries: useRows('entries', { key: ['journey', id], build: (q) => by(q).order('created_at', { ascending: false }).limit(50) }),
  };
}

/** Crée un parcours complet (étapes, livrables, actions). Annule tout si une étape échoue. */
export function useStartJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tpl, start, title, previousId, withHabits }) => {
      const plan = buildJourney(tpl, { start, title, previousId, withHabits });
      const journey = unwrap(await supabase.from('journeys').insert(plan.journey).select().single());
      try {
        const steps = unwrap(await supabase.from('journey_steps')
          .insert(plan.steps.map(({ deliverables, ...s }) => ({ ...s, journey_id: journey.id }))).select());
        const ordered = [...steps].sort((a, b) => a.position - b.position);
        const deliverables = plan.steps.flatMap((s, i) => s.deliverables.map((title, k) => ({
          journey_id: journey.id, step_id: ordered[i].id, title, position: i * 10 + k,
        })));
        if (deliverables.length) unwrap(await supabase.from('deliverables').insert(deliverables));
        if (plan.habits.length) {
          const { data: existing = [] } = await supabase.from('habits').select('position').order('position', { ascending: false }).limit(1);
          const base = (existing[0]?.position ?? 0) + 1;
          unwrap(await supabase.from('habits').insert(plan.habits.map((h, i) => ({
            journey_id: journey.id, domain: h.domain, title: h.title, full_version: h.full, min_version: h.min, position: base + i,
          }))));
        }
      } catch (e) {
        await supabase.from('journeys').delete().eq('id', journey.id);
        throw e;
      }
      return journey;
    },
    onSettled: () => ['journeys', 'journey_steps', 'deliverables', 'habits'].forEach((t) => qc.invalidateQueries({ queryKey: [t] })),
  });
}

/** Avancement : livrables faits, et part du temps écoulé. */
export function journeyProgress(journey, deliverables, today) {
  const total = deliverables.length;
  const done = deliverables.filter((d) => d.done_on).length;
  let time = null;
  if (journey.ends_on) {
    const a = new Date(journey.starts_on).getTime(); const b = new Date(journey.ends_on).getTime();
    time = Math.max(0, Math.min(100, Math.round(((new Date(today).getTime() - a) / (b - a || 1)) * 100)));
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, time };
}
