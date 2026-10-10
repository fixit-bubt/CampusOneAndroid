// App-wide constants.

export const APP_NAME = 'CampusOne';
export const UNIVERSITY_NAME = 'BUBT';

// Pagination - how many rows to fetch per page
export const PAGE_SIZE = 20;

// Report categories (matches DB enum)
export const REPORT_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'IT / Network',
  'Furniture',
  'Safety / Security',
  'Other',
] as const;

// Report statuses with display labels
export const REPORT_STATUS_LABELS: Record<string, string> = {
  Open: 'Open',
  'In Progress': 'In Progress',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
  Closed: 'Closed',
};

// Lost & Found categories
export const LOST_FOUND_CATEGORIES = ['Personal', 'Electronics', 'Documents', 'Other'] as const;

// Marketplace
export const MARKETPLACE_CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Notes', 'Other'] as const;
export const ITEM_CONDITIONS = ['New', 'Like New', 'Used'] as const;

// Blood groups
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

// Urgency levels
export const URGENCY_LEVELS = ['Urgent', 'Today', 'This week'] as const;

// Event categories
export const EVENT_CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Club', 'Career'] as const;

// Announcement priorities
export const ANNOUNCEMENT_PRIORITIES = ['Urgent', 'Important', 'General'] as const;

// Job types
export const JOB_TYPES: Record<string, string> = {
  internship: 'Internship',
  part_time: 'Part-time',
  full_time: 'Full-time',
  on_campus: 'On-Campus',
  tuition: 'Tuition',
  freelance: 'Freelance / Gig',
};

// Job compensation types
export const COMPENSATION_TYPES: Record<string, string> = {
  paid: 'Paid / Stipend',
  conveyance: 'Conveyance Only',
  unpaid: 'Unpaid / Experience',
  negotiable: 'Negotiable',
};

// University departments for job targeting
export const JOB_DEPARTMENTS = [
  { code: 'ALL', label: 'All Departments' },
  { code: 'CSE', label: 'CSE' },
  { code: 'EEE', label: 'EEE' },
  { code: 'BBA', label: 'BBA' },
  { code: 'ENG', label: 'English' },
  { code: 'LAW', label: 'Law' },
  { code: 'ECO', label: 'Economics' },
  { code: 'MATH', label: 'Mathematics' },
  { code: 'TEX', label: 'Textile' },
  { code: 'CIVIL', label: 'Civil' },
] as const;

// Common Dhaka locations for campus jobs & tuition
export const DHAKA_AREAS = [
  'Mirpur-1',
  'Mirpur-2',
  'Mirpur-10',
  'Mirpur-11',
  'Mirpur-12',
  'Mirpur-14',
  'Rupnagar / BUBT Campus',
  'Pallabi',
  'Uttara',
  'Dhanmondi',
  'Mohakhali / Banani',
  'Gulshan',
  'Farmgate',
  'Remote / Online',
] as const;

// Work modes
export const WORK_MODES: Record<string, string> = {
  onsite: 'Onsite',
  remote: 'Remote',
  hybrid: 'Hybrid',
};

// Club categories
export const CLUB_CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;

// Vehicle types for rides
export const VEHICLE_TYPES = ['Car', 'CNG', 'Bike'] as const;

// Days of week (for recurring rides)
export const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

// Supabase storage bucket names (match exactly what's in the DB)
export const BUCKETS = {
  photos: 'photos',           // public - report/lostfound/listing photos
  proofs: 'proofs',           // private - claim proof uploads
  attachments: 'attachments', // public - announcement attachments
  studyMaterials: 'study-materials', // private
  clubCovers: 'club-covers',  // public
  clubAttachments: 'club-attachments', // private
  jobCirculars: 'job-circulars', // public
} as const;

// Max file sizes (bytes)
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_FILE_SIZE_MB = 10;

// Image compression quality
export const IMAGE_QUALITY = 0.7;
