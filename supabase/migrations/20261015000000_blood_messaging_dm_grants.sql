-- Migration: 20261015000000_blood_messaging_dm_grants.sql
-- Enables in-app direct messaging for blood donation coordination:
-- 1. Expands dm_grants context_type check to include 'donor'.
-- 2. Updates open_dm_thread RPC to support contacting registered donors from registry.

alter table public.dm_grants drop constraint if exists dm_grants_context_type_check;
alter table public.dm_grants add constraint dm_grants_context_type_check
  check (context_type in ('listing', 'ride', 'item', 'blood', 'donor'));

drop function if exists public.open_dm_thread(text, text, uuid);

create or replace function public.open_dm_thread(
  p_code text,
  p_context_type text,
  p_target uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := auth.uid();
  v_ctx    uuid;
  v_owner  uuid;
  v_ok     boolean := false;
begin
  if v_me is null then raise exception 'Not signed in.'; end if;
  if p_target is null or p_target = v_me then raise exception 'Invalid recipient.'; end if;

  if not public.is_student_id(v_me) or not public.is_student_id(p_target) then
    raise exception 'Messaging is available to students only.';
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = p_target)
       or (b.blocker_id = p_target and b.blocked_id = v_me)
  ) then
    raise exception 'You can''t message this person.';
  end if;

  if not coalesce((select allow_dms from public.profiles where id = p_target), true) then
    raise exception 'This student isn''t accepting messages.';
  end if;

  if (select count(*) from public.dm_grants
      where created_by = v_me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many new chats started. Try again later.';
  end if;

  if p_context_type = 'listing' then
    select l.id, l.seller_id into v_ctx, v_owner
    from public.listings l where l.code = p_code;
    v_ok := v_ctx is not null and p_target = v_owner;

  elsif p_context_type = 'ride' then
    select r.id, r.driver_id into v_ctx, v_owner
    from public.rides r where r.code = p_code;
    if v_ctx is not null then
      v_ok :=
        (p_target = v_owner and exists (
           select 1 from public.ride_requests rr
           where rr.ride_id = v_ctx and rr.requester_id = v_me))
        or (v_owner = v_me and exists (
           select 1 from public.ride_requests rr
           where rr.ride_id = v_ctx and rr.requester_id = p_target));
    end if;

  elsif p_context_type = 'item' then
    select i.id, i.poster_id into v_ctx, v_owner
    from public.lost_found_items i where i.code = p_code;
    if v_ctx is not null then
      v_ok := exists (
        select 1 from public.claims c
        where c.item_id = v_ctx
          and c.status = 'Approved'
          and ((c.claimant_id = v_me      and p_target = v_owner)
            or (c.claimant_id = p_target  and v_owner  = v_me))
      );
    end if;

  elsif p_context_type = 'blood' then
    select b.id, b.requester_id into v_ctx, v_owner
    from public.blood_requests b where b.code = p_code;
    if v_ctx is not null then
      v_ok :=
        (p_target = v_owner and exists (
           select 1 from public.blood_pledges p
           where p.request_id = v_ctx and p.donor_id = v_me))
        or (v_owner = v_me and exists (
           select 1 from public.blood_pledges p
           where p.request_id = v_ctx and p.donor_id = p_target));
    end if;

  elsif p_context_type = 'donor' then
    v_ctx := p_target;
    v_ok := exists (
      select 1 from public.donors d where d.user_id = p_target
    );

  else
    raise exception 'Unknown context.';
  end if;

  if not v_ok then
    raise exception 'You can''t message this person about that yet.';
  end if;

  insert into public.dm_grants (peer_low, peer_high, context_type, context_id, created_by)
  values (least(v_me, p_target), greatest(v_me, p_target), p_context_type, v_ctx, v_me)
  on conflict (peer_low, peer_high, context_type, context_id)
  do update set expires_at = now() + interval '90 days';

  return true;
end;
$$;

revoke execute on function public.open_dm_thread(text, text, uuid) from public, anon;
grant execute on function public.open_dm_thread(text, text, uuid) to authenticated;
