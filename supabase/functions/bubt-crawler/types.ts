export interface CrawlerOptions {
  tier?: 'fast' | 'faculty' | 'all';
  feature?: 'notices' | 'events' | 'faculty' | 'routines' | 'calendar' | 'bus' | 'all';
  triggeredBy?: string;
  force?: boolean;
}

export interface AdapterResult {
  feature: string;
  scanned: number;
  added: number;
  updated: number;
  unchanged: number;
  details?: Record<string, any>;
  error?: string;
}

export interface NoticeItem {
  code: string;
  title: string;
  body: string;
  department: string | null;
  department_code: string | null;
  priority: 'Urgent' | 'Important' | 'General';
  pinned: boolean;
  category: string;
  category_slug: string;
  attachment_url: string | null;
  attachment_name: string | null;
  image_url: string | null;
  external_url: string | null;
  external_id: string | null;
  source: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  code: string;
  title: string;
  category: 'Academic' | 'Cultural' | 'Sports' | 'Club' | 'Career';
  organizer: string;
  venue: string;
  date: string;
  time: string;
  end_time: string;
  banner_url: string | null;
  description: string;
  source: string;
  external_id: string;
  external_url: string;
  club_id: string | null;
  tags: string[];
  content_hash: string;
}

export interface FacultyItem {
  department_id: string;
  name: string;
  designation: string;
  short_code: string | null;
  photo_url: string | null;
  profile_url: string | null;
  on_leave: boolean;
  is_chairman: boolean;
  data_source: string;
}

export interface RoutineItem {
  type: 'class' | 'exam';
  title: string;
  department: string | null;
  semester: string | null;
  intake: string | null;
  section: string | null;
  file_url: string | null;
  image_url: string | null;
  published_by: string | null;
  content_hash: string;
  created_at: string;
}

