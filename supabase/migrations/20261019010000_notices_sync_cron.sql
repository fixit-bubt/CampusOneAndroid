-- ============================================================================
-- FixIt — Migration 20261019010000: Automated BUBT Notice Sync Cron Schedule
-- ----------------------------------------------------------------------------
-- Schedules automated BUBT official notices crawler via pg_cron + pg_net.
-- Runs every 30 minutes between 02:00 and 16:00 UTC (08:00 AM to 10:00 PM Dhaka).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule if already present
select cron.unschedule('auto-sync-bubt-notices')
where exists (
  select 1 from cron.job where jobname = 'auto-sync-bubt-notices'
);

-- Schedule for every 30 minutes during campus active hours
select cron.schedule(
  'auto-sync-bubt-notices',
  '*/30 2-16 * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/sync-notices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        current_setting('app.settings.service_role_key', true),
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      )
    ),
    body := '{"triggered_by":"cron"}'::jsonb
  );
  $$
);
