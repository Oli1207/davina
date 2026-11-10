-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — Organisation (reprise de Kairos) : rendez-vous à heure fixe avec
-- ponctualité, emploi du temps, créneaux libres, placement des séances.
-- À coller APRÈS 01 à 06, une seule fois.
-- ═══════════════════════════════════════════════════════════════════════════

-- Une action peut avoir une heure fixe, une durée, une marge de grâce,
-- ou revenir « N fois par semaine » (placée alors dans les trous de l'emploi du temps).
alter table public.habits
  add column duration_min int not null default 0 check (duration_min between 0 and 600),
  add column grace_min smallint not null default 15 check (grace_min between 0 and 240),
  add column sacred boolean not null default false,           -- rendez-vous jamais allégé
  add column notify boolean not null default true,            -- rappel à l'heure exacte
  add column per_week smallint check (per_week between 1 and 7),       -- null = certains jours
  add column per_week_min smallint check (per_week_min between 1 and 7);

-- Retard au pointage : « à l'heure », « rattrapé » (hors marge), jamais « manqué » par punition.
alter table public.checkins
  add column late_min smallint check (late_min >= 0);

-- Réveil et coucher : bornes du calcul des créneaux libres.
alter table public.profiles
  add column wake_time time not null default '05:00',
  add column bed_time time not null default '22:30';

-- Emploi du temps : cours, travail, engagements fixes de la semaine.
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  kind text not null default 'cours',
  location text not null default '',
  check (end_time > start_time)
);

-- Séances placées dans la semaine (une par action et par jour).
create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  day date not null,
  at_time time not null,
  unique (habit_id, day)
);

create index on public.schedule_blocks (user_id, weekday, start_time);
create index on public.planned_sessions (user_id, day);

do $$
declare t text;
begin
  foreach t in array array['schedule_blocks', 'planned_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
