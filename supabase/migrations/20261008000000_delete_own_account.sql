-- Google Play Requirement: In-App and Web-based user account deletion
-- Enables authenticated users to permanently delete their own account and all associated data.

create or replace function public.delete_own_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Remove user-owned records that may not cascade directly
  delete from public.study_section_members where user_id = v_uid;
  delete from public.connections where requester_id = v_uid or addressee_id = v_uid;
  delete from public.blood_pledges where donor_id = v_uid;
  delete from public.donors where user_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;

  -- 2. Mark marketplace listings and rides as closed/deleted if any
  delete from public.listings where seller_id = v_uid;
  delete from public.rides where driver_id = v_uid;

  -- 3. Delete the auth user (cascades to profiles, notifications, etc.)
  delete from auth.users where id = v_uid;

  return true;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

