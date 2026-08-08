-- 0074 Study Hub: notify section on new material + bookmarks
--
-- (1) When a material or question is uploaded, notify the section's approved
--     members (except the uploader) via the in-app feed — members otherwise
--     have to reopen the course to discover new files.
-- (2) study_bookmarks: per-user saved materials/questions/books.

-- (1) new-upload notification -------------------------------------------------

create or replace function public.notify_study_material()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_section uuid;
  v_code text;
begin
  select c.section_id, c.code into v_section, v_code
  from public.study_courses c
  where c.id = new.course_id;

  if v_section is null then
    return new;
  end if;

  insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
  select
    m.user_id, 'study',
    'New material in ' || coalesce(v_code, 'your course'),
    coalesce(new.title, 'A file') || ' was just added.',
    new.course_id::text, 'study_course'
  from public.study_section_members m
  where m.section_id = v_section
    and m.status = 'approved'
    and m.user_id <> new.uploaded_by;

  return new;
end;
$$;

drop trigger if exists trg_notify_study_material on public.study_materials;
create trigger trg_notify_study_material
  after insert on public.study_materials
  for each row execute function public.notify_study_material();

drop trigger if exists trg_notify_study_question on public.study_question_bank;
create trigger trg_notify_study_question
  after insert on public.study_question_bank
  for each row execute function public.notify_study_material();

revoke execute on function public.notify_study_material() from public, anon;

-- (2) bookmarks ---------------------------------------------------------------

create table if not exists public.study_bookmarks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_type  text not null check (item_type in ('material', 'question', 'book')),
  item_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create index if not exists study_bookmarks_item_idx on public.study_bookmarks (item_id);

alter table public.study_bookmarks enable row level security;

drop policy if exists study_bookmarks_all_own on public.study_bookmarks;
create policy study_bookmarks_all_own on public.study_bookmarks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
