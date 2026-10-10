-- ============================================================================
-- Migration: 20261013010000_rides_360_hardening.sql
-- 1. Updates ride_contact RPC to support passenger requests (post_type = 'request')
--    and resolve by either code or id::text.
-- 2. Prevents false "Ride Cancelled" notifications on lazy expiry deletions.
-- 3. Notifies drivers when a passenger voluntarily cancels their seat request.
-- 4. Updates set_ride_expires_at trigger to re-compute on date/time update.
-- 5. Restricts ride_requests INSERT to posts with post_type = 'offer'.
-- 6. Adds composite indexes for query performance.
-- 7. Revokes anon execute privileges per SecOps policy.
-- ============================================================================

-- 1. ride_contact RPC enhancement
create or replace function public.ride_contact(p_code text, p_target uuid)
returns table (name text, whatsapp text)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_ride_id   uuid;
  v_driver    uuid;
  v_post_type text;
begin
  -- Resolve by either unique code or id (supports both mobile & web callers)
  select id, driver_id, coalesce(post_type, 'offer')
    into v_ride_id, v_driver, v_post_type
  from public.rides
  where code = p_code or id::text = p_code;

  if v_ride_id is null then return; end if;

  -- Case 1: Driver offering a ride (post_type = 'offer')
  if v_post_type = 'offer' then
    -- A seat REQUESTER asking for the DRIVER's number -> always shown.
    if p_target = v_driver
       and exists (select 1 from public.ride_requests
                   where ride_id = v_ride_id and requester_id = auth.uid()) then
      return query
        select p.full_name, p.whatsapp
        from public.profiles p where p.id = p_target;
      return;
    end if;

    -- The DRIVER asking for a REQUESTER's number -> gated by show_whatsapp.
    if v_driver = auth.uid()
       and exists (select 1 from public.ride_requests
                   where ride_id = v_ride_id and requester_id = p_target) then
      return query
        select p.full_name,
               case when p.show_whatsapp then p.whatsapp else null end
        from public.profiles p where p.id = p_target;
      return;
    end if;

  -- Case 2: Passenger requesting a ride (post_type = 'request')
  elsif v_post_type = 'request' then
    -- Any authenticated student (driver/carpooler) asking for the REQUESTING PASSENGER's number
    -- to offer a lift or coordinate carpooling.
    if p_target = v_driver then
      return query
        select p.full_name, p.whatsapp
        from public.profiles p where p.id = p_target;
      return;
    end if;
  end if;

  -- No relationship -> reveal nothing.
  return;
end;
$$;

revoke execute on function public.ride_contact(text, uuid) from public, anon;
grant execute on function public.ride_contact(text, uuid) to authenticated;

-- 2. notify_ride_cancelled: skip lazy expiry deletions
create or replace function public.notify_ride_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Only notify if the ride was active/future AND deleted by a user/admin.
  -- Do NOT fire false alarms when old rides are lazily cleaned up by delete_expired_rides().
  if (old.expires_at is null or old.expires_at > now()) and auth.uid() is not null then
    for r in (select requester_id from public.ride_requests where ride_id = old.id) loop
      if r.requester_id <> old.driver_id then
        insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
        values (
          r.requester_id,
          'ride',
          'Ride Cancelled (' || coalesce(old.code, 'Ride') || ')',
          'The ride ' || coalesce(old.origin, '') || ' → ' || coalesce(old.destination, '') || ' has been cancelled by the driver.',
          old.id::text,
          'ride'
        );
      end if;
    end loop;
  end if;
  return old;
end;
$$;

revoke execute on function public.notify_ride_cancelled() from public, anon;
grant execute on function public.notify_ride_cancelled() to authenticated;

-- 3. notify_ride_request_event: notify driver when passenger voluntarily cancels
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
    select driver_id, code, origin, destination
      into v_driver_id, v_ride_code, v_origin, v_destination
    from public.rides where id = old.ride_id;

    -- Sub-case A: Removed by driver -> notify the passenger
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
    -- Sub-case B: Cancelled by passenger -> notify the driver
    elsif old.requester_id = auth.uid() and v_driver_id is not null and v_driver_id <> auth.uid() then
      select full_name into v_actor_name from public.profiles where id = old.requester_id;
      insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
      values (
        v_driver_id,
        'ride',
        'Seat Cancelled (' || coalesce(v_ride_code, 'Ride') || ')',
        coalesce(v_actor_name, 'A passenger') || ' cancelled their seat on ride ' || coalesce(v_origin, '') || ' → ' || coalesce(v_destination, '') || '.',
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

-- 4. Expiry Trigger: calculate on insert or update
create or replace function public.set_ride_expires_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expires_at is null or (tg_op = 'UPDATE' and (new.date is distinct from old.date or new.time is distinct from old.time)) then
    new.expires_at := greatest(
      (new.date || ' ' || coalesce(nullif(trim(new.time), ''), '23:59'))::timestamp at time zone 'Asia/Dhaka' + interval '3 hours',
      now() + interval '3 hours'
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.set_ride_expires_at() from public, anon;
grant execute on function public.set_ride_expires_at() to authenticated;

drop trigger if exists rides_set_expires_at on public.rides;
create trigger rides_set_expires_at
  before insert or update of date, time on public.rides
  for each row execute function public.set_ride_expires_at();

-- 5. RLS Policy: Restrict seat requests to posts offering a ride
drop policy if exists ride_req_insert on public.ride_requests;
create policy ride_req_insert on public.ride_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.driver_id <> auth.uid()
        and coalesce(r.post_type, 'offer') = 'offer'
    )
  );

-- 6. Performance Indexes
create index if not exists idx_rides_date_time on public.rides (date, time);
create index if not exists idx_rides_direction_post_type on public.rides (direction, post_type);
