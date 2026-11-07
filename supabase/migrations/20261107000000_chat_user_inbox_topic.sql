-- One realtime inbox per user for DMs.
--
-- Until now each DM was only broadcast to its conversation topic, so the
-- mobile client held one private channel per DM partner and the count grew
-- with every connection. DMs now also go to both participants' personal
-- topic (chat:user:<uuid>), letting the app listen on a single channel.
-- The conversation topic is still sent, so the web client is unaffected.

create or replace function public.broadcast_message_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_topic text;
begin
  v_topic := case new.kind
    when 'dm'      then 'chat:dm:' || new.peer_low || ':' || new.peer_high
    when 'club'    then 'chat:club:' || new.club_id
    when 'section' then 'chat:section:' || new.section_id
  end;

  begin
    perform realtime.broadcast_changes(
      v_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
    );
    if new.kind = 'dm' then
      perform realtime.broadcast_changes(
        'chat:user:' || new.peer_low, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
      perform realtime.broadcast_changes(
        'chat:user:' || new.peer_high, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;
  exception when others then
    -- never let a broadcast failure abort the message; client refetches on reconnect
    null;
  end;

  return new;
end;
$$;
revoke execute on function public.broadcast_message_change() from public, anon;

-- Only the owner may join their inbox topic.
drop policy if exists chat_topic_read on realtime.messages;
create policy chat_topic_read on realtime.messages for select to authenticated using (
  case
    when realtime.topic() ~ '^chat:user:[0-9a-f-]{36}$' then
      auth.uid()::text = split_part(realtime.topic(), ':', 3)
    when realtime.topic() like 'chat:dm:%' then
      auth.uid()::text in (
        split_part(realtime.topic(), ':', 3),
        split_part(realtime.topic(), ':', 4)
      )
    when realtime.topic() ~ '^chat:club:[0-9a-f-]{36}$' then
      public.club_is_member(split_part(realtime.topic(), ':', 3)::uuid)
    when realtime.topic() ~ '^chat:section:[0-9a-f-]{36}$' then
      public.study_is_member(split_part(realtime.topic(), ':', 3)::uuid)
    else false
  end
);
