-- Run the remove-expired-sessions edge function every 5 minutes, so a session
-- and its uploads are gone within 5 minutes of expiring. Defaults are kept.
--
-- Reuses the Vault secrets from 002_schedule_remove_session_files.sql
-- (project_url and remove_session_files_key), so there is nothing new to create.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Scheduling under an existing name replaces that job, so this is re-runnable.
select cron.schedule(
  'remove-expired-sessions',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/remove-expired-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'remove_session_files_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
