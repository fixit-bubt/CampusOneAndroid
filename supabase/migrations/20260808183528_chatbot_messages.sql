-- Chat history for the AI assistant. Self-scoped like accomplishments: a
-- user only ever sees their own messages. Kept simple (no conversation
-- grouping) since the app has a single ongoing chat per user, not threads.

create table public.chatbot_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user', 'model')),
  body       text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create index chatbot_messages_user_idx on public.chatbot_messages (user_id, created_at desc);

revoke all on public.chatbot_messages from anon;
alter table public.chatbot_messages enable row level security;

create policy chatbot_messages_select_own on public.chatbot_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy chatbot_messages_insert_own on public.chatbot_messages
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy chatbot_messages_delete_own on public.chatbot_messages
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.chatbot_messages to authenticated;
