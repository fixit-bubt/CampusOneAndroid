// CampusOne - Navigation Types. Every screen's params are typed here.

export type AuthStackParams = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ResetPassword: { email?: string } | undefined;
  VerifyEmail: { email: string };
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type BottomTabParams = {
  Home: undefined;
  StudyHub: undefined;
  Messages: undefined;
  Explore: undefined;
  Settings: undefined;
};

// Main app stack (flat, ID-based)
export type AppStackParams = {
  // Core tabs wrapper
  Tabs: undefined;

  // Annex Portal
  Annex: undefined;

  // Reports
  ReportDetail: { reportId: string };
  ReportForm?:  { editReportId?: string } | undefined;
  MyReports:    undefined;
  AssignedToMe: undefined;
  CampusIssues?: { initialTab?: 'Campus' | 'My' } | undefined;

  // Lost & Found
  LostFoundBrowse: undefined;
  LostFoundDetail: { itemId: string };
  LostFoundPost:   undefined;
  LostFoundEdit:   { itemId: string };

  // Announcements
  Announcements:      undefined;
  AnnouncementDetail: { announcementId: string };
  AnnouncePost:       undefined;

  // Events
  EventsBrowse: undefined;
  EventDetail:  { eventId: string };
  EventPost:    undefined;

  // Clubs
  Clubs:          undefined;
  ClubDetail:     { clubId: string };
  ClubPost:       { clubId: string; clubName: string };
  ClubPostDetail: { postId: string; clubId: string; clubName?: string; canModerate?: boolean };
  ClubAddMember:  { clubId: string; clubName?: string };
  ClubManage:     { clubId: string };
  ClubMembers:    { clubId: string; clubName?: string };
  ManageClubs:    undefined;

  // Jobs
  JobsBrowse:   undefined;
  JobDetail:    { jobId: string };
  JobPost:      undefined;
  JobsModerate: undefined;

  // Market
  Market:       undefined;
  MarketDetail: { listingId: string };
  MarketPost?:  { listing?: import('./database').Listing } | undefined;

  // Bus
  Bus:       undefined;
  BusDetail: { id?: string; routeId?: string; initialDirection?: 'to' | 'from' };

  // Study Hub
  StudyHub:     undefined;
  CourseDetail: { courseId: string };
  StudyUpload:  { courseId: string; courseCode: string; courseTitle: string; initialTab?: string };

  // Medical (directory + doctor availability only - no booking)
  Medical:         undefined;
  DoctorDetail:    { doctorId: string };

  // Notifications
  Notifications:  undefined;
  NotifDetail:    { notification: import('../services/notificationsService').Notification };
  NotifSettings:  undefined;

  // Messages
  MessageThread:  { kind: import('../services/messagesService').MsgKind; id: string; title: string; initialText?: string };

  // Faculty
  Faculty:        undefined;
  FacultyDept:    { deptId: string };
  FacultyProfile: { facultyId: string };

  // Rides
  Rides:      undefined;
  RidePost?:  { postType?: 'offer' | 'request' } | undefined;
  RideDetail: { rideId: string };

  // Blood
  Blood?:             { requestCode?: string } | undefined;
  BloodRequest:       undefined;
  BloodRequestDetail: { requestId: string };
  DonorRegister:      undefined;

  // Directory
  Directory?:      { tab?: 'search' | 'requests' | 'connections'; initialTab?: 'search' | 'requests' | 'connections' } | undefined;
  StudentProfile: { student?: import('../screens/directory/StudentProfileScreen').DirectoryStudent; studentId?: string; id?: string; userId?: string };

  // Prayer
  Prayer: undefined;

  // Academic Calendar
  AcademicCalendar: undefined;

  // Routines
  RoutinesBrowse?: { initialTab?: 'my_routine' | 'other_routines' | 'official_pdfs'; subSchedule?: 'class' | 'exam' } | undefined;

  // Cover Page Generator
  CoverPageForm: undefined;

  // CGPA Calculator
  Cgpa: undefined;

  // PDF Maker (students only, fully on-device)
  PdfMaker:    undefined;
  PdfImages:   undefined;
  PdfMerge:    undefined;
  PdfOrganize: undefined;
  PdfCompress: undefined;

  // Profile (from Settings tab)
  Profile: undefined;

  // Generic feature landing
  Feature: undefined;

  // AI Chatbot
  Chatbot: { conversationId?: string } | undefined;
  ChatbotHistory: undefined;

  // Dashboards
  AdminDashboard: undefined;
  ManageUsers:    undefined;
  CreateStaffAdmin: undefined;
  ManageFaculty:  undefined;
  ManageStudyHub: undefined;
  ManageBanner:   undefined;
  ManageAnnouncements: undefined;
  ManageAcademicCalendar: undefined;
  ManageMarket:   undefined;
  ManageEvents:   undefined;
  AllReports:     undefined;

  // Legal & Policy
  PrivacyPolicy:  undefined;
  TermsOfService: undefined;
};
