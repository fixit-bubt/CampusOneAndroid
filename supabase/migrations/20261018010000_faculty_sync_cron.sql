-- Migration: 20261018010000_faculty_sync_cron.sql
-- Description:
-- Schedules automated monthly BUBT faculty directory crawl via pg_cron + pg_net.
-- Runs at 03:00 AM Dhaka time (UTC+6 -> 21:00 UTC) on the 1st of every month.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule if already present
select cron.unschedule('auto-sync-bubt-faculty')
where exists (
  select 1 from cron.job where jobname = 'auto-sync-bubt-faculty'
);

-- Schedule for 1st of every month at 21:00 UTC (03:00 AM Dhaka)
select cron.schedule(
  'auto-sync-bubt-faculty',
  '0 21 1 * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/sync-faculty',
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

