-- Migration: 20261017000000_tier2_security_hardening.sql
-- Description:
-- 1. Attributive spoofing fix on study materials & question bank inserts (uploaded_by = auth.uid()).
-- 2. Ride contact WhatsApp privacy fix for ride requests (respects show_whatsapp flag).
-- 3. Lock down email_is_registered RPC from anon probing.

-- 1. Study Hub Insert Policies Hardening
drop policy if exists study_materials_insert on public.study_materials;
create policy study_materials_insert on public.study_materials
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.study_courses c
      where c.id = course_id and public.study_can_edit(c.section_id)
    )
  );

drop policy if exists study_qb_insert on public.study_question_bank;
create policy study_qb_insert on public.study_question_bank
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.study_can_edit(section_id)
  );

-- 2. Ride Contact Privacy Guard (Respects show_whatsapp for all post types)
drop function if exists public.ride_contact(text, uuid);
create or replace function public.ride_contact(p_code text, p_target uuid)
returns table(name text, whatsapp text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_ride_id uuid;
  v_driver uuid;
  v_post_type text;
begin
  if v_caller is null then
    return;
  end if;

  select id, driver_id, coalesce(post_type, 'offer')
  into v_ride_id, v_driver, v_post_type
  from public.rides
  where code = upper(trim(p_code)) or id::text = p_code;

  if v_ride_id is null then
    return;
  end if;

  -- Self lookup
  if p_target = v_caller then
    return query
      select p.full_name, p.whatsapp
      from public.profiles p where p.id = p_target;
    return;
  end if;

  -- Case 1: Driver offering a ride (post_type = 'offer')
  if v_post_type = 'offer' then
    -- Passenger asking for DRIVER's number: allowed if passenger has an ACCEPTED booking
    if p_target = v_driver
       and exists (select 1 from public.ride_requests
                   where ride_id = v_ride_id and requester_id = v_caller and status = 'accepted') then
      return query
        select p.full_name,
               case when p.show_whatsapp then p.whatsapp else null end
        from public.profiles p where p.id = p_target;
      return;
    end if;

    -- Driver asking for a PASSENGER's number: allowed if passenger has an existing booking
    if v_caller = v_driver
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
    if p_target = v_driver then
      return query
        select p.full_name,
               case when p.show_whatsapp then p.whatsapp else null end
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

-- 3. Lock down email_is_registered from anon enumeration
revoke execute on function public.email_is_registered(text) from public, anon;
grant execute on function public.email_is_registered(text) to authenticated;

