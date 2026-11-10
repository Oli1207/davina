-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — Études, partie 2 (repris de Kairos) : culture financière,
-- argumentation, prise de parole (avec audio), pipeline de contenu, mot du jour.
-- À coller APRÈS 01 à 05, une seule fois.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles add column finance_start date;          -- début du programme de 9 semaines
alter table public.day_logs add column word_used boolean;           -- « mot du jour » placé dans une conversation

-- Culture financière : le programme est dans le code, seule la progression est en base.
create table public.finance_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week smallint not null check (week between 1 and 9),
  action_done boolean not null default false,
  notes text not null default '',
  takeaways text not null default '',
  primary key (user_id, week)
);

create table public.arguments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topic text not null check (length(btrim(topic)) > 0),
  thesis text not null default '',
  args text[] not null default '{}',
  objection text not null default '',
  rebuttal text not null default '',
  conclusion text not null default '',
  created_at timestamptz not null default now()
);

create table public.speeches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  topic text not null,
  kind text not null default 'impro',
  duration_sec int check (duration_sec between 1 and 7200),
  audio_path text,
  clarity smallint check (clarity between 1 and 5),
  pace smallint check (pace between 1 and 5),
  structure smallint check (structure between 1 and 5),
  voice smallint check (voice between 1 and 5),
  presence smallint check (presence between 1 and 5),
  fillers smallint check (fillers between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Pipeline de création de contenu : idée, en cours, prêt, publié.
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  pillar text not null default 'instagram',              -- la plateforme
  title text not null check (length(btrim(title)) > 0),
  details text not null default '',
  status text not null default 'idee' check (status in ('idee', 'en_cours', 'pret', 'fait')),
  due_on date,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.arguments (user_id, created_at desc);
create index on public.speeches (user_id, day desc);
create index on public.content_items (user_id, status);

do $$
declare t text;
begin
  foreach t in array array['finance_progress', 'arguments', 'speeches', 'content_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "données personnelles" on public.%I for all
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Enregistrements de prise de parole : bucket privé, un dossier par personne (paroles/<user_id>/<fichier>).
insert into storage.buckets (id, name, public) values ('paroles', 'paroles', false)
on conflict (id) do nothing;

create policy "mes enregistrements" on storage.objects
  for all to authenticated
  using (bucket_id = 'paroles' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'paroles' and (storage.foldername(name))[1] = (select auth.uid())::text);
