-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — schéma de la base (à coller dans Supabase > SQL Editor > Run)
--
-- Chaque table porte un user_id rempli automatiquement avec auth.uid() :
-- le front n'a jamais à l'envoyer. La Row Level Security (fin du fichier)
-- garantit qu'on ne voit et ne modifie que ses propres lignes, sauf ce
-- que la personne a choisi de partager avec son binôme (colonne `shared`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Profil ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Africa/Abidjan',
  reminder_time time not null default '08:00',   -- un seul rappel par jour
  reminder_on boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Domaines de vie ─────────────────────────────────────────────────────────
-- Le catalogue des 10 domaines vit dans le code (frontend/src/data/domains.js) :
-- ici on ne garde que ce que la personne en fait.

create table public.user_domains (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  domain text not null check (domain in
    ('esprit','corps','coeur','relations','savoir','travail','argent','mission','expression','joie')),
  active boolean not null default false,
  vision text not null default '',
  score smallint check (score between 1 and 10),  -- dernière note de la roue
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, domain)
);

-- Une note par domaine et par mois : l'évolution de la roue.
create table public.wheel_scores (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  domain text not null,
  month date not null,                              -- premier jour du mois
  score smallint not null check (score between 1 and 10),
  primary key (user_id, domain, month)
);

-- ─── Parcours : des chapitres de vie qui s'enchaînent ───────────────────────
-- Un parcours est un chemin avec un début, des étapes et des livrables
-- (ex. « Bâtisseur, 12 mois »). On peut en mener plusieurs en parallèle et
-- les enchaîner à vie : `previous_id` relie un parcours à celui dont il est
-- la suite. Actions et notes peuvent s'y rattacher : c'est ce qui permet,
-- des années plus tard, de relire tout ce qu'un parcours a produit.

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  template text,                                      -- clé du modèle d'origine, null = libre
  domain text,                                        -- domaine principal (facultatif)
  intention text not null default '',                 -- le « pourquoi »
  starts_on date not null,
  ends_on date,                                       -- null = sans fin prévue
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  conclusion text not null default '',                -- bilan écrit en le terminant
  finished_on date,
  previous_id uuid references public.journeys on delete set null,
  created_at timestamptz not null default now()
);

create table public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid not null references public.journeys on delete cascade,
  position int not null default 0,
  title text not null,
  about text not null default '',                     -- ce qu'on y travaille, une ligne par point
  starts_on date,
  ends_on date
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid not null references public.journeys on delete cascade,
  step_id uuid references public.journey_steps on delete cascade,
  title text not null,
  note text not null default '',                      -- le résumé ou le lien de ce qu'on a produit
  position int not null default 0,
  done_on date
);

-- ─── Lecture : livres, pages lues, fiches de synthèse ───────────────────────
-- `pages_read` est tenu à jour par un déclencheur : la liste des livres n'a
-- jamais à relire tout l'historique des pages.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid references public.journeys on delete set null,
  domain text,
  title text not null,
  author text not null default '',
  total_pages int check (total_pages > 0),
  pages_read int not null default 0,
  status text not null default 'to_read' check (status in ('to_read', 'reading', 'done', 'dropped')),
  started_on date,
  finished_on date,
  created_at timestamptz not null default now()
);

create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  book_id uuid not null references public.books on delete cascade,
  day date not null default current_date,
  pages int not null check (pages <> 0),               -- négatif = correction
  created_at timestamptz not null default now()
);

-- Security invoker : la RLS s'applique, donc un journal de pages ne peut jamais
-- modifier le livre de quelqu'un d'autre.
create function public.sync_pages_read() returns trigger
language plpgsql security invoker set search_path = public as $$
declare b uuid := coalesce(new.book_id, old.book_id);
begin
  update public.books set pages_read = greatest(0, coalesce(
    (select sum(pages) from public.reading_logs where book_id = b), 0))
  where id = b;
  return null;
end $$;

create trigger reading_logs_sync
  after insert or delete on public.reading_logs
  for each row execute function public.sync_pages_read();

-- La fiche de synthèse : ce qu'on retient d'un livre, en quatre questions.
create table public.book_summaries (
  book_id uuid primary key references public.books on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  learned text not null default '',
  disagree text not null default '',
  country text not null default '',
  apply text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── Habitudes et pointages ──────────────────────────────────────────────────
-- Chaque habitude a une version complète et une version « 2 minutes » :
-- la version minimale compte comme tenue, la chaîne ne casse jamais.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid references public.journeys on delete set null,
  domain text not null,
  title text not null,
  full_version text not null default '',
  min_version text not null default '',
  days smallint[] not null default '{0,1,2,3,4,5,6}',  -- 0 = dimanche
  at_time time,                                        -- facultatif
  position int not null default 0,
  archived boolean not null default false,
  shared boolean not null default false,               -- visible par le binôme
  created_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  day date not null,
  level text not null check (level in ('full', 'min')),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

-- Check-in du matin en 10 secondes.
create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  energy smallint check (energy between 1 and 5),
  mood smallint check (mood between 1 and 5),
  sleep_hours numeric(3,1),
  gratitude text not null default '',
  primary key (user_id, day)
);

-- ─── Capture libre et bilans ─────────────────────────────────────────────────

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  journey_id uuid references public.journeys on delete set null,
  domain text,                                        -- null = non classé
  kind text not null default 'note'
    check (kind in ('note','idee','lecon','gratitude','rencontre','lecture','victoire','erreur')),
  body text not null check (length(btrim(body)) > 0),
  day date not null default current_date,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,                           -- le lundi
  learned text not null default '',
  did text not null default '',
  change text not null default '',
  primary key (user_id, week_start)
);

-- ─── Binôme : partage flexible, élément par élément ──────────────────────────
-- Une personne peut avoir plusieurs binômes. Chaque habitude, note ou domaine
-- porte un interrupteur « partagé » : seuls les éléments partagés sont visibles.

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  a uuid not null default auth.uid() references auth.users on delete cascade,
  b uuid references auth.users on delete cascade,
  code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_at timestamptz not null default now(),
  check (a <> b)
);

create function public.is_partner(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pairs
    where b is not null
      and ((a = auth.uid() and b = other) or (b = auth.uid() and a = other))
  );
$$;

-- Rejoindre avec un code d'invitation (à usage unique).
create function public.join_pair(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare p public.pairs; who text;
begin
  select * into p from public.pairs where code = lower(btrim(p_code)) and b is null for update;
  if not found then raise exception 'Code invalide ou déjà utilisé.'; end if;
  if p.a = auth.uid() then raise exception 'Tu ne peux pas rejoindre ta propre invitation.'; end if;
  if exists (select 1 from public.pairs where b is not null
             and ((a = p.a and b = auth.uid()) or (a = auth.uid() and b = p.a))) then
    raise exception 'Vous êtes déjà binômes.';
  end if;
  update public.pairs set b = auth.uid() where id = p.id;
  select display_name into who from public.profiles where id = p.a;
  return who;
end $$;

-- Ce que les binômes ont partagé : habitudes et si elles sont faites aujourd'hui.
create function public.partner_overview(p_day date) returns table (
  partner_id uuid, partner_name text, habit_id uuid, title text, domain text, level text
) language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, h.id, h.title, h.domain, c.level
  from public.habits h
  join public.profiles pr on pr.id = h.user_id
  left join public.checkins c on c.habit_id = h.id and c.day = p_day
  where h.shared and not h.archived and public.is_partner(h.user_id)
  order by pr.display_name, h.position;
$$;

-- ─── Progression sur toute la vie ────────────────────────────────────────────
-- Un résumé par mois, calculé par la base (pas de milliers de lignes envoyées
-- au téléphone). Security invoker : la RLS s'applique, et on filtre explicitement
-- sur soi-même pour ne pas compter les notes partagées par un binôme.

create function public.progress_by_month() returns table (
  month date, active_days int, actions int, notes int
) language sql stable security invoker as $$
  with c as (
    select date_trunc('month', day)::date m, count(*)::int n, count(distinct day)::int d
    from public.checkins where user_id = auth.uid() group by 1
  ), e as (
    select date_trunc('month', day)::date m, count(*)::int n
    from public.entries where user_id = auth.uid() group by 1
  )
  select coalesce(c.m, e.m), coalesce(c.d, 0), coalesce(c.n, 0), coalesce(e.n, 0)
  from c full join e on c.m = e.m
  order by 1;
$$;

-- ─── Notifications push ──────────────────────────────────────────────────────

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key, day)
);

-- ─── Index ───────────────────────────────────────────────────────────────────

create index on public.checkins (user_id, day);
create index on public.habits (user_id) where not archived;
create index on public.entries (user_id, created_at desc);
create index on public.entries (user_id, domain);
create index on public.journey_steps (journey_id, position);
create index on public.deliverables (journey_id);
create index on public.journeys (user_id, starts_on desc);
create index on public.habits (journey_id) where journey_id is not null;
create index on public.entries (journey_id) where journey_id is not null;
create index on public.books (user_id, status);
create index on public.books (journey_id) where journey_id is not null;
create index on public.reading_logs (book_id, day);
create index on public.pairs (a);
create index on public.pairs (b);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
create policy "profil personnel" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Un binôme voit le prénom de l'autre (rien d'autre).
create policy "prénom du binôme" on public.profiles
  for select using (public.is_partner(id));

alter table public.push_log enable row level security;   -- aucune policy : service role seulement

do $$
declare t text;
begin
  foreach t in array array[
    'user_domains', 'wheel_scores', 'journeys', 'journey_steps', 'deliverables',
    'books', 'reading_logs', 'book_summaries',
    'habits', 'checkins', 'day_logs', 'reviews', 'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Notes : les siennes, plus celles que le binôme a partagées (en lecture).
alter table public.entries enable row level security;
create policy "mes notes" on public.entries
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes partagées" on public.entries
  for select using (shared and public.is_partner(user_id));

alter table public.pairs enable row level security;
create policy "mes binômes" on public.pairs
  for select using (a = (select auth.uid()) or b = (select auth.uid()));
create policy "créer une invitation" on public.pairs
  for insert with check (a = (select auth.uid()) and b is null);
create policy "quitter un binôme" on public.pairs
  for delete using (a = (select auth.uid()) or b = (select auth.uid()));

-- ─── Droits de l'API ─────────────────────────────────────────────────────────
-- « Automatically expose new tables » doit être DÉCOCHÉ à la création du projet.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;
revoke all on public.push_log from authenticated;
revoke update on public.pairs from authenticated;
grant execute on function public.join_pair(text), public.partner_overview(date), public.progress_by_month() to authenticated;
revoke execute on function public.join_pair(text), public.partner_overview(date), public.progress_by_month() from anon, public;
