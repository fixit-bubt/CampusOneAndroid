-- 0073 revoke anon/PUBLIC execute on notify_blood_request trigger function
--
-- Trigger functions never need a caller grant (they run as the trigger owner),
-- and Supabase's default privileges hand anon EXECUTE on every new function.
-- The other notify_* trigger functions were locked in 0069/0070; keep this one
-- consistent so the security advisor stays clean.

revoke execute on function public.notify_blood_request() from public, anon;
