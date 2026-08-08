-- 0072 revoke anon on the 0071 blood RPCs
--
-- 0071 revoked PUBLIC but Supabase's default privileges (pg_default_acl) grant
-- anon EXECUTE explicitly on every new function, so anon still had execute.
-- Revoke anon directly. Both RPCs already reject anon at runtime (they gate on
-- auth.uid()), but this closes the surface and clears the advisor.

revoke execute on function public.confirm_blood_donation(uuid, uuid) from anon;
revoke execute on function public.donor_pledges_for_request(uuid) from anon;
