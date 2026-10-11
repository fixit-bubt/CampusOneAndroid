-- ============================================================================
-- FixIt — Migration 0087: Seed official campus announcements & events
-- ----------------------------------------------------------------------------
-- Inserts realistic campus notices and upcoming events with real banners
-- for BUBT. Uses the first admin profile (or fallback user) as created_by.
-- ============================================================================

do $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id from public.profiles where role = 'admin' limit 1;
  if v_admin_id is null then
    select id into v_admin_id from public.profiles limit 1;
  end if;

  if v_admin_id is not null then
    -- Seed Announcements
    insert into public.announcements (code, title, body, department, priority, pinned, image_url, created_by)
    values
      ('AN-101', '10th Convocation Ceremony — Registration Open', 'Graduating students from batches 40 to 52 of all undergraduate and graduate programs are requested to complete their online convocation registration by November 15, 2026. Please collect clearance from Accounts and Examination Controller.', 'Office of the Registrar', 'Urgent', true, '/announcements/convocation-2026.jpg', v_admin_id),
      ('AN-102', 'Tri-Semester Final Examination Routine Published', 'The final examination routine for all departments (Fall Semester 2026) has been published by the Controller of Examinations. Students can check room allocations and timings in the Routines section.', 'Examination Controller', 'Important', true, '/announcements/exam-routine.jpg', v_admin_id),
      ('AN-103', 'Campus Wi-Fi Upgrade & Fiber Maintenance Notice', 'Maintenance on the central campus fiber link and Wi-Fi access points across Building 1 and Building 2 will take place this Friday from 2:00 PM to 6:00 PM. High-speed 5GHz networks will resume normal operation immediately afterwards.', 'Facilities', 'General', false, null, v_admin_id)
    on conflict (code) do update set
      title = excluded.title,
      body = excluded.body,
      department = excluded.department,
      priority = excluded.priority,
      pinned = excluded.pinned,
      image_url = excluded.image_url;

    -- Seed Events
    insert into public.events (code, title, category, organizer, date, time, end_time, venue, description, capacity, banner_url, created_by)
    values
      ('EV-101', 'Innovate & Code: BUBT Inter-University Hackathon 2026', 'Academic', 'BUBT Computer Gaming & Programming Club', current_date + interval '14 days', '09:30', '18:00', 'Campus Auditorium & CSE Lab 402', 'Annual intra-university programming competition and 24-hour hackathon. Teams will compete in algorithmic problem solving and AI/Web software development.', 250, '/events/hackathon-2026.jpg', v_admin_id),
      ('EV-102', 'Voluntary Blood Donation Drive & Free Health Camp', 'Club', 'BUBT Rover Scout Group & Red Crescent', current_date + interval '21 days', '10:00', '16:00', 'Building 2 Main Lobby', 'Join the annual student blood drive to support emergency patients in Mirpur and surrounding hospitals. Free blood group testing and health checkup provided.', 150, '/events/blood-drive.jpg', v_admin_id)
    on conflict (code) do update set
      title = excluded.title,
      category = excluded.category,
      organizer = excluded.organizer,
      date = excluded.date,
      time = excluded.time,
      venue = excluded.venue,
      description = excluded.description,
      capacity = excluded.capacity,
      banner_url = excluded.banner_url;
  end if;
end $$;
