-- User-authored accomplishments on the Profile screen (Accomplishments
-- section). Self-scoped: a student adds their own award/certificate/project/
-- etc entries; only the owner can see or manage them (this is the "my
-- profile" screen, not the public directory profile view).

create table public.accomplishments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  category   text not null check (category in ('award', 'cert', 'project', 'volunteer', 'leadership', 'research')),
  title      text not null check (char_length(title) >= 1),
  org        text,
  year       text,
  created_at timestamptz not null default now()
);

create index accomplishments_user_idx on public.accomplishments (user_id, created_at desc);

revoke all on public.accomplishments from anon;
alter table public.accomplishments enable row level security;

create policy accomplishments_select_own on public.accomplishments
  for select to authenticated using (user_id = (select auth.uid()));
create policy accomplishments_insert_own on public.accomplishments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy accomplishments_delete_own on public.accomplishments
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.accomplishments to authenticated;
