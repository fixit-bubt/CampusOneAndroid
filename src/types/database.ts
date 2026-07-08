// CampusOne — app-facing database types.
//
// Column presence/nullability comes from the generated schema (./supabase.ts,
// regenerate after DDL changes) so these can never drift from the live DB again.
// The string-literal unions the app relies on for narrowing (statuses,
// categories, roles) are overlaid on top — the DB stores plain text for those,
// enforced by CHECK constraints.

import type { Tables } from './supabase';

export type UserRole = 'student' | 'staff' | 'admin';

export type Profile = Omit<Tables<'profiles'>, 'role'> & {
  role: UserRole;
};

export type Report = Omit<Tables<'reports'>, 'category' | 'status'> & {
  category: 'Electrical' | 'Plumbing' | 'Cleanliness' | 'IT / Network' | 'Furniture' | 'Safety / Security' | 'Other';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected' | 'Closed';
};

export type ReportEvent = Omit<Tables<'report_events'>, 'status'> & {
  status: Report['status'];
};

export type LostFoundItem = Omit<Tables<'lost_found_items'>, 'type' | 'category' | 'status'> & {
  type: 'Lost' | 'Found';
  category: 'Personal' | 'Electronics' | 'Documents' | 'Other';
  status: 'Open' | 'Resolved';
};

export type Claim = Omit<Tables<'claims'>, 'kind' | 'status'> & {
  kind: 'claim' | 'notify';
  status: 'Pending' | 'Approved' | 'Rejected';
};

export type Announcement = Omit<Tables<'announcements'>, 'priority'> & {
  priority: 'Urgent' | 'Important' | 'General';
};

export type Event = Omit<Tables<'events'>, 'category'> & {
  category: 'Academic' | 'Cultural' | 'Sports' | 'Club' | 'Career';
};

export type Listing = Omit<Tables<'listings'>, 'condition' | 'category' | 'status'> & {
  condition: 'New' | 'Like New' | 'Used';
  category: 'Books' | 'Electronics' | 'Furniture' | 'Notes' | 'Other';
  status: 'Available' | 'Sold';
};

export type Ride = Omit<Tables<'rides'>, 'direction' | 'vehicle'> & {
  direction: 'To Campus' | 'From Campus';
  vehicle: 'Car' | 'CNG' | 'Bike';
};

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type BloodRequest = Omit<Tables<'blood_requests'>, 'blood_group' | 'urgency'> & {
  blood_group: BloodGroup;
  urgency: 'Urgent' | 'Today' | 'This week';
};

export type Donor = Omit<Tables<'donors'>, 'blood_group'> & {
  blood_group: BloodGroup;
};

export type Doctor = Tables<'doctors'>;

export type Appointment = Omit<Tables<'appointments'>, 'status'> & {
  status: 'Booked' | 'Confirmed' | 'Completed' | 'Cancelled';
};

export type BusRoute = Tables<'bus_routes'>;

export type PrayerTime = Omit<Tables<'prayer_times'>, 'key'> & {
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jummah';
};

export type Faculty = Tables<'faculty'>;

export type Department = Tables<'departments'>;

export type Job = Omit<Tables<'jobs'>, 'job_type' | 'work_mode' | 'apply_method'> & {
  job_type: 'internship' | 'part_time' | 'full_time';
  work_mode: 'onsite' | 'remote' | 'hybrid';
  apply_method: 'link' | 'email' | 'file';
};

export type Club = Omit<Tables<'clubs'>, 'category'> & {
  category: 'Tech' | 'Cultural' | 'Sports' | 'Professional' | 'Social';
};

export type ClubMember = Omit<Tables<'club_members'>, 'role'> & {
  role: 'president' | 'vp' | 'editor' | 'member';
};

export type Connection = Omit<Tables<'connections'>, 'status'> & {
  status: 'pending' | 'accepted' | 'rejected';
};

export type Notification = Tables<'notifications'>;
