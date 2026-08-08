-- BACKFILL (2026-08-08): applied live 2026-06-14, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Let the assigned staff DECLINE a report: it goes back to the admin pool
-- (unassigned + Open) so the admin can reassign it.

-- 1) Allow the decline transition in the update guard (runs with auth.uid()
--    even inside SECURITY DEFINER, so it must permit this explicitly).
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_admin() then return new; end if;
  if new.reporter_id is distinct from old.reporter_id then
    raise exception 'A report''s reporter cannot be changed';
  end if;

  -- Assigned staff declining: unassign + reopen (handled via decline_report RPC).
  if old.assigned_staff_id is not null
     and old.assigned_staff_id = auth.uid()
     and new.assigned_staff_id is null
     and new.status = 'Open' then
    return new;
  end if;

  if new.assigned_staff_id is distinct from old.assigned_staff_id then
    raise exception 'Only an admin can change report assignment';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and not (old.reporter_id = auth.uid() and old.status = 'Open') then
    raise exception 'Only the reporter (while Open) or an admin can delete a report';
  end if;
  if new.status is distinct from old.status then
    if old.assigned_staff_id is null or old.assigned_staff_id <> auth.uid() then
      raise exception 'Only the assigned staff or an admin can change a report''s status';
    end if;
    if not ((old.status = 'Open' and new.status = 'In Progress')
         or (old.status = 'In Progress' and new.status = 'Resolved')) then
      raise exception 'Assigned staff may only move Open->In Progress or In Progress->Resolved';
    end if;
  end if;
  return new;
end; $function$;

-- 2) RPC the assigned staff calls to decline. SECURITY DEFINER bypasses the
--    owner-only reports_update RLS; it validates the caller is the assignee.
create or replace function public.decline_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignee uuid;
begin
  select assigned_staff_id into v_assignee
  from public.reports
  where id = p_report_id and deleted_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Report not found.');
  end if;
  if v_assignee is null or v_assignee <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'This report is not assigned to you.');
  end if;

  update public.reports
  set assigned_staff_id = null,
      status = 'Open'
  where id = p_report_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.decline_report(uuid) to authenticated;
