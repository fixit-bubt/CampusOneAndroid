// Main app stack - every role gets the full app. The Home tab inside
// BottomTabNavigator is what differs per role (dashboard vs feed).
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParams } from '../types/navigation';
import { BottomTabNavigator } from './BottomTabNavigator';
import { afterTransition } from './afterTransition';

// Auth + feature screens
import { ReportFormScreen }        from '../screens/reports/ReportFormScreen';
import { MyReportsScreen }         from '../screens/reports/MyReportsScreen';
import { AssignedToMeScreen }      from '../screens/reports/AssignedToMeScreen';
import { CampusIssuesScreen }      from '../screens/reports/CampusIssuesScreen';
import { LostFoundBrowseScreen }   from '../screens/lostfound/LostFoundBrowseScreen';
import { LostFoundDetailScreen }   from '../screens/lostfound/LostFoundDetailScreen';
import { PostItemFormScreen }       from '../screens/lostfound/PostItemFormScreen';
import { EventsBrowseScreen }      from '../screens/events/EventsBrowseScreen';
import { EventDetailScreen }       from '../screens/events/EventDetailScreen';
import { AnnouncementsScreen }     from '../screens/announcements/AnnouncementsScreen';
import { AnnouncementDetailScreen } from '../screens/announcements/AnnouncementDetailScreen';
import { BloodScreen }             from '../screens/blood/BloodScreen';
import { BusScreen }               from '../screens/bus/BusScreen';
import { BusDetailScreen }         from '../screens/bus/BusDetailScreen';
import { JobsBrowseScreen }        from '../screens/jobs/JobsBrowseScreen';
import { JobDetailScreen }         from '../screens/jobs/JobDetailScreen';
import { JobsModerateScreen }      from '../screens/jobs/JobsModerateScreen';
import { MarketScreen }            from '../screens/market/MarketScreen';
import { MarketDetailScreen }      from '../screens/market/MarketDetailScreen';
import { RidesScreen }             from '../screens/rides/RidesScreen';
import { DirectoryScreen }         from '../screens/directory/DirectoryScreen';
import { StudentProfileScreen }    from '../screens/directory/StudentProfileScreen';
import { MedicalScreen }           from '../screens/medical/MedicalScreen';
import { DoctorDetailScreen }      from '../screens/medical/DoctorDetailScreen';
import { PrayerScreen }            from '../screens/prayer/PrayerScreen';
import { ClubsScreen }             from '../screens/clubs/ClubsScreen';
import { ClubDetailScreen }        from '../screens/clubs/ClubDetailScreen';
import { ClubManageScreen }        from '../screens/clubs/ClubManageScreen';
import { ClubMembersScreen }       from '../screens/clubs/ClubMembersScreen';
import { ClubAddMemberScreen }      from '../screens/clubs/ClubAddMemberScreen';
import { ClubPostDetailScreen }     from '../screens/clubs/ClubPostDetailScreen';
import { ManageClubsScreen }       from '../screens/dashboard/ManageClubsScreen';
import { StudyHubScreen }          from '../screens/study/StudyHubScreen';
import { CourseDetailScreen }      from '../screens/study/CourseDetailScreen';
import { FacultyScreen }           from '../screens/faculty/FacultyScreen';
import { FacultyDeptScreen }       from '../screens/faculty/FacultyDeptScreen';
import { FacultyProfileScreen }    from '../screens/faculty/FacultyProfileScreen';
import { FeatureScreen }           from '../screens/feature/FeatureScreen';
import { NotificationsScreen }     from '../screens/main/NotificationsScreen';
import { NotifDetailScreen }       from '../screens/notifications/NotifDetailScreen';
import { NotifSettingsScreen }     from '../screens/notifications/NotifSettingsScreen';
import { MessageThread }           from '../screens/messages/MessageThread';
import { AdminDashboardScreen }    from '../screens/dashboard/AdminDashboardScreen';
import { ManageUsersScreen }       from '../screens/dashboard/ManageUsersScreen';
import { CreateStaffAdminScreen }   from '../screens/dashboard/CreateStaffAdminScreen';
import { ManageFacultyScreen }     from '../screens/dashboard/ManageFacultyScreen';
import { ManageStudyHubScreen }    from '../screens/dashboard/ManageStudyHubScreen';
import { ManageBannerScreen }      from '../screens/dashboard/ManageBannerScreen';
import { ManageAnnouncementsScreen } from '../screens/dashboard/ManageAnnouncementsScreen';
import { ManageAcademicCalendarScreen } from '../screens/dashboard/ManageAcademicCalendarScreen';
import { ManageMarketScreen }           from '../screens/dashboard/ManageMarketScreen';
import { ManageEventsScreen }           from '../screens/dashboard/ManageEventsScreen';
import { AllReportsScreen }        from '../screens/dashboard/AllReportsScreen';
import { ReportDetailScreen }      from '../screens/reports/ReportDetailScreen';
import { MarketPostScreen }        from '../screens/market/MarketPostScreen';
import { RidePostScreen }          from '../screens/rides/RidePostScreen';
import { RideDetailScreen }        from '../screens/rides/RideDetailScreen';
import { EventPostScreen }         from '../screens/events/EventPostScreen';
import { JobPostScreen }           from '../screens/jobs/JobPostScreen';
import { AnnouncePostScreen }      from '../screens/announcements/AnnouncePostScreen';
import { BloodRequestScreen }      from '../screens/blood/BloodRequestScreen';
import { BloodRequestDetailScreen } from '../screens/blood/BloodRequestDetailScreen';
import { DonorRegisterScreen }     from '../screens/blood/DonorRegisterScreen';
import { ClubPostScreen }          from '../screens/clubs/ClubPostScreen';
import { StudyUploadScreen }       from '../screens/study/StudyUploadScreen';
import { AcademicCalendarScreen }  from '../screens/calendar/AcademicCalendarScreen';
import { RoutinesBrowseScreen }    from '../screens/routines/RoutinesBrowseScreen';
import { CoverPageFormScreen }     from '../screens/coverpage/CoverPageFormScreen';
import { CgpaScreen }              from '../screens/cgpa/CgpaScreen';
import { PdfMakerScreen }          from '../screens/pdfmaker/PdfMakerScreen';
import { ToolImagesScreen }        from '../screens/pdfmaker/ToolImagesScreen';
import { ToolMergeScreen }         from '../screens/pdfmaker/ToolMergeScreen';
import { ToolOrganizeScreen }      from '../screens/pdfmaker/ToolOrganizeScreen';
import { ToolCompressScreen }      from '../screens/pdfmaker/ToolCompressScreen';
import { ProfileScreen }          from '../screens/main/ProfileScreen';
import { ChatbotScreen }          from '../screens/chatbot/ChatbotScreen';
import { ChatbotHistoryScreen }   from '../screens/chatbot/ChatbotHistoryScreen';
import { AnnexPortalScreen }       from '../screens/annex/AnnexPortalScreen';
import { PrivacyPolicyScreen }    from '../screens/legal/PrivacyPolicyScreen';
import { TermsScreen }            from '../screens/legal/TermsScreen';

const Stack = createNativeStackNavigator<AppStackParams>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main tabs (Home tab = role dashboard for admin/staff) */}
      <Stack.Screen name="Tabs"           component={BottomTabNavigator} />

      {/* Annex Portal (from Explore) */}
      <Stack.Screen name="Annex"          component={afterTransition(AnnexPortalScreen, { plain: true })} />

      {/* Reports */}
      <Stack.Screen name="ReportForm"     component={afterTransition(ReportFormScreen)} />
      <Stack.Screen name="MyReports"      component={afterTransition(MyReportsScreen)} />
      <Stack.Screen name="AssignedToMe"   component={afterTransition(AssignedToMeScreen)} />
      <Stack.Screen name="CampusIssues"   component={afterTransition(CampusIssuesScreen)} />

      {/* Lost & Found */}
      <Stack.Screen name="LostFoundBrowse"  component={afterTransition(LostFoundBrowseScreen)} />
      <Stack.Screen name="LostFoundDetail"  component={afterTransition(LostFoundDetailScreen)} />
      <Stack.Screen name="LostFoundPost"    component={afterTransition(PostItemFormScreen)} />
      <Stack.Screen name="LostFoundEdit"   component={afterTransition(PostItemFormScreen)} />

      {/* Events */}
      <Stack.Screen name="EventsBrowse"   component={afterTransition(EventsBrowseScreen)} />
      <Stack.Screen name="EventDetail"    component={afterTransition(EventDetailScreen)} />

      {/* Announcements */}
      <Stack.Screen name="Announcements"        component={afterTransition(AnnouncementsScreen)} />
      <Stack.Screen name="AnnouncementDetail"   component={afterTransition(AnnouncementDetailScreen)} />

      {/* Blood */}
      <Stack.Screen name="Blood"          component={afterTransition(BloodScreen)} />

      {/* Bus */}
      <Stack.Screen name="Bus"            component={afterTransition(BusScreen)} />
      <Stack.Screen name="BusDetail"      component={afterTransition(BusDetailScreen)} />

      {/* Jobs */}
      <Stack.Screen name="JobsBrowse"     component={afterTransition(JobsBrowseScreen)} />
      <Stack.Screen name="JobDetail"      component={afterTransition(JobDetailScreen)} />
      <Stack.Screen name="JobsModerate"   component={afterTransition(JobsModerateScreen)} />

      {/* Market */}
      <Stack.Screen name="Market"         component={afterTransition(MarketScreen)} />
      <Stack.Screen name="MarketDetail"   component={afterTransition(MarketDetailScreen)} />

      {/* Rides */}
      <Stack.Screen name="Rides"          component={afterTransition(RidesScreen)} />
      <Stack.Screen name="RideDetail"     component={afterTransition(RideDetailScreen)} />

      {/* Directory */}
      <Stack.Screen name="Directory"      component={afterTransition(DirectoryScreen)} />
      <Stack.Screen name="StudentProfile" component={afterTransition(StudentProfileScreen)} />

      {/* Medical - directory + doctor availability only (no booking) */}
      <Stack.Screen name="Medical"        component={afterTransition(MedicalScreen)} />
      <Stack.Screen name="DoctorDetail"   component={afterTransition(DoctorDetailScreen)} />

      {/* Prayer */}
      <Stack.Screen name="Prayer"         component={afterTransition(PrayerScreen)} />

      {/* Clubs */}
      <Stack.Screen name="Clubs"          component={afterTransition(ClubsScreen)} />
      <Stack.Screen name="ClubDetail"     component={afterTransition(ClubDetailScreen)} />
      <Stack.Screen name="ClubManage"     component={afterTransition(ClubManageScreen)} />
      <Stack.Screen name="ClubMembers"    component={afterTransition(ClubMembersScreen)} />
      <Stack.Screen name="ClubAddMember"  component={afterTransition(ClubAddMemberScreen)} />
      <Stack.Screen name="ClubPostDetail" component={afterTransition(ClubPostDetailScreen)} />
      <Stack.Screen name="ManageClubs"    component={afterTransition(ManageClubsScreen)} />

      {/* Study */}
      <Stack.Screen name="StudyHub"       component={afterTransition(StudyHubScreen)} />
      <Stack.Screen name="CourseDetail"   component={afterTransition(CourseDetailScreen)} />
      <Stack.Screen name="StudyUpload"    component={afterTransition(StudyUploadScreen)} />

      {/* Faculty */}
      <Stack.Screen name="Faculty"        component={afterTransition(FacultyScreen)} />
      <Stack.Screen name="FacultyDept"    component={afterTransition(FacultyDeptScreen)} />
      <Stack.Screen name="FacultyProfile" component={afterTransition(FacultyProfileScreen)} />

      {/* Academic Calendar */}
      <Stack.Screen name="AcademicCalendar" component={afterTransition(AcademicCalendarScreen)} />

      {/* Routines */}
      <Stack.Screen name="RoutinesBrowse" component={afterTransition(RoutinesBrowseScreen)} />

      {/* Cover Page Generator */}
      <Stack.Screen name="CoverPageForm" component={afterTransition(CoverPageFormScreen)} />

      {/* CGPA Calculator */}
      <Stack.Screen name="Cgpa"          component={afterTransition(CgpaScreen)} />
      <Stack.Screen name="PdfMaker"      component={afterTransition(PdfMakerScreen)} />
      <Stack.Screen name="PdfImages"     component={afterTransition(ToolImagesScreen)} />
      <Stack.Screen name="PdfMerge"      component={afterTransition(ToolMergeScreen)} />
      <Stack.Screen name="PdfOrganize"   component={afterTransition(ToolOrganizeScreen)} />
      <Stack.Screen name="PdfCompress"   component={afterTransition(ToolCompressScreen)} />

      {/* Profile (from Settings tab) */}
      <Stack.Screen name="Profile"        component={afterTransition(ProfileScreen)} />

      {/* Generic feature landing */}
      <Stack.Screen name="Feature"        component={afterTransition(FeatureScreen)} />

      {/* AI Chatbot */}
      <Stack.Screen name="Chatbot"        component={afterTransition(ChatbotScreen)} />
      <Stack.Screen name="ChatbotHistory" component={afterTransition(ChatbotHistoryScreen)} />

      {/* Notifications (reached via the bell on Home, not a bottom tab) */}
      <Stack.Screen name="Notifications"  component={afterTransition(NotificationsScreen)} />
      <Stack.Screen name="NotifDetail"    component={afterTransition(NotifDetailScreen)} />
      <Stack.Screen name="NotifSettings"  component={afterTransition(NotifSettingsScreen)} />

      {/* Messages */}
      <Stack.Screen name="MessageThread"  component={afterTransition(MessageThread, { plain: true })} />

      {/* Dashboards (reached from Admin Dashboard tiles / Home tab) */}
      <Stack.Screen name="AdminDashboard" component={afterTransition(AdminDashboardScreen, { plain: true })} />
      <Stack.Screen name="ManageUsers"    component={afterTransition(ManageUsersScreen)} />
      <Stack.Screen name="CreateStaffAdmin" component={afterTransition(CreateStaffAdminScreen)} />
      <Stack.Screen name="ManageFaculty"  component={afterTransition(ManageFacultyScreen)} />
      <Stack.Screen name="ManageStudyHub"  component={afterTransition(ManageStudyHubScreen)} />
      <Stack.Screen name="ManageBanner"    component={afterTransition(ManageBannerScreen)} />
      <Stack.Screen name="ManageAnnouncements" component={afterTransition(ManageAnnouncementsScreen)} />
      <Stack.Screen name="ManageAcademicCalendar" component={afterTransition(ManageAcademicCalendarScreen)} />
      <Stack.Screen name="ManageMarket"   component={afterTransition(ManageMarketScreen)} />
      <Stack.Screen name="ManageEvents"   component={afterTransition(ManageEventsScreen)} />
      <Stack.Screen name="AllReports"     component={afterTransition(AllReportsScreen)} />

      {/* Report detail */}
      <Stack.Screen name="ReportDetail"   component={afterTransition(ReportDetailScreen)} />

      {/* Post/create forms */}
      <Stack.Screen name="MarketPost"     component={afterTransition(MarketPostScreen)} />
      <Stack.Screen name="RidePost"       component={afterTransition(RidePostScreen)} />
      <Stack.Screen name="EventPost"      component={afterTransition(EventPostScreen)} />
      <Stack.Screen name="JobPost"        component={afterTransition(JobPostScreen)} />
      <Stack.Screen name="AnnouncePost"   component={afterTransition(AnnouncePostScreen)} />
      <Stack.Screen name="BloodRequest"   component={afterTransition(BloodRequestScreen)} />
      <Stack.Screen name="BloodRequestDetail" component={afterTransition(BloodRequestDetailScreen)} />
      <Stack.Screen name="DonorRegister"  component={afterTransition(DonorRegisterScreen)} />
      <Stack.Screen name="ClubPost"       component={afterTransition(ClubPostScreen)} />

      {/* Legal & Policies */}
      <Stack.Screen name="PrivacyPolicy"  component={afterTransition(PrivacyPolicyScreen)} />
      <Stack.Screen name="TermsOfService" component={afterTransition(TermsScreen)} />
    </Stack.Navigator>
  );
}
