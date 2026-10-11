-- ============================================================================
-- FixIt — Migration 0088: Profile Pinned Tools
-- ----------------------------------------------------------------------------
-- Adds a jsonb column `pinned_tools` to public.profiles so users can pin
-- campus features and custom links to their Academic Tools directory.
-- Automatically syncs across devices (phone, tablet, PC).
-- ============================================================================

alter table public.profiles
  add column if not exists pinned_tools jsonb not null default '[]'::jsonb;

-- Comment for schema documentation
comment on column public.profiles.pinned_tools is
  'JSON array of pinned tools and shortcuts chosen by the user, synced across devices.';
