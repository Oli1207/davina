import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';

/**
 * Lecture d'une table. `build` recoit la requete `select('*')` et peut y
 * ajouter filtres et tri. La cle de cache commence toujours par le nom de la
 * table : toute ecriture sur cette table rafraichit ses lectures.
 */
export function useRows(table, { key = [], build, enabled = true, select = '*' } = {}) {
  return useQuery({
    queryKey: [table, ...key],
    queryFn: async () => {
      const q = supabase.from(table).select(select);
      return unwrap(await (build ? build(q) : q));
    },
    enabled,
  });
}

/**
 * Ecriture : insertion si pas d'id, mise a jour sinon, ou upsert si
 * `onConflict` est donne (ex. 'user_id,day' pour le journal du jour).
 */
export function useSave(table, { onConflict, also = [] } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row) => {
      const { id, ...rest } = row;
      let q;
      if (onConflict) q = supabase.from(table).upsert(row, { onConflict });
      else if (id) q = supabase.from(table).update(rest).eq('id', id);
      else q = supabase.from(table).insert(rest);
      return unwrap(await q.select().single());
    },
    onSettled: () => [table, ...also].forEach((t) => qc.invalidateQueries({ queryKey: [t] })),
  });
}

export function useRemove(table, { also = [] } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => unwrap(await supabase.from(table).delete().eq('id', id)),
    onSettled: () => [table, ...also].forEach((t) => qc.invalidateQueries({ queryKey: [t] })),
  });
}

/** Plusieurs lignes d'un coup (placement automatique, plan de revision). */
export function useBulk(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, onConflict }) =>
      unwrap(await supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined).select()),
    onSettled: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').single()),
  });
}

/** Habitudes actives, triees : la base de presque tous les ecrans. */
export function useHabits() {
  return useRows('habits', {
    build: (q) => q.eq('archived', false).order('position'),
  });
}
