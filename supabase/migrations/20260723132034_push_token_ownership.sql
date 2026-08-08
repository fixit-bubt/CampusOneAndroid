-- 0080 push token ownership: one device token belongs to one account
--
-- push_tokens is keyed (user_id, token), and RLS only lets a user touch their
-- own rows. So when a second account signs in on the same phone, the first
-- account's row survives and FCM keeps delivering that account's pushes to a
-- device someone else is now holding. The client cannot clean that up (RLS
-- hides the other row), so registration moves to a SECURITY DEFINER RPC that
-- claims the token for the caller and drops every other claim on it.

create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_token), '') = '' then
    raise exception 'empty token';
  end if;

  -- One physical device, one owner: this account takes the token over.
  delete from public.push_tokens
   where token = p_token and user_id <> (select auth.uid());

  insert into public.push_tokens (user_id, token, platform, updated_at)
  values ((select auth.uid()), p_token, coalesce(p_platform, 'android'), now())
  on conflict (user_id, token) do update
    set platform = excluded.platform, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Clear the dupes already in the table (a shared phone left two accounts
-- pointing at the same FCM token); keep the most recent claim.
delete from public.push_tokens a
 using public.push_tokens b
 where a.token = b.token
   and (a.updated_at, a.user_id) < (b.updated_at, b.user_id);
