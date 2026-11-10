import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRows, useSave } from './useData';
import { addDays, toMin, today, weekStart } from '../lib/dates';
import { agenda, lateness, streak, weekProgress } from '../lib/engine';

/** Les 10 domaines de la personne (active ou non, avec vision et note). */
export const useUserDomains = () => useRows('user_domains', { build: (q) => q.order('created_at') });

export const useSaveDomain = () => useSave('user_domains', { onConflict: 'user_id,domain' });

/** 60 derniers jours de pointages : une seule requête pour le jour, la semaine et la série. */
export function useRecentChecks() {
  const from = addDays(today(), -60);
  return useRows('checkins', { key: ['recent'], build: (q) => q.gte('day', from) });
}

/** Retard (en minutes) d'un pointage fait maintenant pour une action à heure fixe ; null sinon. */
export function lateFor(habit, day = today()) {
  if (!habit?.at_time) return null;
  return lateness(day, toMin(habit.at_time) + (habit.duration_min || 0));
}

/**
 * Un tap : coche en « complet » ou « 2 minutes ». Retaper le même niveau
 * décoche. Mise à jour immédiate à l'écran, annulée si l'écriture échoue.
 * `late` : minutes de retard pour une action à heure fixe.
 */
export function useToggleCheck() {
  const qc = useQueryClient();
  const key = ['checkins', 'recent'];
  return useMutation({
    mutationFn: async ({ habitId, day, level, current, late }) => {
      if (current === level) return unwrap(await supabase.from('checkins').delete().eq('habit_id', habitId).eq('day', day));
      const row = { habit_id: habitId, day, level, ...(late != null ? { late_min: late } : {}) };
      return unwrap(await supabase.from('checkins').upsert(row, { onConflict: 'habit_id,day' }).select());
    },
    onMutate: async ({ habitId, day, level, current, late }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData(key);
      qc.setQueryData(key, (rows = []) => {
        const rest = rows.filter((r) => !(r.habit_id === habitId && r.day === day));
        return current === level ? rest : [...rest, { id: `tmp-${habitId}`, habit_id: habitId, day, level, late_min: late ?? null }];
      });
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: ['checkins'] }),
  });
}

/** Tout ce qu'il faut à l'écran du jour, calculé une fois. */
export function useToday() {
  const day = today();
  const habits = useRows('habits', { build: (q) => q.eq('archived', false).order('position') });
  const checks = useRecentChecks();
  const blocks = useRows('schedule_blocks');
  const planned = useRows('planned_sessions', { key: [day], build: (q) => q.eq('day', day) });
  const log = useQuery({
    queryKey: ['day_logs', day],
    queryFn: async () => unwrap(await supabase.from('day_logs').select('*').eq('day', day).maybeSingle()),
  });

  const data = useMemo(() => {
    const rows = checks.data || [];
    const byHabit = new Map(rows.filter((r) => r.day === day).map((r) => [r.habit_id, r]));
    const ag = agenda(day, habits.data || [], planned.data || [], blocks.data || []);
    const withState = (item) => (item.type === 'habit' ? { ...item, checkin: byHabit.get(item.habit.id) || null } : item);
    const timed = ag.timed.map(withState);
    const untimed = ag.untimed.map(withState);
    const todo = [...timed, ...untimed].filter((i) => i.type === 'habit' && i.checkin?.level !== 'rest');
    const monday = weekStart();
    const weekly = ag.weekly.map((h) => ({ habit: h, checkin: byHabit.get(h.id) || null, progress: weekProgress(h, rows, monday) }));
    return {
      timed, untimed, weekly,
      done: todo.filter((i) => i.checkin && i.checkin.level !== 'miss').length,
      total: todo.length,
      // Un jour de repos ne casse pas la série ; un jour « manqué » ne la prolonge pas.
      streak: streak(new Set(rows.filter((r) => r.level !== 'miss').map((r) => r.day)), day),
    };
  }, [habits.data, checks.data, blocks.data, planned.data, day]);

  return { ...data, day, log: log.data, loading: habits.isLoading || checks.isLoading };
}

/**
 * Coche automatiquement l'action liée à une activité (journal de méditation,
 * mode prière, jeûne accompli…). Ne décoche jamais et ne change pas un pointage déjà là.
 */
export function useAutoCheck() {
  const toggle = useToggleCheck();
  const habits = useRows('habits', { build: (q) => q.eq('archived', false).order('position') });
  const checks = useRecentChecks();
  return (kind) => {
    const day = today();
    const h = (habits.data || []).find((x) => x.kind === kind);
    if (!h || (checks.data || []).some((c) => c.habit_id === h.id && c.day === day)) return;
    toggle.mutate({ habitId: h.id, day, level: 'full', current: null, late: lateFor(h, day) });
  };
}
