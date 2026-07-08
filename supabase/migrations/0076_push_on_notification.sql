-- 0076 fan every new notification out to push (pg_net -> send-push edge function)
--
-- Each row inserted into `notifications` (by any of the existing triggers -
-- reports, announcements, claims, blood, study, ...) is POSTed to the send-push
-- edge function, which delivers it via FCM to the user's registered devices.
-- The bearer is the project's public anon key (safe to embed; it only satisfies
-- the function's verify_jwt gate). The service-account key that actually sends
-- lives in the function's FCM_SERVICE_ACCOUNT secret, never here.

create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net'
as $$
begin
  perform net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZ3B4dnlxcnVmYmJ1aXZ0dG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTkxNTIsImV4cCI6MjA5NTk5NTE1Mn0.hjKh52Svwou5xZCvDic-WLkpGCFfuGWdDksIy4vUXcs'
    ),
    body := jsonb_build_object(
      'user_id',        new.user_id,
      'title',          new.title,
      'body',           new.body,
      'sector',         new.sector,
      'reference_id',   new.reference_id,
      'reference_type', new.reference_type
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

revoke execute on function public.push_on_notification() from public, anon;
