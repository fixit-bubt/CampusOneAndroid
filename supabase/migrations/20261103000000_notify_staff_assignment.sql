-- ============================================================================
-- Migration: notify_staff_assignment
-- ----------------------------------------------------------------------------
-- When an admin assigns a report to a staff member (assigned_staff_id set or changed),
-- create an in-app notification row for the assigned staff member.
-- This automatically triggers push_on_notification() to dispatch an FCM push
-- notification directly to the staff member's device.
-- ============================================================================

create or replace function public.notify_report_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc text;
begin
  -- Trigger whenever a ticket gets assigned to a staff member or reassigned to a different staff member
  if new.assigned_staff_id is not null
     and (TG_OP = 'INSERT' or old.assigned_staff_id is null or new.assigned_staff_id is distinct from old.assigned_staff_id) then
    
    v_loc := concat_ws(' · ', nullif(trim(new.building), ''), nullif(trim(new.room), ''));
    if v_loc = '' then
      v_loc := 'BUBT Campus';
    end if;

    insert into public.notifications (
      user_id,
      sector,
      title,
      body,
      reference_id,
      reference_type
    )
    values (
      new.assigned_staff_id,
      'reports',
      'New Task: ' || coalesce(new.code, 'Workorder'),
      'Assigned ' || coalesce(new.category, 'maintenance') || ' issue at ' || v_loc || ': "' || left(coalesce(new.description, ''), 70) || '"',
      new.id::text,
      'report'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_report_assignment on public.reports;
create trigger trg_notify_report_assignment
  after insert or update on public.reports
  for each row execute function public.notify_report_assignment();

