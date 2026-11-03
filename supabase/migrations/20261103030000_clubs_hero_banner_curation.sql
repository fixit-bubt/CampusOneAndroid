-- Migration: 20261103030000_clubs_hero_banner_curation.sql
-- Enables Admin Hero Banner curation and ordering for Campus Clubs alongside Announcements & Events.

-- 1. Add banner curation columns to public.clubs
alter table public.clubs
  add column if not exists in_banner boolean not null default false,
  add column if not exists banner_order integer default 0;

create index if not exists clubs_in_banner_idx
  on public.clubs (banner_order asc, created_at desc)
  where in_banner = true and is_active = true;

-- 2. Dedicated RPC to set club banner status
create or replace function public.set_club_banner(
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
    raise exception 'Unauthorized: Only system administrators can curate hero banners.';
  end if;

  update public.clubs
  set
    in_banner = p_in_banner,
    banner_order = case when p_in_banner then coalesce(p_order, 0) else 0 end
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.set_club_banner(uuid, boolean, integer) to authenticated;

-- 3. Upgrade reorder_banner_items to support announcements, events, and clubs
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
    raise exception 'Unauthorized: Only system administrators can reorder hero banners.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_id := (v_item->>'id')::uuid;
    v_type := coalesce(v_item->>'type', 'announcement');
    v_order := coalesce((v_item->>'order')::integer, 0);

    if v_type = 'event' then
      update public.events
      set banner_order = v_order, in_banner = true
      where id = v_id;
    elsif v_type = 'club' then
      update public.clubs
      set banner_order = v_order, in_banner = true
      where id = v_id;
    else
      update public.announcements
      set banner_order = v_order, in_banner = true
      where id = v_id;
    end if;
  end loop;

  return true;
end;
$$;

grant execute on function public.reorder_banner_items(jsonb) to authenticated;
