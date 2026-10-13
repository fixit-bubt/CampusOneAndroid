# CampusOne — 58dp Universal Bar Standardization Plan

## 1. Executive Summary & Objective

- **Target Metric:** Exactly **58dp** fixed outer height across all primary horizontal bars (Hero/Action Buttons, Segmented Tabs, Search Bars, and Filter / Dropdown Trigger Buttons).
- **Corner Radius:** Standardized **16dp** outer border radius (`borderRadius: 16`), matching the rounded-rectangle geometry of the design system.
- **Horizontal Length & Grid Alignment:** Every element shares the exact same screen margin (`Layout.screenPadding = 16dp` on left and right) so all stacked elements have the **exact same length and exact same 58dp height**.
- **Parity Reference:** Matches the exact visual weight and touch comfort of the **Home Screen Community Updates** bar.
- **Rule:** DO NOT make arbitrary guesses. Zero variations (no 34dp, 38dp, 42dp, 44dp, 46dp, 48dp, or 52dp on primary control bars). Everything listed below is strictly **58dp**.

---

## 2. Core Architectural Changes

### 2.1 Universal Component: `SegmentedTabs.tsx`
- **File:** `CampusOne/src/components/ui/SegmentedTabs.tsx`
- **Current State:** Dynamic outer height from inner `tabBtn` padding (`minHeight: 48 + padding: 4.5*2 + borders = 59dp`). Compact variant previously caused 45dp/38dp shrink.
- **Target Specification:**
  - `styles.track`:
    - `height: 58` (fixed outer height)
    - `borderRadius: 16`
    - `padding: 4`
  - `styles.indicator`:
    - `top: 4`, `bottom: 4`, `left: 4`
    - `borderRadius: 12`
    - Active pill height: `50dp` (fills track perfectly)
  - `styles.tabBtn`:
    - `height: '100%'` (fills track height)
    - `paddingVertical: 0`
    - `borderRadius: 12`
  - `styles.tabLabel`:
    - `fontSize: 13.5`
  - `styles.badge`:
    - `minWidth: 20`
    - `height: 22`
    - `paddingHorizontal: 6.5`
    - `borderRadius: 999`
    - `fontSize: 11`

---

## 3. Deep File-by-File Inventory & Change Matrix (Target: 58dp)

| # | File Path | Component / Element | Current Style & Height | Target Spec (58dp) | Status |
|---|---|---|---|---|---|
| **1** | `src/components/ui/SegmentedTabs.tsx` | Universal Segmented Switcher Track | Dynamic (~59dp / 45dp) | `height: 58, borderRadius: 16, padding: 4` | Core Component |
| **2** | `src/screens/rides/RidesScreen.tsx` | `heroActBtn` ("+ Post a Campus Ride") | `height: 44, borderRadius: 12` | `height: 58, borderRadius: 16, gap: 9` | Hero Action |
| **3** | `src/screens/rides/RidesScreen.tsx` | `searchBar` ("Search pickup, destination...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **4** | `src/screens/rides/RidePostScreen.tsx` | `modalSearchBox` (Location picker search) | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Modal Search |
| **5** | `src/screens/market/MarketScreen.tsx` | `heroActBtn` ("+ Sell an Item") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, gap: 9` | Hero Action |
| **6** | `src/screens/market/MarketScreen.tsx` | `dualBarBtn` ("All Categories" / "All") | `height: 46, borderRadius: 13` | `height: 58, borderRadius: 16, paddingHorizontal: 14` | Dropdown Bar |
| **7** | `src/screens/market/MarketScreen.tsx` | `searchBar` ("Search items...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **8** | `src/screens/market/MarketScreen.tsx` | `filterTriggerBtn` ("Filter" button) | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Filter Trigger |
| **9** | `src/screens/market/MarketPostScreen.tsx` | `modalSearchBox` (Campus location search) | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Modal Search |
| **10** | `src/screens/lostfound/LostFoundBrowseScreen.tsx` | `actBtn` ("+ Report Lost or Found") | `height: 44, borderRadius: 12` | `height: 58, borderRadius: 16, gap: 9` | Hero Action |
| **11** | `src/screens/lostfound/LostFoundBrowseScreen.tsx` | `searchBar` ("Search items...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **12** | `src/screens/lostfound/LostFoundBrowseScreen.tsx` | `filterBtn` ("Filters" trigger button) | `height: 44, borderRadius: 12` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Filter Trigger |
| **13** | `src/screens/blood/BloodScreen.tsx` | `actBtn` ("+ Request Blood" Hero Action) | `height: 44, borderRadius: 12` | `height: 58, borderRadius: 16, gap: 9` | **Discovered in Audit** |
| **14** | `src/screens/blood/BloodScreen.tsx` | `searchBar` ("Search hospital, patient...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **15** | `src/screens/blood/BloodScreen.tsx` | `areaPickerTrigger` (Dhaka Location selector) | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 12` | Trigger Bar |
| **16** | `src/components/blood/AreaPickerModal.tsx` | `searchBox` ("Search area or neighborhood...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Modal Search |
| **17** | `src/screens/jobs/JobsBrowseScreen.tsx` | `searchBar` ("Search jobs, internships...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **18** | `src/screens/jobs/JobsBrowseScreen.tsx` | `dualBarBtn` ("Job Type" / "Department") | `height: 38, borderRadius: 11` | `height: 58, borderRadius: 16, paddingHorizontal: 14` | Dropdown Bar |
| **19** | `src/screens/events/EventsBrowseScreen.tsx` | `searchBar` ("Search events, clubs...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **20** | `src/screens/announcements/AnnouncementsScreen.tsx` | `searchBar` ("Search notices, circulars...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **21** | `src/screens/medical/MedicalScreen.tsx` | `searchBox` ("Search doctor or specialist...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **22** | `src/screens/routines/RoutinesBrowseScreen.tsx` | `searchBar` ("Search department, intake...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **23** | `src/screens/study/CourseDetailScreen.tsx` | `search` ("Search files, notes...") | `height: 48, borderRadius: 14` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **24** | `src/screens/study/CourseDetailScreen.tsx` | `sortBtn` (Sort order trigger) | `48×48dp, borderRadius: 14` | `58×58dp, borderRadius: 16` | Trigger Button |
| **25** | `src/screens/study/StudyHubScreen.tsx` | `sheetStyles.input` (CR student search modal) | `height: 46, borderRadius: 12` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | **Discovered in Audit** |
| **26** | `src/screens/directory/DirectoryScreen.tsx` | `dualBarBtn` (Department dropdown trigger) | `height: 42, borderRadius: 12` | `height: 58, borderRadius: 16, paddingHorizontal: 14` | **Discovered in Audit** |
| **27** | `src/screens/directory/DirectoryScreen.tsx` | `searchBar` ("Search students...") | Dynamic (`paddingVertical: 11`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **28** | `src/screens/faculty/FacultyScreen.tsx` | `searchBar` ("Search faculty...") | Dynamic (`paddingVertical: 11`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **29** | `src/screens/faculty/FacultyDeptScreen.tsx` | `searchBar` ("Search in department...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **30** | `src/screens/dashboard/ManageFacultyScreen.tsx` | `syncActionBtn` ("Sync Faculty Database") | `height: 42, borderRadius: 11` | `height: 58, borderRadius: 16, gap: 9` | **Discovered in Audit** |
| **31** | `src/screens/dashboard/ManageFacultyScreen.tsx` | `searchBar` ("Search faculty...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **32** | `src/screens/dashboard/ManageStaffScreen.tsx` | `addBtn` ("+ Add Staff / Admin" Hero Action) | `height: 46, borderRadius: 13` | `height: 58, borderRadius: 16, gap: 9` | **Discovered in Audit** |
| **33** | `src/screens/dashboard/ManageClubsScreen.tsx` | `searchBar` ("Search clubs...") | Dynamic (`paddingVertical: 8`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **34** | `src/screens/dashboard/ManageClubsScreen.tsx` | `createBtn` ("New Club" Action in Modal) | `height: 50, borderRadius: 14` | `height: 58, borderRadius: 16` | **Discovered in Audit** |
| **35** | `src/screens/dashboard/AllReportsScreen.tsx` | `searchBar` ("Search all reports...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **36** | `src/screens/reports/CampusIssuesScreen.tsx` | `searchBar` ("Search campus issues...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **37** | `src/screens/reports/MyReportsScreen.tsx` | `searchBar` ("Search my reports...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **38** | `src/screens/reports/AssignedToMeScreen.tsx` | `searchBar` ("Search assigned tasks...") | Dynamic (`paddingVertical: 10`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **39** | `src/screens/clubs/ClubMembersScreen.tsx` | `searchBar` ("Search members...") | Dynamic (`paddingVertical: 8`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **40** | `src/screens/messages/MessageThread.tsx` | `searchBar` ("Search in conversation...") | Dynamic (`paddingVertical: 8`) | `height: 58, borderRadius: 16, paddingHorizontal: 16` | Search Bar |
| **41** | `src/screens/coverpage/CoverPageFormScreen.tsx` | `sBar` (Course & Teacher modal search) | `height: 42, borderRadius: Radius.sm` | `height: 58, borderRadius: 16, paddingHorizontal: 16` | **Discovered in Audit** |
| **42** | `src/screens/coverpage/CoverPageFormScreen.tsx` | `genBtn` ("Generate Document" Hero CTA) | `height: 52, borderRadius: Radius.md` | `height: 58, borderRadius: 16, gap: 9` | **Discovered in Audit** |

---

## 4. Screens Benefiting Automatically from SegmentedTabs 58dp
All screens using `<SegmentedTabs />` will instantly adopt the exact **58dp** height with zero code duplication:
1. `HomeCommunityUpdates.tsx` (Notices / Clubs / Events)
2. `RidesScreen.tsx` (Direction tabs & Post type tabs)
3. `RidePostScreen.tsx` (Offer / Need Ride, To / From Campus, Today / Tomorrow, Location modal)
4. `MarketScreen.tsx` (All / Mine / Saved, Condition filter, Sort filter)
5. `MarketPostScreen.tsx` (Condition picker, Location modal)
6. `BloodScreen.tsx` (Requests / Donors switcher)
7. `BloodRequestScreen.tsx` (Urgency: Urgent / Today / Week)
8. `AreaPickerModal.tsx` (Hospitals / Areas switcher)
9. `LostFoundBrowseScreen.tsx` (Lost / Found / Mine switcher)
10. `PostItemFormScreen.tsx` (Lost / Found switcher)
11. `FacultyScreen.tsx` (Depts / Mentors / Saved switcher)
12. `DirectoryScreen.tsx` (All / Connections / Requests switcher)
13. `AnnouncementsScreen.tsx` (All / Urgent / Saved switcher)
14. `AnnouncePostScreen.tsx` (Urgent / Important / General)
15. `JobsBrowseScreen.tsx` (Browse / Saved / Applied switcher, Status filter)
16. `JobPostScreen.tsx` (Work Mode, Compensation, Apply Method)
17. `JobsModerateScreen.tsx` (Reported / Removed)
18. `EventsBrowseScreen.tsx` (Upcoming / Past / Saved switcher)
19. `MyReportsScreen.tsx` (Everyone / My Reports)
20. `ManageStaffScreen.tsx` (Staff / Admins)
21. `ClubDetailScreen.tsx` (Feed / Members)
22. `MedicalScreen.tsx` (Doctors / Services / Emergency)
23. `CourseDetailScreen.tsx` (Notes / Questions / Books)
24. `StudyUploadScreen.tsx` (Materials / Questions / Books)
25. `RoutinesBrowseScreen.tsx` (Class / Exam routines)
26. `NotificationsScreen.tsx` (All / Unread)
27. `PrayerScreen.tsx` (Today / Month)

---

## 5. Execution & Verification Workflow

1. **Phase 1: Component & Screen Edits**
   - Apply 58dp specs across all 42 entries in the change matrix.
   - Standardize search input font size to `14.5px` and center vertically inside the 58dp box.
   - Standardize icon sizes to `18px` in search bars and action buttons for balanced visual weight.

2. **Phase 2: Code Quality Gates**
   - Run TypeScript typecheck: `cmd.exe /c npx tsc --noEmit` (Must be 0 errors).
   - Run Jest test suite: `cmd.exe /c npm test` (Must be 15/15 suites passing, 110/110 tests passing).

3. **Phase 3: Clean Installation on Physical Phone**
   - Run Gradle release build: `cmd.exe /c gradlew.bat assembleRelease`.
   - **Crucial Step:** Force-stop running instance first: `adb -s 8734b5da shell am force-stop com.bubt.campusone`.
   - Install APK: `adb -s 8734b5da install -r android/app/build/outputs/apk/release/app-release.apk`.
   - Start fresh process: `adb -s 8734b5da shell am start -n com.bubt.campusone/.MainActivity`.
   - Verify new PID and ensure no stale background processes remain.

4. **Phase 4: Memory Synchronization**
   - Update `AGENTS.md` and `CLAUDE.md` in workspace root.
   - Synchronously copy to `CampusOne/AGENTS.md` and `CampusOne/CLAUDE.md`.
   - Document Section 5.4 with the **58dp** universal standard.

5. **Phase 5: Git Commit & Remote Push**
   - Verify `git status` and `git diff`.
   - Stage all files (`git add -A`).
   - Clean human commit: `feat(ui): standardize 58dp universal bar height across all modules`.
   - Author: `Nawyaj Morshed <nawyajmorshed2000@gmail.com>` (Zero AI footprint).
   - Push to `https://github.com/fixit-bubt/CampusOneAndroid.git` branch `main`.
