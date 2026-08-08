-- BACKFILL (2026-08-08): applied live 2026-06-12, never had a file in this
-- repo until now. Exact original SQL, pulled from
-- supabase_migrations.schema_migrations.statements — see
-- 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Contact reveal for Lost & Found claims: once a claim is Approved, the
-- poster and the claimant may each fetch the OTHER party's contact details.
-- Anyone else (or any non-approved claim) gets zero rows.
create or replace function public.claim_contact(p_claim_id uuid)
returns table(full_name text, email text, whatsapp text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.full_name, p.email, p.whatsapp, p.avatar_url
  from claims c
  join lost_found_items i on i.id = c.item_id
  join profiles p on p.id = case
    when auth.uid() = i.poster_id then c.claimant_id
    when auth.uid() = c.claimant_id then i.poster_id
  end
  where c.id = p_claim_id
    and c.status = 'Approved';
$$;

revoke all on function public.claim_contact(uuid) from public;
grant execute on function public.claim_contact(uuid) to authenticated;
