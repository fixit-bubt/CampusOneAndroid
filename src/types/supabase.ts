// Generated from the live Supabase schema (supabase gen types). Do not edit
// by hand - regenerate after DDL changes. App-facing aliases live in database.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          code: string
          created_at: string
          created_by: string
          deleted_at: string | null
          department: string
          id: string
          image_url: string | null
          pinned: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body: string
          code?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          department: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          code?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      app_stats: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          code: string
          created_at: string
          date: string
          doctor_id: string
          id: string
          slot: string
          status: string
          student_id: string
          token: string
          updated_at: string
        }
        Insert: {
          code?: string
          created_at?: string
          date: string
          doctor_id: string
          id?: string
          slot: string
          status?: string
          student_id: string
          token: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          date?: string
          doctor_id?: string
          id?: string
          slot?: string
          status?: string
          student_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_pledges: {
        Row: {
          created_at: string
          donor_id: string
          fulfilled_at: string | null
          request_id: string
        }
        Insert: {
          created_at?: string
          donor_id: string
          fulfilled_at?: string | null
          request_id: string
        }
        Update: {
          created_at?: string
          donor_id?: string
          fulfilled_at?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pledges_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_requests: {
        Row: {
          area: string
          blood_group: string
          code: string
          created_at: string
          fulfilled_at: string | null
          hospital: string
          id: string
          patient: string
          requester_id: string
          units: number
          updated_at: string
          urgency: string
        }
        Insert: {
          area: string
          blood_group: string
          code?: string
          created_at?: string
          fulfilled_at?: string | null
          hospital: string
          id?: string
          patient: string
          requester_id: string
          units: number
          updated_at?: string
          urgency: string
        }
        Update: {
          area?: string
          blood_group?: string
          code?: string
          created_at?: string
          fulfilled_at?: string | null
          hospital?: string
          id?: string
          patient?: string
          requester_id?: string
          units?: number
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          active: boolean
          area: string
          bus_no: string | null
          created_at: string
          days: string[]
          friday_note: string | null
          from_departures: string[]
          helper_name: string | null
          helper_phone: string | null
          id: string
          leg_mins: number[]
          name: string
          stops: string[]
          to_departures: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          bus_no?: string | null
          created_at?: string
          days?: string[]
          friday_note?: string | null
          from_departures?: string[]
          helper_name?: string | null
          helper_phone?: string | null
          id: string
          leg_mins?: number[]
          name: string
          stops?: string[]
          to_departures?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          bus_no?: string | null
          created_at?: string
          days?: string[]
          friday_note?: string | null
          from_departures?: string[]
          helper_name?: string | null
          helper_phone?: string | null
          id?: string
          leg_mins?: number[]
          name?: string
          stops?: string[]
          to_departures?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          claimant_id: string
          code: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string
          kind: string
          message: string
          proof_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claimant_id: string
          code?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id: string
          kind: string
          message: string
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claimant_id?: string
          code?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string
          kind?: string
          message?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lost_found_items"
            referencedColumns: ["id"]
          },
        ]
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          added_by: string | null
          club_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_posts: {
        Row: {
          author_id: string
          body: string | null
          club_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          club_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          club_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          about: string | null
          category: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          faculty_advisor_id: string | null
          id: string
          is_active: boolean
          name: string
          tagline: string | null
        }
        Insert: {
          about?: string | null
          category: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          faculty_advisor_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          tagline?: string | null
        }
        Update: {
          about?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          faculty_advisor_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_faculty_advisor_id_fkey"
            columns: ["faculty_advisor_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          decided_at: string | null
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string | null
          department: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          department?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          department?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          branch: string
          chairman: string | null
          created_at: string
          dept_number: string
          id: string
          name: string
        }
        Insert: {
          branch: string
          chairman?: string | null
          created_at?: string
          dept_number: string
          id?: string
          name: string
        }
        Update: {
          branch?: string
          chairman?: string | null
          created_at?: string
          dept_number?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
          created_at: string
          days: string[]
          end_time: string
          id: string
          name: string
          room: string | null
          specialty: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days?: string[]
          end_time: string
          id: string
          name: string
          room?: string | null
          specialty: string
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: string[]
          end_time?: string
          id?: string
          name?: string
          room?: string | null
          specialty?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      donors: {
        Row: {
          area: string
          blood_group: string
          created_at: string
          last_donated: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          blood_group: string
          created_at?: string
          last_donated?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          blood_group?: string
          created_at?: string
          last_donated?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_organizers: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_organizers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          capacity: number | null
          category: string
          club_id: string | null
          code: string
          created_at: string
          created_by: string
          date: string
          description: string
          end_time: string | null
          id: string
          organizer: string
          time: string
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          category: string
          club_id?: string | null
          code?: string
          created_at?: string
          created_by: string
          date: string
          description: string
          end_time?: string | null
          id?: string
          organizer: string
          time: string
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          category?: string
          club_id?: string | null
          code?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          end_time?: string | null
          id?: string
          organizer?: string
          time?: string
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          created_at: string
          data_source: string
          department_id: string
          designation: string
          email: string | null
          id: string
          is_chairman: boolean
          last_synced_at: string
          linkedin_url: string | null
          name: string
          on_leave: boolean
          orcid_url: string | null
          phone: string | null
          photo_url: string | null
          profile_url: string | null
          qualifications: Json | null
          research_interests: string[]
          researchgate_url: string | null
          scholar_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          data_source?: string
          department_id: string
          designation: string
          email?: string | null
          id?: string
          is_chairman?: boolean
          last_synced_at?: string
          linkedin_url?: string | null
          name: string
          on_leave?: boolean
          orcid_url?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_url?: string | null
          qualifications?: Json | null
          research_interests?: string[]
          researchgate_url?: string | null
          scholar_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          data_source?: string
          department_id?: string
          designation?: string
          email?: string | null
          id?: string
          is_chairman?: boolean
          last_synced_at?: string
          linkedin_url?: string | null
          name?: string
          on_leave?: boolean
          orcid_url?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_url?: string | null
          qualifications?: Json | null
          research_interests?: string[]
          researchgate_url?: string | null
          scholar_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_bookmarks: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_bookmarks_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_bookmarks: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reports: {
        Row: {
          created_at: string
          id: string
          job_id: string
          note: string | null
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_file_name: string | null
          apply_file_url: string | null
          apply_method: string
          apply_value: string | null
          club_id: string | null
          code: string
          company: string
          created_at: string
          deadline: string
          deleted_at: string | null
          description: string
          id: string
          job_type: string
          location: string
          posted_by: string
          posted_by_name: string
          removed_by: string | null
          removed_reason: string | null
          requirements: string | null
          stipend: string | null
          title: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          apply_file_name?: string | null
          apply_file_url?: string | null
          apply_method: string
          apply_value?: string | null
          club_id?: string | null
          code?: string
          company: string
          created_at?: string
          deadline: string
          deleted_at?: string | null
          description: string
          id?: string
          job_type: string
          location: string
          posted_by: string
          posted_by_name: string
          removed_by?: string | null
          removed_reason?: string | null
          requirements?: string | null
          stipend?: string | null
          title: string
          updated_at?: string
          work_mode?: string
        }
        Update: {
          apply_file_name?: string | null
          apply_file_url?: string | null
          apply_method?: string
          apply_value?: string | null
          club_id?: string | null
          code?: string
          company?: string
          created_at?: string
          deadline?: string
          deleted_at?: string | null
          description?: string
          id?: string
          job_type?: string
          location?: string
          posted_by?: string
          posted_by_name?: string
          removed_by?: string | null
          removed_reason?: string | null
          requirements?: string | null
          stipend?: string | null
          title?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          code: string
          condition: string
          course_code: string | null
          created_at: string
          description: string
          id: string
          negotiable: boolean
          photo_url: string | null
          price: number
          seller_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code?: string
          condition: string
          course_code?: string | null
          created_at?: string
          description: string
          id?: string
          negotiable?: boolean
          photo_url?: string | null
          price: number
          seller_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          condition?: string
          course_code?: string | null
          created_at?: string
          description?: string
          id?: string
          negotiable?: boolean
          photo_url?: string | null
          price?: number
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_items: {
        Row: {
          category: string
          code: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          item_date: string
          location: string
          photo_url: string | null
          poster_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          item_date: string
          location: string
          photo_url?: string | null
          poster_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          item_date?: string
          location?: string
          photo_url?: string | null
          poster_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_items_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          conv_key: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conv_key: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conv_key?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          club_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          kind: string
          peer_high: string | null
          peer_low: string | null
          section_id: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          club_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          kind: string
          peer_high?: string | null
          peer_low?: string | null
          section_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          club_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          peer_high?: string | null
          peer_low?: string | null
          section_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_peer_high_fkey"
            columns: ["peer_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_peer_high_fkey"
            columns: ["peer_high"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_peer_low_fkey"
            columns: ["peer_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_peer_low_fkey"
            columns: ["peer_low"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      musallah_locations: {
        Row: {
          floor_desc: string
          id: number
          name: string
          sort: number
        }
        Insert: {
          floor_desc?: string
          id?: never
          name: string
          sort?: number
        }
        Update: {
          floor_desc?: string
          id?: never
          name?: string
          sort?: number
        }
        Relationships: []
      }
      notif_prefs: {
        Row: {
          email: boolean
          enabled: boolean
          inapp: boolean
          push: boolean
          sector: string
          user_id: string
        }
        Insert: {
          email?: boolean
          enabled?: boolean
          inapp?: boolean
          push?: boolean
          sector: string
          user_id: string
        }
        Update: {
          email?: boolean
          enabled?: boolean
          inapp?: boolean
          push?: boolean
          sector?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notif_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notif_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          sector: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          sector: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          sector?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_times: {
        Row: {
          ar: string
          azan: string
          en: string
          jamaat: string
          key: string
          sort: number
          updated_at: string
        }
        Insert: {
          ar: string
          azan: string
          en: string
          jamaat: string
          key: string
          sort: number
          updated_at?: string
        }
        Update: {
          ar?: string
          azan?: string
          en?: string
          jamaat?: string
          key?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          blood_group: string | null
          created_at: string
          department: string | null
          directory_visible: boolean
          email: string
          expertise: string | null
          full_name: string
          id: string
          intake: string | null
          phone: string | null
          program: string | null
          role: string
          section: string | null
          show_whatsapp: boolean
          student_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          department?: string | null
          directory_visible?: boolean
          email: string
          expertise?: string | null
          full_name: string
          id: string
          intake?: string | null
          phone?: string | null
          program?: string | null
          role?: string
          section?: string | null
          show_whatsapp?: boolean
          student_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          department?: string | null
          directory_visible?: boolean
          email?: string
          expertise?: string | null
          full_name?: string
          id?: string
          intake?: string | null
          phone?: string | null
          program?: string | null
          role?: string
          section?: string | null
          show_whatsapp?: boolean
          student_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          report_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          report_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          report_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_votes: {
        Row: {
          created_at: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_votes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          assigned_staff_id: string | null
          building: string
          category: string
          code: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          photo_url: string | null
          reporter_id: string
          room: string | null
          show_on_board: boolean
          status: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          building: string
          category: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          photo_url?: string | null
          reporter_id: string
          room?: string | null
          show_on_board?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          building?: string
          category?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          photo_url?: string | null
          reporter_id?: string
          room?: string | null
          show_on_board?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          created_at: string
          requester_id: string
          ride_id: string
        }
        Insert: {
          created_at?: string
          requester_id: string
          ride_id: string
        }
        Update: {
          created_at?: string
          requester_id?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          code: string
          created_at: string
          date: string
          destination: string
          direction: string
          driver_id: string
          expires_at: string | null
          fare: number
          id: string
          notes: string | null
          origin: string
          recurring: string[]
          seats_total: number
          time: string
          updated_at: string
          vehicle: string
        }
        Insert: {
          code?: string
          created_at?: string
          date: string
          destination: string
          direction: string
          driver_id: string
          expires_at?: string | null
          fare: number
          id?: string
          notes?: string | null
          origin: string
          recurring?: string[]
          seats_total: number
          time: string
          updated_at?: string
          vehicle: string
        }
        Update: {
          code?: string
          created_at?: string
          date?: string
          destination?: string
          direction?: string
          driver_id?: string
          expires_at?: string | null
          fare?: number
          id?: string
          notes?: string | null
          origin?: string
          recurring?: string[]
          seats_total?: number
          time?: string
          updated_at?: string
          vehicle?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string | null
          department: string | null
          file_url: string | null
          id: string
          image_url: string | null
          intake: string | null
          published_by: string | null
          section: string | null
          semester: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          intake?: string | null
          published_by?: string | null
          section?: string | null
          semester?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          intake?: string | null
          published_by?: string | null
          section?: string | null
          semester?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      saved_bus_routes: {
        Row: {
          route_id: string
          user_id: string
        }
        Insert: {
          route_id: string
          user_id: string
        }
        Update: {
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_bus_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_bus_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_bus_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_access_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          from_section_id: string
          id: string
          message: string | null
          requested_by: string | null
          status: string
          to_section_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          from_section_id: string
          id?: string
          message?: string | null
          requested_by?: string | null
          status?: string
          to_section_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          from_section_id?: string
          id?: string
          message?: string | null
          requested_by?: string | null
          status?: string
          to_section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_access_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_access_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_access_requests_from_section_id_fkey"
            columns: ["from_section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_access_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_access_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_access_requests_to_section_id_fkey"
            columns: ["to_section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_bookmarks: {
        Row: {
          created_at: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      study_books: {
        Row: {
          added_by: string | null
          author: string | null
          course_code: string | null
          course_id: string | null
          created_at: string
          edition: string | null
          id: string
          intake_id: string
          kind: string
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          added_by?: string | null
          author?: string | null
          course_code?: string | null
          course_id?: string | null
          created_at?: string
          edition?: string | null
          id?: string
          intake_id: string
          kind: string
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          added_by?: string | null
          author?: string | null
          course_code?: string | null
          course_id?: string | null
          created_at?: string
          edition?: string | null
          id?: string
          intake_id?: string
          kind?: string
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_books_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_books_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_books_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_books_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "study_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          section_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          section_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_courses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_intake_vote_ballots: {
        Row: {
          ballot: string
          cr_id: string
          id: string
          vote_id: string
          voted_at: string
        }
        Insert: {
          ballot: string
          cr_id: string
          id?: string
          vote_id: string
          voted_at?: string
        }
        Update: {
          ballot?: string
          cr_id?: string
          id?: string
          vote_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_intake_vote_ballots_cr_id_fkey"
            columns: ["cr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_intake_vote_ballots_cr_id_fkey"
            columns: ["cr_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_intake_vote_ballots_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "study_intake_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_intake_votes: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          initiated_by: string
          intake_id: string
          proposal: string
          result: string | null
          status: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          initiated_by: string
          intake_id: string
          proposal: string
          result?: string | null
          status?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          initiated_by?: string
          intake_id?: string
          proposal?: string
          result?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_intake_votes_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_intake_votes_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_intake_votes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "study_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_intakes: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_public: boolean
          number: number
          years: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_public?: boolean
          number: number
          years?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_public?: boolean
          number?: number
          years?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_intakes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          course_id: string
          created_at: string
          file_kind: string | null
          id: string
          size_bytes: number | null
          storage_path: string
          title: string
          type: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          file_kind?: string | null
          id?: string
          size_bytes?: number | null
          storage_path: string
          title: string
          type: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          file_kind?: string | null
          id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_pins: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          kind: string
          message: string
          pinned_by: string | null
          section_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          kind: string
          message: string
          pinned_by?: string | null
          section_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          message?: string
          pinned_by?: string | null
          section_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_pins_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_pins_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_pins_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_question_bank: {
        Row: {
          course_id: string | null
          created_at: string
          exam: string
          file_kind: string | null
          id: string
          section_id: string
          size_bytes: number | null
          storage_path: string
          title: string
          uploaded_by: string | null
          verified: boolean
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          exam: string
          file_kind?: string | null
          id?: string
          section_id: string
          size_bytes?: number | null
          storage_path: string
          title: string
          uploaded_by?: string | null
          verified?: boolean
        }
        Update: {
          course_id?: string | null
          created_at?: string
          exam?: string
          file_kind?: string | null
          id?: string
          section_id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          uploaded_by?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "study_question_bank_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_bank_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_bank_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_bank_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_section_grants: {
        Row: {
          created_at: string
          from_section_id: string
          id: string
          to_section_id: string
        }
        Insert: {
          created_at?: string
          from_section_id: string
          id?: string
          to_section_id: string
        }
        Update: {
          created_at?: string
          from_section_id?: string
          id?: string
          to_section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_section_grants_from_section_id_fkey"
            columns: ["from_section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_grants_to_section_id_fkey"
            columns: ["to_section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_section_members: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          joined_via: string | null
          role: string
          section_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          joined_via?: string | null
          role?: string
          section_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          joined_via?: string | null
          role?: string
          section_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_section_members_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_members_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_members_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_section_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          department_id: string
          id: string
          intake_number: number
          reason: string | null
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          section_id: string | null
          section_number: number
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          department_id: string
          id?: string
          intake_number: number
          reason?: string | null
          requester_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          section_number: number
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          department_id?: string
          id?: string
          intake_number?: number
          reason?: string | null
          requester_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          section_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_section_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_requests_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sections: {
        Row: {
          created_at: string
          id: string
          intake_id: string
          is_public: boolean
          join_code: string | null
          number: number
        }
        Insert: {
          created_at?: string
          id?: string
          intake_id: string
          is_public?: boolean
          join_code?: string | null
          number: number
        }
        Update: {
          created_at?: string
          id?: string
          intake_id?: string
          is_public?: boolean
          join_code?: string | null
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sections_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "study_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          department: string | null
          expertise: string | null
          full_name: string | null
          id: string | null
          program: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          department?: string | null
          expertise?: string | null
          full_name?: string | null
          id?: string | null
          program?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          department?: string | null
          expertise?: string | null
          full_name?: string | null
          id?: string | null
          program?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_section_request: { Args: { p_request_id: string }; Returns: Json }
      blood_requester_contact: {
        Args: { p_code: string }
        Returns: {
          name: string
          whatsapp: string
        }[]
      }
      booked_slots: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: string[]
      }
      campus_issues_feed: {
        Args: never
        Returns: {
          building: string
          category: string
          code: string
          created_at: string
          description: string
          id: string
          room: string
          status: string
          vote_count: number
          voted: boolean
        }[]
      }
      campus_reports: {
        Args: { p_limit?: number }
        Returns: {
          building: string
          category: string
          code: string
          created_at: string
          description: string
          id: string
          reporter_id: string
          reporter_name: string
          room: string
          status: string
        }[]
      }
      can_create_events: { Args: never; Returns: boolean }
      can_post_jobs: { Args: never; Returns: boolean }
      cast_intake_vote: {
        Args: { p_ballot: string; p_vote_id: string }
        Returns: Json
      }
      check_expired_intake_votes: {
        Args: { p_intake_id: string }
        Returns: undefined
      }
      claim_contact: {
        Args: { p_claim_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          whatsapp: string
        }[]
      }
      close_intake_vote: { Args: { p_vote_id: string }; Returns: undefined }
      club_can_manage: { Args: { cid: string }; Returns: boolean }
      club_can_post: { Args: { cid: string }; Returns: boolean }
      club_is_member: { Args: { cid: string }; Returns: boolean }
      club_is_president: { Args: { cid: string }; Returns: boolean }
      club_member_counts: {
        Args: never
        Returns: {
          club_id: string
          members: number
        }[]
      }
      club_set_president: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: undefined
      }
      club_update_details: {
        Args: {
          p_about?: string
          p_advisor?: string
          p_category?: string
          p_club_id: string
          p_cover_url?: string
          p_name: string
          p_tagline?: string
        }
        Returns: undefined
      }
      confirm_blood_donation: {
        Args: { p_donor_id: string; p_request_id: string }
        Returns: Json
      }
      decline_report: { Args: { p_report_id: string }; Returns: Json }
      delete_expired_rides: { Args: never; Returns: undefined }
      directory_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          department: string
          full_name: string
          id: string
          role: string
        }[]
      }
      dm_can_send: { Args: { other: string }; Returns: boolean }
      donor_contact: { Args: { p_user_id: string }; Returns: Json }
      donor_pledges_for_request: {
        Args: { p_request_id: string }
        Returns: {
          blood_group: string
          donor_id: string
          fulfilled_at: string
          full_name: string
          last_donated: string
          pledged_at: string
        }[]
      }
      email_is_registered: { Args: { p_email: string }; Returns: boolean }
      gen_section_join_code: { Args: never; Returns: string }
      initiate_intake_vote: {
        Args: { p_intake_id: string; p_proposal: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_report_board_eligible: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      is_staff_or_admin: { Args: never; Returns: boolean }
      is_student: { Args: never; Returns: boolean }
      job_admin_remove: {
        Args: { p_code: string; p_reason: string }
        Returns: undefined
      }
      job_admin_restore: { Args: { p_code: string }; Returns: undefined }
      job_report: {
        Args: { p_code: string; p_note?: string; p_reason: string }
        Returns: undefined
      }
      job_withdraw: { Args: { p_code: string }; Returns: undefined }
      join_section_by_code: { Args: { p_code: string }; Returns: Json }
      listing_contact: {
        Args: { p_code: string }
        Returns: {
          name: string
          whatsapp: string
        }[]
      }
      reject_section_request: {
        Args: { p_note: string; p_request_id: string }
        Returns: Json
      }
      report_vote_counts: {
        Args: never
        Returns: {
          report_id: string
          vote_count: number
        }[]
      }
      ride_contact: {
        Args: { p_code: string; p_target: string }
        Returns: {
          name: string
          whatsapp: string
        }[]
      }
      ride_request_counts: {
        Args: never
        Returns: {
          ride_id: string
          taken: number
        }[]
      }
      rsvp_event: { Args: { p_event_id: string }; Returns: Json }
      set_report_board_visibility: {
        Args: { p_report_id: string; p_visible: boolean }
        Returns: boolean
      }
      student_directory: {
        Args: never
        Returns: {
          avatar_url: string
          blood_group: string
          department: string
          email: string
          full_name: string
          id: string
          intake: string
          program: string
          section: string
          status: string
          whatsapp: string
        }[]
      }
      study_can_edit: { Args: { sec: string }; Returns: boolean }
      study_can_read_object: { Args: { obj: string }; Returns: boolean }
      study_can_view: { Args: { sec: string }; Returns: boolean }
      study_editor_of_intake: { Args: { ina: string }; Returns: boolean }
      study_is_cr: { Args: { sec: string }; Returns: boolean }
      study_is_member: { Args: { sec: string }; Returns: boolean }
      study_member_of_intake: { Args: { ina: string }; Returns: boolean }
      study_sections_with_cr: {
        Args: never
        Returns: {
          section_id: string
        }[]
      }
      toggle_report_vote: {
        Args: { p_report_id: string }
        Returns: {
          vote_count: number
          voted: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
