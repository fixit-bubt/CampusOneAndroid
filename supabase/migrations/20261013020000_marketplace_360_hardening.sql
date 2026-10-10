-- ============================================================================
-- CampusOne - Migration 20261013020000: marketplace 360 hardening & constraint fix
-- ----------------------------------------------------------------------------
-- 1. Loosen listings_category_check to allow expanded categories (Drafting, LabGear)
--    and custom student-defined category names (e.g. Drawing Board, Apron).
-- 2. Ensure additive columns (meetup_spot, photos) and covering indexes exist.
-- ============================================================================

-- 1. Loosen category check constraint from fixed union to any valid category (>= 2 chars)
alter table public.listings
  drop constraint if exists listings_category_check;

alter table public.listings
  add constraint listings_category_check check (char_length(category) >= 2);

-- 2. Additive columns for physical handover spots and multi-photo arrays
alter table public.listings
  add column if not exists meetup_spot text;

alter table public.listings
  add column if not exists photos text[] default '{}';

-- 3. High-performance covering indexes
create index if not exists idx_listings_feed
  on public.listings (status, created_at desc);

create index if not exists idx_listings_category
  on public.listings (category);

create index if not exists idx_listings_course_code
  on public.listings (course_code)
  where course_code is not null;

create index if not exists idx_listings_meetup_spot
  on public.listings (meetup_spot)
  where meetup_spot is not null;
