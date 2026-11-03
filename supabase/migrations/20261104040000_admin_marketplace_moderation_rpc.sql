-- Migration: 20261104040000_admin_marketplace_moderation_rpc.sql
-- Enables reasoned marketplace moderation with automated seller notification

create or replace function public.admin_moderate_listing(
  p_listing_id uuid,
  p_reason text
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
  v_code text;
begin
  -- 1. Authorization check: Only administrators can moderate listings
  if not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can moderate marketplace listings';
  end if;

  -- 2. Fetch listing details prior to deletion
  select seller_id, title, code into v_seller, v_title, v_code
  from public.listings
  where id = p_listing_id;

  if v_seller is null then
    raise exception 'Listing not found';
  end if;

  -- 3. Insert notification for seller (Security Definer permits insert)
  insert into public.notifications (
    user_id,
    sector,
    title,
    body,
    reference_id,
    reference_type
  ) values (
    v_seller,
    'market',
    'Marketplace Listing Removed',
    'Your listing "' || coalesce(v_title, 'item') || '" was taken down by campus administration. Reason: ' || coalesce(p_reason, 'Policy violation'),
    v_code,
    'listing'
  );

  -- 4. Delete the moderated listing from table
  delete from public.listings where id = p_listing_id;

  return true;
end;
$$;

revoke execute on function public.admin_moderate_listing(uuid, text) from public, anon;
grant execute on function public.admin_moderate_listing(uuid, text) to authenticated;
