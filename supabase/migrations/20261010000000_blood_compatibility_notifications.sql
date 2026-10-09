-- Blood donation cross-compatibility & apheresis platelet notifications
-- 
-- 1. Introduces compatible_donor_groups() mapping clinical recipient blood groups
--    to allowable donor blood groups per hematology standards.
-- 2. Updates notify_blood_request() to alert all compatible, eligible donors,
--    and applies a 14-day recovery window for dengue platelet apheresis requests.
-- 3. Revokes anon execute privileges per SecOps policy.

create or replace function public.compatible_donor_groups(p_group text)
returns text[]
language sql
immutable
as $$
  select case p_group
    when 'A+'  then array['A+', 'A-', 'O+', 'O-']
    when 'A-'  then array['A-', 'O-']
    when 'B+'  then array['B+', 'B-', 'O+', 'O-']
    when 'B-'  then array['B-', 'O-']
    when 'AB+' then array['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    when 'AB-' then array['A-', 'B-', 'AB-', 'O-']
    when 'O+'  then array['O+', 'O-']
    when 'O-'  then array['O-']
    else array[p_group]
  end;
$$;

create or replace function public.notify_blood_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_wait_days integer;
begin
  -- Dengue Platelet requests allow apheresis donors who donated 14+ days ago
  if new.patient ilike '%[Platelets]%' or new.hospital ilike '%platelet%' then
    v_wait_days := 14;
  else
    v_wait_days := 90;
  end if;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  select
    d.user_id, 'blood',
    new.urgency || ': ' || new.blood_group || ' blood needed',
    'Patient ' || trim(replace(new.patient, '[Platelets]', '')) || ' at ' || new.hospital || ' needs ' || new.blood_group || '. Tap if you can help.',
    new.code, 'blood_request'
  from public.donors d
  where d.blood_group = any(public.compatible_donor_groups(new.blood_group))
    and d.user_id <> new.requester_id
    and (d.last_donated is null
         or d.last_donated <= (now() at time zone 'Asia/Dhaka')::date - v_wait_days);
  return new;
end;
$$;

revoke execute on function public.notify_blood_request() from public, anon;
revoke execute on function public.compatible_donor_groups(text) from anon;
grant execute on function public.compatible_donor_groups(text) to authenticated;
