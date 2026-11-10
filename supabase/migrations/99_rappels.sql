-- ═══════════════════════════════════════════════════════════════════════════
-- Davina — planification du rappel (à exécuter APRÈS avoir déployé la
-- fonction « rappels », voir docs/SUPABASE.md).
--
-- Remplace les deux valeurs entre chevrons avant d'exécuter :
--   <PROJECT_URL>  ex. https://abcdefgh.supabase.co
--   <CRON_SECRET>  la même valeur que le secret CRON_SECRET de la fonction
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<PROJECT_URL>', 'davina_project_url');
select vault.create_secret('<CRON_SECRET>', 'davina_cron_secret');

-- Chaque minute : le rappel tombe à l'heure choisie par chaque personne.
select cron.schedule(
  'davina-rappels',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'davina_project_url') || '/functions/v1/rappels',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'davina_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Ménage : on ne garde que 14 jours d'historique d'envois.
select cron.schedule('davina-menage', '17 3 * * *', $$ delete from public.push_log where day < current_date - 14 $$);
