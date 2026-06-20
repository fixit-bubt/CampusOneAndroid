// CampusOne — Database Types

export type UserRole = 'student' | 'staff' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  whatsapp: string | null;
  intake: string | null;
  section: string | null;
  avatar_url: string | null;
  directory_visible: boolean;
  show_whatsapp: boolean;
  expertise: string | null;
  student_id: string | null;
  blood_group: string | null;
  phone: string | null;
  program: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  code: string;
  category: 'Electrical' | 'Plumbing' | 'Cleanliness' | 'IT / Network' | 'Furniture' | 'Safety / Security' | 'Other';
  description: string;
  building: string;
  room: string | null;
  photo_url: string | null;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected' | 'Closed';
  reporter_id: string;
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReportEvent {
  id: string;
  report_id: string;
  status: Report['status'];
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LostFoundItem {
  id: string;
  code: string;
  type: 'Lost' | 'Found';
  title: string;
  category: 'Personal' | 'Electronics' | 'Documents' | 'Other';
  description: string;
  location: string;
  item_date: string;
  photo_url: string | null;
  status: 'Open' | 'Resolved';
  poster_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Claim {
  id: string;
  code: string;
  item_id: string;
  claimant_id: string;
  kind: 'claim' | 'notify';
  message: string;
  proof_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  code: string;
  title: string;
  body: string;
  department: string;
  priority: 'Urgent' | 'Important' | 'General';
  pinned: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Event {
  id: string;
  code: string;
  title: string;
  category: 'Academic' | 'Cultural' | 'Sports' | 'Club' | 'Career';
  organizer: string;
  date: string;
  time: string;
  end_time: string | null;
  venue: string;
  description: string;
  capacity: number | null;
  banner_url: string | null;
  club_id: string | null;
  created_by: string;
  created_at: string;
}

export interface Listing {
  id: string;
  code: string;
  title: string;
  price: number;
  condition: 'New' | 'Like New' | 'Used';
  negotiable: boolean;
  category: 'Books' | 'Electronics' | 'Furniture' | 'Notes' | 'Other';
  description: string;
  photo_url: string | null;
  status: 'Available' | 'Sold';
  seller_id: string;
  created_at: string;
  updated_at: string;
}

export interface Ride {
  id: string;
  code: string;
  driver_id: string;
  direction: 'To Campus' | 'From Campus';
  vehicle: 'Car' | 'CNG' | 'Bike';
  origin: string;
  destination: string;
  date: string;
  time: string;
  seats_total: number;
  fare: number;
  recurring: string[];
  notes: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface BloodRequest {
  id: string;
  code: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  units: number;
  patient: string;
  hospital: string;
  area: string;
  urgency: 'Urgent' | 'Today' | 'This week';
  requester_id: string;
  created_at: string;
}

export interface Donor {
  user_id: string;
  blood_group: BloodRequest['blood_group'];
  area: string;
  phone: string | null;
  last_donated: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  days: string[];
  start_time: string;
  end_time: string;
  room: string | null;
  active: boolean;
}

export interface Appointment {
  id: string;
  code: string;
  doctor_id: string;
  student_id: string;
  date: string;
  slot: string;
  token: string;
  status: 'Booked' | 'Confirmed' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface BusRoute {
  id: string;
  name: string;
  area: string;
  bus_no: string | null;
  helper_name: string | null;
  helper_phone: string | null;
  days: string[];
  friday_note: string | null;
  stops: string[];
  leg_mins: number[];
  to_departures: string[];
  from_departures: string[];
  active: boolean;
}

export interface PrayerTime {
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jummah';
  en: string;
  ar: string;
  azan: string;
  jamaat: string;
  sort: number;
}

export interface Faculty {
  id: string;
  department_id: string;
  name: string;
  designation: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  research_interests: string[];
  on_leave: boolean;
  is_chairman: boolean;
  scholar_url: string | null;
  researchgate_url: string | null;
  linkedin_url: string | null;
  orcid_url: string | null;
  website_url: string | null;
}

export interface Department {
  id: string;
  name: string;
  branch: string;
  dept_number: string;
  chairman: string | null;
}

export interface Job {
  id: string;
  code: string;
  title: string;
  company: string;
  job_type: 'internship' | 'part_time' | 'full_time';
  location: string;
  work_mode: 'onsite' | 'remote' | 'hybrid';
  description: string;
  requirements: string | null;
  stipend: string | null;
  deadline: string;
  apply_method: 'link' | 'email' | 'file';
  apply_value: string | null;
  apply_file_url: string | null;
  posted_by: string;
  posted_by_name: string;
  club_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  cover_url: string | null;
  category: 'Tech' | 'Cultural' | 'Sports' | 'Professional' | 'Social';
  is_active: boolean;
  created_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'president' | 'vp' | 'editor' | 'member';
  joined_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  decided_at: string | null;
}
