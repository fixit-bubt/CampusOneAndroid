-- Migration: 20261010020000_student_directory_enhancements.sql
-- 1. Updates connections_delete RLS policy to allow mutual disconnection when status = 'accepted'.
-- 2. Adds disconnect_student RPC for secure, atomic disconnection.
-- 3. Adds connection event notification triggers for instant in-app alerts and FCM push.
-- 4. Creates student_profile_detail RPC for fast, single-student profile lookups.
-- 5. Updates student_directory RPC to return student_id and is_cr (Class Representative badge).

-- 1. Policy update: Allow deleting pending requests (cancel/decline) or accepted connections (disconnect)
drop policy if exists connections_delete on public.connections;
create policy connections_delete on public.connections for delete to authenticated
  using (
    (status in ('pending', 'accepted'))
    and (requester_id = auth.uid() or addressee_id = auth.uid())
  );

-- 2. Disconnect RPC: Atomic removal of mutual connection
create or replace function public.disconnect_student(p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  deleted_count int;
begin
  if uid is null then
    return false;
  end if;

  delete from public.connections
  where status = 'accepted'
    and ((requester_id = uid and addressee_id = p_target_id)
      or (requester_id = p_target_id and addressee_id = uid));

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke execute on function public.disconnect_student(uuid) from public, anon;
grant execute on function public.disconnect_student(uuid) to authenticated;

-- 3. Notification Triggers on Connections
create or replace function public.notify_connection_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    select full_name into v_actor_name from public.profiles where id = new.requester_id;
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      new.addressee_id,
      'directory',
      'Connection Request',
      coalesce(v_actor_name, 'A student') || ' sent you a connection request.',
      new.requester_id::text,
      'connection_request'
    );
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    select full_name into v_actor_name from public.profiles where id = new.addressee_id;
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      new.requester_id,
      'directory',
      'Connection Accepted',
      coalesce(v_actor_name, 'A student') || ' accepted your connection request.',
      new.addressee_id::text,
      'connection_accepted'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_connection_event on public.connections;
create trigger trg_notify_connection_event
  after insert or update on public.connections
  for each row execute function public.notify_connection_event();

-- 4. Single-student Profile Detail RPC
create or replace function public.student_profile_detail(p_target_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  department text,
  program text,
  intake text,
  section text,
  blood_group text,
  student_id text,
  is_cr boolean,
  status text,
  email text,
  whatsapp text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- Reciprocity: caller must be a visible student
  if not exists (
    select 1 from public.profiles m
    where m.id = uid and m.role = 'student' and m.directory_visible = true
  ) then
    return;
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.department,
    p.program,
    p.intake,
    p.section,
    p.blood_group,
    case when cs.accepted then p.student_id else null end as student_id,
    exists (
      select 1 from public.study_section_members sm
      where sm.user_id = p.id and sm.role = 'cr'
    ) as is_cr,
    coalesce(cs.status_label, 'none') as status,
    case when cs.accepted then p.email else null end as email,
    case when cs.accepted and p.show_whatsapp then p.whatsapp else null end as whatsapp
  from public.profiles p
  left join lateral (
    select
      case
        when c.status = 'accepted' then 'accepted'
        when c.status = 'pending' and c.requester_id = uid then 'pending_outgoing'
        when c.status = 'pending' and c.addressee_id = uid then 'pending_incoming'
        else 'none'
      end as status_label,
      (c.status = 'accepted') as accepted
    from public.connections c
    where (c.requester_id = uid and c.addressee_id = p.id)
       or (c.addressee_id = uid and c.requester_id = p.id)
    order by c.created_at desc
    limit 1
  ) cs on true
  where p.id = p_target_id
    and p.role = 'student'
    and p.directory_visible = true;
end;
$$;

revoke execute on function public.student_profile_detail(uuid) from public, anon;
grant execute on function public.student_profile_detail(uuid) to authenticated;

-- 5. Updated student_directory RPC with student_id and is_cr
drop function if exists public.student_directory();
create function public.student_directory()
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  department text,
  program text,
  intake text,
  section text,
  blood_group text,
  student_id text,
  is_cr boolean,
  status text,
  email text,
  whatsapp text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.profiles m
    where m.id = uid and m.role = 'student' and m.directory_visible = true
  ) then
    return;
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.department,
    p.program,
    p.intake,
    p.section,
    p.blood_group,
    case when cs.accepted then p.student_id else null end as student_id,
    exists (
      select 1 from public.study_section_members sm
      where sm.user_id = p.id and sm.role = 'cr'
    ) as is_cr,
    coalesce(cs.status_label, 'none') as status,
    case when cs.accepted then p.email else null end as email,
    case when cs.accepted and p.show_whatsapp then p.whatsapp else null end as whatsapp
  from public.profiles p
  left join lateral (
    select
      case
        when c.status = 'accepted' then 'accepted'
        when c.status = 'pending' and c.requester_id = uid then 'pending_outgoing'
        when c.status = 'pending' and c.addressee_id = uid then 'pending_incoming'
        else 'none'
      end as status_label,
      (c.status = 'accepted') as accepted
    from public.connections c
    where (c.requester_id = uid and c.addressee_id = p.id)
       or (c.addressee_id = uid and c.requester_id = p.id)
    order by c.created_at desc
    limit 1
  ) cs on true
  where p.role = 'student'
    and p.directory_visible = true
    and p.id <> uid
  order by p.full_name;
end;
$$;

revoke execute on function public.student_directory() from public, anon;
grant execute on function public.student_directory() to authenticated;
