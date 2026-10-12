-- ============================================================================
-- FixIt — Migration 20261020010000: Automated BUBT Events Sync Cron Schedule
-- ----------------------------------------------------------------------------
-- Schedules automated BUBT official events crawler via pg_cron + pg_net.
-- Runs every 30 minutes between 02:00 and 16:00 UTC (08:00 AM to 10:00 PM Dhaka).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule if already present
select cron.unschedule('auto-sync-bubt-events')
where exists (
  select 1 from cron.job where jobname = 'auto-sync-bubt-events'
);

-- Schedule for every 30 minutes during campus active hours
select cron.schedule(
  'auto-sync-bubt-events',
  '*/30 2-16 * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/sync-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', coalesce((select value from public.app_config where key = 'sync_secret' limit 1), '')
    ),
    body := '{"triggered_by":"cron"}'::jsonb
  );
  $$
);
