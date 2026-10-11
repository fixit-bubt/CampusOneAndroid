-- ============================================================================
-- Migration: 20261014000000_blood_notifications_360.sql
-- Blood Donation Notification System Hardening & Two-Way Loop
--
-- 1. Adds alert_urgency column to public.donors ('urgent_only', 'today_plus', 'all')
-- 2. Trigger on blood_pledges INSERT: Immediately alerts requester when a donor pledges
-- 3. Trigger on blood_pledges DELETE: Alerts requester if a donor cancels pledge
-- 4. Trigger on blood_requests UPDATE: Alerts unfulfilled pledged donors when blood is arranged
-- 5. Enhances notify_blood_request() with area matching, urgency filtering, and notif_prefs guards
-- 6. Strict SecOps permissions: revoke execute from public and anon
-- ============================================================================

-- 1. Add alert_urgency column to public.donors
alter table public.donors
  add column if not exists alert_urgency text not null default 'all'
  check (alert_urgency in ('urgent_only', 'today_plus', 'all'));

-- 2. Notify requester when a donor offers help (blood_pledges INSERT)
create or replace function public.notify_blood_pledge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_donor_name text;
begin
  select id, code, patient, hospital, blood_group, requester_id
  into v_req
  from public.blood_requests
  where id = new.request_id;

  if v_req is null or v_req.requester_id is null then
    return new;
  end if;

  -- Don't notify if the requester pledged to their own request
  if v_req.requester_id = new.donor_id then
    return new;
  end if;

  select full_name into v_donor_name
  from public.profiles
  where id = new.donor_id;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  values (
    v_req.requester_id,
    'blood',
    '🩸 Donor Available: ' || v_req.blood_group,
    coalesce(v_donor_name, 'A student') || ' offered to donate for ' || trim(replace(v_req.patient, '[Platelets]', '')) || ' at ' || v_req.hospital || '. Tap to contact immediately.',
    v_req.id::text,
    'blood_pledge'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_blood_pledge on public.blood_pledges;
create trigger trg_notify_blood_pledge
  after insert on public.blood_pledges
  for each row execute function public.notify_blood_pledge();

-- 3. Notify requester if a pledged donor cancels their offer (blood_pledges DELETE)
create or replace function public.notify_blood_pledge_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_donor_name text;
begin
  select id, code, patient, hospital, blood_group, requester_id, fulfilled_at
  into v_req
  from public.blood_requests
  where id = old.request_id;

  -- If request was already fulfilled, cancellation is expected/irrelevant
  if v_req is null or v_req.requester_id is null or v_req.fulfilled_at is not null then
    return old;
  end if;

  if v_req.requester_id = old.donor_id then
    return old;
  end if;

  select full_name into v_donor_name
  from public.profiles
  where id = old.donor_id;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  values (
    v_req.requester_id,
    'blood',
    'Pledge Cancelled (' || v_req.blood_group || ')',
    coalesce(v_donor_name, 'A donor') || ' is no longer able to donate for ' || trim(replace(v_req.patient, '[Platelets]', '')) || '.',
    v_req.id::text,
    'blood_pledge_cancelled'
  );

  return old;
end;
$$;

drop trigger if exists trg_notify_blood_pledge_cancelled on public.blood_pledges;
create trigger trg_notify_blood_pledge_cancelled
  after delete on public.blood_pledges
  for each row execute function public.notify_blood_pledge_cancelled();

-- 4. Notify unfulfilled pledged donors when blood is arranged (blood_requests UPDATE)
create or replace function public.notify_blood_request_fulfilled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fulfilled_at is not null and old.fulfilled_at is null then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select
      pl.donor_id,
      'blood',
      'Blood Arranged (' || trim(replace(new.patient, '[Platelets]', '')) || ')',
      'Blood for ' || trim(replace(new.patient, '[Platelets]', '')) || ' at ' || new.hospital || ' has been arranged. Thank you so much for stepping up to help!',
      new.code,
      'blood_request_fulfilled'
    from public.blood_pledges pl
    where pl.request_id = new.id
      and pl.donor_id <> new.requester_id
      and pl.fulfilled_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_blood_request_fulfilled on public.blood_requests;
create trigger trg_notify_blood_request_fulfilled
  after update on public.blood_requests
  for each row execute function public.notify_blood_request_fulfilled();

-- 5. Enhanced notify_blood_request with area matching, urgency filtering & notif_prefs
create or replace function public.notify_blood_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wait_days integer;
  v_is_platelet boolean;
begin
  -- Dengue Platelet requests allow apheresis donors who donated 14+ days ago
  if new.patient ilike '%[Platelets]%' or new.hospital ilike '%platelet%' then
    v_wait_days := 14;
    v_is_platelet := true;
  else
    v_wait_days := 90;
    v_is_platelet := false;
  end if;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  select
    d.user_id,
    'blood',
    case
      when d.area is not null and length(trim(d.area)) > 1 and (new.area ilike '%' || d.area || '%' or new.hospital ilike '%' || d.area || '%')
        then '🚨 URGENT: ' || new.blood_group || ' needed near you in ' || d.area || '!'
      when v_is_platelet
        then '⚡ Dengue Platelets: ' || new.blood_group || ' needed at ' || new.hospital
      when new.urgency = 'Urgent'
        then '🚨 Urgent: ' || new.blood_group || ' blood needed at ' || new.hospital
      when new.urgency = 'Today'
        then '⚡ Today: ' || new.blood_group || ' blood needed at ' || new.hospital
      else '📅 Blood Request: ' || new.blood_group || ' needed at ' || new.hospital
    end,
    'Patient ' || trim(replace(new.patient, '[Platelets]', '')) || ' at ' || new.hospital || ' (' || coalesce(new.area, 'Dhaka') || ') needs ' || coalesce(new.units, 1) || ' unit(s). Tap if you can help.',
    new.code,
    'blood_request'
  from public.donors d
  where d.blood_group = any(public.compatible_donor_groups(new.blood_group))
    and d.user_id <> new.requester_id
    and (d.last_donated is null
         or d.last_donated <= (now() at time zone 'Asia/Dhaka')::date - v_wait_days)
    -- Respect user urgency sensitivity preference
    and (
      new.urgency = 'Urgent'
      or (new.urgency = 'Today' and d.alert_urgency in ('today_plus', 'all'))
      or (new.urgency = 'This week' and d.alert_urgency = 'all')
    )
    -- Respect notification preferences
    and not exists (
      select 1 from public.notif_prefs p
      where p.user_id = d.user_id
        and (
          (p.sector = '_paused' and p.enabled = true)
          or (p.sector = 'blood' and p.enabled = false)
        )
    );

  return new;
end;
$$;

-- 6. Lock down definer RPCs
revoke execute on function public.notify_blood_pledge() from public, anon;
revoke execute on function public.notify_blood_pledge_cancelled() from public, anon;
revoke execute on function public.notify_blood_request_fulfilled() from public, anon;
revoke execute on function public.notify_blood_request() from public, anon;
grant execute on function public.notify_blood_pledge() to authenticated;
grant execute on function public.notify_blood_pledge_cancelled() to authenticated;
grant execute on function public.notify_blood_request_fulfilled() to authenticated;
grant execute on function public.notify_blood_request() to authenticated;
