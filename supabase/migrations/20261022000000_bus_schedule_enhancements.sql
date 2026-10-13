-- ============================================================================
-- FixIt / CampusOne - Migration 20261022000000: Bus Schedule Enhancements & Grants
-- ----------------------------------------------------------------------------
-- 1. Grant SELECT on public.bus_routes to anon so guest and unauthenticated
--    students can view routes, helper contacts, and timetables.
-- 2. Add RLS policy for anon reading of active bus routes.
-- 3. Upsert clean data for all 6 BUBT campus shuttle corridors.
-- ============================================================================

-- 1. Table Grants
grant select on public.bus_routes to anon, authenticated;

-- 2. Row Level Security Policies
drop policy if exists bus_routes_anon_select on public.bus_routes;
create policy bus_routes_anon_select on public.bus_routes
  for select to anon
  using (active = true);

-- 3. Refresh and standardize campus shuttle bus routes
insert into public.bus_routes
  (id, name, area, bus_no, helper_name, helper_phone, days, friday_note, stops, leg_mins, to_departures, from_departures, active)
values
  ('BR-07', 'Uttara Line', 'Uttara', 'BUBT-07', 'Md. Jasim', '+8801712554477', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Uttara House Building","Airport","Khilkhet","Mirpur-14","Mirpur-12","BUBT Campus"}', '{15,15,20,10,15}', '{"06:45","07:30"}', '{"16:30","18:15"}', true),
  ('BR-03', 'Mirpur Line', 'Mirpur', 'BUBT-03', 'Sohel Rana', '+8801813220099', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Mirpur-1","Mirpur-2","Mirpur-10","Mirpur-11","Rupnagar","BUBT Campus"}', '{8,10,8,10,7}', '{"07:00","07:45"}', '{"16:30","17:45"}', true),
  ('BR-05', 'Dhanmondi Line', 'Dhanmondi', 'BUBT-05', 'Abdul Karim', '+8801911778822', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Dhanmondi 27","Shyamoli","Gabtoli","Technical","Mirpur-1","BUBT Campus"}', '{12,10,8,10,12}', '{"06:50","07:40"}', '{"16:30","18:00"}', true),
  ('BR-09', 'Mohammadpur Line', 'Mohammadpur', 'BUBT-09', 'Rasel Ahmed', '+8801677334411', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Mohammadpur Bus Stand","Shyamoli Square","Kallyanpur","Mirpur-1","Rupnagar","BUBT Campus"}', '{10,8,10,12,8}', '{"07:00","07:50"}', '{"16:30","17:50"}', true),
  ('BR-02', 'Gulshan Line', 'Gulshan', 'BUBT-02', 'Tanvir Hossain', '+8801556990011', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Gulshan-1","Mohakhali","Bijoy Sarani","Agargaon","Mirpur-10","BUBT Campus"}', '{12,10,12,12,14}', '{"06:40","07:30"}', '{"16:30","18:10"}', true),
  ('BR-11', 'Savar Line', 'Savar', 'BUBT-11', 'Mizanur Rahman', '+8801722446688', '{"Sat–Wed"}', 'No service on Friday & government holidays.',
   '{"Savar Bazar","Hemayetpur","Amin Bazar","Gabtoli","Technical","BUBT Campus"}', '{15,12,12,10,12}', '{"06:30","07:20"}', '{"16:30","17:40"}', true)
on conflict (id) do update set
  name = excluded.name,
  area = excluded.area,
  bus_no = excluded.bus_no,
  helper_name = excluded.helper_name,
  helper_phone = excluded.helper_phone,
  days = excluded.days,
  friday_note = excluded.friday_note,
  stops = excluded.stops,
  leg_mins = excluded.leg_mins,
  to_departures = excluded.to_departures,
  from_departures = excluded.from_departures,
  active = excluded.active;
