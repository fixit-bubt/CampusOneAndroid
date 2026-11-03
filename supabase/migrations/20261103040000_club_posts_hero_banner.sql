-- ============================================================================
-- Migration: 20261103040000_club_posts_hero_banner.sql
-- Description: Enable Club News/Posts curation on the Home Hero Banner.
-- Target table: public.club_posts (instead of club organizations)
-- ============================================================================

-- 1. Add banner curation columns to club_posts
alter table public.club_posts
  add column if not exists in_banner boolean not null default false,
  add column if not exists banner_order integer not null default 0;

-- 2. Partial index for active banner club posts
create index if not exists club_posts_banner_idx
  on public.club_posts (banner_order asc, created_at desc)
  where in_banner = true;

-- 3. Open club_posts SELECT to all authenticated users
-- Club posts are official announcements published by club leaders for the campus community
drop policy if exists club_posts_select on public.club_posts;
create policy club_posts_select on public.club_posts
  for select to authenticated
  using (true);

-- 4. RPC to set club post banner status
create or replace function public.set_club_post_banner(
  p_id uuid,
  p_in_banner boolean,
  p_order integer default 0
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  update public.club_posts
  set in_banner = p_in_banner,
      banner_order = case when p_in_banner then p_order else 0 end
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.set_club_post_banner(uuid, boolean, integer) to authenticated;

-- 5. Update reorder_banner_items to reorder club_posts when type = 'club'
create or replace function public.reorder_banner_items(
  p_items jsonb
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  item_id uuid;
  item_type text;
  item_order integer;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    item_id := (item->>'id')::uuid;
    item_type := item->>'type';
    item_order := (item->>'order')::integer;

    if item_type = 'announcement' then
      update public.announcements
      set in_banner = true,
          banner_order = item_order
      where id = item_id;
    elsif item_type = 'event' then
      update public.events
      set in_banner = true,
          banner_order = item_order
      where id = item_id;
    elsif item_type = 'club' then
      update public.club_posts
      set in_banner = true,
          banner_order = item_order
      where id = item_id;
    end if;
  end loop;

  return true;
end;
$$;

grant execute on function public.reorder_banner_items(jsonb) to authenticated;

