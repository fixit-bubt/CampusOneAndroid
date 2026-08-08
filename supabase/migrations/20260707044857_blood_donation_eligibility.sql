-- 0071 blood donation eligibility — make the 90-day wait real
--
-- Before: donors.last_donated was a self-typed date that never auto-updated,
-- and the "Eligible / Recently donated" pill was cosmetic. Now:
--  - a confirmed donation stamps donors.last_donated (the clock actually ticks),
--  - requesters can see who pledged (names) and confirm who actually donated,
--  - posting a request notifies matching, currently-eligible donors.
-- Dates use Asia/Dhaka to match the client's localToday() rule (UTC would be
-- off by one near midnight for UTC+6 users).

-- Records that a pledge resulted in an actual donation.
alter table public.blood_pledges add column if not exists fulfilled_at timestamptz;

create index if not exists blood_pledges_request_id_idx on public.blood_pledges (request_id);

-- Requester confirms a specific donor donated for their request. Stamps the
-- donor's 90-day clock (SECURITY DEFINER crosses the donor-row RLS boundary,
-- but only for the request's owner and only for someone who actually pledged).
create or replace function public.confirm_blood_donation(p_request_id uuid, p_donor_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_req uuid;
  v_code text;
begin
  select requester_id, code into v_req, v_code
  from public.blood_requests where id = p_request_id;

  if v_req is null then
    return json_build_object('ok', false, 'error', 'Request not found.');
  end if;
  if v_req <> auth.uid() then
    return json_build_object('ok', false, 'error', 'Only the requester can confirm a donation.');
  end if;
  if not exists (
    select 1 from public.blood_pledges
    where request_id = p_request_id and donor_id = p_donor_id
  ) then
    return json_build_object('ok', false, 'error', 'That donor has not offered to help.');
  end if;

  update public.blood_pledges
    set fulfilled_at = now()
    where request_id = p_request_id and donor_id = p_donor_id and fulfilled_at is null;

  update public.donors
    set last_donated = (now() at time zone 'Asia/Dhaka')::date,
        updated_at   = now()
    where user_id = p_donor_id;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  values (
    p_donor_id, 'blood', 'Thank you for donating',
    'Your donation was confirmed. You''ll be eligible to donate again in 90 days.',
    v_code, 'blood_request'
  );

  return json_build_object('ok', true);
end;
$$;

-- Requester-only view of who pledged to their request, with the donor names
-- (profiles are otherwise unreadable to the requester) and eligibility inputs.
create or replace function public.donor_pledges_for_request(p_request_id uuid)
returns table(
  donor_id uuid,
  full_name text,
  blood_group text,
  last_donated date,
  fulfilled_at timestamptz,
  pledged_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select pl.donor_id, p.full_name, d.blood_group, d.last_donated, pl.fulfilled_at, pl.created_at
  from public.blood_pledges pl
  join public.blood_requests b on b.id = pl.request_id
  left join public.profiles p on p.id = pl.donor_id
  left join public.donors d on d.user_id = pl.donor_id
  where pl.request_id = p_request_id
    and b.requester_id = auth.uid()
  order by pl.created_at desc;
$$;

-- New request -> notify matching-group, currently-eligible donors (in-app feed).
-- Exact blood-group match only; cross-group compatibility (e.g. O- universal)
-- is intentionally left out to avoid mismatched pings.
create or replace function public.notify_blood_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  select
    d.user_id, 'blood',
    new.urgency || ': ' || new.blood_group || ' blood needed',
    'Patient ' || new.patient || ' at ' || new.hospital || ' needs ' || new.blood_group || '. Tap if you can help.',
    new.code, 'blood_request'
  from public.donors d
  where d.blood_group = new.blood_group
    and d.user_id <> new.requester_id
    and (d.last_donated is null
         or d.last_donated <= (now() at time zone 'Asia/Dhaka')::date - 90);
  return new;
end;
$$;

drop trigger if exists trg_notify_blood_request on public.blood_requests;
create trigger trg_notify_blood_request
  after insert on public.blood_requests
  for each row execute function public.notify_blood_request();

-- Lock down the new definer RPCs: authenticated only, never anon/PUBLIC.
-- NB: Supabase default privileges auto-grant anon EXECUTE on new functions, so
-- revoking PUBLIC is not enough — anon must be revoked explicitly.
revoke execute on function public.confirm_blood_donation(uuid, uuid) from public, anon;
revoke execute on function public.donor_pledges_for_request(uuid) from public, anon;
grant execute on function public.confirm_blood_donation(uuid, uuid) to authenticated;
grant execute on function public.donor_pledges_for_request(uuid) to authenticated;
