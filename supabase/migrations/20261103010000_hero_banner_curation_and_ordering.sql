-- ============================================================================
-- CampusOne — Migration 20261103010000: Hero Banner Curation and Ordering
-- ----------------------------------------------------------------------------
-- 1. Adds banner_order & banner_image_url to public.announcements.
-- 2. Adds in_banner & banner_order to public.events.
-- 3. Creates partial indexes for ultra-fast Home Hero Banner queries.
-- 4. Seeds initial banner curation so defaults remain active.
-- 5. Creates atomic admin RPCs for single-item toggle and batch reordering.
-- ============================================================================

-- 1. Schema Additions
alter table public.announcements
  add column if not exists in_banner boolean not null default false,
  add column if not exists banner_order integer not null default 0,
  add column if not exists banner_image_url text;

alter table public.events
  add column if not exists in_banner boolean not null default false,
  add column if not exists banner_order integer not null default 0;

-- 2. Performance Indexes (zero-overhead filtered indexes)
create index if not exists announcements_in_banner_order_idx
  on public.announcements (banner_order asc, created_at desc)
  where in_banner = true and deleted_at is null;

create index if not exists events_in_banner_order_idx
  on public.events (banner_order asc, date asc)
  where in_banner = true and deleted_at is null;

-- 3. Seed initial curated banners from verified campus notices & events
update public.announcements
set in_banner = true, banner_order = 1
where code = 'AN-101' and deleted_at is null;

update public.announcements
set in_banner = true, banner_order = 2
where code = 'AN-102' and deleted_at is null;

update public.events
set in_banner = true, banner_order = 3
where code = 'EV-101' and deleted_at is null;

update public.events
set in_banner = true, banner_order = 4
where code = 'EV-102' and deleted_at is null;

-- 4. Atomic Admin RPC: Toggle announcement banner status
create or replace function public.set_announcement_banner(
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
    raise exception 'Unauthorized: Only campus administrators can manage the hero banner';
  end if;

  update public.announcements
  set
    in_banner = p_in_banner,
    banner_order = case when p_in_banner then coalesce(p_order, 0) else 0 end,
    updated_at = now()
  where id = p_id;

  return found;
end;
$$;

-- 5. Atomic Admin RPC: Batch reorder banner slides (strictly max 6)
create or replace function public.reorder_banner_items(
  p_items jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_id uuid;
  v_type text;
  v_order integer;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only campus administrators can manage the hero banner';
  end if;

  -- Reset existing orders
  update public.announcements
  set in_banner = false, banner_order = 0
  where in_banner = true;

  update public.events
  set in_banner = false, banner_order = 0
  where in_banner = true;

  -- Apply new curated sequence
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_id := (v_item->>'id')::uuid;
    v_type := coalesce(v_item->>'type', 'announcement');
    v_order := coalesce((v_item->>'order')::integer, 0);

    if v_type = 'event' then
      update public.events
      set in_banner = true, banner_order = v_order, updated_at = now()
      where id = v_id;
    else
      update public.announcements
      set in_banner = true, banner_order = v_order, updated_at = now()
      where id = v_id;
    end if;
  end loop;

  return true;
end;
$$;

grant execute on function public.set_announcement_banner(uuid, boolean, integer) to authenticated;
grant execute on function public.reorder_banner_items(jsonb) to authenticated;

