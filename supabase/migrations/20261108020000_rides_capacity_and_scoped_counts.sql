-- Migration: 20261108020000_rides_capacity_and_scoped_counts.sql
-- Description:
-- 1. Optimize public.ride_request_counts to accept optional p_ride_id parameter.
--    Avoids full-table aggregate scans across all rides when viewing a single ride.
-- 2. Ensure public.ride_capacity_guard is idempotent and active.

drop function if exists public.ride_request_counts();
drop function if exists public.ride_request_counts(uuid);

create or replace function public.ride_request_counts(p_ride_id uuid default null)
returns table(ride_id uuid, taken bigint)
language sql
security definer
set search_path = public
as $$
  select rr.ride_id, count(*)::bigint
  from public.ride_requests rr
  where (p_ride_id is null or rr.ride_id = p_ride_id)
  group by rr.ride_id;
$$;

revoke execute on function public.ride_request_counts(uuid) from public, anon;
grant execute on function public.ride_request_counts(uuid) to authenticated;

-- Ensure capacity guard trigger is cleanly defined
create or replace function public.ride_capacity_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  select seats_total into cap from public.rides where id = new.ride_id for update;
  if cap is null then return new; end if;
  select count(*) into taken from public.ride_requests where ride_id = new.ride_id;
  if taken >= cap then
    raise exception 'This ride is full';
  end if;
  return new;
end;
$$;

drop trigger if exists ride_capacity_guard on public.ride_requests;
create trigger ride_capacity_guard
  before insert on public.ride_requests
  for each row execute function public.ride_capacity_guard();

revoke execute on function public.ride_capacity_guard() from public, anon, authenticated;
