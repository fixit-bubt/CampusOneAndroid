-- ============================================================================
-- CampusOne — Migration 20261013000000: marketplace enhancements & performance
-- ----------------------------------------------------------------------------
-- 1. Composite indexes for high-speed feed sorting & course cross-referencing.
-- 2. Additive meetup_spot column for campus physical handover locations.
-- 3. Additive photos array column for multi-image support while preserving
--    existing photo_url for full backwards-compatibility.
-- ============================================================================

-- 1. Performance Indexes
create index if not exists idx_listings_feed
  on public.listings (status, created_at desc);

create index if not exists idx_listings_course_code
  on public.listings (course_code)
  where course_code is not null;

create index if not exists idx_listings_category
  on public.listings (category);

-- 2. Additive Meetup Spot & Multi-Photo Columns
alter table public.listings
  add column if not exists meetup_spot text;

alter table public.listings
  add column if not exists photos text[] default '{}';
