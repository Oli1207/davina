-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — module Corps (repris de Kairos) : séances, sucre et sel, repas,
-- poids, eau, bilan du soir. À coller APRÈS 01, 02 et 03, une seule fois.
-- ═══════════════════════════════════════════════════════════════════════════

-- Point de départ et objectif de poids (facultatifs).
alter table public.profiles
  add column height_cm numeric(5,1) check (height_cm between 50 and 260),
  add column start_weight numeric(5,1) check (start_weight between 20 and 400),
  add column target_weight numeric(5,1) check (target_weight between 20 and 400),
  add column weigh_day smallint not null default 6 check (weigh_day between 0 and 6);

-- Le journal du jour s'enrichit : eau, sucre/sel du jour, bilan du soir.
alter table public.day_logs
  add column water smallint not null default 0 check (water between 0 and 50),
  add column sugar_free boolean,
  add column salt_free boolean,
  add column victory text not null default '',
  add column lesson text not null default '';

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 400),
  waist_cm numeric(5,1) check (waist_cm between 20 and 300),
  unique (user_id, day)
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  routine text not null default '',
  minutes int not null check (minutes between 1 and 600),
  effort smallint check (effort between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.cravings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('sucre', 'sel')),
  trigger text not null default '',
  resisted boolean,
  note text not null default ''
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  meal text not null check (meal in ('matin', 'midi', 'soir', 'collation')),
  quality smallint not null check (quality between 1 and 3),   -- 1 équilibré, 2 moyen, 3 écart
  sugar boolean not null default false,
  salt boolean not null default false,
  note text not null default '',
  unique (user_id, day, meal)
);

create index on public.weigh_ins (user_id, day);
create index on public.workouts (user_id, day desc);
create index on public.cravings (user_id, at desc);
create index on public.meals (user_id, day);

do $$
declare t text;
begin
  foreach t in array array['weigh_ins', 'workouts', 'cravings', 'meals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
