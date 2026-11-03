-- Migration: 20261104050000_rides_student_peer_to_peer.sql
-- Restricts Campus Rides to a 100% Student Peer-to-Peer community feature.
-- Removes administrative override/moderation clauses from public.rides and public.ride_requests RLS policies.

-- 1. rides_update: only the driver can update their ride
drop policy if exists rides_update on public.rides;
create policy rides_update on public.rides for update to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- 2. rides_delete: only the driver can delete their ride
drop policy if exists rides_delete on public.rides;
create policy rides_delete on public.rides for delete to authenticated
  using (driver_id = auth.uid());

-- 3. ride_req_select: only the requester or the ride's driver can view requests
drop policy if exists ride_req_select on public.ride_requests;
create policy ride_req_select on public.ride_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.id = ride_requests.ride_id
        and r.driver_id = auth.uid()
    )
  );

-- 4. ride_req_delete: only the requester or the ride's driver can remove/cancel requests
drop policy if exists ride_req_delete on public.ride_requests;
create policy ride_req_delete on public.ride_requests for delete to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.id = ride_requests.ride_id
        and r.driver_id = auth.uid()
    )
  );

