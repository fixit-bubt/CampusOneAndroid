-- 0078 close/expire blood requests
--
-- Requests had no terminal state, so the feed grew forever. Requester can now
-- mark a request fulfilled (RLS blood_req_update already covers the owner); the
-- client hides fulfilled requests and ages out anything older than 21 days.
alter table public.blood_requests add column if not exists fulfilled_at timestamptz;
