-- 0075 push notifications: device token registry + pg_net for server send
--
-- Direct-FCM push. The client registers its FCM device token here; an edge
-- function (send-push) reads these to deliver via FCM v1. pg_net lets a trigger
-- on `notifications` call that edge function so every in-app notification also
-- becomes a push.

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_tokens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text not null default 'android',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- A user manages only their own device tokens.
drop policy if exists push_tokens_all_own on public.push_tokens;
create policy push_tokens_all_own on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
