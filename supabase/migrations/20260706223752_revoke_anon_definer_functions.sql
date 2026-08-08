-- 0069 revoke anon execute on SECURITY DEFINER functions
--
-- Security advisor anon_security_definer_function_executable: 13 definer
-- functions were executable by anon. All are either trigger functions (never
-- called via REST) or RPCs the app only calls while signed in, so anon gains
-- nothing from keeping them. email_is_registered stays anon-executable on
-- purpose: the Register screen calls it before any session exists.

revoke execute on function public.decline_report(uuid) from anon;
revoke execute on function public.delete_expired_rides() from anon;
revoke execute on function public.ride_request_counts() from anon;
revoke execute on function public.rsvp_event(uuid) from anon;
revoke execute on function public.guard_jobs_columns() from anon;
revoke execute on function public.increment_rides_posted() from anon;
revoke execute on function public.notify_claim_decided() from anon;
revoke execute on function public.notify_claim_received() from anon;
revoke execute on function public.notify_new_announcement() from anon;
revoke execute on function public.notify_report_status() from anon;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.set_appointment_token() from anon;
