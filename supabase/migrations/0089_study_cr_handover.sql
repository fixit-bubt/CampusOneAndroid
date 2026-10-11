-- ============================================================================
-- FixIt — Migration 0089: Study Hub — CR Handover and Leave
-- ----------------------------------------------------------------------------
-- Allows a sitting Class Representative (CR) who is the sole CR of a section
-- to hand over the CR role to an approved classmate in the same section
-- before leaving the section.
-- ============================================================================

-- 1. Update study_members_guard to permit CR handover via session flag
create or replace function public.study_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.section_id <> old.section_id or new.user_id <> old.user_id) then
    raise exception 'Cannot move a membership to another section or user';
  end if;

  -- Allow CR role assignment if caller is admin OR during an authorized CR handover
  if new.role = 'cr' and not public.is_admin() and coalesce(current_setting('app.allow_cr_handover', true), 'false') <> 'true' then
    raise exception 'Only an admin can assign the CR role';
  end if;

  -- Block self-approval EXCEPT when joining via a validated code.
  if new.user_id = auth.uid()
     and new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from 'approved')
     and coalesce(new.joined_via, '') <> 'code' then
    raise exception 'You cannot approve your own membership';
  end if;

  if new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;

-- 2. SECURITY DEFINER RPC: study_handover_cr_and_leave
create or replace function public.study_handover_cr_and_leave(
  p_section_id uuid,
  p_new_cr_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_new_cr_status text;
begin
  -- Verify caller is an approved CR of p_section_id
  select role into v_caller_role
  from public.study_section_members
  where section_id = p_section_id and user_id = auth.uid() and status = 'approved';

  if v_caller_role is distinct from 'cr' then
    return jsonb_build_object('ok', false, 'error', 'Only the active Class Representative can transfer this role.');
  end if;

  if p_new_cr_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'You cannot transfer the CR role to yourself.');
  end if;

  -- Verify recipient is an approved member of the same section
  select status into v_new_cr_status
  from public.study_section_members
  where section_id = p_section_id and user_id = p_new_cr_id;

  if v_new_cr_status is distinct from 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Selected student must be an approved member of this section.');
  end if;

  -- Temporarily set session flag to allow CR promotion inside this transaction
  perform set_config('app.allow_cr_handover', 'true', true);

  -- Promote the new CR
  update public.study_section_members
  set role = 'cr',
      decided_by = auth.uid(),
      decided_at = now()
  where section_id = p_section_id and user_id = p_new_cr_id;

  -- Delete caller's membership from the section
  delete from public.study_section_members
  where section_id = p_section_id and user_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.study_handover_cr_and_leave(uuid, uuid) from public, anon;
grant  execute on function public.study_handover_cr_and_leave(uuid, uuid) to authenticated;
