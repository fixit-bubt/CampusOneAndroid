-- ============================================================================
-- Migration: 20261012000002_rides_rickshaw_and_request.sql
-- 1. Updates rides_vehicle_check to include 'Rickshaw'
-- 2. Adds post_type column ('offer' for driver posts, 'request' for passenger posts)
-- ============================================================================

-- 1. Allow 'Rickshaw' in vehicles
alter table public.rides drop constraint if exists rides_vehicle_check;
alter table public.rides add constraint rides_vehicle_check
  check (vehicle in ('Car', 'CNG', 'Bike', 'Rickshaw'));

-- 2. Add post_type column to support passenger "Need a Ride" posts
alter table public.rides add column if not exists post_type text not null default 'offer'
  check (post_type in ('offer', 'request'));

-- Create index for filtering by post_type
create index if not exists idx_rides_post_type on public.rides (post_type);

