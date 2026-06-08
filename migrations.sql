-- CampusOne migrations — apply these in Supabase SQL Editor
-- Each block is labelled. Apply only blocks that don't already exist.

-- ─────────────────────────────────────────────────────────────────
-- 1. blood_pledges table (for "I can help" responses to blood requests)
-- ─────────────────────────────────────────────────────────────────
create table if not exists blood_pledges (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references blood_requests(id) on delete cascade,
  donor_id    uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (request_id, donor_id)
);

alter table blood_pledges enable row level security;

create policy "Authenticated users can insert pledges"
  on blood_pledges for insert
  with check (auth.uid() = donor_id);

create policy "Anyone can read pledges"
  on blood_pledges for select
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- 2. donor_contact RPC (returns WhatsApp for a donor)
-- ─────────────────────────────────────────────────────────────────
create or replace function donor_contact(p_user_id uuid)
returns json
language plpgsql security definer as $$
declare
  v_whatsapp text;
begin
  select whatsapp into v_whatsapp
  from profiles
  where id = p_user_id;

  return json_build_object('whatsapp', v_whatsapp);
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 3. listing_contact RPC (returns seller contact for a marketplace listing)
-- ─────────────────────────────────────────────────────────────────
create or replace function listing_contact(p_code text)
returns json
language plpgsql security definer as $$
declare
  v_email   text;
  v_phone   text;
begin
  select p.email, p.whatsapp
  into v_email, v_phone
  from listings l
  join profiles p on p.id = l.seller_id
  where l.code = p_code;

  return json_build_object('email', v_email, 'phone', v_phone);
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 4. student_directory RPC (privacy-safe student list)
-- ─────────────────────────────────────────────────────────────────
create or replace function student_directory()
returns table (
  id          uuid,
  full_name   text,
  department  text,
  intake      text,
  section     text
)
language plpgsql security definer as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.department,
    p.intake,
    p.section
  from profiles p
  where p.role = 'student'
    and (p.directory_visible is null or p.directory_visible = true)
    and p.id <> auth.uid();
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 5. Add directory_visible column to profiles (if not already present)
-- ─────────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists directory_visible boolean default true;


-- ─────────────────────────────────────────────────────────────────
-- 6. Add whatsapp column to profiles (if not already present)
-- ─────────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists whatsapp text;


-- ─────────────────────────────────────────────────────────────────
-- 7. event_organizers table (whitelist of users who can post events)
-- ─────────────────────────────────────────────────────────────────
create table if not exists event_organizers (
  user_id    uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table event_organizers enable row level security;

create policy "Admin can manage event organizers"
  on event_organizers for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Anyone can read event organizers"
  on event_organizers for select
  using (true);
