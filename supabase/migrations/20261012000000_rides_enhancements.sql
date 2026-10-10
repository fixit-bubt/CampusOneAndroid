-- ============================================================================
-- Migration: 20261012000000_rides_enhancements.sql
-- 1. Updates ride_req_delete RLS policy to allow mutual cancellation
--    (passengers can cancel their requests, drivers can remove riders, admins moderate).
-- 2. Updates ride_req_select RLS policy to allow admin visibility for moderation.
-- 3. Adds push and in-app notification triggers for ride requests and cancellations.
-- 4. Improves ride expiry calculation with Asia/Dhaka timezone awareness.
-- 5. Revokes anon execute privileges per SecOps policy.
-- ============================================================================

-- 1. Mutual Cancellation & Deletion Policy on ride_requests
drop policy if exists ride_req_delete on public.ride_requests;
create policy ride_req_delete on public.ride_requests for delete to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.id = ride_requests.ride_id
        and r.driver_id = auth.uid()
    )
    or public.is_admin()
  );

-- 2. Admin Visibility on ride_requests
drop policy if exists ride_req_select on public.ride_requests;
create policy ride_req_select on public.ride_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.id = ride_requests.ride_id
        and r.driver_id = auth.uid()
    )
    or public.is_admin()
  );

-- 3. Notification Triggers on ride_requests
create or replace function public.notify_ride_request_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_ride_code text;
  v_origin text;
  v_destination text;
  v_actor_name text;
begin
  if tg_op = 'INSERT' then
    -- Find ride details
    select driver_id, code, origin, destination
      into v_driver_id, v_ride_code, v_origin, v_destination
    from public.rides where id = new.ride_id;

    if v_driver_id is not null and v_driver_id <> new.requester_id then
      select full_name into v_actor_name from public.profiles where id = new.requester_id;
      insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
      values (
        v_driver_id,
        'ride',
        'New Seat Request (' || coalesce(v_ride_code, 'Ride') || ')',
        coalesce(v_actor_name, 'A student') || ' requested a seat on your ride ' || coalesce(v_origin, '') || ' → ' || coalesce(v_destination, '') || '.',
        new.ride_id::text,
        'ride'
      );
    end if;
  elsif tg_op = 'DELETE' then
    -- If deleted by driver (removing rider), notify passenger
    select driver_id, code, origin, destination
      into v_driver_id, v_ride_code, v_origin, v_destination
    from public.rides where id = old.ride_id;

    if v_driver_id = auth.uid() and old.requester_id <> auth.uid() then
      insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
      values (
        old.requester_id,
        'ride',
        'Seat Released (' || coalesce(v_ride_code, 'Ride') || ')',
        'Your seat on ride ' || coalesce(v_origin, '') || ' → ' || coalesce(v_destination, '') || ' was released by the driver.',
        old.ride_id::text,
        'ride'
      );
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

revoke execute on function public.notify_ride_request_event() from public, anon;
grant execute on function public.notify_ride_request_event() to authenticated;

drop trigger if exists trg_notify_ride_request_event on public.ride_requests;
create trigger trg_notify_ride_request_event
  after insert or delete on public.ride_requests
  for each row execute function public.notify_ride_request_event();

-- 4. Notification Trigger when Driver Deletes a Ride (Notify all booked passengers)
create or replace function public.notify_ride_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in (select requester_id from public.ride_requests where ride_id = old.id) loop
    if r.requester_id <> old.driver_id then
      insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
      values (
        r.requester_id,
        'ride',
        'Ride Cancelled (' || old.code || ')',
        'The ride ' || old.origin || ' → ' || old.destination || ' has been cancelled by the driver.',
        old.id::text,
        'ride'
      );
    end if;
  end loop;
  return old;
end;
$$;

revoke execute on function public.notify_ride_cancelled() from public, anon;
grant execute on function public.notify_ride_cancelled() to authenticated;

drop trigger if exists trg_notify_ride_cancelled on public.rides;
create trigger trg_notify_ride_cancelled
  before delete on public.rides
  for each row execute function public.notify_ride_cancelled();

-- 5. Timezone-aware expiry calculation
create or replace function public.set_ride_expires_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expires_at is null then
    -- Clean up 3 hours after scheduled departure time in Asia/Dhaka timezone
    new.expires_at := (new.date || ' ' || coalesce(nullif(new.time, ''), '23:59'))::timestamp at time zone 'Asia/Dhaka' + interval '3 hours';
  end if;
  return new;
end;
$$;

revoke execute on function public.set_ride_expires_at() from public, anon;

