-- Lets a chat message carry a photo (e.g. a homework problem to ask about),
-- stored in the existing public `photos` bucket like every other image
-- upload in the app (see src/utils/storage.ts uploadPhoto). A message can now
-- be image-only (no caption text), so the old "body must be non-empty"
-- check is relaxed to "body or image, at least one".

alter table public.chatbot_messages
  add column image_url text;

alter table public.chatbot_messages
  drop constraint chatbot_messages_body_check;

alter table public.chatbot_messages
  add constraint chatbot_messages_body_or_image_check
  check (char_length(body) > 0 or image_url is not null);

alter table public.chatbot_messages
  alter column body set default '';
