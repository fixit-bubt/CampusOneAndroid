// CampusOne — Navigation Types. Every screen's params are typed here.

export type AuthStackParams = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ResetPassword: { email?: string } | undefined;
  VerifyEmail: { email: string };
};

export type BottomTabParams = {
  Home: undefined;
  Explore: undefined;
  Messages: undefined;
  Notifications: undefined;
  Settings: undefined;
};

// Main app stack (flat, ID-based)
export type AppStackParams = {
  // Core tabs wrapper
  Tabs: undefined;

  // Reports
  ReportDetail: { reportId: string };
  ReportForm:   { editReportId?: string };
  MyReports:    undefined;
  AssignedToMe: undefined;
  CampusIssues: undefined;

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
  Clubs:       undefined;
  ClubDetail:  { clubId: string };
  ClubPost:    { clubId: string; clubName: string };
  ClubManage:  { clubId: string };
  ClubMembers: { clubId: string };
  ManageClubs: undefined;

  // Jobs
  JobsBrowse:   undefined;
  JobDetail:    { jobId: string };
  JobPost:      undefined;
  JobsModerate: undefined;

  // Market
  Market:       undefined;
  MarketDetail: { listingId: string };
  MarketPost:   { listing?: import('./database').Listing };

  // Bus
  Bus:       undefined;
  BusDetail: { id: string };

  // Study Hub
  StudyHub:     undefined;
  CourseDetail: { courseId: string };
  StudyUpload:  { courseId: string; courseCode: string; courseTitle: string };

  // Medical (directory + doctor availability only — no booking)
  Medical:         undefined;
  DoctorDetail:    { doctorId: string };

  // Notifications
  NotifDetail:    { notification: import('../services/notificationsService').Notification };
  NotifSettings:  undefined;

  // Messages
  MessageThread:  { kind: import('../services/messagesService').MsgKind; id: string; title: string };

  // Faculty
  Faculty:        undefined;
  FacultyDept:    { deptId: string };
  FacultyProfile: { facultyId: string };

  // Rides
  Rides:      undefined;
  RidePost:   undefined;
  RideDetail: { rideId: string };

  // Blood
  Blood:              undefined;
  BloodRequest:       undefined;
  BloodRequestDetail: { requestId: string };
  DonorRegister:      undefined;

  // Directory
  Directory: undefined;
  StudentProfile: { student: import('../screens/directory/StudentProfileScreen').DirectoryStudent };

  // Prayer
  Prayer: undefined;

  // Academic Calendar
  AcademicCalendar: undefined;

  // Routines
  RoutinesBrowse: undefined;

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

  // Dashboards
  StaffDashboard: undefined;
  AdminDashboard: undefined;
  ManageUsers:    undefined;
  ManageStaff:    undefined;
  ManageFaculty:  undefined;
  AllReports:     undefined;
};

export type AnnouncementsStackParams = {
  AnnouncementsList: undefined;
  AnnouncementDetail: { announcementId: string };
  AnnouncementPost: undefined;
};

export type BloodStackParams = {
  BloodMain: undefined;
  BloodRequest: undefined;
  DonorRegister: undefined;
};

export type BusStackParams = {
  BusList: undefined;
  BusDetail: { routeId: string };
};

export type JobsStackParams = {
  JobsBrowse: undefined;
  JobDetail: { jobId: string };
  JobPost: undefined;
};

export type MedicalStackParams = {
  DoctorList: undefined;
  DoctorDetail: { doctorId: string };
};

export type ClubsStackParams = {
  ClubsList: undefined;
  ClubDetail: { clubId: string };
  ClubManage: { clubId: string };
  ClubPost: { clubId: string; clubName: string };
};

export type FacultyStackParams = {
  FacultyBrowse: undefined;
  FacultyProfile: { facultyId: string };
};

export type DirectoryStackParams = {
  DirectorySearch: undefined;
};

export type AdminStackParams = {
  AdminDashboard: undefined;
  AdminAllReports: undefined;
  AdminManageUsers: undefined;
  AdminManageFaculty: undefined;
  AdminManageStudyHub: undefined;
  AdminManageClubs: undefined;
};

export type StaffStackParams = {
  StaffDashboard: undefined;
  StaffAssigned: undefined;
};
