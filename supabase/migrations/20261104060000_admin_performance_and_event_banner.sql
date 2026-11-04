-- ============================================================================
-- Migration: 20261104060000_admin_performance_and_event_banner.sql
-- Description: Indexes, RPCs, and optimizations for Admin/Staff/Student operations
-- ============================================================================

-- 1. High-Performance Indexes for Admin & Staff Queries
create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_role_name_idx
  on public.profiles (role, full_name asc);

create index if not exists reports_staff_active_idx
  on public.reports (assigned_staff_id, created_at desc)
  where deleted_at is null;

create index if not exists reports_admin_feed_idx
  on public.reports (created_at desc)
  where deleted_at is null;

create index if not exists listings_created_at_idx
  on public.listings (created_at desc);

create index if not exists jobs_all_created_at_idx
  on public.jobs (created_at desc);

-- 2. RPC: set_event_banner (Atomically updates event hero banner status & order)
create or replace function public.set_event_banner(
  p_id uuid,
  p_in_banner boolean,
  p_order integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  update public.events
  set in_banner = p_in_banner,
      banner_order = case when p_in_banner then p_order else 0 end
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.set_event_banner(uuid, boolean, integer) to authenticated;

-- 3. RPC: admin_report_stats (Consolidates 3 round-trips into 1 single database scan)
create or replace function public.admin_report_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unassigned bigint;
  v_active bigint;
  v_resolved bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  select
    count(*) filter (where status = 'Open' and assigned_staff_id is null and deleted_at is null),
    count(*) filter (where assigned_staff_id is not null and status in ('Open', 'In Progress') and deleted_at is null),
    count(*) filter (where status in ('Resolved', 'Closed') and deleted_at is null)
  into v_unassigned, v_active, v_resolved
  from public.reports;

  return jsonb_build_object(
    'unassigned', coalesce(v_unassigned, 0),
    'active', coalesce(v_active, 0),
    'resolved', coalesce(v_resolved, 0)
  );
end;
$$;

grant execute on function public.admin_report_stats() to authenticated;

-- 4. RPC: event_rsvp_counts (Replaces unbounded select from event_rsvps)
create or replace function public.event_rsvp_counts()
returns table(event_id uuid, rsvps bigint)
language sql
security definer
set search_path = public
as $$
  select r.event_id, count(*)::bigint
  from public.event_rsvps r
  group by r.event_id;
$$;

grant execute on function public.event_rsvp_counts() to authenticated;

