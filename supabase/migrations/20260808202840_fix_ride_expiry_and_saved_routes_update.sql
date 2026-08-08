-- Bug audit fixes (2026-08-09):
--
-- 1) Rides were expiring 8/12 hours after being POSTED, not after the ride's
--    actual date — a ride posted today for tomorrow was silently deleted
--    (cascading its ride_requests with it) hours before it even happened.
--    RidesScreen calls delete_expired_rides() on every load, so this bit
--    everyone. Expiry is now tied to the ride's own `date` column instead:
--    it stays visible through the end of its listed day, then cleans up.
--
-- 2) saved_bus_routes (the bus-favourites star) has SELECT/INSERT/DELETE
--    policies but no UPDATE policy. The client saves a favourite via
--    .upsert(..., {onConflict:'user_id,route_id'}) — Postgres requires an
--    UPDATE policy for ANY insert-with-on-conflict-do-update, even when no
--    conflict actually occurs, so starring a route failed every single time.

create or replace function public.set_ride_expires_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.expires_at is null then
    new.expires_at := (new.date::timestamptz) + interval '1 day';
  end if;
  return new;
end;
$$;

create policy saved_routes_update on public.saved_bus_routes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
