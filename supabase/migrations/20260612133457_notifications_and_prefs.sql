-- BACKFILL (2026-08-08): this migration was applied to the live DB on
-- 2026-06-12 (recorded in supabase_migrations.schema_migrations as
-- "notifications_and_prefs") but the file never existed in this repo until
-- now. Content below is the exact original SQL, pulled verbatim via
-- `supabase db query --linked` against the schema_migrations.statements
-- column — not reverse-engineered from live schema. Do not edit.
--
-- ORDERING NOTE: this filename's timestamp prefix sorts AFTER every
-- "00NN_*.sql" file (since '2' > '0'). That's correct for matching the real
-- remote-tracked version, but means a hypothetical from-scratch rebuild via
-- `supabase db push` in filename order would create `notifications` too
-- late for 0071_blood_donation_eligibility.sql / 0074_study_hub_notify_and_bookmarks.sql /
-- 0076_push_on_notification.sql, which reference it. On the live DB this is
-- a non-issue (already applied in the correct real order in 2026-06). Only
-- matters for a fresh rebuild — flagged here rather than silently risking a
-- renumber of the already-correctly-tracked 0062-0081 files.

-- Notifications + per-sector preferences (app-only feature; web has none)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sector text not null,
  title text not null,
  body text,
  read boolean not null default false,
  reference_id text,
  reference_type text,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table public.notif_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sector text not null,
  enabled boolean not null default true,
  push boolean not null default true,
  email boolean not null default false,
  inapp boolean not null default true,
  primary key (user_id, sector)
);

alter table public.notifications enable row level security;
alter table public.notif_prefs enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notif_prefs_all_own" on public.notif_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Generation triggers (security definer bypasses RLS for inserts) ──

-- Report status change → notify reporter
create or replace function public.notify_report_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      new.reporter_id,
      'reports',
      'Report ' || new.code || ': ' || new.status,
      'Your report "' || left(new.description, 80) || '" is now ' || new.status || '.',
      new.code,
      'report'
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_report_status
  after update on public.reports
  for each row execute function public.notify_report_status();

-- New announcement → notify every user
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
  from public.profiles p
  where p.id <> new.created_by;
  return new;
end;
$$;

create trigger trg_notify_new_announcement
  after insert on public.announcements
  for each row execute function public.notify_new_announcement();

-- Claim decided → notify claimant
create or replace function public.notify_claim_decided()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('Approved', 'Rejected') then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      new.claimant_id,
      'lostfound',
      'Claim ' || new.code || ' ' || lower(new.status),
      'Your claim was ' || lower(new.status) || '.',
      new.code,
      'claim'
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_claim_decided
  after update on public.claims
  for each row execute function public.notify_claim_decided();

-- New claim → notify item poster
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
      left(new.message, 120),
      new.code,
      'claim'
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_claim_received
  after insert on public.claims
  for each row execute function public.notify_claim_received();
