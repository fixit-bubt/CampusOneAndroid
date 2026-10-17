-- Migration: Add GPS Coordinates to Map-Connected Modules
-- Tables: blood_requests, rides, listings, lost_found_items
-- Project: CampusOne (xhgpxvyqrufbbuivttmi)

-- 1. Blood Requests: store exact hospital/clinic GPS coordinates
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Campus Rides: store exact origin and destination GPS coordinates
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS dest_lat double precision,
  ADD COLUMN IF NOT EXISTS dest_lng double precision;

-- 3. Marketplace Listings: store exact meetup GPS coordinates
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 4. Lost & Found Items: store exact lost/found GPS coordinates
ALTER TABLE public.lost_found_items
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Comments for documentation
COMMENT ON COLUMN public.blood_requests.latitude IS 'Exact latitude of hospital or blood donation location';
COMMENT ON COLUMN public.blood_requests.longitude IS 'Exact longitude of hospital or blood donation location';
COMMENT ON COLUMN public.rides.origin_lat IS 'Exact latitude of ride pickup / origin';
COMMENT ON COLUMN public.rides.origin_lng IS 'Exact longitude of ride pickup / origin';
COMMENT ON COLUMN public.rides.dest_lat IS 'Exact latitude of ride drop-off / destination';
COMMENT ON COLUMN public.rides.dest_lng IS 'Exact longitude of ride drop-off / destination';
COMMENT ON COLUMN public.listings.latitude IS 'Exact latitude of marketplace meetup spot';
COMMENT ON COLUMN public.listings.longitude IS 'Exact longitude of marketplace meetup spot';
COMMENT ON COLUMN public.lost_found_items.latitude IS 'Exact latitude where item was lost or found';
COMMENT ON COLUMN public.lost_found_items.longitude IS 'Exact longitude where item was lost or found';
