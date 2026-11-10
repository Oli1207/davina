-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — module Études (repris de Kairos) : matières, chapitres avec
-- rappels espacés, devoirs, sessions de concentration. À coller APRÈS 01 à 04.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  exam_on date,
  position int not null default 0
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  status text not null default 'a_voir' check (status in ('a_voir', 'vu', 'revise')),
  planned_on date,
  -- Révisions espacées après le premier passage : J+1, J+3, J+7, J+14, J+30.
  review_step smallint not null default 0,
  next_review date,
  confidence smallint check (confidence between 1 and 5),
  explanation text not null default '',               -- technique Feynman
  position int not null default 0
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  course_id uuid references public.courses on delete set null,
  title text not null check (length(btrim(title)) > 0),
  due_on date not null,
  est_min int not null default 60 check (est_min between 5 and 2000),
  priority smallint not null default 2 check (priority between 1 and 3),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  started_at timestamptz not null default now(),
  minutes int not null check (minutes between 1 and 720),
  kind text not null default 'etude',                  -- etude, anglais, contenu…
  course_id uuid references public.courses on delete set null,
  skill text,                                          -- compétence travaillée (anglais)
  goal text not null default '',                       -- objectif annoncé avant la session
  focus smallint check (focus between 1 and 5),        -- concentration ressentie
  distractions text not null default '',               -- pensées parasites gardées
  note text not null default ''
);

-- Les cartes de questions d'un chapitre (rappel actif) vivent dans la même table.
alter table public.cards
  add column course_id uuid references public.courses on delete cascade,
  add column chapter_id uuid references public.chapters on delete cascade;
alter table public.cards drop constraint if exists cards_deck_check;
alter table public.cards add constraint cards_deck_check
  check (deck in ('mots', 'anglais', 'versets', 'autre', 'cours'));

create index on public.courses (user_id, position);
create index on public.chapters (course_id, position);
create index on public.chapters (user_id, next_review) where next_review is not null;
create index on public.assignments (user_id, due_on) where not done;
create index on public.focus_sessions (user_id, started_at desc);
create index on public.cards (chapter_id) where chapter_id is not null;

do $$
declare t text;
begin
  foreach t in array array['courses', 'chapters', 'assignments', 'focus_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
