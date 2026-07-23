// Main app stack — every role gets the full app. The Home tab inside
// BottomTabNavigator is what differs per role (dashboard vs feed).
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParams } from '../types/navigation';
import { BottomTabNavigator } from './BottomTabNavigator';

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
import { ManageClubsScreen }       from '../screens/dashboard/ManageClubsScreen';
import { StudyHubScreen }          from '../screens/study/StudyHubScreen';
import { CourseDetailScreen }      from '../screens/study/CourseDetailScreen';
import { FacultyScreen }           from '../screens/faculty/FacultyScreen';
import { FacultyDeptScreen }       from '../screens/faculty/FacultyDeptScreen';
import { FacultyProfileScreen }    from '../screens/faculty/FacultyProfileScreen';
import { FeatureScreen }           from '../screens/feature/FeatureScreen';
import { NotifDetailScreen }       from '../screens/notifications/NotifDetailScreen';
import { NotifSettingsScreen }     from '../screens/notifications/NotifSettingsScreen';
import { MessageThread }           from '../screens/messages/MessageThread';
import { StaffDashboardScreen }    from '../screens/dashboard/StaffDashboardScreen';
import { AdminDashboardScreen }    from '../screens/dashboard/AdminDashboardScreen';
import { ManageUsersScreen }       from '../screens/dashboard/ManageUsersScreen';
import { ManageStaffScreen }       from '../screens/dashboard/ManageStaffScreen';
import { ManageFacultyScreen }     from '../screens/dashboard/ManageFacultyScreen';
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

const Stack = createNativeStackNavigator<AppStackParams>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main tabs (Home tab = role dashboard for admin/staff) */}
      <Stack.Screen name="Tabs"           component={BottomTabNavigator} />

      {/* Reports */}
      <Stack.Screen name="ReportForm"     component={ReportFormScreen} />
      <Stack.Screen name="MyReports"      component={MyReportsScreen} />
      <Stack.Screen name="AssignedToMe"   component={AssignedToMeScreen} />
      <Stack.Screen name="CampusIssues"   component={CampusIssuesScreen} />

      {/* Lost & Found */}
      <Stack.Screen name="LostFoundBrowse"  component={LostFoundBrowseScreen} />
      <Stack.Screen name="LostFoundDetail"  component={LostFoundDetailScreen} />
      <Stack.Screen name="LostFoundPost"    component={PostItemFormScreen} />
      <Stack.Screen name="LostFoundEdit"   component={PostItemFormScreen} />

      {/* Events */}
      <Stack.Screen name="EventsBrowse"   component={EventsBrowseScreen} />
      <Stack.Screen name="EventDetail"    component={EventDetailScreen} />

      {/* Announcements */}
      <Stack.Screen name="Announcements"        component={AnnouncementsScreen} />
      <Stack.Screen name="AnnouncementDetail"   component={AnnouncementDetailScreen} />

      {/* Blood */}
      <Stack.Screen name="Blood"          component={BloodScreen} />

      {/* Bus */}
      <Stack.Screen name="Bus"            component={BusScreen} />
      <Stack.Screen name="BusDetail"      component={BusDetailScreen} />

      {/* Jobs */}
      <Stack.Screen name="JobsBrowse"     component={JobsBrowseScreen} />
      <Stack.Screen name="JobDetail"      component={JobDetailScreen} />
      <Stack.Screen name="JobsModerate"   component={JobsModerateScreen} />

      {/* Market */}
      <Stack.Screen name="Market"         component={MarketScreen} />
      <Stack.Screen name="MarketDetail"   component={MarketDetailScreen} />

      {/* Rides */}
      <Stack.Screen name="Rides"          component={RidesScreen} />
      <Stack.Screen name="RideDetail"     component={RideDetailScreen} />

      {/* Directory */}
      <Stack.Screen name="Directory"      component={DirectoryScreen} />
      <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />

      {/* Medical — directory + doctor availability only (no booking) */}
      <Stack.Screen name="Medical"        component={MedicalScreen} />
      <Stack.Screen name="DoctorDetail"   component={DoctorDetailScreen} />

      {/* Prayer */}
      <Stack.Screen name="Prayer"         component={PrayerScreen} />

      {/* Clubs */}
      <Stack.Screen name="Clubs"          component={ClubsScreen} />
      <Stack.Screen name="ClubDetail"     component={ClubDetailScreen} />
      <Stack.Screen name="ClubManage"     component={ClubManageScreen} />
      <Stack.Screen name="ClubMembers"    component={ClubMembersScreen} />
      <Stack.Screen name="ManageClubs"    component={ManageClubsScreen} />

      {/* Study */}
      <Stack.Screen name="StudyHub"       component={StudyHubScreen} />
      <Stack.Screen name="CourseDetail"   component={CourseDetailScreen} />
      <Stack.Screen name="StudyUpload"    component={StudyUploadScreen} />

      {/* Faculty */}
      <Stack.Screen name="Faculty"        component={FacultyScreen} />
      <Stack.Screen name="FacultyDept"    component={FacultyDeptScreen} />
      <Stack.Screen name="FacultyProfile" component={FacultyProfileScreen} />

      {/* Academic Calendar */}
      <Stack.Screen name="AcademicCalendar" component={AcademicCalendarScreen} />

      {/* Routines */}
      <Stack.Screen name="RoutinesBrowse" component={RoutinesBrowseScreen} />

      {/* Cover Page Generator */}
      <Stack.Screen name="CoverPageForm" component={CoverPageFormScreen} />

      {/* CGPA Calculator */}
      <Stack.Screen name="Cgpa"          component={CgpaScreen} />
      <Stack.Screen name="PdfMaker"      component={PdfMakerScreen} />
      <Stack.Screen name="PdfImages"     component={ToolImagesScreen} />
      <Stack.Screen name="PdfMerge"      component={ToolMergeScreen} />
      <Stack.Screen name="PdfOrganize"   component={ToolOrganizeScreen} />
      <Stack.Screen name="PdfCompress"   component={ToolCompressScreen} />

      {/* Profile (from Settings tab) */}
      <Stack.Screen name="Profile"        component={ProfileScreen} />

      {/* Generic feature landing */}
      <Stack.Screen name="Feature"        component={FeatureScreen} />

      {/* Notifications */}
      <Stack.Screen name="NotifDetail"    component={NotifDetailScreen} />
      <Stack.Screen name="NotifSettings"  component={NotifSettingsScreen} />

      {/* Messages */}
      <Stack.Screen name="MessageThread"  component={MessageThread} />

      {/* Dashboards (reached from Admin Dashboard tiles / Home tab) */}
      <Stack.Screen name="StaffDashboard" component={StaffDashboardScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ManageUsers"    component={ManageUsersScreen} />
      <Stack.Screen name="ManageStaff"    component={ManageStaffScreen} />
      <Stack.Screen name="ManageFaculty"  component={ManageFacultyScreen} />
      <Stack.Screen name="AllReports"     component={AllReportsScreen} />

      {/* Report detail */}
      <Stack.Screen name="ReportDetail"   component={ReportDetailScreen} />

      {/* Post/create forms */}
      <Stack.Screen name="MarketPost"     component={MarketPostScreen} />
      <Stack.Screen name="RidePost"       component={RidePostScreen} />
      <Stack.Screen name="EventPost"      component={EventPostScreen} />
      <Stack.Screen name="JobPost"        component={JobPostScreen} />
      <Stack.Screen name="AnnouncePost"   component={AnnouncePostScreen} />
      <Stack.Screen name="BloodRequest"   component={BloodRequestScreen} />
      <Stack.Screen name="BloodRequestDetail" component={BloodRequestDetailScreen} />
      <Stack.Screen name="DonorRegister"  component={DonorRegisterScreen} />
      <Stack.Screen name="ClubPost"       component={ClubPostScreen} />
    </Stack.Navigator>
  );
}
