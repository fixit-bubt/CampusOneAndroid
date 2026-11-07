-- Evaluate auth.uid() once per query instead of once per row in RLS policies.
do $$
declare
  p record;
  q text;
  w text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and ((qual ~ 'auth\.uid\(\)' and qual !~ 'SELECT auth\.uid')
        or (with_check ~ 'auth\.uid\(\)' and with_check !~ 'SELECT auth\.uid'))
  loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    w := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then stmt := stmt || ' using (' || q || ')'; end if;
    if w is not null then stmt := stmt || ' with check (' || w || ')'; end if;
    execute stmt;
  end loop;
end $$;

-- Unindexed foreign keys
create index if not exists club_join_requests_decided_by_idx on public.club_join_requests (decided_by);
create index if not exists routine_pins_routine_id_idx on public.routine_pins (routine_id);
create index if not exists user_custom_routine_slots_slot_id_idx on public.user_custom_routine_slots (slot_id);

-- Duplicate index
drop index if exists public.listings_course_code_idx;

-- Redundant permissive SELECT policies
drop policy if exists academic_calendar_anon_select on public.academic_calendar;

drop policy if exists staff_admin_manage_exam_slots on public.exam_slots;
drop policy if exists staff_admin_insert_exam_slots on public.exam_slots;
create policy staff_admin_insert_exam_slots on public.exam_slots for insert to authenticated
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));
drop policy if exists staff_admin_update_exam_slots on public.exam_slots;
create policy staff_admin_update_exam_slots on public.exam_slots for update to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')))
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));
drop policy if exists staff_admin_delete_exam_slots on public.exam_slots;
create policy staff_admin_delete_exam_slots on public.exam_slots for delete to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));

drop policy if exists staff_admin_manage_routine_slots on public.routine_slots;
drop policy if exists staff_admin_insert_routine_slots on public.routine_slots;
create policy staff_admin_insert_routine_slots on public.routine_slots for insert to authenticated
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));
drop policy if exists staff_admin_update_routine_slots on public.routine_slots;
create policy staff_admin_update_routine_slots on public.routine_slots for update to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')))
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));
drop policy if exists staff_admin_delete_routine_slots on public.routine_slots;
create policy staff_admin_delete_routine_slots on public.routine_slots for delete to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','staff')));

-- SECURITY DEFINER hygiene: trigger functions are never called over RPC,
-- banner RPCs are for signed-in users only.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('notify_connection_event','notify_report_assignment','touch_chatbot_conversation',
                        'trg_notify_application_status','trg_notify_job_application')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('reorder_banner_items','set_announcement_banner','set_club_banner','set_club_post_banner')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'compatible_donor_groups'
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;
