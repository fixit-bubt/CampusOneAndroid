-- Schema-drift recovery (bug audit, 2026-08-09): club_join_requests exists
-- live in production — used by ClubDetailScreen.tsx (request/withdraw) and
-- ClubMembersScreen.tsx (approve/deny) — with NO corresponding migration
-- anywhere in this repo, not even a mismatched one. It was created directly
-- against the database, bypassing the migration system entirely. This
-- migration file reproduces its exact live definition (table, indexes,
-- policies, grants, notify trigger) so the repo finally matches reality; it
-- is applied via `migration repair --status applied`, not `db push`, since
-- every object it defines already exists.
--
-- Note: this contradicts migration 0053_club_hub.sql's stated design rule
-- ("No self-join — officers add members; no application flow") — the
-- self-serve join-request flow was added later, out-of-band, superseding
-- that original design decision without ever being recorded.

create table public.club_join_requests (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  decided_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create index club_join_requests_club_idx on public.club_join_requests (club_id);
create index club_join_requests_user_idx on public.club_join_requests (user_id);
-- One pending request per user per club at a time.
create unique index club_join_requests_pending_uni on public.club_join_requests (club_id, user_id) where (status = 'pending');

alter table public.club_join_requests enable row level security;

create policy cjr_select on public.club_join_requests
  for select
  using (user_id = auth.uid() or public.club_can_manage(club_id) or public.is_admin());

create policy cjr_insert on public.club_join_requests
  for insert
  with check (user_id = auth.uid() and status = 'pending' and not public.club_is_member(club_id));

create policy cjr_update on public.club_join_requests
  for update
  using (status = 'pending' and (public.club_can_manage(club_id) or public.is_admin()))
  with check (status in ('approved', 'denied') and decided_by = auth.uid());

create policy cjr_delete on public.club_join_requests
  for delete
  using (user_id = auth.uid() and status = 'pending');

grant select, insert, update, delete on public.club_join_requests to authenticated;

create or replace function public.notify_club_request_decided()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_club text;
begin
  if new.status = old.status or new.status = 'pending' then
    return new;
  end if;
  if exists (select 1 from notif_prefs where user_id = new.user_id and sector = '_paused' and enabled) then
    return new;
  end if;
  if coalesce((select enabled from notif_prefs where user_id = new.user_id and sector = 'clubs'), true) is false then
    return new;
  end if;
  select name into v_club from clubs where id = new.club_id;
  insert into notifications (user_id, sector, title, body, reference_id, reference_type)
  values (
    new.user_id,
    'clubs',
    case when new.status = 'approved'
      then 'Welcome to ' || coalesce(v_club, 'the club') || '!'
      else 'Update on your ' || coalesce(v_club, 'club') || ' request' end,
    case when new.status = 'approved'
      then 'Your join request was approved — you are now a member.'
      else 'Your join request was not approved this time.' end,
    new.club_id,
    'club'
  );
  return new;
end;
$$;

create trigger club_request_decided_notify
  after update on public.club_join_requests
  for each row execute function public.notify_club_request_decided();
