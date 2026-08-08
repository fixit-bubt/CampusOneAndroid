-- 0077 harden the push pipeline with a shared secret
--
-- Before: send-push only sat behind verify_jwt with the public anon key as
-- bearer, so anyone who extracted the anon key from the APK could POST a forged
-- push to a known user. Now the trigger also sends x-push-secret from a private
-- app_config row; the edge function rejects anything without it. The secret
-- value is inserted out-of-band (never in git).

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- RLS on with NO policy => only service_role / SECURITY DEFINER can read it.
alter table public.app_config enable row level security;

create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net'
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.app_config where key = 'push_secret';

  perform net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZ3B4dnlxcnVmYmJ1aXZ0dG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTkxNTIsImV4cCI6MjA5NTk5NTE1Mn0.hjKh52Svwou5xZCvDic-WLkpGCFfuGWdDksIy4vUXcs',
      'x-push-secret', coalesce(v_secret, '')
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

revoke execute on function public.push_on_notification() from public, anon;
