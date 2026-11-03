-- ============================================================================
-- Migration: Seed Official BUBT Clubs & Organizations
-- ----------------------------------------------------------------------------
-- Populates the 19 official student clubs, societies, and chapters at BUBT
-- across 5 verified categories: Tech, Professional, Cultural, Sports, Social.
-- Idempotent: Only inserts clubs that do not already exist by exact name.
-- ============================================================================

DO $$
BEGIN
  -- 1. Tech Category
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT IT Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT IT Club',
      'Official tech & coding community of BUBT',
      'BUBT IT Club (BUBTIC) organizes programming contests, hackathons, CSE Fiesta, gaming fests, and software engineering workshops for technology enthusiasts.',
      'Tech',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT EEE Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT EEE Club',
      'Robotics, AI & electrical engineering innovation',
      'Focuses on robotics competitions, artificial intelligence hardware projects, circuit design, physics & math olympiads, and industrial engineering tours.',
      'Tech',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Civil Engineering Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Civil Engineering Club',
      'Building the sustainable infrastructure of tomorrow',
      'Provides practical civil engineering workshops, CAD/ETABS modeling sessions, structural mechanics competitions, and site survey expeditions.',
      'Tech',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Textile Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Textile Club',
      'Advancing textile engineering & sustainable fashion tech',
      'Connects textile engineering students with Bangladesh RMG industry leaders through technical symposiums, fabric design showcases, and factory visits.',
      'Tech',
      true
    );
  END IF;

  -- 2. Professional Category
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Business Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Business Club',
      'Empowering future corporate leaders & entrepreneurs',
      'Established in 2003, BUBT Business Club develops corporate acumen, business case competitions, networking sessions, and entrepreneurship incubators.',
      'Professional',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Moot Court Society') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Moot Court Society',
      'Excellence in legal research, advocacy & moot court',
      'Operating under the Department of Law and Justice, BMCS trains future jurists through national and international mooting tournaments, legal drafting, and mock trials.',
      'Professional',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Economics Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Economics Club',
      'Analyzing policies, markets & socio-economic dynamics',
      'Fosters macroeconomic discussions, fiscal policy debates, economic research seminars, and budget analysis symposiums.',
      'Professional',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'IEEE BUBT Student Branch') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'IEEE BUBT Student Branch',
      'Advancing technology for humanity at BUBT',
      'Official student branch under the global IEEE organization, providing engineering students access to research papers, international conferences, and WIE initiatives.',
      'Professional',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BASIS Students’ Forum - BUBT Chapter') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BASIS Students’ Forum - BUBT Chapter',
      'Connecting BUBT tech talents with the national IT industry',
      'Official BUBT chapter of BASIS (Bangladesh Association of Software and Information Services), bridging students with software industry internships and tech mentorship.',
      'Professional',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'ESAB BUBT Unit Face') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'ESAB BUBT Unit Face',
      'Engineering Students Association of Bangladesh at BUBT',
      'Inter-university engineering network connecting student engineers across disciplines through collaborative technical projects and nationwide symposiums.',
      'Professional',
      true
    );
  END IF;

  -- 3. Cultural Category
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Cultural Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Cultural Club',
      'Celebrating cultural diversity, music, drama & arts',
      'BUBTCC coordinates musical events, theatre performances, dance fests, and cultural celebrations for national occasions including Pohela Boishakh, Victory Day, and 21st February.',
      'Cultural',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Debating Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Debating Club',
      'Sharpening eloquence, critical reasoning & public speech',
      'Trains passionate debaters in parliamentary debate rules, logic construction, and rhetoric, competing actively across national inter-varsity tournaments.',
      'Cultural',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Photography Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Photography Club',
      'Capturing campus moments through light & storytelling',
      'Creative hub for mobile and DSLR photographers, cinematographers, and visual artists; hosts annual photo exhibitions and photo walks.',
      'Cultural',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT English Language Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT English Language Club',
      'Fostering English communication & global eloquence',
      'Enhances conversational English, presentation skills, IELTS preparation, and linguistic confidence through interactive speaking sessions and quizzes.',
      'Cultural',
      true
    );
  END IF;

  -- 4. Sports Category
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Sports Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Sports Club',
      'Promoting athleticism, team spirit & sporting excellence',
      'Central governing sports organization at BUBT. Hosts the BUBT Premier League (Cricket), varsity football/futsal tournaments, badminton, table tennis, volleyball, and chess championships.',
      'Sports',
      true
    );
  END IF;

  -- 5. Social Category
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Social Welfare Club') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Social Welfare Club',
      'Compassionate action for society & humanitarian aid',
      'Dedicated to voluntary blood donation drives, flood relief campaigns, winter clothing distribution, and philanthropic community outreach.',
      'Social',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'BUBT Rover Scout Group') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'BUBT Rover Scout Group',
      'Leadership, service & character in the Scout spirit',
      'Operates under Bangladesh Scouts, fostering outdoor survival, community leadership, disaster response readiness, and civic responsibility.',
      'Social',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'Bangladesh National Cadet Corps (BNCC)') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'Bangladesh National Cadet Corps (BNCC)',
      'Knowledge, discipline & volunteer defense service',
      'BUBT platoon under the Bangladesh Armed Forces reserve corps, training students in military drills, ceremonial guards, national emergency rescue, and self-discipline.',
      'Social',
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE name = 'Rotaract Club of BUBT') THEN
    INSERT INTO public.clubs (name, tagline, about, category, is_active)
    VALUES (
      'Rotaract Club of BUBT',
      'Fellowship through service under Rotary International',
      'Part of Rotary District 3281, focusing on youth empowerment, community development, professional mentorship, and international goodwill.',
      'Social',
      true
    );
  END IF;

END $$;

