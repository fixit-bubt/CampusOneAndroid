-- 0068 split admin FOR ALL policies into write-only commands
--
-- Performance advisor multiple_permissive_policies: each lookup table paired a
-- FOR ALL admin policy with a public SELECT policy, so every SELECT evaluated
-- both. The SELECT policies are all USING (true) for authenticated, so admins
-- lose nothing by narrowing the admin policy to insert/update/delete.
-- study_sections additionally had two UPDATE policies (admin + CR); merged.

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('bus_routes',         'bus_routes_admin_write'),
      ('departments',        'departments_admin_write'),
      ('doctors',            'doctors_admin_write'),
      ('event_organizers',   'event_org_admin_write'),
      ('faculty',            'faculty_admin_write'),
      ('musallah_locations', 'musallah_admin_write'),
      ('prayer_times',       'prayer_admin_write'),
      ('study_intakes',      'study_intakes_admin')
    ) as v(tbl, pol)
  loop
    execute format('drop policy %I on public.%I', t.pol, t.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (is_admin())', t.tbl || '_admin_insert', t.tbl);
    execute format('create policy %I on public.%I for update to authenticated using (is_admin()) with check (is_admin())', t.tbl || '_admin_update', t.tbl);
    execute format('create policy %I on public.%I for delete to authenticated using (is_admin())', t.tbl || '_admin_delete', t.tbl);
  end loop;
end $$;

-- study_sections: admin ALL + CR UPDATE -> admin insert/delete + one merged update
drop policy study_sections_admin on public.study_sections;
drop policy study_sections_cr_visibility on public.study_sections;

create policy study_sections_admin_insert on public.study_sections
  for insert to authenticated with check (is_admin());

create policy study_sections_admin_delete on public.study_sections
  for delete to authenticated using (is_admin());

create policy study_sections_update on public.study_sections
  for update to authenticated
  using (is_admin() or study_is_cr(id))
  with check (is_admin() or study_is_cr(id));
