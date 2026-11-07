-- 20261104060000 granted these SECURITY DEFINER functions to authenticated
-- but left Supabase's default anon EXECUTE in place, so event_rsvp_counts()
-- answered unauthenticated callers. Signed-in users only.
revoke execute on function public.set_event_banner(uuid, boolean, integer) from public, anon;
revoke execute on function public.admin_report_stats() from public, anon;
revoke execute on function public.event_rsvp_counts() from public, anon;
grant execute on function public.set_event_banner(uuid, boolean, integer) to authenticated;
grant execute on function public.admin_report_stats() to authenticated;
grant execute on function public.event_rsvp_counts() to authenticated;
