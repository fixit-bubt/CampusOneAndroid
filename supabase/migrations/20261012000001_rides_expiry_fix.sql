-- Ensure newly posted rides are never expired instantly upon creation
create or replace function public.set_ride_expires_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expires_at is null then
    -- Clean up 3 hours after scheduled departure time in Asia/Dhaka timezone,
    -- or at least 3 hours from creation time to protect recently posted rides.
    new.expires_at := greatest(
      (new.date || ' ' || coalesce(nullif(new.time, ''), '23:59'))::timestamp at time zone 'Asia/Dhaka' + interval '3 hours',
      now() + interval '3 hours'
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.set_ride_expires_at() from public, anon;
grant execute on function public.set_ride_expires_at() to authenticated;

