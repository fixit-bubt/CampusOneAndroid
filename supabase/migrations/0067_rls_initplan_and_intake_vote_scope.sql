-- 0067 RLS perf + intake-vote scope fix
--
-- 1) study_intake_votes select/insert policies compared s.intake_id to itself
--    (always true), so any approved section member could read every intake's
--    votes and any CR could open a vote for a different intake. Scope both to
--    the vote row's intake.
-- 2) Performance advisor auth_rls_initplan: policies calling auth.uid() bare
--    re-evaluate it per row. Rewrite every such policy to (select auth.uid())
--    so the planner runs it once per statement. Done programmatically from
--    pg_policies; expressions are otherwise unchanged.
-- 3) Two foreign keys still missing covering indexes (advisor
--    unindexed_foreign_keys): academic_calendar.created_by, routines.published_by.

-- 1) Intake-vote scoping ------------------------------------------------------

alter policy study_intake_votes_select on public.study_intake_votes
  using (exists (
    select 1
    from study_section_members m
    join study_sections s on s.id = m.section_id
    where s.intake_id = study_intake_votes.intake_id
      and m.user_id = (select auth.uid())
      and m.status = 'approved'
  ));

alter policy study_intake_votes_insert on public.study_intake_votes
  with check (
    initiated_by = (select auth.uid())
    and exists (
      select 1
      from study_section_members m
      join study_sections s on s.id = m.section_id
      where s.intake_id = study_intake_votes.intake_id
        and m.user_id = (select auth.uid())
        and m.status = 'approved'
        and m.role = 'cr'
    )
    and status = 'open'
    and closes_at > now()
  );

-- 2) Wrap bare auth.uid() in an initplan subquery across all public policies --

do $$
declare
  p record;
  new_qual text;
  new_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  loop
    -- Shield already-wrapped occurrences (rendered by pg as
    -- "( SELECT auth.uid() AS uid)") so they are not double-wrapped.
    new_qual := case when p.qual is null then null else
      replace(replace(replace(p.qual,
        '( SELECT auth.uid() AS uid)', '@@WRAPPED@@'),
        'auth.uid()', '(select auth.uid())'),
        '@@WRAPPED@@', '( SELECT auth.uid() AS uid)') end;
    new_check := case when p.with_check is null then null else
      replace(replace(replace(p.with_check,
        '( SELECT auth.uid() AS uid)', '@@WRAPPED@@'),
        'auth.uid()', '(select auth.uid())'),
        '@@WRAPPED@@', '( SELECT auth.uid() AS uid)') end;

    if new_qual is distinct from p.qual or new_check is distinct from p.with_check then
      execute format('alter policy %I on %I.%I%s%s',
        p.policyname, p.schemaname, p.tablename,
        case when new_qual is distinct from p.qual
          then format(' using (%s)', new_qual) else '' end,
        case when new_check is distinct from p.with_check
          then format(' with check (%s)', new_check) else '' end);
    end if;
  end loop;
end $$;

-- 3) Remaining FK covering indexes --------------------------------------------

create index if not exists academic_calendar_created_by_idx on academic_calendar (created_by);
create index if not exists routines_published_by_idx on routines (published_by);
