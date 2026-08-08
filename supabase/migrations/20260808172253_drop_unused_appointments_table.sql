-- The `appointments` table (doctor booking + queue token system) has zero
-- rows and zero app code referencing it anywhere -- fully orphaned backend,
-- no UI was ever wired to it. Requested removal rather than building the
-- missing booking UI. Drops the table plus its dependent trigger functions
-- and code-generation sequence, none of which are used by anything else.

drop table if exists public.appointments cascade;
drop function if exists public.set_appointment_token() cascade;
drop function if exists public.booked_slots(text, date) cascade;
drop function if exists public.guard_appointment_update() cascade;
drop sequence if exists public.appointment_code_seq;
