-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — module Esprit (repris de Kairos) : plan de lecture, méditation
-- É.O.A.P., sujets de prière et exaucements, jeûne, intercession.
-- À coller dans SQL Editor APRÈS 01 et 02, une seule fois.
-- ═══════════════════════════════════════════════════════════════════════════

-- Une action peut être liée à une activité (ex. « meditation ») : l'écrire dans
-- le journal la coche automatiquement dans « Aujourd'hui ».
alter table public.habits add column kind text;

create table public.bible_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  book text not null,
  chapters smallint not null check (chapters > 0),
  current smallint not null default 1 check (current > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Journal de méditation, méthode É.O.A.P. (Écriture, Observation, Application, Prière).
create table public.devotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  passage text not null default '',
  verse text not null default '',
  observation text not null default '',
  application text not null default '',
  prayer text not null default '',
  created_at timestamptz not null default now()
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  details text not null default '',
  category text not null default 'personnel',
  status text not null default 'en_cours' check (status in ('en_cours', 'exauce')),
  answered_on date,
  testimony text not null default '',
  created_at timestamptz not null default now()
);

create table public.fasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('total', 'partiel', 'daniel', 'sec')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  intention text not null default '',
  ended_at timestamptz,                                -- rupture effective
  completed boolean,
  journal text not null default '',
  created_at timestamptz not null default now()
);

-- Liste d'intercession tournante : un sujet par jour, ou tous les jours.
create table public.intercession_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  category text not null default '',
  weekday smallint check (weekday between 0 and 6),    -- null = tous les jours
  notes text not null default '',
  last_prayed_on date,
  active boolean not null default true
);

create index on public.devotions (user_id, day desc);
create index on public.prayer_requests (user_id, status);
create index on public.fasts (user_id, starts_at desc);
create index on public.intercession_targets (user_id) where active;

do $$
declare t text;
begin
  foreach t in array array['bible_plans', 'devotions', 'prayer_requests', 'fasts', 'intercession_targets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
