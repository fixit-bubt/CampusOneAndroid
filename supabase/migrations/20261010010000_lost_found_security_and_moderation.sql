-- Migration: 20261010010000_lost_found_security_and_moderation.sql
-- Hardens Lost & Found security boundaries:
-- 1. Adds column immutability guard trigger on lost_found_items (prevents tampering with core fields or reopening resolved items with approved claims).
-- 2. Restores admin content moderation capability (allows proctors/admins to view and soft-delete abusive posts).
-- 3. Sanitizes lockscreen push notification body for claim notifications.

-- 1. Column Immutability Guard Trigger
create or replace function public.guard_item_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent altering core immutable properties
  if new.id is distinct from old.id
     or new.poster_id is distinct from old.poster_id
     or new.code is distinct from old.code
     or new.created_at is distinct from old.created_at then
    raise exception 'Core item properties cannot be modified';
  end if;

  -- Once an item is Resolved with an Approved claim, status cannot be reverted to Open
  if old.status = 'Resolved' and new.status = 'Open' then
    if exists (select 1 from public.claims where item_id = old.id and status = 'Approved') then
      raise exception 'Cannot re-open an item that has an approved claim';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_item_update() from public, anon, authenticated;

drop trigger if exists items_guard_update on public.lost_found_items;
create trigger items_guard_update
  before update on public.lost_found_items
  for each row execute function public.guard_item_update();

-- 2. Admin Content Moderation Policies
drop policy if exists items_select on public.lost_found_items;
create policy items_select on public.lost_found_items for select to authenticated
  using (
    (deleted_at is null and public.is_student())
    or public.is_admin()
  );

drop policy if exists items_update on public.lost_found_items;
create policy items_update on public.lost_found_items for update to authenticated
  using (
    (poster_id = auth.uid() and public.is_student())
    or public.is_admin()
  )
  with check (
    (poster_id = auth.uid() and public.is_student())
    or public.is_admin()
  );

-- 3. Push Notification Body Sanitization for Claims
create or replace function public.notify_claim_received()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_poster uuid;
  v_title text;
begin
  select poster_id, title into v_poster, v_title
  from public.lost_found_items where id = new.item_id;
  if v_poster is not null and v_poster <> new.claimant_id then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      v_poster,
      'lostfound',
      'New claim on "' || coalesce(v_title, 'your item') || '"',
      'A student submitted a claim with verification details.',
      new.code,
      'claim'
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_claim_received() from public, anon;
grant execute on function public.notify_claim_received() to authenticated;
