-- Run the remove-session-files edge function every 5 minutes, so uploads are
-- gone 30-35 minutes after they land. The sample_* defaults are kept.
--
-- Needs two Vault secrets, created once by hand so no key lives in git:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('sb_secret_...', 'remove_session_files_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Scheduling under an existing name replaces that job, so this is re-runnable.
select cron.schedule(
  'remove-session-files',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/remove-session-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'remove_session_files_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
