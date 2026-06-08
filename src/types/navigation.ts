// ─────────────────────────────────────────────────────────────────────────────
// CampusOne — Navigation Types
// Every screen's params are typed here. TypeScript will catch wrong params.
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStackParams = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
};

export type BottomTabParams = {
  Home: undefined;
  Explore: undefined;
  Notifications: undefined;
  Profile: undefined;
};

// ─── Main app stack (flat, ID-based) ─────────────────────────────────────────
export type AppStackParams = {
  // Core tabs wrapper
  Tabs: undefined;

  // Reports
  ReportDetail: { reportId: string };
  ReportForm:   { editReportId?: string };

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

  // Jobs
  JobsBrowse: undefined;
  JobDetail:  { jobId: string };
  JobPost:    undefined;

  // Market
  Market:       undefined;
  MarketDetail: { listingId: string };
  MarketPost:   { listing?: import('./database').Listing };

  // Bus
  Bus:       undefined;
  BusDetail: { routeId: string };

  // Study Hub
  StudyHub:     undefined;
  CourseDetail: { courseId: string };
  StudyUpload:  { courseId: string; courseCode: string; courseTitle: string };

  // Medical
  Medical:      undefined;
  DoctorDetail: { doctorId: string };

  // Notifications
  NotifDetail:    { notifId: string };
  NotifSettings:  undefined;

  // Faculty
  Faculty:        undefined;
  FacultyProfile: { facultyId: string };

  // Rides
  Rides:      undefined;
  RidePost:   undefined;
  RideDetail: { rideId: string };

  // Blood
  Blood:          undefined;
  BloodRequest:   undefined;
  DonorRegister:  undefined;

  // Directory
  Directory: undefined;

  // Prayer
  Prayer: undefined;

  // Generic feature landing
  Feature: undefined;

  // Dashboards
  StaffDashboard: undefined;
  AdminDashboard: undefined;
  ManageUsers:    undefined;
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
  BookAppointment: { doctorId: string };
  MyAppointments: undefined;
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
