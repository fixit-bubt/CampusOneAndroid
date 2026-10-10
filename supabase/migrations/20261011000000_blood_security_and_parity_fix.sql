-- ============================================================================
-- Migration: 20261011000000_blood_security_and_parity_fix.sql
-- 1. Fix donor_contact IDOR vulnerability: strictly restrict contact reveals
--    to registered donors in public.donors, returning table(name, whatsapp).
-- 2. Restrict blood_pledges insert policy: donor must be registered in public.donors.
-- 3. Add partial covering index on active blood requests for query performance.
-- 4. Revoke execute privileges from anon per SecOps policy.
-- ============================================================================

-- 1. donor_contact(p_user_id)
-- Strictly enforce that p_user_id is in public.donors.
-- Returns both name and whatsapp to maintain parity across mobile and web.
create or replace function public.donor_contact(p_user_id uuid)
returns table (name text, whatsapp text)
language sql stable security definer set search_path = public
as $$
  select p.full_name, coalesce(p.whatsapp, p.phone)
  from public.donors d
  join public.profiles p on p.id = d.user_id
  where d.user_id = p_user_id;
$$;

revoke execute on function public.donor_contact(uuid) from public, anon;
grant execute on function public.donor_contact(uuid) to authenticated;

-- 2. blood_requester_contact(p_code)
-- Returns name and whatsapp of requester to a donor who pledged.
create or replace function public.blood_requester_contact(p_code text)
returns table (name text, whatsapp text)
language sql stable security definer set search_path = public
as $$
  select p.full_name, coalesce(p.whatsapp, p.phone)
  from public.blood_requests b
  join public.profiles p on p.id = b.requester_id
  where b.code = p_code
    and exists (
      select 1 from public.blood_pledges pl
      where pl.request_id = b.id and pl.donor_id = auth.uid()
    );
$$;

revoke execute on function public.blood_requester_contact(text) from public, anon;
grant execute on function public.blood_requester_contact(text) to authenticated;

-- 3. Harden blood_pledges insert policy:
-- Require that the pledging user is a registered donor in public.donors.
drop policy if exists blood_pledge_insert on public.blood_pledges;
create policy blood_pledge_insert on public.blood_pledges for insert to authenticated
  with check (
    donor_id = auth.uid()
    and exists (
      select 1 from public.donors d
      where d.user_id = auth.uid()
    )
  );

-- 4. Add index for active unfulfilled blood requests
create index if not exists blood_requests_active_created_idx
  on public.blood_requests (created_at desc)
  where fulfilled_at is null;
