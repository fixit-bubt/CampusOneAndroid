-- Splits the chatbot's single continuous thread per user into multiple named
-- conversations (ChatGPT-style: sidebar history, resume an old chat, start a
-- new one). chatbot_messages keeps its own user_id (unchanged RLS shape) and
-- gains a conversation_id grouping FK.

create table public.chatbot_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chatbot_conversations_user_idx on public.chatbot_conversations (user_id, updated_at desc);

revoke all on public.chatbot_conversations from anon;
alter table public.chatbot_conversations enable row level security;

create policy chatbot_conversations_select_own on public.chatbot_conversations
  for select to authenticated using (user_id = (select auth.uid()));
create policy chatbot_conversations_insert_own on public.chatbot_conversations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy chatbot_conversations_update_own on public.chatbot_conversations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy chatbot_conversations_delete_own on public.chatbot_conversations
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.chatbot_conversations to authenticated;

-- Link messages to a conversation.
alter table public.chatbot_messages
  add column conversation_id uuid references public.chatbot_conversations (id) on delete cascade;

-- Backfill: one conversation per user who already has messages, titled from
-- their first user-role message, spanning their existing message timestamps.
with backfill as (
  insert into public.chatbot_conversations (user_id, title, created_at, updated_at)
  select
    grp.user_id,
    coalesce(
      (select left(m.body, 60) from public.chatbot_messages m
       where m.user_id = grp.user_id and m.role = 'user'
       order by m.created_at asc limit 1),
      'New chat'
    ),
    grp.min_created,
    grp.max_created
  from (
    select user_id, min(created_at) as min_created, max(created_at) as max_created
    from public.chatbot_messages
    group by user_id
  ) grp
  returning id, user_id
)
update public.chatbot_messages m
set conversation_id = b.id
from backfill b
where m.user_id = b.user_id;

alter table public.chatbot_messages alter column conversation_id set not null;
create index chatbot_messages_conversation_idx on public.chatbot_messages (conversation_id, created_at asc);

-- Bumps the parent conversation's updated_at whenever a message is added, so
-- the sidebar list can sort by most-recent activity with no client bookkeeping.
create or replace function public.touch_chatbot_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chatbot_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger chatbot_messages_touch_conversation
  after insert on public.chatbot_messages
  for each row execute function public.touch_chatbot_conversation();

-- Tighten the insert policy: conversation_id must belong to the same
-- authenticated user, not just user_id matching auth.uid() in isolation —
-- otherwise a client could attach its own messages to someone else's
-- conversation row (self-inflicted data pollution, not a read leak since
-- SELECT still filters by user_id, but sloppy to allow).
drop policy chatbot_messages_insert_own on public.chatbot_messages;
create policy chatbot_messages_insert_own on public.chatbot_messages
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chatbot_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
