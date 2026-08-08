-- 0070 revoke PUBLIC execute on SECURITY DEFINER functions
--
-- 0069 revoked anon directly, but these functions still carried the default
-- PUBLIC execute grant (=X in proacl), which anon inherits — so the revoke was
-- a no-op. Revoke PUBLIC instead; authenticated and service_role already hold
-- explicit grants, so the app is unaffected. email_is_registered keeps its
-- anon path on purpose (Register screen calls it pre-auth).

revoke execute on function public.decline_report(uuid) from public;
revoke execute on function public.delete_expired_rides() from public;
revoke execute on function public.ride_request_counts() from public;
revoke execute on function public.rsvp_event(uuid) from public;
revoke execute on function public.guard_jobs_columns() from public;
revoke execute on function public.increment_rides_posted() from public;
revoke execute on function public.notify_claim_decided() from public;
revoke execute on function public.notify_claim_received() from public;
revoke execute on function public.notify_new_announcement() from public;
revoke execute on function public.notify_report_status() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.set_appointment_token() from public;
