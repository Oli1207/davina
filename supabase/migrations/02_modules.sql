-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — modules ajoutés après le schéma de base (à coller dans SQL Editor
-- APRÈS 01_schema.sql, une seule fois) :
--   cartes de révision, carnet de terrain, cercle de mentors, impact, vigilance.
-- ═══════════════════════════════════════════════════════════════════════════

-- Cartes de révision espacée (5 boîtes de Leitner).
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  deck text not null default 'mots' check (deck in ('mots', 'anglais', 'versets', 'autre')),
  front text not null check (length(btrim(front)) > 0),
  back text not null default '',
  example text not null default '',
  box smallint not null default 1 check (box between 1 and 5),
  due_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Carnet de terrain : ce qu'on apprend en écoutant les gens (jamais de noms).
create table public.field_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid references public.journeys on delete set null,
  day date not null default current_date,
  place text not null default '',
  who text not null default '',                       -- un rôle (« agriculteur »), pas un nom
  problems text not null default '',
  solutions text not null default '',
  learned text not null default '',
  created_at timestamptz not null default now()
);

-- Cercle de mentors et de contradicteurs.
create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  role text not null default '',
  kind text not null default 'mentor' check (kind in ('mentor', 'contradicteur')),
  last_met_on date,
  challenge text not null default '',                 -- ce qu'il ou elle m'a contesté
  created_at timestamptz not null default now()
);

-- Impact : des personnes qui ont acquis une compétence, lancé un projet, amélioré leur environnement.
create table public.impact_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid references public.journeys on delete set null,
  day date not null default current_date,
  kind text not null check (kind in ('competence', 'projet', 'amelioration')),
  people int not null default 1 check (people between 0 and 100000),
  body text not null default '',
  created_at timestamptz not null default now()
);

-- Vigilance du bilan hebdomadaire : sauveur, culte de la personnalité, intolérance.
alter table public.reviews add column guard text[] not null default '{}';

create index on public.cards (user_id, due_on);
create index on public.field_notes (user_id, day desc);
create index on public.mentors (user_id);
create index on public.impact_logs (user_id, day desc);

do $$
declare t text;
begin
  foreach t in array array['cards', 'field_notes', 'mentors', 'impact_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
