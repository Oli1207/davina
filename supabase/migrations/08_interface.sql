-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — interface à la manière de Kairos : pointage « manqué » et « jour de
-- repos », mode « jour léger » explicite. À coller APRÈS 01 à 07, une seule fois.
-- ═══════════════════════════════════════════════════════════════════════════

-- Un pointage peut maintenant être : complet, version 2 minutes, manqué (assumé),
-- ou jour de repos (maladie, voyage : ne casse pas la série).
alter table public.checkins drop constraint if exists checkins_level_check;
alter table public.checkins add constraint checkins_level_check
  check (level in ('full', 'min', 'miss', 'rest'));

-- Jour plein ou jour léger, choisi au check-in du matin (ou à la main).
alter table public.day_logs
  add column mode text not null default 'plein' check (mode in ('plein', 'leger'));

-- Les jours « manqué » et « repos » ne comptent pas comme des actions tenues.
create or replace function public.progress_by_month() returns table (
  month date, active_days int, actions int, notes int
) language sql stable security invoker as $$
  with c as (
    select date_trunc('month', day)::date m, count(*)::int n, count(distinct day)::int d
    from public.checkins where user_id = auth.uid() and level in ('full', 'min') group by 1
  ), e as (
    select date_trunc('month', day)::date m, count(*)::int n
    from public.entries where user_id = auth.uid() group by 1
  )
  select coalesce(c.m, e.m), coalesce(c.d, 0), coalesce(c.n, 0), coalesce(e.n, 0)
  from c full join e on c.m = e.m
  order by 1;
$$;
