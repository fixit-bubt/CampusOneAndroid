-- BACKFILL (2026-08-08): applied live 2026-06-13, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Auto-generate a unique join code for every study section.
-- Charset excludes ambiguous chars (0/O/1/I/L).
create or replace function public.gen_section_join_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  text;
  i     int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.study_sections where join_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.set_section_join_code()
returns trigger
language plpgsql
as $$
begin
  if new.join_code is null or length(trim(new.join_code)) = 0 then
    new.join_code := public.gen_section_join_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_section_join_code on public.study_sections;
create trigger trg_section_join_code
  before insert on public.study_sections
  for each row execute function public.set_section_join_code();

-- Backfill the existing sections that have no code.
update public.study_sections
set join_code = public.gen_section_join_code()
where join_code is null or length(trim(join_code)) = 0;
