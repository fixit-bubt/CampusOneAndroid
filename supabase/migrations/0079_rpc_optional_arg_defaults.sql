-- 0079 SQL defaults on genuinely-optional RPC args
--
-- club_update_details and job_report already handle NULLs in their bodies, but
-- without SQL defaults the generated TypeScript args marked every parameter
-- required, forcing the client to pass nulls the arg types don't allow.
-- Defaults make codegen emit them as optional; omitting an arg = NULL.

CREATE OR REPLACE FUNCTION public.club_update_details(
  p_club_id uuid,
  p_name text,
  p_tagline text default null,
  p_about text default null,
  p_category text default 'Tech',
  p_advisor uuid default null,
  p_cover_url text default null
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.club_can_manage(p_club_id) or public.is_admin()) then
    raise exception 'Not authorized to edit this club.';
  end if;
  if char_length(coalesce(p_name, '')) < 2 then
    raise exception 'Club name must be at least 2 characters.';
  end if;
  if p_category not in ('Tech','Cultural','Sports','Professional','Social') then
    raise exception 'Invalid category.';
  end if;
  update public.clubs set
    name               = p_name,
    tagline            = p_tagline,
    about              = p_about,
    category           = p_category,
    faculty_advisor_id = p_advisor,
    cover_url          = coalesce(p_cover_url, cover_url)
  where id = p_club_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.job_report(p_code text, p_reason text, p_note text default null)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_job public.jobs;
begin
  select * into v_job from public.jobs where code = p_code;
  if v_job.id is null then raise exception 'Listing not found.'; end if;
  if v_job.deleted_at is not null then raise exception 'This listing is no longer available.'; end if;
  if v_job.posted_by = auth.uid() then raise exception 'You can''t report your own listing.'; end if;
  if p_reason not in ('spam','scam','expired','inappropriate','other') then raise exception 'Invalid reason.'; end if;
  insert into public.job_reports (job_id, reporter_id, reason, note)
    values (v_job.id, auth.uid(), p_reason, nullif(btrim(p_note), ''));
end;
$function$;
