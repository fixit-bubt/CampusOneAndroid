# AGENTS.md — CampusOne Knowledge & Engineering Reference

This document is the single, authoritative reference for any AI agent or developer working on the **CampusOne** project. It synthesizes all project memory, live code patterns, database schemas, environment constraints, and developer preferences.

> [!IMPORTANT]
> ### STRICT BUILD & TESTING RULE: LOCAL ANDROID SDK & GRADLE ONLY (NO EXPO GO / NO METRO / NO EAS)
> - **NEVER suggest or run `npx expo start`, Expo Go, or Metro bundler for testing.**
> - **NEVER use EAS Cloud builds.**
> - **Testing & Building is 100% Native via Local Android SDK & Gradle:**
>   1. Build release APK: `cd android; .\gradlew assembleRelease`
>   2. Force-stop previous instance: `& "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am force-stop com.bubt.campusone`
>   3. Install to phone via ADB: `& "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da install -r android/app/build/outputs/apk/release/app-release.apk`
>   4. Launch on phone: `& "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am start -n com.bubt.campusone/.MainActivity`
> - **Hardware Connected:** The user tests directly on their physical USB-connected Android phone (`8734b5da`).
> - **Why?** Google Sign-In is strictly pinned to the release keystore's SHA-1 fingerprint (`campusone-release.keystore`). Debug / Expo builds fail Google Sign-In with `DEVELOPER_ERROR`. Real device testing MUST be done using the locally compiled, signed release APK.

---

## 1. Executive Summary & Project Purpose

- **Project:** CampusOne (Android Mobile App)
- **Institution:** Bangladesh University of Business & Technology (BUBT), Dhaka, Bangladesh
- **Context:** University Capstone Project
- **Purpose:** An all-in-one campus mobile companion for BUBT students, faculty, and administrative staff. Covers everyday university life: bus schedules, prayer times, lost & found, peer-to-peer marketplace, campus rides, class routines, study hub, clubs, events, blood donation, student jobs, campus maintenance reporting, AI assistance, academic calendar, and BUBT Annex portal access.
- **Sibling Web App:** "FixIt — Campus Management" (`Desktop/fix it sdp/fixit-campus`), built with React + Vite + Tailwind JS. Both mobile and web share the **exact same Supabase backend** and database tables.
- **1:1 Feature Parity:** The website and mobile app share the **exact same core feature set and business logic**:
  - **Campus Maintenance & Issues:** Report infrastructure problems, track status, trade assignment to staff.
  - **Lost & Found:** Post items, claim with proof photos, pre-post matching.
  - **Student Marketplace:** Buy/sell books, electronics, course materials, contact reveal RPC.
  - **Campus Rides:** Ride sharing, route planning, seat availability, driver contact reveal.
  - **Blood Donation:** Donor directory, urgent blood requests, 90-day eligibility enforcement, "I can help" pledges.
  - **Study Hub:** Department/intake/section notes, file uploads, bookmarks, CR section moderation.
  - **Clubs & Communities:** Club directory, membership join requests, posts, executive roles.
  - **Events & Announcements:** Campus events, RSVP, administrative announcements.
  - **Student Jobs:** Campus recruitment, internships, bookmarks, deadlines.
  - **Campus Directories:** Student directory with connection requests, faculty/staff directory.
  - **Campus Info:** Bus schedules, prayer/masjid times, clinic/doctor directory.
  - **Tools & Utilities:** CGPA calculator, PDF tools, academic calendar.
  - **Role System:** Student, Staff, and Admin dashboards and permissions are identical across both platforms.

---

## 2. Repositories, Environments & Backend Reference

### 2.1 Git Remotes
- **Target Repo (Active):** `https://github.com/fixit-bubt/CampusOneAndroid.git` (branch: `main`)
- **Stale Repos (DO NOT TOUCH):** `nawyajmorshed/CampusOne`, `fixit-bubt/CampusOne`
- **STRICT PROHIBITION:** Never touch or push to any repository containing `evergreen`, `evergreenweb`, or personal non-CampusOne repositories.

### 2.2 Supabase Backend
- **Project Ref:** `xhgpxvyqrufbbuivttmi` (Dashboard name: `fixit-campus`, Region: `ap-south-1`)
- **API URL:** `https://xhgpxvyqrufbbuivttmi.supabase.co`
- **Anon Key:** Configured in `src/lib/supabase.ts` (safe for client bundle)
- **MCP Database Changes:** Allowed via project-scoped `.mcp.json`. Always verify the project ref is `xhgpxvyqrufbbuivttmi` before running any DDL or migration.

### 2.3 Working Directories
- **React Native Project Root:** `c:\Users\dracu\Desktop\CampusOne\CampusOne`
- **Outer Wrapper / Workspace:** `c:\Users\dracu\Desktop\CampusOne` (contains Capstone Thesis Word document and backup files)

### 2.4 Model Context Protocol (MCP) & Design Tooling
- **Config Locations:**
  - Global: `~/.gemini/config/mcp_config.json`
  - Workspace: `.mcp.json` in workspace root and `CampusOne/.mcp.json`
- **21st.dev MCP Integration (`twenty-first` / `21st`):**
  - **Transport & Endpoints:** Stdio proxy via `@21st-dev/magic@latest` (Windows `cmd.exe /c npx -y @21st-dev/magic@latest`) and HTTP endpoint `https://21st.dev/api/mcp` with `x-api-key` header.
  - **Authentication:** Dedicated 21st.dev API token configured in environment (`API_KEY` / `API_KEY_21ST`).
  - **Capabilities:** Direct search and installation of React/Tailwind/Framer components, SVG brand logos (`21st logo <name>`), and icon variants without manual copy-pasting.
- **Visual Design & Asset Creation:**
  - **Native Image Generation:** Agent `generate_image` tool generates high-resolution app icons, logos, banners, and splash screen artwork directly into project assets.
  - **Brand Identity System:** `brandkit` skill (`~/.gemini/config/skills/brandkit`) standardizes palettes, typography tokens, logo rules, and marketing mockups.

---

## 3. Critical Non-Negotiable Rules & Workflow

### 3.1 Git Commits & Author Attribution
1. **NO AI Footprint:** NEVER add `Co-Authored-By: Claude`, `Co-Authored-By: Antigravity`, or any AI/Anthropic/Google trailer in commit messages.
2. **Commit Author:** Commits must reflect ONLY the user as author.
3. **Commit Cadence:** Commit and push after each completed, reviewed feature/screen increment. Do not batch multiple unrelated features into massive commits.

### 3.2 Code Craft & "No AI Tells"
The app is graded and reviewed by university teachers who actively check for AI-generated code and copy.
1. **NO AI Header Comments:** Do not write comments like `// Matches design...`, `// Web parity: ...`, `// Showcase`, `// Real devs...`.
2. **NO Box-Drawing Banners:** Avoid ASCII separators like `// ───── Section ─────`.
3. **NO Em-Dashes in UI Copy:** Never use `—` in user-visible UI microcopy; use `-`, `,`, or `.` instead. (Middle-dots `·` for metadata separators and `…` for search placeholders are acceptable).
4. **Terse, Human Comments:** Keep comments short, direct, and focused on non-obvious logic, edge-to-edge gotchas, or security constraints.
5. **NO AI-Made Icons / Slop:** Never use AI-generated icon illustrations, cheesy 3D glyphs, or cartoon clipart for feature tiles, buttons, or navigation. All icons must strictly come from established, human-designed vector icon libraries (vetted collections from 21st.dev like Lucide, Tabler, Heroicons, Phosphor, Hugeicons, or native `@expo/vector-icons` Feather). They must look clean, balanced, and authentic so teachers/evaluators never see "AI-made" graphics.

### 3.3 User Communication Style
1. **Non-Technical & Click-by-Click:** The user prefers clear, numbered, step-by-step guidance for external dashboards (Google AI Studio, Supabase, Android settings).
2. **Plain English First:** Explain "what it does" in simple terms before diving into technical details.
3. **Typo Tolerance:** The user frequently types shorthand and colloquial typos (`naw` → now, `lick` → like, `loock` → look, `dose` → does, `stuff` → staff). Read intent generously.
4. **Iterative UI Polish:** Ship a solid first pass, test on device, and welcome incremental refinements.

### 3.4 STRICT Build & Deployment Mandate (Android SDK & Gradle ONLY — NEVER Expo Go / EAS)
1. **Zero Expo Dev Server / Zero Expo Go:** Do NOT suggest `npx expo start`, Expo Go, scanning QR codes, or running debug servers. The user builds native Android APKs with the local Android SDK and tests on a physical phone.
2. **Local Gradle Native Build:** The app is compiled locally using Gradle (`cd android; .\gradlew assembleRelease`).
3. **Release Keystore Dependency:** Google Sign-In is pinned exclusively to the release keystore's SHA-1 fingerprint (`campusone-release.keystore`, alias `campusone`, password `campusone2026`). Debug builds fail with `DEVELOPER_ERROR`. All real device testing MUST be done using the locally compiled, signed release APK.
4. **Connected Physical Device Testing via ADB:**
   - Device ID: `8734b5da` (connected via USB).
   - Local SDK Path: `C:\Users\dracu\Android\sdk` (NDK `27.1.12297006`).
   - ADB Path: `C:\Users\dracu\Android\sdk\platform-tools\adb.exe`.
5. **Exact Build & Deploy Sequence:**
   ```powershell
   cd android
   .\gradlew assembleRelease
   & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am force-stop com.bubt.campusone
   & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da install -r android/app/build/outputs/apk/release/app-release.apk
   & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am start -n com.bubt.campusone/.MainActivity
   ```

---

## 4. Tech Stack & Dependencies

| Layer | Technology | Details |
|---|---|---|
| **Framework** | React Native 0.85.3 (uses Expo modules, but built strictly via Android SDK & Gradle — NO Expo Go / NO EAS) | TypeScript 6, React 19.2.3 |
| **Build System** | Native Gradle + Android SDK (NDK 27.1.12297006) | `gradlew assembleRelease` using local release keystore |
| **Testing Method** | Direct ADB install to USB physical Android device (`8734b5da`) | No Expo Go, no emulators |
| **Navigation** | React Navigation 7 | Native Stack + Bottom Tabs |
| **Backend / DB** | Supabase JS v2.107.0 | PostgreSQL 15, Auth, Storage, Realtime, Edge Functions |
| **Push Notifications** | Direct FCM v1 | Firebase project `campusone-853e6` + `send-push` edge function |
| **AI Assistant** | Google Gemini | `gemini-flash-lite-latest` via Supabase Edge Function (`chat`) |
| **PDF Processing** | `pdf-lib` + vendored `pdf.js` | On-device assembly + hidden offscreen WebView rasterizer |
| **Storage / Cache** | `@react-native-async-storage/async-storage` & `expo-secure-store` | Session persistence and preferences |
| **Icons** | `@expo/vector-icons` (Feather) | Strict semantic iconography |
| **Theme / Design** | Custom Design System | Plus Jakarta Sans + Hind Siliguri (Bangla), dark-mode tokens |

---

## 5. Design System & UI/UX Principles

All visual styles must strictly flow from `src/theme/`. **Never hardcode hex colors, arbitrary spacing, or font families in screen components.**

### 5.1 Tokens & Imports
- **Import Location:** `import { useTheme } from '../hooks/useTheme'; import { SectorColors, FontFamily, FontSize, Spacing, Radius, Layout } from '../theme';`
- **Dynamic Semantic Colors (`C.*`):** `C.bg`, `C.surface`, `C.border`, `C.text`, `C.textMuted`, `C.brand`, `C.success`, `C.warn`, `C.danger` (`#f87171` dark / `#d63d35` light).
- **Web Parity OLED Dark Theme:** True pitch-black foundation (`bg: '#000000'`), neutral dark surfaces (`surface: '#121212'`, `surface2: '#1c1c1c'`, `surface3: '#262626'`), neutral borders (`border: '#262626'`, `border2: '#383838'`), neutral Zinc text (`text: '#f4f4f5'`, `text2: '#a1a1aa'`, `text3: '#71717a'`), electric blue brand (`brand: '#5b85f7'`), and Tailwind semantics (`success: '#34d399'`, `warn: '#fbbf24'`, `danger: '#f87171'`). Zero blue/navy tint on surfaces.
- **Navigation Theme Sync:** `RootNavigator.tsx` passes a dynamic `navTheme` (merging `isDark ? DarkTheme : DefaultTheme` with `C.*` tokens) to `<NavigationContainer theme={navTheme}>` to prevent white/gray transition flashes on screen pushes and pops.
- **Feature Sector Accents (`SectorColors`):** Use `SectorColors.<sector>` for feature tiles and icons (`reports`, `bus`, `study`, `medical`, `blood`, `ride`, `prayer`, `jobs`, `market`, `clubs`, `events`, `announce`, `lostfound`, `directory`, `faculty`, `pdfmaker`).
- **Typography:** Bilingual support with `FontFamily.jakarta*` and `FontFamily.hind*` (matra-aware line height).

### 5.2 Layout Rules: Full-Width Rows
- **Navigation Lists:** Always use **full-width rows** (icon on left, title, subtitle/description below, chevron on right).
- **Prohibited:** Never use 2-column grid cards for navigation destinations, and **never mix grids and rows on the same screen**.
- **Reference Layout:** `styles.toolCard` in `src/screens/main/ExploreScreen.tsx`.

### 5.3 Iconography Standards, Animated Icons & StatusBadge System
- **Strict Human Sourcing:** When adding icons for new features, modules, settings, or dashboard cards, always source from verified, human-crafted icon collections (21st.dev icon families: Lucide, Tabler, Heroicons, Phosphor, Hugeicons, or native `@expo/vector-icons` Feather/MaterialCommunityIcons/Ionicons).
- **Geometric Harmony:** Maintain consistent 2px stroke weight (`stroke: 2`), standard 24dp viewbox, and subtle round caps/joins.
- **Zero AI-Looking Icons:** Never use AI-generated visual badges or clip-art styles. Icons must look razor-sharp, purposeful, and production-standard.
- **Color Binding:** Always pair icons with their designated `SectorColors.<sector>` accent token rather than arbitrary colors.
- **Universal AnimatedIcon (`src/components/ui/AnimatedIcon.tsx`):**
  - High performance, 120 FPS native animated component powered by React Native's `Animated` library (`useNativeDriver: true`) running directly on Android's RenderThread.
  - Supports animations: `spring` (tactile rubberband bounce pop from 1.0 to 1.22 to 1.0 on mount/tab focus), `pulse` (continuous rhythmic heartbeat scale from 1.0 to 1.22 for urgent alerts/AI orb), `float` (continuous smooth vertical hovering translateY from 0 to -4 to 0), `bounce` (periodic spring jump translateY from 0 to -6 to 0), `entrance` (zoom-in from 0.85 to 1.18 to 1.0 with zero default delay), `wobble` (rotational shake from -14deg to +14deg with optional loop), and `none`.
  - Bottom Tab Bar integration: `BottomTabNavigator` keys tab icons with `${key}-${focused}` to guarantee tactile rubberband pop on every tap.
  - Maps seamlessly across icon families (`feather`, `mci` / MaterialCommunityIcons, `ionicons`).
  - RenderThread Overflow Safety Rule: Never wrap an `AnimatedIcon` using scaling transforms (`spring`, `entrance`, `pulse`) inside a parent or ancestor with `overflow: 'hidden'` on Android. Android hardware layer canvas clipping aggressively slices transformed glyphs at the un-transformed layout boundary. Containers must declare `overflow: 'visible'`, and icons should be placed inside a dedicated geometric box (e.g. `pillIconBox` 22×22dp for 16px icons) with centered alignment.
- **Universal StatusBadge (`src/components/ui/StatusBadge.tsx`):**
  - Replaces all raw Unicode emoji stickers across deep features with sleek, theme-aware vector badges:
    - `vehicle`: `car-side`, `taxi`, `motorbike`, `rickshaw`
    - `role`: `navigation` (Need Ride) / `car-side` (Offer)
    - `urgency`: `alert-triangle` (Urgent, with pulsing icon), `clock` (Today), `calendar` (Scheduled)
    - `bags`: `blood-bag` with bag count
    - `platelet`: `zap` (Platelets / প্লাটিলেট)
    - `medical`: `needle`, `alert-decagram`, `baby-carriage`, `hospital-building`, `activity`
    - `affiliation`: `school` (BUBT Student), `briefcase` (Faculty / Staff), `users` (Family)
    - `shortlisted`: `award` (Shortlisted candidate badge)
    - `deadline`: `clock`
    - `meetup`: `map-pin` (Marketplace meetup location)
- **Touch Responder Safety Rule:**
  - Never wrap `AnimatedIcon` or `SectorIcon` in `<TouchableWithoutFeedback>` unless an explicit `onPress` callback is supplied.
  - In React Native Android, mounting an empty touch responder without a handler intercepts gesture responders and swallows taps intended for parent `<TouchableOpacity>` wrappers (e.g. `ExploreScreen` tool cards or `HomeFrequentTools`).
- **Zero-Emoji Project Standard:**
  - Strict ban on raw Unicode emojis (`🚗`, `🛺`, `🏍️`, `🩸`, `⚡`, `🎉`, `✨`, etc.) in button text, filter chips, list badges, and UI copy. All status indicators and categorizations must use vector badges (`StatusBadge` or `@expo/vector-icons`).
- **1:1 Sibling Web Mobile Bottom Navigation Bar (`BottomTabNavigator.tsx`):**
  - Midnight Navy Gradient (`#0f2862` to `#0a1b42`) with crisp 1px top rim highlight stroke (`rgba(255, 255, 255, 0.16)`).
  - Clean flat top line with retained 20dp smooth rounded corner shoulders (`r = 20 dp`). Zero middle notch dip.
  - Seamless Screen Edge Integration: All 7 tab screens strictly use `<SafeAreaView edges={['top', 'left', 'right']}>`, eliminating any bottom inset bar (`C.bg`: black in dark mode, white in light mode) above the navbar.
  - Clean in-line Messages tab button in the center (tab 3 of 5 for students) with unread badge.
  - Active tab highlighted with an electric blue translucent capsule pill (`width: 48, height: 28, borderRadius: 14`, `rgba(96, 165, 250, 0.20)` fill, `rgba(96, 165, 250, 0.35)` border), electric blue typography (`#60a5fa`), and native bouncy vector icon entrance pop. Inactive tabs rendered in soft muted slate (`rgba(148, 163, 184, 0.50)`). Clean distraction-free layout with no bottom dots.
  - 120 FPS Elastic Bounce Tap Micro-Interactions on Android RenderThread (`useNativeDriver: true`): Press-in tactile squash to `0.84`, release elastic spring pop (`scale: 0.72 -> 1.30 -> 1.0`, matching Explore entrance physics).
  - Role-adaptive tab count & layout:
    - Students (5 tabs): `Home`, `StudyHub`, `Messages`, `Explore`, `Settings`.
    - Admin (4 tabs): `Home`, `StudyHub`, `Explore`, `Settings`.
    - Staff (3 tabs): `Home`, `Explore`, `Settings`.
  - Annex Portal Relocation: Relocated from bottom navigation bar to `ExploreScreen` under Academics, rendered as an interactive tool card that opens `AnnexPortalScreen` with an integrated header back button.
- **Universal Liquid Gooey Toggle Switch Standard (`LiquidToggle.tsx` / `TactileSwitch.tsx`):**
  - **Fluid Viscous Morphing Physics:** Single cohesive fluid droplet thumb with native volume-preserving squash-and-stretch (`scaleX: 1.0 -> 1.40 -> 1.0`, `scaleY: 1.0 -> 0.84 -> 1.0`, `translateX: 0 -> travel`) driven by a 460ms silky fluid cubic-bezier curve (`Easing.bezier(0.32, 0.0, 0.18, 1.0)`). Pure, continuous fluid gel capsule motion with zero seams, zero overlapping boxes, and zero extraneous artifacts.
  - **100% Native-Driver Performance (120 FPS):** All transforms and crossfades execute exclusively on the Android RenderThread (`useNativeDriver: true`), ensuring buttery-smooth interaction with zero JS-thread frame drops.
  - **Color Variants & Semantic Mapping:**
    - `default`: Electric Brand Blue (`#275EFE` / `C.brand`)
    - `success`: Emerald (`#10B981` / `C.success`) - used for Language, Free Donation mode, etc.
    - `warning`: Amber (`#F59E0B` / `C.warn`)
    - `danger`: Red (`#EF4444` / `C.danger`) - used for Doctor On-Leave, Master Pause, Faculty On-Leave.
    - Custom: `trackColor?: { false?: string; true?: string }` support across modules.
  - **Proportions & Ergonomics:** Standard 52×32dp (radius 16, thumb 24, travel 20, uniform 4dp margins) and compact `sm` 44×26dp (radius 13, thumb 20, travel 18, uniform 3dp margins) with minimum 48dp touch hit-slop.
  - **Full Backwards Compatibility:** `TactileSwitch` re-exports `LiquidToggle`, supporting both `checked` / `value` and `onCheckedChange` / `onValueChange` across all screens.

### 5.4 Universal 58dp Control Bar & SegmentedTabs Standard
- **App-Wide Standard:** All segmented tab controls, feed switchers, search bars, dropdown triggers, and primary action/submit buttons across the app MUST strictly adhere to the universal **58dp fixed outer height** standard (`height: 58`, `borderRadius: 16`, horizontal screen padding alignment `Layout.screenPadding = 16dp`) for visual, structural, and ergonomic consistency.
- **Strict Geometric Symmetry:** Every tab has equal width (`flex: 1` / `100% / tabs.length`) so tabs never look mismatched or uneven based on word length.
- **Strict Button Count Range (Max 3, Min 2):** Never use 4 buttons in a segmented tab bar. 4 buttons squeeze touch targets down to ~80dp and cause text truncation on mobile. All segmented bars must strictly have 2 or 3 tabs. Move secondary views (e.g. "My Rides") to header buttons or sub-bars.
- **No-Icon Policy on Counted & Narrow Tabs:** Do not include icons on tabs that display (or will display) numerical count badges. Tab labels must be kept short (<7 chars: e.g. "Applied" not "Applications", "Depts" not "Departments", "Notes" not "Materials", "Doctors" not "Doctors & Staff"). This guarantees >30dp of safety buffer so future 2-digit and 3-digit counts (`12`, `99`, `999`) never cause cut-offs.
- **Universal 58dp Fixed Height & Control Bar Standard:** All segmented tab bars (`SegmentedTabs.tsx`), search bars, modal search boxes, dropdown triggers, and top hero / form submission action buttons (`submitBtn`, `joinBtn`, `genBtn`, `addBtn`) across the entire app are standardized to exactly **58dp fixed outer height** (`height: 58`, `borderRadius: 16`, horizontal screen padding alignment `Layout.screenPadding = 16dp`, search input `fontSize: 14.5`, and icons standardized to `18px` or `16px` for compact triggers). Completely eliminates thin/squished 38-52dp controls, delivering substantial touch targets, seamless vertical grid alignment, and WCAG/Material touch ergonomics everywhere.
- **Strict Horizontal Grid Alignment (Same Length):** Top action buttons, segmented tab switchers, category buttons, and search bars MUST share the exact same `Layout.screenPadding` (16dp) on both left and right, ensuring a seamless, aligned vertical column across screens.
- **Interpolation Guard:** Uses safe interpolation output range (`outputRange: tabs.length <= 1 ? [0, 0] : ...`) and gracefully hides the indicator when `activeIndex = -1` (unselected state).
- **Zero Legacy Segment Slop:** Never write ad-hoc animated tab bars or inline indicator bars in screen components. All custom segment animations and dead styles (`segRow`, `segBtn`, `segTxt`, `typeToggle`, `segmentTrack`) have been eliminated in favor of `SegmentedTabs`.
- **Universal Adoption Across App (Strictly 2 or 3 tabs, No legacy animations):**
  - `RidePostScreen`: Post Type (`Offer Ride` / `Need Ride`), Direction (`To Campus` / `From Campus`), Date Choice (`Today` / `Tomorrow`), Location Modal (`Mirpur & Campus` / `Greater Dhaka`).
  - `RidesScreen`: Direction filter (3 tabs: `All` / `To Campus` / `From Campus`), Post Type filter (3 tabs: `All` / `Offers` / `Need Ride`), with `My Rides` in header.
  - `BloodScreen`: Requests vs Donors switcher with counts (2 tabs, no icons).
  - `BloodRequestScreen`: Urgency selector (3 tabs: `Urgent` / `Today` / `Week`).
  - `AreaPickerModal`: Filter mode (2 tabs: `Hospitals` / `Areas`, no icons).
  - `MarketScreen`: Feed tabs (3 tabs: `All` / `Mine` / `Saved`), Filter Modal Sort (3 tabs: `Newest` / `Price Low` / `Price High`), Condition (3 tabs: `New` / `Like New` / `Used`).
  - `MarketPostScreen`: Condition selector (3 tabs), Location modal (2 tabs without hardcoded numbers).
  - `LostFoundBrowseScreen`: Main 3-tab switcher (`Lost` / `Found` / `Mine` with counts; "All" eliminated).
  - `PostItemFormScreen`: Type toggle (2 tabs: `Lost` / `Found`).
  - `FacultyScreen`: Main 3-tab switcher (`Depts` / `Mentors` / `Saved` with bookmark counts, no icons).
  - `DirectoryScreen`: Main 3-tab switcher (`All` / `Connections` / `Requests` with counts, no icons; legacy spring anim eliminated).
  - `AnnouncementsScreen`: Main 3-tab switcher (`All` / `Urgent` / `Saved` with counts, no icons).
  - `AnnouncePostScreen`: Priority selector (3 tabs: `Urgent` / `Important` / `General`).
  - `JobsBrowseScreen`: Main tabs (3 tabs: `Browse` / `Saved` / `Applied`), Status filter (3 tabs: `Open` / `Closing` / `Expired`).
  - `JobPostScreen`: Work Mode (3 tabs: `On-site` / `Remote` / `Hybrid`), Compensation model (3 tabs: `Paid` / `Conveyance` / `Negotiable`), How to Apply (3 tabs: `Email` / `Link` / `PDF`).
  - `JobsModerateScreen`: Moderation tabs (2 tabs: `Reported` / `Removed`, no icons).
  - `EventsBrowseScreen`: Main 3-tab switcher (`Upcoming` / `Past` / `Saved` with counts; legacy static chips eliminated).
  - `MyReportsScreen`: Scope switcher (2 tabs: `Everyone` / `My Reports`, no icons).
  - `ManageStaffScreen`: Role tabs (2 tabs: `Staff` / `Admins` with counts; legacy static chips eliminated).
  - `ClubDetailScreen`: 2-tab switcher (`Feed` / `Members` with count; legacy static chips eliminated).
  - `MedicalScreen`: 3 tabs (`Doctors` / `Services` / `Emergency`, no icons), 58dp roster dropdown trigger bar, 58dp medicine search bar, 58dp emergency blood bridge card, 48dp hospital action buttons, 44dp admin quick-edit button, and 58dp admin modal controls with Android 15 keyboard padding.
  - `DoctorDetailScreen`: `actionBtn` (Call Desk 58dp, Send Email 58dp), `counselingActionBtn` (58dp), and offline cache fallback via `CacheKeys.DOCTORS`.
  - `CourseDetailScreen`: Material tabs (3 tabs: `Notes` / `Questions` / `Books` with counts, no icons).
  - `StudyUploadScreen`: Upload category switcher (3 tabs: `Materials` / `Questions` / `Books`).
  - `RoutinesBrowseScreen`: Main routine tabs (2 tabs: `Class` / `Exam` with counts, no icons), Modal type switcher (2 tabs).
  - `NotificationsScreen`: Filter switcher (2 tabs: `All` / `Unread` with unread count, no icons).
  - `HomeCommunityUpdates`: Update categories (3 tabs: `Notices` / `Clubs` / `Events` with counts, no icons).
  - `PrayerScreen`: Timetable view switcher (2 tabs: `Today` / `Month`).
  - `BusScreen`: Direction switcher (2 tabs: `To Campus` / `From Campus`), 58dp search bar, 58dp admin modal controls.
  - `BusDetailScreen`: Direction switcher (2 tabs: `To Campus` / `From Campus`), trip timetable selector.
- **Layout Tokens (`src/theme/spacing.ts`):** `Layout.controlHeight = 58` and `Layout.controlRadius = 16` provide universal design system constants for all horizontal bars, buttons, and segmented tracks.
- **Detail Screen & Modal Action CTAs (58dp):** All primary submission/action CTAs across detail views and modal bottom sheets are standardized to `height: 58, borderRadius: 16`:
  - `RideDetailScreen`: `actionBtn` (58dp)
  - `MarketDetailScreen`: `actionBtn` (58dp), `secActionBtn` (58dp)
  - `LostFoundDetailScreen`: `actionBtn` (58dp)
  - `ReportDetailScreen`: `actionBtn` (58dp)
  - `JobDetailScreen`: `actionBtn` (58dp), `secondaryBtn` (58dp)
  - `DoctorDetailScreen`: `actionBtn` (Call Desk 58dp, Send Email 58dp), `counselingActionBtn` (58dp)
  - `MedicalScreen`: Admin modal `modalSaveBtn` (58dp), `modalInput` (58dp)
  - `EventPostScreen`: `submitBtn` (58dp)
  - `ClubPostScreen`: `submitBtn` (58dp)
  - `DonorRegisterScreen`: `submitBtn` (58dp), `selectorCard` (58dp), `input` (58dp)
  - `BloodRequestDetailScreen`: `fulfillBtn` (58dp)
  - `BloodRequestScreen`: `submitBtn` (58dp), `input` (58dp), `inputWithIcon` (58dp), `dropdownCard` (58dp)
  - `FeatureScreen`: `ctaBtn` (58dp)
  - `ProfileScreen`: Modal `submitBtn` (58dp)
  - `NotifDetailScreen`: `actionBtn` (58dp), `secondaryBtn` (58dp)
  - `StudyHubScreen`: CR & section request sheets `submitBtn` (58dp)
  - `ManageStaffScreen`: Add staff modal `createBtn` (58dp)
  - `SettingsScreen`: Modal action buttons (`primaryBtn`, `outlineBtn`, `cancelBtn` 58dp) and password inputs (`pwField` 58dp)
  - `LocationPickerModal`: `gpsBtn` ("Use My Current Location" 58dp), `confirmBtn` ("Confirm Location" 58dp), and modal map switchers (`mapTriggerCard58` 58dp across `RidePostScreen`, `MarketPostScreen`, and `AreaPickerModal`).
- **PDF Maker Suite Standardization (58dp):** All 4 PDF Maker tools (`ToolCompressScreen`, `ToolMergeScreen`, `ToolImagesScreen`, `ToolOrganizeScreen`) `cta` buttons are standardized to `height: 58, borderRadius: 16`. In `components.tsx`, `primaryBtn` (Share), `secondaryBtn` (Start Over), and `SegmentToggle` track are standardized to `height: 58, borderRadius: 16`.

### 5.5 Universal 72dp Content Card & Row Standard (Reference: `DESIGN.md`)
- **The 58 / 72 Dual System:** Controls, switchers, search bars, and CTAs adhere to the **58dp** standard (`Layout.controlHeight = 58`), while all content cards, list rows, and feed items adhere to the **72dp** standard (`height: 72` or `padding: 14` + `44dp` icon/avatar = `72dp`).
- **Blood Donation Module (`BloodScreen.tsx`, `BloodRequestScreen.tsx`, `BloodRequestDetailScreen.tsx`, `DonorRegisterScreen.tsx`, `AreaPickerModal.tsx`):**
  - **Universal 58dp Control Standard:** Top Emergency Request Blood button (`actBtn`), search bar (`searchBar`), location trigger (`areaPickerTrigger`), segmented tabs (`SegmentedTabs.tsx`), form submission buttons (`submitBtn`), request card action CTAs (`cardActionBtn` — *"I Can Help"*, *"Call Requester"*, *"Manage Responses"*), and full-width Urgency segmented tabs bar (`Urgent | Today | Week`) all standardized to exactly `height: 58, borderRadius: 16`.
  - **Universal 72dp Content Card Standard:**
    - `unitsBar` in `BloodRequestScreen.tsx`: Standardized to the 72dp Content Card Standard (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` droplet icon box, 14.5px Title, 11.5px Subtitle, and 36dp stepper buttons), providing ergonomic breathing room and matching the 2-line layout rule.
    - `myStatusCard` (registered donor status): standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` blood badge box).
    - `registerPromptCard` ("Join campus donor network"): standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` icon box).
    - `donorCard` in `BloodScreen.tsx`: Standalone 72dp cards (`minHeight: 72, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10`, `<Avatar size="md" />` 44dp), matching `DirectoryScreen.tsx` and eliminating the flat glued list with hairline dividers.
    - `responderCard` in `BloodRequestDetailScreen.tsx`: Standalone 72dp cards (`minHeight: 72, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10`, `<Avatar size="md" />` 44dp).
    - `plateletCard` (Dengue Platelet / Apheresis toggle): standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` icon box).
    - `lockedCard` (verified group card): standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16, 44 × 44 dp` badge box).
    - Rich Selector Cards in `BloodRequestScreen.tsx` (`Case Reason`, `Patient Affiliation`, `Hospital`, `Area`): standardized to 72dp content cards (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` icon box with `borderRadius: 13`), matching `plateletCard`, with 14.5px Title and 11.5px Subtitle.
    - `selectorCard` & `urgencyPrefCard` in `DonorRegisterScreen.tsx`: Area card standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16, 44 × 44 dp` icon box with spring `map-pin`); Notification sensitivity options standardized to standalone tactile 72dp cards (`UrgencyCard`, `minHeight: 72, padding: 14, borderRadius: 16, 44 × 44 dp` icon box, 14.5px Title, 11.5px Subtitle, spring `AnimatedIcon`, and spring press feedback `0.96 ➔ 1.02 ➔ 1.0`); blood group pills feature tactile `GroupButton` spring bounce (`0.90 ➔ 1.15 ➔ 1.0`); and submit button pops with an animated spring droplet.
    - `areaCardBar` in `AreaPickerModal.tsx`: standardized to 72dp (`padding: 14, borderRadius: 16`, `itemIconBox` 44 × 44 dp).
  - **Fabric Native Crash Prevention & Animation Engine:** Fixed fatal `RetryableMountingLayerException` in React Native 0.85 Fabric by removing infinite `loop={true}` on unvirtualized/scrollable feed items. In `AnimatedIcon.tsx`, added `delay?: number` support (default 160ms for `entrance`) so entrance animations are clearly visible after React Navigation screen slide-in transitions. Badges animate with finite 120 FPS `entrance` pop (0.3 ➔ 1.25 ➔ 1.0) and a single tactile `wobble` alert shake for Urgent requests (`loop={false}`). Blood Group pills feature tactile `GroupButton` spring bounce (`0.90 ➔ 1.15 ➔ 1.0`), and all selector cards use dynamic `AnimatedIcon` with spring reaction on selection.
  - Dropdown triggers (`medicalReason`, `hospital`, `area`) in `BloodRequestScreen.tsx`: converted from nested touchables with broken `e.stopPropagation()` to parent `<View>` with sibling touchables (`dropdownMain` + `dropdownRight`), fully eliminating Android touch conflicts.
  - Institutional Hospital Icon Standard: Standardized hospital icon across the entire app from Feather zigzag line `activity` to `MaterialCommunityIcons` `'hospital-building'` (`AreaPickerModal`, `BloodScreen`, `BloodRequestScreen`, `BloodRequestDetailScreen`, and `StatusBadge`).
  - Elimination of Double-Badge Glitch: Removed redundant `<View style={styles.affBadge}>` wrapping around `<StatusBadge variant="affiliation" />` in `BloodScreen.tsx`.
  - WHO Clinical Cooldown Enforcement: 90 days (male) and 120 days (female) clinical recovery windows properly enforced by passing user/donor profile gender to `donorEligibility` in `BloodScreen.tsx`.
- **Student Directory (`DirectoryScreen.tsx`):**
  - Student row cards: `padding: 14, borderRadius: 16` (`44dp` avatar + `28dp` padding = 72dp). Connect/Chat CTA buttons standardized to 32dp.
  - Department picker modal cards: `padding: 14, borderRadius: 16`, `44 × 44 dp` icon box = 72dp.
  - Native 120 FPS `AnimatedIcon` integration for department triggers, modal icons, empty states, and action buttons.
- **Home Community Updates (`HomeCommunityUpdates.tsx`):**
  - Notice & update feed cards: `padding: 12, borderRadius: 16`, `48 × 48 dp` thumbnail = 72dp.
  - Bottom "View All Campus Notices" button: standardized to 58dp (`height: 58, borderRadius: 16, fontSize: 14`).
- **Home Campus Pulse Status Strips (`HomeStatusStrips.tsx`):**
  - Standardized to **72dp fixed height** (`height: 72, borderRadius: 16, borderWidth: 1`).
  - Calm neutral surface (`C.surface`) and border (`C.border`).
  - Left pill container (`leftPill`): `width: 98, height: 48, paddingLeft: 6, paddingRight: 6, borderRightWidth: 1, overflow: 'visible'`.
  - Dedicated geometric icon container (`pillIconBox`): `width: 22, height: 22, alignItems: 'center', justifyContent: 'center', overflow: 'visible'` with `AnimatedIcon` using `animation="spring"` (`1.0 -> 1.22 -> 1.0`).
  - RenderThread Overflow Safety: `pillLeft` flex wrapper strictly uses `overflow: 'visible'`, eliminating Android hardware layer bounding-box clipping so curved icon glyphs (Reports `alert-circle`, Routine `clock`, Lost & Found `search`) never get sliced off.
  - Safe text truncation: `pillText` specifies `flexShrink: 1, numberOfLines={1}, ellipsizeMode="tail"`.
  - Customization Sheet modal: Full 19 campus features available in catalog. Equal-width 50/50 footer action buttons (`cancelBtn` & `saveBtn`: `flex: 1, height: 50, borderRadius: 14`).
- **Home Frequently Used Academic Tools (`HomeFrequentTools.tsx`):**
  - Standardized to **72dp fixed height** (`height: 72, borderRadius: 14, borderWidth: 1`).
  - Calm neutral surface (`C.surface`, `C.border`).
  - Icon box: `34 × 34 dp, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center'`.
  - Customization Sheet modal: Full 19 tools catalog with title + subtitle and 40×40dp icon boxes. Equal-width 50/50 footer buttons (`resetBtn` & `saveBtn`: `flex: 1, height: 50, borderRadius: 14`).
- **Home Hero Announcement & Event Banner (`HomeHeroBanner.tsx`):**
  - Strictly capped at 6 live slides (announcements, events, club posts).
  - Theme-aware line indicators.
- **Student Profile Direct Action & Status System (`StudentProfileScreen.tsx`):**
  - Hero card cleanup: redundant inline buttons completely removed; clean status badges (`Connected`, `Requested`, `Incoming`) placed directly in `badgeRow` alongside CR and Blood Group.
  - Mutually connected: Direct, 1-tap **72dp action cards** (`height: 72, paddingHorizontal: 14, borderRadius: 16`, `44 × 44 dp` icon box):
    1. CampusOne In-App Chat (72dp, Brand Blue)
    2. WhatsApp (72dp, official WhatsApp `#25D366`)
    3. Call Phone (72dp, Emerald `#10B981`)
    4. Send Email (72dp, Purple `#8B5CF6`)
  - Pending outgoing request: 72dp Amber Status Card (*"Connection Request Pending"*, pulsing clock icon) paired with a 58dp `Cancel Connection Request` button.
  - Unconnected: 72dp Shield Privacy Card (*"Contact Details Protected"*, floating shield icon) paired with a 58dp `Send Connection Request` primary CTA button.
  - Incoming request: 72dp Request Card (*"Incoming Connection Request"*, spring user-check icon) paired with dual 58dp symmetrical `Accept` and `Decline` action buttons.
  - Disconnect connection converted to clean destructive outline action button (`height: 50, borderRadius: 14`).
- **Contact Sheet (`ContactSheet.tsx`):** Standardized primary action buttons to universal 58dp (`height: 58, borderRadius: 16`), added top-right close button (`32 × 32 dp`), and resolved clashing greens.
- **Faculty Directory & Mentors Module (`FacultyScreen.tsx`, `FacultyDeptScreen.tsx`, `FacultyProfileScreen.tsx`, `facultyShared.tsx`, `ManageFacultyScreen.tsx`):**
  - **Universal 58dp Control Standard:** Segmented tabs switcher (`SegmentedTabs`), search bars, department/domain picker dropdown bars (`dropdownBar`), modal sheet close buttons (`sheetCloseBtn`), bottom dock CTAs (`proposalBtn`, `contactBtn`), admin sync trigger (`syncActionBtn`), and form save buttons (`saveBtn`, `closeReportBtn`) all standardized to `height: 58, borderRadius: 16`.
  - **Universal 72dp Content Card Standard:**
    - `TeacherBar` (`facultyShared.tsx`): standardized to `minHeight: 72, padding: 14, borderRadius: 16, marginBottom: 10, gap: 13`, featuring `44 × 44 dp` avatar (`<Avatar size="md" />`), 14.5px Title, 12px Subtitle, and tactile spring animated star bookmark icon.
    - `categoryBar` (`FacultyScreen.tsx`): standardized to `minHeight: 72, padding: 14, borderRadius: 16, marginBottom: 10, gap: 13` with `44 × 44 dp` tile and `<AnimatedIcon animation="entrance" />`.
    - `deptBar` (`FacultyScreen.tsx`): standardized to `minHeight: 72, padding: 14, borderRadius: 16, marginBottom: 10, gap: 13` with `44 × 44 dp` tile and `<AnimatedIcon animation="entrance" />`.
    - `pickerBar` (modal lists in `FacultyScreen.tsx`): standardized to `minHeight: 72, padding: 14, borderRadius: 16, marginBottom: 10, gap: 13` with `44 × 44 dp` tile and `<AnimatedIcon animation="entrance" />`.
    - `FacultyDeptScreen.tsx`: Dept header tile standardized to `width: 44, height: 44, borderRadius: 13` with `<AnimatedIcon animation="entrance" />`; empty state with pulsing search icon.
    - `ManageFacultyScreen.tsx`: Admin teacher rows standardized to `minHeight: 72, padding: 14, gap: 13` with `44 × 44 dp` avatar (`<Avatar size="md" />`); sync icon wrap standardized to `44 × 44 dp` with pulsing/spring `refresh-cw` animation; sync report modal features entrance animated status badges.
    - `FacultyProfileScreen.tsx`: SubBar star bookmark button features tactile spring pop (`animation="spring"`); campus office location card uses vertical bouncing pin (`animation="bounce"`); counseling hours card uses pulsing clock (`animation="pulse"`); bottom dock buttons feature smooth entrance animations (`animation="entrance"`).
- **Settings & Preferences Module (`SettingsScreen.tsx`):**
  - **Universal 58dp Control Standard:** All bottom sheet modal action buttons (`primaryBtn`, `outlineBtn`, `cancelBtn`) and modal password input fields (`pwField`) standardized to `height: 58, borderRadius: 16, paddingHorizontal: 14, fontSize: 14.5`.
  - **Universal 72dp Content Card Standard:**
    - `SettingCard`: Standardized to `minHeight: 72, padding: 14, borderRadius: 16, marginBottom: 10, gap: 13` with `44 × 44 dp` icon wrap (`borderRadius: 13`), matching `DirectoryScreen` and `FacultyScreen`.
    - Vector iconography migration: Replaced static legacy `Icon` with human-designed vector `AnimatedIcon` using verified Feather names (`refresh-cw`, `hard-drive`, `download-cloud`, `share-2`, `file-text`, `log-out`, `trash-2`, `tool`), fixing 6 broken icon identifiers (`refreshCw`, `database`, `downloadCloud`, `share`, `fileText`, `logout`, `trash`, `wrench`).
    - Contextual micro-animations: Tactile `wobble` on Admin Dashboard, Staff Workspace, Notifications disabled, Delete Account card, and Delete Confirmation modal header (`AnimatedIcon` `trash-2` `wobble`); vertical hovering `float` on About App and Award badge modal (`award` `float` loop); smooth `entrance` on standard preference rows and Data & Cache modal header (`hard-drive` `entrance`).
- **Interactive Location Picker (`LocationPickerModal.tsx`):**
  - Live selected place preview card: standardized to 72dp (`minHeight: 72, padding: 14, borderRadius: 16`, `44 × 44 dp` map pin icon box, 14.5px Title, 11.5px Subtitle) adhering to the 2-line layout rule.
- **Universal Tactile Squish Switch (`src/components/ui/TactileSwitch.tsx`):**
  - High-performance, tactile toggle switch inspired by 21st.dev `kuratlielia/switch`.
  - 100% Native Driver Performance: `posAnim`, `flightScale`, and `pressScale` run entirely with `useNativeDriver: true` directly on Android's RenderThread at 120 FPS.
  - Layered Track & No `overflow: 'hidden'` Clipping: Base track renders `inactiveTrackColor`, overlay renders `activeTrackColor`, smoothly cross-fading via native `opacity`. `overflow: 'hidden'` is strictly omitted from track because on Android RN 0.85 Fabric it clips `scaleX` native-driver transforms whenever the thumb squishes outside layout bounds.
  - Synchronized Flight Stretch & Anticipation Squish: `flightScale` is mathematically interpolated directly from `posAnim` (`[0, 0.5, 1] -> [1, 1.20, 1]`) ensuring peak stretch occurs at 0.5 velocity midpoint without timing race conditions. `pressScale` springs to `1.10` on `onPressIn` and settles back on release. Combined via `Animated.multiply(flightScale, pressScale)`.
  - Touch Ergonomics & Card Integration: Uses `TouchableOpacity` with `hitSlop={12}` (72 × 52 dp touch target). In row cards (`SettingCard`, notification toggles), row card is interactive via `onPress` while switch has `pointerEvents="none"` and `disabled={!onValueChange}`, allowing users to tap anywhere across the row without double-firing.
  - Replaces all legacy React Native `<Switch>` components across all 16 toggle locations in the app (Settings, Notifications, Profile, Marketplace, Study Hub, Medical, and Announcements).

---

## 6. Expo SDK 56 & Android Quirks

Expo SDK 56 enforces Android 15 edge-to-edge mode. This breaks two standard React Native conventions:

### 6.1 Android `singleTask` RAM Persistence & Clean ADB Installation
- When an app is configured with `android:launchMode="singleTask"` in `AndroidManifest.xml` (Expo default), running `adb install -r` updates the APK file on disk, but running `adb shell am start` merely brings the **existing running process forward from RAM** without reloading the newly packaged JavaScript bundle.
- **The Rule:** Always force-stop the app process before testing new APK builds:
  ```bash
  adb -s <device_id> shell am force-stop com.bubt.campusone
  adb -s <device_id> install -r android/app/build/outputs/apk/release/app-release.apk
  adb -s <device_id> shell am start -n com.bubt.campusone/.MainActivity
  ```
- Verify the process restarted by inspecting `adb shell "ps -A | grep bubt"` for a newly allocated PID.

### 6.2 Keyboard Handling & KeyboardAvoidingView across Android & iOS
- **`app.json` Configuration:** `"softwareKeyboardLayoutMode": "resize"` is explicitly configured in `expo.android`.
- **The `behavior="height"` Trap:** In React Native's `KeyboardAvoidingView.js`, `behavior="height"` forcibly sets `flex: 0` and recalculates an explicit height. In Android 15 edge-to-edge mode (Expo SDK 56), this collapses flex containers, zeros offsets, and causes the soft keyboard to obstruct search boxes and inputs.
- **The Standard Rule:** ALWAYS use `behavior="padding"` across all screens on both iOS and Android. It maintains `flex: 1` and applies `paddingBottom: keyboardHeight` smoothly.
- **Modals & Bottom Sheets:** React Native's `<Modal>` opens in a separate native Android window. Outer screen wrappers do not protect inputs inside modals. Every Modal with text inputs or search fields MUST contain an internal `<KeyboardAvoidingView behavior="padding" style={styles.overlay}>`.
- **Scroll & Touch Ergonomics:** Lists and scroll containers (`FlatList`, `ScrollView`) must configure `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"` so search result taps are never swallowed by an open keyboard.

### 6.2 Inverted FlatList Empty States
- **Old Broken Pattern:** Wrapping `ListEmptyComponent` in `transform: [{ scaleY: -1 }]` renders upside-down or mirrored text on modern React Native Fabric architecture.
- **Rule:** Never use `ListEmptyComponent` on an inverted `FlatList`. Conditionally render the empty state as a separate sibling component outside the list:
  ```tsx
  {data.length === 0 ? <EmptyView /> : <FlatList inverted data={data} ... />}
  ```

### 6.3 WebView Transparent Background Bleed
- Modern Android WebViews render `rgba(0,0,0,0)` transparently if the target webpage (such as BUBT's Annex portal) lacks an explicit background color.
- **Rule:** Always set explicit opaque `backgroundColor: '#fff'` on the `WebView` component (`style={{ backgroundColor: '#fff' }}`), preventing the app's dark theme from bleeding through.

---

## 7. Dhaka Local Time Rule (UTC+6)

- Dhaka is UTC+6. Between 00:00 and 06:00 Dhaka time, UTC date calculations return yesterday's date.
- **Rule:** For date-only comparisons, filters, and stamps (`events.date`, `jobs.deadline`, `lost_found_items.item_date`), ALWAYS use `localToday()` from `src/utils/format.ts`.
- **Prohibited:** Never call `new Date().toISOString().split('T')[0]`.
- **SQL Rule:** Server-side comparisons must use `(now() at time zone 'Asia/Dhaka')::date`.

---

## 8. Database Schema & Ground-Truth Rules

The live Supabase database (`xhgpxvyqrufbbuivttmi`) is the single source of truth.

### 8.1 Ground-Truth Table Names & Columns

| Domain | Table Name (DO NOT GUESS) | Key Columns & Gotchas |
|---|---|---|
| **Marketplace** | `listings` (NOT `marketplace`) | Status: `'Available'` / `'Sold'`. Contact reveal via `listing_contact(p_code)` RPC. Upload to `photos` bucket (`marketplace/{user_id}/`). |
| **Rides** | `rides` (NOT `ride_shares`) | Columns: `origin`, `destination`, `date`, `time`, `seats_total`, `fare`, `driver_id`, `code`. Contact via `ride_contact(p_code, p_target)`. Call `delete_expired_rides()` before fetch. |
| **Blood Donors** | `donors` (NOT `blood_donors`) | Columns: `user_id`, `blood_group`, `area`, `last_donated`, `alert_urgency` (`'urgent_only'`, `'today_plus'`, `'all'`). No phone column (phone is in `profiles.whatsapp`). Contact via `donor_contact(p_user_id)` RPC. 90/120-day wait enforced. |
| **Events** | `events`, `event_rsvps`, `event_bookmarks`, `event_sync_logs` | Date column is `date` (NOT `event_date`); location is `venue` (NOT `location`). Columns: `source` (`'manual'`, `'bubt_news'`), `external_id`, `external_url`, `tags`, `deleted_at`, `banner_url`, `club_id`. Bookmarks via `toggle_event_bookmark(p_event_id)` RPC. 4-tier live status (`Ongoing`, `Today`, `Upcoming`, `Ended`). Automated crawler Edge Function `sync-events` synced via cron `auto-sync-bubt-events`. Whitelist: `event_organizers`. |
| **Clubs** | `clubs` & `club_posts` | `clubs.about` (NOT `description`), filter `is_active = true`. Posts: `club_posts.body` (NOT `content`), `author_id`. |
| **Jobs** | `jobs` & `job_applications` | **NO status column on jobs**. Removed jobs have `deleted_at IS NOT NULL`. Withdraw a job by setting `deleted_at = now()`. Types: `internship`, `tuition`, `on_campus`, `part_time`, `full_time`, `freelance`. Applications tracked in `job_applications` (`submitted`, `viewed`, `shortlisted`, `rejected`) with RLS & notification triggers. Storage bucket `job-circulars` (circulars uploaded to `{user_id}/*`, student resumes uploaded to `resumes/{user_id}/*`). Poster authorization verified via `can_post_jobs()` RPC. Notifications use `sector = 'jobs'`. |
| **Reports** | `reports` | Columns: `code`, `reporter_id`, `assigned_staff_id`, `status` (`'Open'`, `'In Progress'`, `'Resolved'`, `'Rejected'`, `'Closed'`). Trade assignment matches `profiles.expertise`. |
| **Connections** | `connections` | `requester_id`, `addressee_id`, `status` (`'pending'`, `'accepted'`). Contact reveal via `student_profile_detail(p_target_id)` RPC. Atomic disconnect via `disconnect_student(p_target_id)` RPC. Event notification trigger `trg_notify_connection_event` for alerts and lockscreen push. |
| **Medical** | `doctors` | Official BUBT Medical Unit (Room 205, Bldg 3). Columns: `name`, `specialty`, `qualifications`, `days`, `start_time`, `end_time`, `room`, `phone`, `email`, `role_type`, `is_on_leave`, `leave_note`, `active`. Walk-in triage, mental health counseling, emergency Mirpur hospital directory. RLS: select authenticated, admin write. |
| **Account Deletion** | `delete_own_account()` RPC | SECURITY DEFINER. Removes dependent records and caller from `auth.users` (cascading to `profiles`). Revoked from anon; authenticated only. |

### 8.2 Profiles RLS & Display Names
- `profiles` RLS policy (`profiles_select_self_admin_or_matched`) returns **ONLY the caller's own row** (or admin/matched lost-and-found counterpart).
- **Rule:** Never query `.from('profiles').select(...)` or embed `profiles!user_id(full_name)` for other users — it silently returns `null` or blank names.
- **Solution:** Always use `peopleService.ts` (`fetchPeople` / `loadPeople` / `personName`), backed by the cached SECURITY DEFINER RPC `directory_profiles()`.

### 8.3 Security Definer Functions
- In Supabase, default ACLs grant `anon` execute permissions on functions created by `postgres`.
- **Rule:** Every new `SECURITY DEFINER` function must explicitly revoke anon permissions:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.my_function(...) FROM public, anon;
  GRANT EXECUTE ON FUNCTION public.my_function(...) TO authenticated;
  ```

### 8.4 Supabase JS v2 Mutations
- Supabase JS v2 **never throws errors automatically**.
- **Rule:** Always check and handle errors explicitly:
  ```typescript
  const { data, error } = await supabase.from('table').insert({...});
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  ```
- Always implement loading, empty, and retry states. Never silently swallow errors.

### 8.5 Refresh on Focus
- Screens fetching dynamic data must refresh when focused to prevent stale lists after edits/inserts:
  ```typescript
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  ```

---

## 9. Role System & Navigation Architecture

### 9.1 Role Hierarchy & Policy
- **Roles:** `'student'` | `'staff'` | `'admin'`
- **Role Promotion Rule:** Students are **NEVER promoted to staff or admin** in the app. Students may only be elevated to **CR** (`study_section_members.role = 'cr'`) or **Club President** (`club_set_president` RPC).
- The `ManageUsersScreen` role toggle only switches `Staff ↔ Admin`.

### 9.2 Bottom Navigation Structure
- **Home:** Role-adaptive tab:
  - Admin → `AdminDashboardScreen`
  - Staff → `StaffDashboardScreen`
  - Student → `HomeScreen` (campus feed, quick actions)
- **Explore:** Full directory of campus tools and services.
- **Messages:** Student-to-student realtime chat & group messaging (students only).
- **Annex:** BUBT student portal in-app WebView.
- **Settings:** Profile, preferences, language toggle, notification settings.

### 9.3 Student Onboarding Gate
In `RootNavigator.tsx`, students who have not completed onboarding (`!profile?.student_id`) are redirected to `OnboardingScreen` before reaching the main app.

### 9.4 Role Resolution & Auth State Integrity (Anti-Flash Architecture)
- **Profile Load Race Elimination:** In `authStore.ts`, `SET_SESSION` resets `profileLoaded: false` and `profile: null` on any new session or account switch. `SET_PROFILE` only marks `profileLoaded: true` when `profile !== null`. On sign-out, state is cleanly cleared via `SIGN_OUT`.
- **Pre-Navigation Role Await:** `signIn()` proactively awaits `fetchProfile(userId)` before resolving, ensuring the caller stays in busy/loading state until the role is resolved.
- **Navigator Gate:** `RootNavigator.tsx` blocks on `if (loading || (session && (!profileLoaded || !profile)))` with a clean splash/loader, guaranteeing `AppNavigator` never mounts before the user's role is confirmed.
- **Push Notification Registration Timing:** FCM token registration in `RootNavigator.tsx` waits until `user?.id && profileLoaded && profile` are valid so permission dialogs never pop over uninitialized screens.
- **Home Fallback Safety:** `BottomTabNavigator.tsx`'s `HomeComponent` explicitly checks `profile?.role === 'student' ? HomeScreen : HomeLoadingScreen`. It never blindly defaults to `HomeScreen` for unverified or loading roles.
- **Multi-Role Defense:** `HomeScreen`, `AdminDashboardScreen`, and `StaffDashboardScreen` have guards ensuring non-matching roles never render or fire role-mismatched data queries.

---

## 10. Specialized Features

### 10.1 AI Chatbot
- **Service:** `src/services/chatbotService.ts` → `src/screens/chatbot/ChatbotScreen.tsx`
- **Edge Function:** `supabase/functions/chat/index.ts`
- **Model:** Google Gemini (`gemini-flash-lite-latest`), API key securely stored in Supabase secrets.
- **Grounding Tools (10 tools):** Bus routes, prayer times, lost & found, clubs, rides, class routines, events, blood requests, jobs, faculty directory. CGPA calculations are solved directly by system prompt.
- **Streaming:** SSE streaming using `expo/fetch` (standard React Native `fetch` cannot stream response bodies).
- **Security:** Validates caller's JWT directly in the Edge Function; student-only restriction enforced server-side.

### 10.2 PDF Maker
- **Location:** `src/screens/pdfmaker/`
- **Architecture:** 100% on-device native `pdf-lib` for document generation + hidden offscreen WebView running vendored `pdf.js` (`assets/pdfjs/*.txt`) for rasterizing page thumbnails.
- **Capabilities:** Photos to PDF, PDF Merge, Organize/Reorder Pages, Compress.
- **Zero Schema Change:** Does not touch Supabase or upload files.

### 10.3 Direct FCM Push Notifications
- **Firebase Project:** `campusone-853e6`
- **Mechanism:** Trigger on `notifications` table (`trg_push_on_notification`) → `pg_net` HTTP post → `send-push` Edge Function → Google Service Account OAuth → FCM v1.
- **Emergency Channel:** Android native channel `emergency_blood` (`AndroidImportance.MAX`, double-pulse vibration `[0, 500, 200, 500]`, heads-up lockscreen banner). FCM messages with `sector === 'blood'` are routed directly to this channel.
- **Device Registration:** Handled via `register_push_token` RPC in `src/lib/push.ts`.
- **Diagnosis:** If push fails, check `push_tokens` table and `net._http_response` first. `{"sent": 0}` means the target user has no registered device token.

---

## 11. Android Build, Signing & Deployment

- **Keystore File:** `campusone-release.keystore` (located in the repo root).
- **Alias & Password:** Configured in `android/app/build.gradle` (`signingConfigs.release` with alias `campusone` and password `campusone2026`).
- **Local Android SDK & NDK:** Configured via `android/local.properties` (`sdk.dir=C:/Users/dracu/Android/sdk`). NDK version is `27.1.12297006`.
- **Google Sign-In Dependency:** Google Sign-In is registered against the **release keystore's SHA-1 fingerprint**. Debug builds (`npx expo run:android`) fail Google Sign-In with `DEVELOPER_ERROR`. Real testing must use the release APK.
- **Build Release APK Locally (No EAS required):**
  ```bash
  cd android
  .\gradlew assembleRelease
  ```
- **Build Release Android App Bundle (.aab) for Google Play Submission:**
  ```bash
  cd android
  .\gradlew bundleRelease
  ```
  Standard output: `android/app/build/outputs/bundle/release/app-release.aab`
- **Google Play Compliance & Legal Infrastructure:**
  - **Account Context:** Personal Account ID `6137426018535669538` (`nawyaj morshed`).
  - **Account Verification:** Official Government NID/Passport identity approval + SMS phone verification required before publishing.
  - **20-Tester / 14-Day Closed Testing Rule:** Personal accounts created after Nov 2023 must run a closed test with 20 opted-in testers for 14 continuous days before Google unlocks production release.
  - **In-App Policy & Terms:** `PrivacyPolicyScreen.tsx` and `TermsScreen.tsx` wired into both `AppNavigator` and `AuthNavigator`. Interactive footer links on `LandingScreen.tsx` and `RegisterScreen.tsx`.
  - **Account & Data Deletion:** In-app flow in `SettingsScreen.tsx` calling `delete_own_account()` RPC. Public web request page at `delete-account.html`.
  - **Public Web Pages:** `public/privacy-policy.html` and `public/delete-account.html` mirrored to `CampusOneWeb` public directory for live URL hosting.
  - **Store Listing Assets:**
    - App Icon: `assets/playstore-icon-full.png` (512×512 PNG, verified).
    - Feature Graphic: 1024×500 PNG banner (required by Play Console).
    - Reviewer Credentials: Test student credentials must be supplied in Play Console App Access declaration.
- **Release APK Locations:**
  - Standard output: `android/app/build/outputs/apk/release/app-release.apk` (~51MB, fully signed).
  - Quick-access root copy: `CampusOne-release.apk`.
- **Install & Launch on Real Device via ADB:**
  - Connected device ID: `8734b5da` (physical Android device).
  ```powershell
  # 1. Force stop running process (prevents singleTask RAM caching)
  & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am force-stop com.bubt.campusone

  # 2. Install newly built release APK
  & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da install -r android/app/build/outputs/apk/release/app-release.apk

  # 3. Launch the MainActivity cleanly
  & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" -s 8734b5da shell am start -n com.bubt.campusone/.MainActivity
  ```
- **Stale Path / Gradle Cache Gotcha:** If Gradle ever reports a missing directory referencing an old machine path (e.g. `C:\Users\Administrator\...`), remove `android/.gradle`, `android/build`, and `android/app/build`, verify `local.properties`, run `.\gradlew --stop`, and rebuild.

---

## 12. Capstone Project Thesis Report

- **Document Location:** `c:\Users\dracu\Desktop\CampusOne\Copy of Capstone_Project_Report_Format-DOCX (1).docx` (Backup: `...BACKUP.docx`).
- **Current State:** Chapters 1–4 completed (Introduction, Background Study, Methodology, Implementation & Result Analysis). Chapters 5–6 (Constraints/Milestones, Conclusion) remain template placeholders.
- **Report Strategy:** Mobile app and Web app are presented as **one unified system** with two client interfaces sharing a single backend.
- **Editing Tool:** Edit using `python-docx` (`pip show python-docx` is available). Always confirm scope before altering document structure.

---

## 13. UI/UX & Institutional Polish Standards (Varsity Pitch Ready)

The mobile and web applications are actively pitched and presented to BUBT administration, department heads, and academic review committees. The following design and implementation patterns are strictly mandatory across all screens:

### 13.1 Native Direct Contact Flow (`ContactSheet.tsx`)
- **Prohibition:** NEVER display raw, un-dialable system dialogs (`Alert.alert("Name", "+880...")`) for phone numbers.
- **Pattern:** Use `ContactSheet` from `src/components/ui/ContactSheet.tsx`.
- **Capabilities:**
  - One-tap Call Phone (`callPhone(cleanPhone)` via `tel:` intent).
  - One-tap Chat on WhatsApp (`openWhatsApp(cleanPhone)` via `https://wa.me/`).
  - Copy to clipboard (`handleCopy()` with success toast).
  - Send Email (`mailto:${email}` when email is present).
  - In-app student chat action fallback (`inAppChatAction`).
- **Integration Points:**
  - `MarketDetailScreen.tsx`: Triggered upon seller contact reveal RPC (`listing_contact`) and interactive seller contact card.
  - `RideDetailScreen.tsx`: Triggered upon driver contact reveal (`ride_contact`) and seat requester contact cards.
  - `BloodScreen.tsx`: Triggered upon donor contact reveal (`donor_contact`) and urgent patient requester contact reveal.
  - `LostFoundDetailScreen.tsx`: Triggered upon approved claim contact unlock (`claim_contact`).

### 13.2 Visual Media Pipeline & Upload Storage Control
- **Automated Compression Engine (`src/utils/imageCompress.ts`):**
  - Powered by `expo-image-manipulator` (`SaveFormat.JPEG`) with aspect-ratio preserving downscaling and EXIF normalization.
  - Presets:
    - `avatar`: Max dimension 512px, 0.80 quality (~30-60 KB). Used for Profile avatars (`ProfileScreen`) and faculty portraits (`ManageFacultyScreen`).
    - `standard`: Max dimension 1440px, 0.75 quality (~150-300 KB). Used for Maintenance reports (`ReportFormScreen`), Marketplace listings (`MarketPostScreen`), Lost & Found (`PostItemFormScreen`, `LostFoundDetailScreen`), Club posts (`ClubPostScreen`), and Announcement flyers (`AnnouncePostScreen`).
    - `document`: Max dimension 1800px, 0.82 quality (~250-500 KB). Used for Routine schedule sheets (`RoutinesBrowseScreen`) and whiteboard/notebook notes (`StudyUploadScreen`).
    - `compact`: Max dimension 1024px, 0.70 quality (~80-150 KB). Used for AI assistant query attachments (`ChatbotScreen`).
  - Fallback Resilience: Gracefully falls back to uncompressed URI on any unexpected image parser failure; never crashes or blocks user submissions.
- **Storage Layer Auto-Compression (`src/utils/storage.ts`):**
  - `uploadFile`: Inspects MIME type / extension; automatically routes images through `compressImage` with appropriate preset before reading bytes.
  - `uploadPhoto`: Auto-resolves preset by folder (`avatars` -> `avatar`, `chatbot` -> `compact`, `routines` -> `document`, else `standard`).
  - `uploadProof`: Auto-compresses claim proof photos with `standard` preset.
  - Pre-Upload Size Guards: Rejects documents exceeding `MAX_FILE_SIZE_MB` (10MB) and images exceeding `MAX_IMAGE_SIZE_MB` (5MB).
 - **Lost & Found Photos:**
   - `LostFoundBrowseScreen.tsx`: Render 52×52 rounded cover thumbnail with category icon fallback.
   - `LostFoundDetailScreen.tsx`: Render 190dp hero image card with anchored status badge (`Lost` in crimson / `Found` in emerald).
   - `PostItemFormScreen.tsx`: Support image picking via `expo-image-picker`, preview thumbnail with Change/Remove actions, and upload to public `photos` bucket via `uploadPhoto(uri, 'lostfound', user.id)`.

### 13.3 Home Live Status Carousel (`CampusToday.tsx`)
- Replaced cramped 2-column flex-wrapped grid with a horizontal snap carousel (210dp card width, 13.5px bold title, 11.5px subtitle, sector accent pill).
- Surfaces next bus to campus, next prayer azan, latest campus announcement, upcoming event, open jobs count, and urgent blood requests.

### 13.4 Real-World Logistics & Time Display
- **12-Hour Bus Departures:** Always format military time (e.g. `13:30`) to human 12-hour AM/PM format (e.g. `01:30 PM`) using `format12Hour` helper. Always safeguard route stops (`(r.stops ?? []).length`).
- **Dynamic Ramadan Detection:** In `PrayerScreen.tsx`, never hardcode fasting banners. Use `isRamadanNow()` checking Hijri calendar month 9 via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`.

### 13.5 AI Assistant Onboarding (`ChatbotScreen.tsx`)
- Never present an empty blank screen. Present 4 varsity-focused starter prompt chips (Bus routes, prayer times, CGPA calculation, campus jobs) that pre-fill the composer on tap.

### 13.6 Navigation & Dashboard Layout Integrity
- Strictly enforce AGENTS.md Rule 5.2 (full-width rows with left icon, bold title, and right chevron).
- In `AdminDashboardScreen.tsx`, all 7 management destinations use full-width rows to prevent orphaned cards.

### 13.7 Theme-Aware Dark Mode Tokens (`pillBg`)
- Never use hardcoded light pastel constants (`Accent.tealBg = #e4f5f4`, `greenBg = #e8f8f0`, `grayBg = #f0f2f6`) on cards or badges in dark mode.
- Use `pillBg(fgHex, isDark)` from `src/theme/colors.ts`, generating `${fgHex}2e` on dark and `${fgHex}18` on light.

### 13.8 Unified Blood Group Matrix Grid & Emergency Hero Action (`BloodScreen.tsx`)
- **Prominent Emergency Hero Bar:** `Request blood` is rendered as a full-width high-priority emergency action bar directly below `SubBar` for instant life-saving triage access.
- **Symmetrical 8-Box Grid on Both Tabs:** Both 'Requests' and 'Donors' tabs share the exact same 4×2 interactive blood group matrix card (`A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`).
- **Zero Horizontal Chip Scrollbars:** Completely eliminated messy horizontal scrolling carousels.
- **Live Emergency Counts:** Displays live counts of active requests and available donors per blood group; tapping any cell toggles filtering with a clear active filter indicator and empty state reset button.

### 13.9 Blood Donation Search & Dhaka Area Architecture (`BloodScreen.tsx`, `AreaPickerModal.tsx`)
- **Native Touch Focus & No Nested Touchables:** The unified search bar uses a native `<View style={styles.searchBar}>` with `flex: 1` and `height: 42`, containing a touchable search icon, full-height `TextInput`, and instant clear button. Never wrap `TextInput` inside an outer `TouchableOpacity` on Android, which intercepts responder focus.
- **Dhaka Area Filter Trigger:** Split into two discrete, non-nested touch targets (`styles.areaPickerBtn` and `styles.areaClearBtn`), completely avoiding React Native Android nested touch responder bugs (`stopPropagation` failures).
- **Search Auto-Reset & Dismiss Controls:** `AreaPickerModal` auto-resets its search input upon opening (`visible` hook), supports `returnKeyType="search"`, and enables `keyboardDismissMode="on-drag"`.
- **Form Area Picker vs Filter Picker:** `AreaPickerModal` supports `allowAll={false}` for registration/request forms (`BloodRequestScreen`, `DonorRegisterScreen`) to prevent users from accidentally selecting "All Areas" as a physical address, while keeping `allowAll={true}` on `BloodScreen` for filtering.

### 13.10 Student Home Dashboard: Frequently Used Tools & Community Updates (`HomeScreen.tsx`)
- **Frequently Used Academic Tools (`HomeFrequentTools.tsx`):**
  - Replaced the standalone Lost & Found action card on Home with a 4-square grid row:
    1. Study Hub (`StudyHub`, `SectorColors.study`)
    2. Routines (`RoutinesBrowse`, `SectorColors.routines`)
    3. Cover Page (`CoverPageForm`, `SectorColors.coverpage`)
    4. CGPA Calc (`Cgpa`, `#0e9c8a`)
  - Features theme-aware icon tint boxes (`bgTint`, `borderTint`), `adjustsFontSizeToFit` + `minimumFontScale={0.85}` safety to prevent ellipsis truncation across all Android screen sizes and display scales, and 1-tap muscle-memory navigation.
- **Dynamic Community Updates Feed (`HomeCommunityUpdates.tsx`):**
  - Replaced the redundant `CampusToday` carousel on Student Home with a unified campus news feed aggregating notices (`announcements`), upcoming events (`events`), and club updates (`club_posts`).
  - **Unified Segmented Tab Switcher (Parity with BloodScreen):** Replaced floating scrollable pills with a full-width segmented track container (`C.surface2`, `borderRadius: 12`, `borderWidth: 1`) matching `BloodScreen`'s tab architecture. Features 4 integrated segments (`All`, `Notices`, `Clubs`, `Events`) with Feather micro-icons (`layers`, `bell`, `users`, `calendar`), real-time count badges, elevated card selection (`C.surface`), and sector-accented active highlights.
  - **Visual Media Pipeline & Fallback Resolution:** Resolves bundled varsity banner assets (`hackathon-2026.jpg`, `convocation-2026.jpg`, `exam-routine.jpg`, `blood-drive.jpg`) or remote URLs, equipped with native `onError` fallback to styled sector icon boxes.
  - **Robust PostgREST Relations & Fallback Merge:** Normalizes array/object `cp.clubs` relation join and guarantees at least 4 feed items via fallback merge if database entries are sparse.
  - **Detail Routing:** 1-tap navigation directly to `AnnouncementDetail`, `EventDetail`, or `ClubDetail`.
- **Role Scoping:** `CampusToday` is retained exclusively for `StaffDashboardScreen` and `AdminDashboardScreen` where it continues to serve as an at-a-glance operational status widget. Lost & Found remains 100% accessible in the `Explore` tab.

### 13.11 Student Directory Architecture & Peer Discovery (`DirectoryScreen.tsx` & `StudentProfileScreen.tsx`)
- **Segmented Discovery Track Switcher:** Full-width segmented track (`C.surface2`, `borderRadius: 14`, `padding: 3`) with native spring sliding indicator physics (`Animated.spring`, `tension: 68`, `friction: 10`, `useNativeDriver: true`) matching `LostFoundBrowseScreen.tsx`. Features three dedicated discovery scopes:
  - `All Students`: University-wide student roster with live total count badge.
  - `Connections`: Mutual accepted peer network with one-tap chat and phone actions.
  - `Requests`: Pending incoming and outgoing connection requests with live count badge and alert indicator.
- **Option A Funnel Layout (Zero Sandwich Effect):** Solves stacked bar clutter by organizing controls into a natural visual hierarchy:
  1. Top Scope: Segmented Track Switcher (`All Students | Connections | Requests`).
  2. Sub-Filters: Dual Control Bar (`[ ✨ My Sec (Intake-Section) ]` + `[ 🏛️ All Depts ▾ ]`) directly beneath tabs.
  3. Fine-Grained Search: Search input directly above the student card feed (`🔍 Search by name, intake, section, dept, blood...`).
- **Structured Dual Control Bar:**
  - **Left Button (`My Section`):** One-tap toggle filtering the directory down to students in the user's exact intake and section (e.g. `51-1`). Theme-aware styling across both light and dark modes.
  - **Right Button (`Department Picker`):** Displays current department with dynamic signature emblem and accent color.
- **Varsity-Grade Department Picker Modal:**
  - Modern slide-up bottom sheet modal (`animationType="slide"`) with grab handle, safe area insets (`useSafeAreaInsets`), and 9 BUBT faculties/departments:
    - `All Departments`: Royal Blue (`#2563EB`) · `globe`
    - `CSE (Computer Science & Engineering)`: Tech Cyan (`#0891B2`) · `cpu`
    - `EEE (Electrical & Electronic Engineering)`: Electric Amber (`#D97706`) · `zap`
    - `BBA (Business Administration)`: Growth Emerald (`#059669`) · `briefcase`
    - `Law (Department of Law)`: Justice Crimson (`#E11D48`) · `shield`
    - `English (Department of English)`: Literature Violet (`#7C3AED`) · `book-open`
    - `Civil (Civil Engineering)`: Infrastructure Orange (`#EA580C`) · `compass`
    - `Textile (Textile Engineering)`: Material Rose (`#DB2777`) · `layers`
    - `Economics (Department of Economics)`: Financial Indigo (`#4F46E5`) · `trending-up`
  - Real-time student count badges per department (`[count] peers`).
  - Active selection receives glowing colored border, tinted background, and checkmark pill.
- **Database & Backend Architecture:**
  - `disconnect_student(p_target_id UUID)`: SECURITY DEFINER RPC for atomic mutual disconnection.
  - `student_profile_detail(p_target_id UUID)`: SECURITY DEFINER RPC returning full profile details for single-student lookups.
  - `student_directory()`: Returns `student_id` and `is_cr` (checking `study_section_members.role = 'cr'`).
  - `connections_delete` RLS policy: Allows mutual deletion for both `pending` and `accepted` connections.
  - `trg_notify_connection_event`: In-app notification and FCM lockscreen push on connection request and acceptance.
- **Direct Contact & Profile Integration:**
  - Standardized `ContactSheet.tsx` integration across cards and detail screen for one-tap Phone, WhatsApp, Mail, and in-app DM.
  - Mutual disconnect with native confirmation alert in `StudentProfileScreen.tsx`.
- **1:1 Web Parity (`StudentDirectory.jsx`):**
  - Sibling web app equipped with Department filter select dropdown, Classmates toggle, CR & Blood badges, and modal Disconnect action. Verified via `vite build`.

### 13.12 Blood Donation Notification System & Life-Saving Dispatch Loop (`BloodScreen.tsx`, `DonorRegisterScreen.tsx`, `NotifSettingsScreen.tsx`)
- **Emergency Priority Architecture:**
  - Android native channel `emergency_blood` configured with `AndroidImportance.MAX`, bypasses DND in emergency contexts, displays full heads-up banner on lockscreen, and features a distinct emergency double-pulse vibration pattern (`[0, 500, 200, 500]`).
  - Edge function `send-push` (`supabase/functions/send-push/index.ts`) automatically maps all notifications with `sector === 'blood'` to `channelId: 'emergency_blood'`.
- **Urgency Sensitivity & Fatigue Prevention:**
  - `public.donors` table stores `alert_urgency` (`'urgent_only'`, `'today_plus'`, `'all'`) defaulting to `'all'`.
  - Registered donors can toggle their urgency preference in both `DonorRegisterScreen.tsx` during signup/profile editing and directly in `NotifSettingsScreen.tsx` under the Blood notification preferences card via `updateDonorAlertUrgency(userId, urgency)`.
  - Sensitivity thresholds:
    - `urgent_only`: Alerted ONLY for critical immediate emergencies (`urgency = 'urgent'`).
    - `today_plus`: Alerted for critical emergencies and requests needed today (`urgency IN ('urgent', 'today')`).
    - `all`: Alerted for all blood requests matching blood group (`urgent`, `today`, `this_week`, `planned`).
- **Smart Dhaka Location Matching with City-Wide Fallback:**
  - `notify_blood_request()` trigger function checks the requested patient `area` (e.g. `Mirpur`, `Dhanmondi`, `Uttara`, `Mohakhali`).
  - Matches compatible donors located in that specific area first who have not donated within the recharge interval and have enabled blood notifications (`notif_prefs->blood`).
  - **Zero-Response Safety Fallback:** If fewer than 3 compatible donors are found in that specific area, the system automatically expands notifications to city-wide compatible Dhaka donors. This guarantees life-saving requests are never silenced if an area has low donor density or all local donors have recently donated.
- **Two-Way Dispatch & Closure Feedback Loop:**
  - `trg_notify_blood_pledge` (AFTER INSERT on `blood_pledges`): Instantly notifies the requester when a student taps "I can help" (`type = 'blood_pledge'`), providing the donor's name and blood group.
  - `trg_notify_blood_pledge_cancelled` (AFTER DELETE on `blood_pledges`): Alerts the requester if a donor cancels their pledge (`type = 'blood_pledge_cancelled'`), allowing the requester to seek alternative donors without delay.
  - `trg_notify_blood_request_fulfilled` (AFTER UPDATE on `blood_requests` when `is_fulfilled = true`): Automatically sends a closure and thank-you notification (`type = 'blood_request_fulfilled'`) to all donors who pledged, informing them that blood has been arranged.
- **Intelligent Deep-Linking & Targeted Highlight:**
  - `notifTarget.ts` maps `blood_pledge` and `blood_pledge_cancelled` to `BloodRequestDetail` (with `requestId`), and `blood_request` and `blood_request_fulfilled` to `Blood` (with `requestCode`).
  - When opened via push or in-app notification with `requestCode`, `BloodScreen.tsx` switches to the Requests tab, anchors a golden highlight card banner, and highlights the specific emergency request card with an accent border.
- **Gender-Aware Replenishment & WHO Health Safeguards:**
  - Enforces WHO blood donation recovery intervals: 90 days for males and 120 days for females (`scheduleRechargedReminder` in `src/utils/bloodReminder.ts` taking user's `gender`).
- **Direct WhatsApp Coordination:**
  - `ContactSheet.tsx` supports optional `whatsAppMessage` prop, routing pre-composed emergency details (`Assalamu Alaikum, I saw your urgent blood request on CampusOne for [Blood Group] at [Hospital]...`) directly into WhatsApp chat.
- **In-App Direct Messaging & Privacy Protection:**
  - Integrated `inAppChatAction` into `ContactSheet.tsx` across all blood contact touchpoints:
    1. Requesters can message pledged responders in `BloodRequestDetailScreen.tsx` via `openBloodDmThread(code, donorId)`.
    2. Pledged donors can message the requester in `BloodScreen.tsx` via `openBloodDmThread(code, requesterId)`.
    3. Students in urgent need can message registered donors directly from the donor catalog in `BloodScreen.tsx` via `openDonorDmThread(donorUserId)`.
  - Backed by SECURITY DEFINER RPC `open_dm_thread(p_code, p_context_type, p_target)` granting 90-day DM access in `public.dm_grants` (`context_type in ('blood', 'donor')`).
  - Pre-fills the `MessageThread` composer with relevant emergency details (blood group, patient name, hospital).
  - Enables privacy-preserving coordination for donors who withheld their WhatsApp/phone numbers from the public registry.

---

## 14. Official Logo & Brand Assets (Google Play Ready)

### 14.1 Visual Brand Identity
- **Mark:** Royal blue squircle container (`#0D3ECF` to `#1B52F8` gradient) featuring a unified C1 monogram:
  - Sweeping 3D beveled letter "C".
  - Upright numeral "1" embedded in center space.
  - Academic graduation mortarboard cap with hanging tassel.
- **Typography:** Modern geometric sans-serif wordmark "CampusOne" — "Campus" in deep midnight navy (`#0A1C3D`), "One" in royal blue (`#1B52F8`).
- **Zero AI / Generic Icon Tells:** All generic `@expo/vector-icons` `school` hats and placeholder icons are strictly purged. The official mark is used universally.

### 14.2 Asset Registry & Directory Locations
- **Master App Icon:** `assets/icon.png` (1024×1024 transparent PNG).
- **Google Play Console Upload:** `assets/playstore-icon.png` & `assets/playstore-icon-full.png` (512×512 PNG, formatted to official Google Play store requirements).
- **Android Adaptive Icon Layers:**
  - Foreground: `assets/android-icon-foreground.png` (1024×1024, emblem centered inside 66% safe keyline zone).
  - Background: `assets/android-icon-background.png` (1024×1024 `#ffffff`).
  - Themed Icon: `assets/android-icon-monochrome.png` (1024×1024 white silhouette for Android 13+ Material You).
- **Splash Screen:** `assets/splash-icon.png` (1024×1024 combination mark proportioned inside the Android 12+ 160dp circular safe zone with width ratio ~39%, so the full wordmark "CampusOne" from "C" to "e" is never clipped).
- **In-App Transparent PNGs:** `assets/logo.png` (full mark), `assets/logo-mark.png` (emblem only), `assets/logo-text.png` (wordmark only), `assets/favicon.png` (64×64).
- **Native Android Prebuilds (`android/app/src/main/res/`):**
  - Drawables: `drawable-*/splashscreen_logo.png` across mdpi (288×288, logo 112px), hdpi (432×432, logo 169px), xhdpi (576×576, logo 225px), xxhdpi (864×864, logo 338px), xxxhdpi (1152×1152, logo 450px) generated by `scripts/gen-icons.mjs`.
  - Mipmaps: `mipmap-*/ic_launcher.webp`, `ic_launcher_round.webp`, `ic_launcher_foreground.webp`, `ic_launcher_background.webp`, `ic_launcher_monochrome.webp` across all 5 densities.
  - Background colors: `values/colors.xml` (`splashscreen_background`, `iconBackground` set to `#ffffff`).

### 14.3 In-App UI Components
- `src/components/ui/Logo.tsx`: `LogoMark` renders `assets/logo-mark.png` with dynamic `size` and elevation `shadow`. Also exports `LogoFull` and `LogoText`.
- `Brand` component in `LandingScreen.tsx` wraps `LogoMark`, automatically providing the new logo to `LandingScreen`, `LoginScreen`, `RegisterScreen`, `OnboardingScreen`, `ResetPasswordScreen`, `VerifyEmailScreen`, and `TopBar`.

---

## 15. Memory Synchronization Mandate
Whenever the user instructs to "update memorys", the agent MUST synchronously update ALL memory references across both projects:
1. `CampusOne/AGENTS.md` & `CampusOne/CampusOne/AGENTS.md`
2. `CampusOne/CLAUDE.md` & `CampusOne/CampusOne/CLAUDE.md`
3. `fixit-campus/AGENTS.md`, `fixit-campus/agent.md`, and `fixit-campus/CLAUDE.md`

---

## 16. Google Play Store Readiness & Institutional Audit Standards

### 16.1 AndroidManifest Permissions & Queries
- **Forbidden Unused Permissions:** `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` must never be present in `android/app/src/main/AndroidManifest.xml`. Google Play Console flags them as high-risk policy violations for campus companion apps.
- **Intent Queries:** `<queries>` block in `AndroidManifest.xml` must declare `intent.action.DIAL` (`tel:`) and `intent.action.SENDTO` (`mailto:`) for deterministic external resolution on Android 11+ (API 30+).

### 16.2 Academic Scrutiny & Brand Consistency
- **Varsity Code Identifier:** `UNIVERSITY_NAME = 'BUBT'` in `src/constants/app.ts` (strictly never placeholder or other varsity codes like `'DIU'`).
- **Exported Document Footers:** Generated PDFs and cover pages must output `Generated by CampusOne` in `CoverPageFormScreen.tsx`.
- **Zero AI Tells:** 0 em-dashes `—` in user-facing microcopy/i18n; no ASCII box-drawing comments (`// ───`); no AI header comments (`// Matches design...`).
- **Theme Polish:** `pillBg(fgHex, isDark)` with default `isDark = false` applied across all status badges and pills, ensuring zero blinding pastels in dark mode.

---

## 17. Navigation & Screen Information Architecture (Explore & Tools Placement)

### 17.1 Home Screen Integrity (`HomeScreen.tsx`)
- **Zero Redundant Clutter:** Notifications belong strictly in the dedicated top-right **Bell Icon** (with live unread badge count) linking to `NotificationsScreen`. Redundant legacy notification banners and large repetitive list cards are eliminated from the Home screen.
- **Home Screen Flow (Student):**
  1. TopBar (Varsity LogoMark insignia, CampusOne brand text, role-aware subtitle / badge, and single Notification Bell with live unread badge).
  2. Hero Auto-Changing Banner (`HomeHeroBanner.tsx`): 4.2s auto-rotating carousel of announcements and events strictly gated to photo attachments with fallback varsity assets.
  3. Four Luxury Status Strips (`HomeStatusStrips.tsx`):
     - Reports Strip: Indigo blueprint gradient with Open, In Progress, Resolved counters linking to `MyReports`.
     - Bus Strip: Dark transit amber gradient with route, departure, wait countdown, and 120-min cycle progress bar.
     - Prayer Strip: Midnight Islamic emerald gradient with Salah name, Azan time, wait countdown, and interval progress bar.
     - Blood Strip: Midnight crimson gradient with Urgent requests, Needed active requests, and Registered Donors counters linking to `Blood`.
  4. Browse Lost & Found action card linking to `LostFoundBrowse`.
  5. Campus Today Highlights (`CampusToday.tsx` with `hide={['bus', 'prayer', 'blood']}`): Shows open campus jobs and updates.
- **De-cluttered Efficiency:** Old `Quick Actions` row and redundant `My Reports` card list are eliminated since Reports, Bus, Prayer, and Blood are directly represented in the status strips.
- **Banner Image Resolution Engine:** In `HomeHeroBanner.tsx`, `resolveBannerSource()` intercepts image URLs from the database. When relative web paths from database seeds are encountered (e.g. `/announcements/convocation-2026.jpg` or `/events/blood-drive.jpg`), it automatically resolves them to bundled local assets in `assets/banners/` (`convocation-2026.jpg`, `blood-drive.jpg`, `exam-routine.jpg`, `hackathon-2026.jpg`) with 0ms latency. Full remote URLs (`https://...` from Supabase storage) load over the network, and unrecognized relative paths resolve against the web host.
- **Zero Misplaced Tool Promos:** Document tools (PDF Maker, Cover Page Generator) remain organized in Explore -> Academics and are not dumped on the Home screen.

### 17.2 Settings & Notification Architecture (`SettingsScreen.tsx` & `NotifSettingsScreen.tsx`)
- **Standalone Card Layout:** Settings items are structured as independent floating cards (`borderRadius: 16`, `borderWidth: 1`, `marginBottom: 10`, `padding: 14`) with tinted squircle icons, bold titles, and subtitles. Monolithic grouped tables and hairline dividers are strictly forbidden.
- **Data & Cache Manager:** Dedicated card backed by `storageService.ts` that calculates temporary working file cache (PDF Maker thumbnails & working files, people roster memory cache), safely purges cache without de-authenticating the user, and provides 1-tap navigation to Android system App Info via `Linking.openSettings()`.
- **Optimized Sync:** Battery-optimized background sync toggle persisted in `app.optSync` storage.
- **Role-Aware Dashboards & Workspaces:** Admin accounts get an `Admin Dashboard` quick access card to management hubs; Staff accounts get a `Staff Workspace` quick access card to assigned maintenance tasks.
- **Notifications Screen Parity (`NotifSettingsScreen.tsx`):**
  - OS-Level Permission Alert: Displays an amber banner (`Notifications are disabled in your phone settings`) with an `[Open Settings]` button linking directly to Android's App Info when push permissions are blocked.
  - Subtitle: "Manage your notification preferences. Turn off what you don't need."
  - Sector-Level Standalone Cards: Every sector is an independent card with expandable channel pills (`Push` / `In-app`).
  - Role-Tailored Sector Filtering:
    - Student: all 18 sectors.
    - Staff: maintenance & campus essentials (`reports`, `announce`, `bus`, `prayer`, `medical`, `blood`, `market`, `ride`), omitting academic/student-only channels.
    - Admin: all campus management sectors, omitting student-exclusive private channels (`messages`, `directory`, `coverpage`).
- **Live OS Permission Reactivity:** In `SettingsScreen.tsx` and `NotifSettingsScreen.tsx`, never rely solely on startup permission state. Always query `Notifications.getPermissionsAsync()` on focus (`useFocusEffect`) and app resume (`AppState.addEventListener('change', state => state === 'active')`). When notifications are disabled at the OS level, `SettingsScreen.tsx` flags the Notifications row with an amber alert triangle (`#f59e0b`) and subtitle `"Notifications disabled in phone settings"`, and `NotifSettingsScreen.tsx` displays the warning banner with `[Open Settings]`. Re-enabling permissions in Android settings automatically clears the warning without requiring an app restart.
- **Decoupling of OS Permission & Push Registration:** The warning banner strictly watches real-time OS permissions (`osDisabled`), never locking the banner with stale in-memory push state (`push.state === 'denied'`). When permissions are enabled, `syncPushPermission()` proactively registers the FCM token with Supabase and dismisses the banner immediately.
- **Zero Utility Dumps:** Utility tools or document generators (e.g. Cover Page Generator) remain organized in Explore -> Academics and are not dumped in Settings.

### 17.3 Explore Screen Categories & Accordion UX (`ExploreScreen.tsx` & `CollapsibleSection.tsx`)
- **Categorization & Hierarchy:** High-level grouping matches the web sidebar:
  - **Featured & Quick Access:** AI Assistant and Campus Issues separated at the top with a dedicated section eyebrow and right navigation chevrons.
  - **Campus Directory Categories:** Academics, Campus Life, Services, and Community under a dedicated section eyebrow.
- **Prominent Category Header & Big Standout Count Box:**
  - Category headers feature a dedicated 34x28dp prominent count box (`borderRadius: 8`, `borderWidth: 1.5`, `FontFamily.jakartaExtraBold`) tinted in the sector's vibrant accent color.
  - When expanded, the header card highlights with a 1.5px sector-colored border and opens smoothly with an active colored chevron.
- **Icon-Free Indented Separate Child Bars (`styles.childBar`):**
  - All icons are deliberately removed from nested children (Study Hub, Class Routines, Marketplace, Ride Share, etc.) to eliminate visual clutter and ensure children never look like heavy top-level cards.
  - Each child is an independent, indented separate bar (`borderRadius: 14`, `borderWidth: 1`, `marginLeft: 12`, `marginBottom: 8`).
  - **Spatial Identity & Anchor ("Know Where We Are"):** Every separate bar features a bold 4dp colored left accent strip (`borderLeftWidth: 4`, `borderLeftColor: accentColor`) and matching tinted right chevron (`>`) in the parent category's sector color (Academics Cyan, Campus Life Pink, Services Blue, Community Green). This guarantees instant recognition while scrolling.
- **Default State (Collapsed):** All categories start **collapsed by default** (`defaultOpen = false`).
- **Accordion Behavior:** Tapping any category smoothly expands it (`chevD` `v`) and closes other open categories, keeping the screen compact.
- **Admin Dashboard Integrity:** `AdminDashboardScreen.tsx` uses `defaultOpen={true}` with full backward compatibility.

---

## 18. Admin & Staff Operations Architecture (Full Audit Reference)

### 18.1 Staff Workflow & Dispatch Mechanics
- **Staff Home Routing:** Role `'staff'` lands directly on `StaffDashboardScreen.tsx` with live workload counters (`Assigned`, `In Progress`, `Resolved`).
- **Issue Lifecycle Actions:**
  - `Start Work`: Optimistically updates issue status from `Open` to `In Progress`.
  - `Mark Resolved`: Optimistically updates status to `Resolved`.
  - `Decline`: Prompts confirmation and executes `decline_report(reportId)` RPC, atomically removing `assigned_staff_id` and reverting status to `Open` for admin re-dispatch.
- **Cross-RLS Reporter Resolution:** Staff queries use `fetchPeople` via `directory_profiles()` to retrieve student reporter names without hitting `profiles` RLS blockades.
- **Maintenance-Focused Explore:** Staff accounts are filtered to maintenance-relevant sectors (`bus`, `prayer`, `announce`, `medical`, `market`, `ride`, `blood`). Academic tools, student directories, anonymous boards, and chatbot are excluded.

### 18.2 Administrator Operations & Security Rules
- **Admin Home Routing:** Role `'admin'` lands on `AdminDashboardScreen.tsx` with high-level triage counters (`Open`, `In Progress`, `Resolved`).
- **Smart Trade-Matching Dispatch:** Reports are classified into trades (`Electrical`, `Plumbing`, `Cleanliness`, `IT / Network`, `Furniture`, `Safety / Security`, `Other`). The assignment modal sorts staff whose `expertise` matches the report trade to the top, flags them with a `Match` pill, and displays their active workload count.
- **7 Core Management Hubs:**
  - `AllReportsScreen`: Filterable, searchable catalog of all campus infrastructure reports.
  - `ManageStaffScreen`: Staff trade management and in-app staff/admin account creation.
  - `ManageUsersScreen`: Student-to-executive elevation (CR / President) and staff/admin role cycling.
  - `AnnouncementsScreen`: Campus-wide broadcast announcements with priority and attachments.
  - `ManageFacultyScreen`: Teacher profile patching, contact details, research tags, and photos.
  - `StudyHubScreen`: Academic catalogue management, intake/section provisioning, and CR review.
  - `ManageClubsScreen`: Club creation, status toggle, and atomic presidential assignment (`club_set_president` RPC).

---

## 19. Varsity Top App Bar Architecture (`TopBar.tsx`)

- **Option B Implementation:** Replaced the legacy cluttered top bar (avatar circle `MM`, "Good morning Monir" greeting, language `EN` toggle, theme `Sun/Moon` toggle) with a unified, institution-grade Varsity Top Bar across all roles (`HomeScreen.tsx`, `AdminDashboardScreen.tsx`, and `StaffDashboardScreen.tsx`).
- **Brand Presentation:**
  - 32dp `LogoMark` with university insignia.
  - Two-tone wordmark: `Campus` in primary text color (`C.text`) + `One` in `#10b981` (emerald green).
  - Role-aware badge pill:
    - Admin: `ADMIN` emerald badge (`#e6f7ef` bg in light, `rgba(16, 185, 129, 0.16)` in dark) + Subtitle: "Campus Administration".
    - Staff: `STAFF` amber badge (`#fef3c7` bg in light, `rgba(245, 158, 11, 0.16)` in dark) + Subtitle: "Staff Workspace".
    - Student: Subtitle "Full campus in one app" (matches web app tagline).
- **Action Buttons:**
  - Notification Bell `[🔔]` (`40×40dp` with live unread badge, triggers `navigation.navigate('Notifications')`).
  - Redundant search button removed to eliminate duplicate navigation to the permanently present bottom Explore tab, matching the sibling web app (`AppShell.jsx`) mobile header 1:1.
- **Clean Separation of Concerns:**
  - User profile is accessed via the dedicated bottom navigation `Settings` tab.
  - Language and dark/light theme switching are housed inside `SettingsScreen.tsx`.
  - Top bar remains focused on varsity identity and instant alert notifications.

---

## 20. Blood Donation Life-Saving Engine & Clinical Architecture

### 20.1 Clinical Standards & Safety
- **Gender-Aware Medical Cooldown (WHO Standard):** Enforces a 90-day recovery window for male donors and a 120-day recovery window for female donors to preserve iron reserves and prevent microcytic anemia (`DONATION_WAIT_DAYS_MALE = 90`, `DONATION_WAIT_DAYS_FEMALE = 120` in `src/utils/blood.ts`).
- **Zero-Migration Gender Storage:** Donor gender preference is persisted via `AsyncStorage` (`@donor_gender_${user.id}`), keeping the client fully type-safe without modifying the live database schema.

### 20.2 Native Recharged Push Alarms (`bloodReminder.ts`)
- **AlarmManager Integration:** Automatically schedules on-device notifications via `expo-notifications` (`scheduleNotificationAsync`) using `BLOOD_RECHARGE_NOTIFICATION_ID`.
- **Zero Backend Cost:** Operates 100% on-device, incurring $0 in backend compute or FCM costs, and triggers deterministically even when offline.
- **Trigger Points:** Armed upon donor registration/profile update and whenever the donor marks donation via `markDonatedToday()`.

### 20.3 Personal Donation & Lives Saved Impact Tracker
- **Lifetime Recognition:** Backed by `blood_pledges.fulfilled_at` counted in `getBloodFeed()` (`myDonationCount`).
- **UI Presentation:** Displays an impact badge (`🏅 X donations recorded · Up to Y lives impacted`) on the donor status card, celebrating lifetime contribution (1 whole blood unit impacts up to 3 lives).

### 20.4 Dhaka 45+ Areas Catalog & Searchable Area Sheet (`dhakaAreas.ts` & `AreaPickerModal.tsx`)
- **Master Area Catalog:** Complete dictionary of 45+ Dhaka neighborhoods and medical hubs categorized into 6 zones (`Mirpur & Campus`, `Medical Hubs`, `North Dhaka`, `Central & West Dhaka`, `East Dhaka`, `South & Old Dhaka`, and `Suburbs`).
- **Elimination of Endless Sliding:** Solves the 40-chip horizontal swipe problem by keeping 5 high-frequency campus hubs (`All`, `Mirpur`, `DMCH`, `Kurmitola`, `Dhanmondi`, `Uttara`) and providing an `[ 📍 All Areas (45+) ▾ ]` button.
- **Searchable Bottom Sheet Modal:** Tapping `All Areas` opens `AreaPickerModal` with instant search as you type, zone grouping, real-time live donor/request count pills, custom landmark support, and 1-tap clear.
- **Active Area Highlighting:** When an area outside the quick list is selected (e.g. `Banani`), it pins as the primary active crimson chip (`📍 Banani ✕`) with 1-tap dismiss.
- **Universal Search Bar:** An in-screen search bar filters across area, hospital, patient, and donor names simultaneously in real time.
- **Unified Registration & Posting:** `DonorRegisterScreen.tsx` and `BloodRequestScreen.tsx` feature a 1-tap `[ 📍 Select from Dhaka Areas ]` picker to guarantee zero spelling errors.

### 20.5 Dengue Platelet Mode (Apheresis)
- **Clinical Apheresis Protocol:** Platelet donors replenish cells within 72 hours, allowing safe donation every 14 days.
- **Request Tagging:** `BloodRequestScreen.tsx` provides a dedicated `Dengue Platelet (Apheresis)` toggle, tagging the request with `[Platelets]`.
- **Feed UI:** Displays an amber `⚡ Platelet Emergency` badge on matching requests.

### 20.6 Targeted Cross-Compatibility Notification Engine
- **Migration:** `supabase/migrations/20261010000000_blood_compatibility_notifications.sql`.
- **Compatibility Function:** `compatible_donor_groups(p_group)` maps clinical recipient blood groups to eligible donor types (e.g. A+ receives from A+, A-, O+, O-; AB+ receives from all 8 groups; O- receives only O-).
- **Trigger:** `trg_notify_blood_request` alerts all compatible, currently-eligible donors, factoring in the 14-day recovery window for platelet requests.
- **SecOps Compliance:** Explicitly revokes anon execution permissions on all database functions.

### 20.7 UI Ergonomics, Filter Non-Collapsing & Blood Group Immutability
- **Non-Collapsing Filter Chips:** All horizontal filter chips (`groupChip`, `areaChip`) use `flexShrink: 0` and explicit padding. This prevents Android Yoga flexbox from collapsing chips into ellipses (`...`) or dashes (`-`).
- **Interactive Available Donors Grid:** On the Donors tab, the 8-cell `Available Donors` summary card doubles as the blood group filter. Tapping any blood type highlights it and filters the roster, eliminating redundant horizontal chip rows.
- **Blood Group Immutability & Permanent Lock:** In `DonorRegisterScreen.tsx`, once a student registers their blood group, the blood type is locked as a verified badge (`O+ Verified · Permanent`). Registered donors can only update their Area and WhatsApp contact number, preventing accidental or dangerous blood type alteration.

- **Automatic 90/120-Day Cooldown Display:** Eligibility is derived automatically from `last_donated` (`Eligible` green badge vs `Eligible in Xd` countdown). Donors do not need to manually edit anything to become eligible. When eligible, a 1-tap `I donated today` action resets the recovery clock and arms the recharged reminder.

### 20.8 360° Forensic Audit, Security Hardening & Web Parity
- **IDOR Remediation (`donor_contact` RPC):**
  - Patched security vulnerability where `donor_contact(p_user_id)` exposed contact details without verifying donor registry status. Added strict inner join on `public.donors` so non-donors' numbers cannot be harvested.
  - Returns `table(name text, whatsapp text)` ensuring full schema parity with the web client.
  - Explicitly revoked execute permissions from `anon` and `public`; granted exclusively to `authenticated`.
  - Migration: `supabase/migrations/20261011000000_blood_security_and_parity_fix.sql` (pushed to Supabase).
- **`blood_pledges` Security Hardening:**
  - Insert RLS policy checks caller's presence in `public.donors` (`donor_id = auth.uid() and exists (select 1 from public.donors where user_id = auth.uid())`). Prevents non-donors from harvesting requester contact numbers by submitting unauthorized pledges.
- **Query Performance & Indexing:**
  - Added partial index `blood_requests_active_created_idx` on `public.blood_requests(created_at desc) where fulfilled_at is null` for instantaneous feed queries.
- **Timezone Drift Remediation (Dhaka UTC+6):**
  - Fixed midnight calendar math in `donorEligibility()` using `Date.UTC(y, m - 1, d)` and `localToday()` to eliminate 1-day drift during 00:00-06:00 Dhaka hours.
  - Aligned on-device recharge push alarms in `bloodReminder.ts` to 10:00 AM daytime Dhaka time (04:00 AM UTC).
- **Cross-Group Biological Compatibility (`isBloodCompatible`):**
  - Replaced strict string equality with biological compatibility rules across mobile (`src/utils/blood.ts`) and web (`fixit-campus/src/screens/blood/Blood.jsx`). Universal donors (e.g. O- donating to all groups; O+ donating to A+, B+, AB+, O+) can respond and pledge ("I can donate").
- **Web Student Dashboard Parity:**
  - In `fixit-campus/src/screens/student/StudentDashboard.jsx`, corrected filter from invalid columns (`b.urgency === "Immediate" || b.status === "open"`) to `b.urgency === "Urgent" || b.urgency === "Today"` and properly mapped `b.group` and `b.createdAt`.
- **Android 15 Edge-to-Edge & Exact Selection:**
  - In `AreaPickerModal.tsx`, added `useSafeAreaInsets` bottom padding to clear the gesture pill in edge-to-edge mode.
  - Fixed selection check to exact match (`selectedArea.trim().toLowerCase() === item.name.trim().toLowerCase()`), preventing all 8 Mirpur variations from checking simultaneously.
- **Cache Invalidation Lifecycle:**
  - Automated invalidation of `CacheKeys.BLOOD_FEED(userId)` and `CacheKeys.HOME_STATUS(userId)` upon request posting, donor registration/updates, and request fulfillment.

---

## 21. Full-App Offline Caching & Stale-While-Revalidate (SWR) Architecture

### 21.1 Offline Engine Core (`src/services/cacheService.ts`)
- **Dual-Layer Architecture:** Fast in-memory RAM cache backed by persistent `@react-native-async-storage/async-storage` (v2.2.0). Zero external npm dependencies added.
- **Cache Contract:** `getCache<T>(key, maxAgeMs?)` returns stale data instantly while background queries fetch the latest network records. `setCache<T>(key, data)` writes synchronously to memory and asynchronously to disk.
- **Eviction & Safety:** JSON parsing failures or disk errors fail silently to `null` without crashing the render tree.

### 21.2 Cold-Start & Auth Gate Unlocking
- **Profile Offline Persistence:** In `authStore.ts`, profiles are cached under `@c1_profile_${userId}` on every successful fetch. On cold boots without internet, the app reads the cached profile, avoiding the `profileError` screen lock in `RootNavigator.tsx`.
- **People Roster Persistence:** In `peopleService.ts`, the directory profiles roster is cached to `@c1_people_roster`. Display names across rides, listings, reports, and blood requests resolve instantly instead of showing blank initials when offline.

### 21.3 Offline UI Feedback (`OfflineBanner.tsx`)
- Non-intrusive status strip rendered across feeds when data is served from local cache during network outages.
- Clear, polite indication that cached information is displayed and will automatically refresh when internet connection resumes.

### 21.4 Feature-Level SWR & Offline Protection
- **Academic & Reference:** Bus schedules, prayer times, class routines, academic calendar, faculty roster, and medical center directory load instantly from cache and work in signal-dead zones (such as campus basements and transit buses).
- **Feeds & Communities:** Announcements, campus events, active clubs, student jobs, and home status strips load from cache instantly.
- **Peer-to-Peer Services:** Market listings, ride shares, lost and found items, and blood donor requests display cached feeds. Action mutations (contact reveal RPCs, seat booking, claim posting, pledges) are safely guarded with warning toasts when offline.
- **Messaging & Notifications:** Message history, DM channels, read states, and notifications are cached locally, allowing students to review past conversations without internet.
- **Web & AI Guards:** BUBT Annex portal shows a dedicated offline fallback card with a retry button instead of a broken webview. AI Chatbot displays cached conversation history and graceful offline notifications.

---

## 22. Lost & Found Varsity Architecture & Ergonomics

### 22.1 Hero Action Bar & Header Ergonomics (`LostFoundBrowseScreen.tsx`)
- **Prohibition:** Eliminates cramped corner `[+]` icon from `SubBar.rightSlot`.
- **Hero Action Bar:** Positioned directly below the header in the primary thumb strike zone. 44dp height, `borderRadius: 12`, `SectorColors.lostfound` (`#c77d1a`) background, 13.5px bold white text with `plus-circle` icon: `"+ Report Lost or Found Item"`.
- **Role Scoping:** Only displayed for students (`isStudent`), matching campus permission rules.

### 22.2 Unified Segmented Track Switcher & Native Spring Animation (`LostFoundBrowseScreen.tsx`)
- **Native Spring Animated Indicator:** Floating surface pill with subtle elevation and accent border that glides smoothly across the track under the user's finger using native 60fps driver (`Animated.spring`).
- **Dynamic Thematic Color Identity per Tab:**
  - `All`: Sector Amber (`#c77d1a`) text and soft badge tint.
  - `Lost`: Vibrant Crimson (`#d63d35` / `C.danger`) text and badge tint indicating missing items.
  - `Found`: Fresh Emerald (`#16a34a` / `C.success`) text and badge tint indicating recovered items.
  - `My Posts`: Royal Violet (`#8b5cf6`) text and badge tint for personal reports.
- **Live Badge Counters:** Real-time dynamic count chips per tab tracking active items with themed colors.

### 22.3 Unified Single-Row Search & Bottom Sheet Filter Modal (`LostFoundBrowseScreen.tsx`)
- **Zero Loose Chips Clutter:** Completely eliminates cluttered horizontal scrolling category chips and loose status pills from the main feed screen.
- **Single 44dp Row:** Search input on the left (`flex: 1`, search icon, full-height `TextInput`, instant clear `✕`) paired side-by-side with a prominent 44dp `Filters` button on the right (`minWidth: 96`, `flexShrink: 0`, matching `BloodScreen` search + area trigger architecture).
- **Active Filter Pill:** When filters are active (e.g. `category !== 'All'` or `status !== 'Open'`), the filter button highlights in sector amber (`${SectorColors.lostfound}18`), displays a filter count badge (e.g. `1`), and opens the modal to adjust or reset.
- **Filter Bottom Sheet Modal:** Tapping `Filters` opens a sleek bottom sheet organized into two distinct sections:
  - **STATUS:** Symmetrical card/bar rows for `Active (Open only)` (default), `Resolved only`, and `All (Active & Resolved)` with squircle status icons (`clock`, `check-circle`, `layers`), descriptive hints, and real-time status counts matching category rows 1:1.
  - **CATEGORY:** `All Categories`, `Personal`, `Electronics`, `Documents`, and `Other` with semantic squircle icon boxes, descriptive hints, and real-time category counts.
  - **Sheet Actions:** Equal 50/50 split buttons: styled soft-crimson `Reset` button (`C.dangerBg`, border, `rotate-ccw` icon) paired with solid sector-amber `Apply Filters` (check icon).
- **Feed Direct Placement:** The item card feed begins immediately beneath the single search/filter row with clean visual hierarchy.

### 22.4 Full-Screen Photo Viewer (`LostFoundDetailScreen.tsx`)
- **Tap-to-View Modal:** Tapping the 190dp hero image card opens a full-screen image modal (`rgba(0,0,0,0.94)` background, close button `✕`, title header, and `resizeMode="contain"` uncropped view), allowing students to inspect fine details like student ID numbers, serial codes, marks, or room numbers.
- **Zoom Hint Badge:** Anchored `Tap to view full photo` pill with `maximize-2` icon on the hero banner.

### 22.5 Post Item Form Ergonomics (`PostItemFormScreen.tsx`)
- **High-Contrast Type Selector:** Soft crimson tint for `Lost` (`C.dangerBg`, border `C.danger`) and soft emerald tint for `Found` (`C.successBg`, border `C.success`).
- **Symmetrical 2×2 Category Grid:** Balanced 2-column cards with squircle icon boxes and active borders.
- **Camera & Gallery Photo Picker:** Action sheet supporting both direct camera capture (`takePhotoWithCamera`) and media library selection (`pickFromGallery`).
- **Campus Location Quick Chips:** 1-tap campus location chips (`Library`, `Cafeteria`, `Building 2`, `Room 402`, `Exam Hall`, `Mosque`, `Computer Lab`, `Campus Grounds`).
- **Smart Pre-Post Match Banner:** Amber alert card with lightbulb icon alerting students if a matching item was already reported before submission.
- **Dynamic Action Button:** Dynamic type-aware colors and labels (`Post Lost Report` in crimson vs `Post Found Item` in emerald).

### 22.6 Complete 360-Degree Bug Audit & Robustness Hardening
- **Unicode Indic / Bengali Pre-Post Matching (`lostFoundMatch.ts`):**
  - Uses `/[^\p{L}\p{M}\p{N}]+/u` token splitting to support Indic script without severing vowel marks (`\p{M}`) from base consonants (`\p{L}`).
  - Lowered minimum token length threshold to >= 2 characters to match short terms (e.g., "ID", "বই").
  - Explicitly filters out 0-score items (`filter(x => x.score > 0)`) in `rankMatches()` to eliminate false-positive suggestions.
- **Item Owner Controls & SWR Cache Synchronization (`LostFoundDetailScreen.tsx`):**
  - Added dedicated Edit Post action routing directly to `PostItemFormScreen` with pre-filled state.
  - Implemented 1-tap `Mark as Resolved` and soft-delete (`deleted_at = now()`) with confirmation alerts and immediate optimistic SWR cache updates (`CacheKeys.LOST_FOUND`).
  - Replaced isolated `timeAgo` helper with standardized `formatRelativeTime(iso)`.
  - Added dedicated `LoadError` retry boundary distinguishing 404 (`PGRST116`) from network errors.
- **Claimant Lifecycle, Anti-Lockout & Race Prevention:**
  - Separated `myActiveClaim` (`'Pending' | 'Approved'`) from `myRejectedClaim` (`'Rejected'`) so claimants whose submissions are rejected are no longer locked out and can re-submit with clarified details.
  - Handled duplicate constraint error `23505` with friendly guidance.
  - Automatic storage rollback: cleans up uploaded proof from private `proofs` bucket if the subsequent database insert fails.
  - Row-level decision locks (`decidingClaimId`) preventing concurrent double-tap race conditions on claim approval/rejection.
  - Secured proof photo viewer to ensure only authenticated Supabase Storage URLs are opened.
- **Android 15 Edge-to-Edge & Ergonomics:**
  - Added `useSafeAreaInsets` bottom padding to photo picker and filter modals (`Math.max(insets.bottom, 18)`).
  - Configured `keyboardShouldPersistTaps="handled"` on horizontal location scroll views.
  - Guaranteed >= 42-44dp touch targets across all filter chips and action buttons.
- **Database Moderation Migration (`20261010010000_lost_found_security_and_moderation.sql`):**
  - Added `guard_item_update` trigger on `lost_found_items` to protect immutable fields and prevent reopening resolved items with approved claims.
  - Updated RLS policies (`items_select`, `items_update`) to enable admin moderation.
  - Sanitized push notification lockscreen text to prevent leaking private item details.

---

## 23. Native Spring Animated Segmented Track Pattern

### 23.1 Design Principles & Visual Standard
Segmented tab switcher tracks are used throughout CampusOne to toggle between core data feeds (e.g. Lost & Found tabs, Blood Requests vs Donors, Job types, Routine categories). To eliminate static transitions and give every tab its own distinctive institutional personality:
- **Zero-Latency Sliding Pill:** An elevated floating indicator glides fluidly beneath active options with physical spring dynamics (`Animated.spring`).
- **Dynamic Thematic Color Identity:** Rather than a uniform monochrome highlight, each tab defines its own semantic foreground and soft background tint (e.g. Danger Crimson for requests/lost, Success Emerald for recovered/donors/open, Violet for personal/my posts, Sector Accents for general feeds).
- **Responsive Geometry:** Automatically adapts to 2, 3, or 4 tab segments using layout callbacks (`onLayout`).

### 23.2 Mathematical Specification & Spring Physics
- **Track Padding:** `TRACK_PADDING = 3`
- **Inner Track Width:** `innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2)`
- **Dynamic Segment Width:** `tabWidth = innerTrackWidth > 0 ? innerTrackWidth / N : 0` (where `N` is the number of tabs)
- **Native Translation:**
  ```tsx
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, ..., N - 1],
    outputRange: [0, tabWidth, ..., tabWidth * (N - 1)],
  });
  ```
- **Physics Calibration:**
  ```tsx
  Animated.spring(animIndex, {
    toValue: activeIndex,
    tension: 68,
    friction: 10,
    useNativeDriver: true,
  }).start();
  ```
- **Elevated Indicator Design Tokens:**
  - `position: 'absolute'`, `top: 3`, `left: 3`, `bottom: 3`
  - `borderRadius: 11`, `borderWidth: 1.5`, `elevation: 2`
  - `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 1.5 }`, `shadowOpacity: 0.12`, `shadowRadius: 3`
  - `backgroundColor: C.surface`, `borderColor: isDark ? `${cfg.fg}55` : `${cfg.fg}35``
- **Badge Counters:** Live count badges dynamically light up in the active tab's soft background tint (`${cfg.fg}18` or `rgba(..., 0.18)`) and text color (`cfg.fg`). Inactive badges render subtle neutral borders/surfaces.

### 23.3 Comprehensive CampusOne Segmented Track Catalog
The following screens contain segmented control bars slated for this animated pattern:
1. **Lost & Found (`LostFoundBrowseScreen.tsx`):** `All` (Sector Amber) · `Lost` (Crimson) · `Found` (Emerald) · `My Posts` (Violet) [Implemented].
2. **Blood Donation (`BloodScreen.tsx`):** `Requests` (Blood Crimson `#d63d35`) vs `Donors` (Medical Emerald `#16a34a`) [Implemented].
3. **Home Community Updates (`HomeCommunityUpdates.tsx`):** `All` (Brand Blue `#2563eb`) · `Notices` (Announce Orange `#ea580c`) · `Clubs` (Emerald `#059669`) · `Events` (Violet `#8b5cf6`) [Implemented].
4. **Student Jobs (`JobsBrowseScreen.tsx`):** `Open` (Emerald) · `Closing Soon` (Amber) · `Expired` (Slate) · `Saved` (Rose/Pink) (4 tabs).
5. **Marketplace (`MarketScreen.tsx`):** `All Listings` (Slate/Brand) vs `My Listings` (Market Amber) (2 tabs).
6. **Campus Rides (`RidesScreen.tsx`):** `All` (Ride Cyan) · `To Campus` (Emerald) · `From Campus` (Royal Blue) (3 tabs).
7. **Campus Events (`EventsBrowseScreen.tsx`):** `Upcoming` (Violet) vs `Past` (Muted Slate) (2 tabs).
8. **Class & Exam Routines (`RoutinesBrowseScreen.tsx`):** `Class Routines` (Indigo) vs `Exam Routines` (Orange) (2 tabs).
9. **Study Hub Course Details (`CourseDetailScreen.tsx`):** `Materials` (Amber) · `Questions` (Blue) · `Books` (Emerald) · `Saved` (Violet) (4 tabs).
10. **Campus Issues & Reports (`CampusIssuesScreen.tsx`, `MyReportsScreen.tsx`, `AssignedToMeScreen.tsx`, `AllReportsScreen.tsx`):** Status switchers (`All` · `Open` · `In Progress` · `Resolved`).
11. **Notifications (`NotificationsScreen.tsx`):** `All` (Slate) vs `Unread` (Crimson) (2 tabs).
12. **Club Details (`ClubDetailScreen.tsx`):** `Feed` (Club Accent) vs `Members` (Indigo) (2 tabs).
13. **Admin Management (`ManageStaffScreen.tsx` & `JobsModerateScreen.tsx`):** `Staff` vs `Admins` (2 tabs), `Reported` vs `Removed` (2 tabs).

---

## 24. Student Directory Architecture & Bug-Hunting Hardening

### 24.1 Architecture & Core Components
- **Screens:** `DirectoryScreen.tsx`, `StudentProfileScreen.tsx` (Mobile) and `StudentDirectory.jsx` (Web).
- **Services:** `connectionsService.ts`, `peopleService.ts` (Mobile) and `store.jsx` (Web).
- **Database Functions & Triggers:**
  - `student_directory()` RPC: Returns visible students (`id <> uid`) with cohort info, `is_cr`, `blood_group`, `status`, and conditionally revealed `email` and `whatsapp`.
  - `student_profile_detail(p_target_id)` RPC: Single-student profile lookup bypassing full directory table scan.
  - `disconnect_student(p_target_id)` RPC: Mutual atomic removal of accepted connections.
  - `trg_notify_connection_event`: Automatic trigger on `connections` table fanning events out to in-app notifications and FCM push (`connection_request`, `connection_accepted`).
  - `connections_delete` RLS: Allows mutual deletion when `status IN ('pending', 'accepted')`.

### 24.2 360° Hardening & Bug Fixes
1. **Dynamic Route Param Integration:** `DirectoryScreen` accepts `route.params.tab` and `route.params.initialTab`, automatically switching to the requested tab with spring animation on notification press or deep link.
2. **Notification Deep Link Targeting:** `notifTarget.ts` routes `connection_request` directly to `{ tab: 'requests' }` and `connection_accepted` to `{ tab: 'connections' }`.
3. **Requests Tab Priority Sorting:** Urgent incoming connection requests (`connState === 'incoming'`) always sort to the top of the Requests tab ahead of pending outgoing requests.
4. **Multi-Token Composite Search:** Search queries are tokenized by whitespace (`q.split(/\s+/)`), matching across name, department, intake, section, intake-section combo, blood group, student ID, and CR badges on both mobile and web.
5. **Instant Filter Reset:** Single-tap "Clear filters" action rendered inside empty states whenever search query, department, or classmates filter is active.
6. **StudentProfile Param Fallback & Offline Resilience:** `StudentProfileScreen` supports `route.params?.student?.id ?? route.params?.studentId ?? route.params?.id`, displays loading spinner on cold lookup, gracefully renders empty state if hidden or deleted, and provides offline protection with `OfflineBanner`.
7. **Cache Mutation Sync:** `syncDirectoryCache` in `connectionsService.ts` ensures `CacheKeys.DIRECTORY(uid)` in `AsyncStorage` updates immediately upon connect, cancel, accept, decline, and disconnect.
8. **Web Parity:** `StudentDirectory.jsx` and `store.jsx` synchronize DM roster upon accept/disconnect via `loadMessages()` and match tokenized search filtering.

---

## 25. Campus Rides (Ride Share) Modernization & Polish

### 25.1 Architecture & Core Components
- **Screens & Components:** `RidesScreen.tsx`, `RideDetailScreen.tsx`, `RidePostScreen.tsx`, `CampusToday.tsx` (Mobile) and `Rides.jsx`, `store.jsx` (Web).
- **Database Migrations:**
  - `20261012000000_rides_enhancements.sql`: Mutual cancellation RLS (`ride_req_delete`), admin select (`ride_req_select`), notification triggers (`trg_notify_ride_request_event`, `trg_notify_ride_cancelled`).
  - `20261012000001_rides_expiry_fix.sql`: `set_ride_expires_at` calculates `greatest(scheduled + 3h, now() + 3h)` so newly posted rides never expire instantly upon creation.
  - `20261012000002_rides_rickshaw_and_request.sql`: Adds `'Rickshaw'` to `rides_vehicle_check` and introduces `post_type text NOT NULL DEFAULT 'offer' CHECK (post_type IN ('offer', 'request'))` with index `idx_rides_post_type`.

### 25.2 Key Features & Enhancements
1. **Hero Action Bar (Option 1):** Single prominent full-width `[+ Post a Campus Ride]` button (`SectorColors.ride`, 44dp height) matching `LostFoundBrowseScreen` and `BloodScreen` 1:1. Tapping it opens the post screen where the student picks Offer or Request via the animated slider.
2. **Animated Segmented Track Bar (Browse & Post Screens):**
   - **Browse Screen (`RidesScreen.tsx`):**
     - **Route Tab Switcher:** Unified rounded track container (`surface2`, `borderRadius: 14`) with native spring sliding indicator (`Animated.View`) across 4 tabs: `All` (Ride Cyan `#6e8b1f`), `To Campus` (Emerald `#16a34a`), `From Campus` (Royal Blue `#2563eb`), and `My Rides` (Violet `#8b5cf6`).
     - **Post Type Filter Bar (Below Search):** Unified rounded segmented track container (`surface2`, `borderRadius: 14`, `marginTop: 2`, `marginBottom: 8`) with native spring sliding indicator (`Animated.View`) across 3 filters: `All` (Brand), `Offers` (🚗 `#6e8b1f`), and `Need Ride` (🙋 Violet `#8b5cf6`). Replaced previous loose chips with a smooth physical card slider, live reactive count badges, and bilingual translation support.
   - **Post Screen (`RidePostScreen.tsx`):** Animated segmented sliding track container (native spring physics) smoothly transitioning between `[ 🚗 Offer Ride (Driver) ]` and `[ 🙋 Need Ride (Passenger) ]`. SubBar header remains steady ("Post a Ride") with zero jumpiness.
3. **Dedicated "My Rides" Tab:** Live badge counter showing total active rides. Surfaces both rides the user is offering as a driver (with booked passenger counts) and rides the user booked as a passenger (with seat status), immune to public departure cutoff filters.
4. **Rickshaw & Multi-Vehicle Commute:**
   - Supported vehicles: `Car` (`🚗`), `CNG` (`🛺`), `Bike` (`🏍️`), and `Rickshaw` (true 3-wheeled vector icon via `MaterialCommunityIcons` `rickshaw`, never a 2-wheel bicycle).
   - Rickshaw accommodates 1-2 passengers, perfectly matching Mirpur 1, 2, 10, and Sony Cinema varsity commutes.
5. **Passenger "Need a Ride" Requests (`post_type: 'request'`):**
   - Students without vehicles can post ride requests specifying pickup, destination, seats needed, departure time, and max budget.
   - Dual post type toggle in `RidePostScreen.tsx` dynamically switches seat limits, labels, and placeholders with smooth spring pill animation.
   - Cards display distinct badges: `🚗 Offer` (emerald) vs `🙋 Need Ride` (amber) with direct driver/passenger contact flow.
6. **Smart Posting Time & Expiry Safeguard:** Automatically defaults to tomorrow 08:00 AM when posting in the evening (after 6 PM), or upcoming hour today. Validates that departure time is not in the past.
7. **Full-Width Cards:** Driver avatar, name, department, vehicle badge, humanized departure ("Today · 8:00 AM", "Tomorrow · 5:00 PM"), and fare/budget.
8. **Mutual Cancellation:** Passengers can cancel their seat booking at any time with alert confirmation. Drivers can remove individual passengers directly from the seat requests list.
9. **Direct Contact & Navigation:**
   - Native `ContactSheet.tsx` integration with one-tap WhatsApp launcher, phone dialer, copy number, and in-app chat fallback.
   - Level 1 "Open in Maps" intent opening pickup/meeting point in Google Maps without battery drain or Play Store location permission hurdles.
10. **Campus Today Commute Widget:** `CampusToday.tsx` surfaces upcoming rides with available seats directly on the Home screen.
11. **Web Parity:** `fixit-campus/src/screens/rides/Rides.jsx` and `store.jsx` updated with Rickshaw vehicle, post_type filtering, single hero button, seat cancellation, passenger removal, and Google Maps integration.

---

## 26. Student Marketplace Modernization, Performance & Full-Fledged Overhaul

### 26.1 Architecture & Core Components
- **Screens & Components:** `MarketScreen.tsx`, `MarketDetailScreen.tsx`, `MarketPostScreen.tsx` (Mobile).
- **Services:** `marketService.ts` (saved listings / wishlist in `@c1_saved_listings`, `openListingDmThread`, `updateListingStatus`, `deleteListingRow`), `cacheService.ts` (`CacheKeys.MARKET_LISTINGS`), `peopleService.ts` (`fetchPeople`).
- **Database Migrations:**
  - `20261013000000_marketplace_enhancements.sql`:
    - Performance composite indexes: `idx_listings_feed` on `(status, created_at desc)`, `idx_listings_course_code` on `(course_code)`, and `idx_listings_category` on `(category)`.
    - Additive physical meetup column: `meetup_spot text`.
    - Additive multi-photo column: `photos text[] DEFAULT '{}'`.
  - `20261013020000_marketplace_360_hardening.sql`:
    - Loosened restrictive `listings_category_check` to support custom categories (`char_length(category) >= 2`).
    - Defensive idempotency on `meetup_spot text` and `photos text[] DEFAULT '{}'`.
    - Performance composite indexes: `idx_listings_feed`, `idx_listings_category`, `idx_listings_course_code`, and `idx_listings_meetup_spot`.

### 26.2 Key Features & Enhancements
1. **Prominent Hero Action Bar & Header Decluttering:**
   - Dedicated full-width 44dp emerald action bar (`[ + Sell an Item ]`) positioned directly below the header with `plus-circle` icon, matching `BloodScreen` and `RidesScreen`.
   - Removed cramped sell buttons from the top `SubBar`, keeping navigation standard and uncluttered.
2. **Spring-Animated Segmented Control Bar:**
   - 3-tab sliding card track matching `BloodScreen` and `DirectoryScreen` (`All Items`, `My Listings`, `Saved`).
   - Driven by native spring interpolation (`tension: 68, friction: 10, useNativeDriver: true`) inside a sunken `C.surface2` tray (`borderRadius: 14`) with elevated `C.surface` card indicator (`borderRadius: 11`).
   - Live badge counters on each tab.
3. **Structured Dual Control Bar & Category Sheet Modal:**
   - Dual button control row matching `DirectoryScreen`:
     - Left: `[ All ]` quick reset button to view all campus items.
     - Right: `[ Category ∨ ]` dynamic selector button.
   - Tapping category opens a rich bottom sheet modal displaying category icons, full titles, subtitle descriptions, active checkmarks, and live item counts (exact parity with Directory's `DepartmentModal`).
   - Expanded Categories: Books & Textbooks, Electronics & Accessories, Notes & Study Material, Drafting & Drawing Kits, Lab Coats & Safety Equipment, and Other Campus Items (supports custom category naming).
4. **Search Row & Secondary Filter Sheet:**
   - Positioned directly above the product feed for optimal thumb-zone reach.
   - `[ Filter ]` button styled with prominent emerald green accent and active state indicator.
   - Tapping filter opens a clean, uncluttered bottom sheet modal featuring:
     - Sort By: Single segmented bar with spring-animated sliding card indicator (`Newest`, `Price: Low to High`, `Price: High to Low`).
     - Availability: "Hide Sold Items" toggle switch.
     - Condition: Single segmented bar with spring-animated sliding card indicator (`All`, `Brand New`, `Like New`, `Used`).
     - Action Buttons: Symmetrical equal-width action buttons: `[ Reset Filters ]` (flex: 1) and `[ Apply Filters ]` (flex: 1).
5. **High-Performance Virtualized 2-Column Grid:**
   - `<FlatList numColumns={2}>` with dynamic card width.
   - Cards display 4:3 cover photo or themed category icon, condition tag (`New`, `Like New`, `Used`), condition-colored badge, favorite heart, price formatted in BDT, negotiable / fixed tag, relative timestamp freshness (`2h ago`, `Yesterday`), handover spot, and seller avatar with name and department cohort (`morshed · CSE`).
   - Dimmed opacity and centered `SOLD` badge overlay for sold listings.
6. **In-App Direct Chat Context Inflow (`open_dm_thread`):**
   - Primary "Message Seller" CTA on `MarketDetailScreen` calls `open_dm_thread('listing', code, seller_id)`.
   - Passes `initialText` pre-filled with: `"Hi, I'm interested in your listing: [Title] ([Price]). Is this still available?"`.
   - Secondary "Contact Info" button opens `ContactSheet.tsx` for WhatsApp / Direct phone call if opted-in via `show_whatsapp`.
7. **Wishlist & Saved Items (Local Persistence):**
   - 1-tap heart toggle on cards and detail screen with spring pop micro-animation.
   - Saved IDs persisted in `@c1_saved_listings` via `AsyncStorage` for instant offline access.
8. **Hero Image Lightbox & Tap-to-Zoom:**
   - Tapping the listing image opens a full-screen zoomable lightbox modal with dark backdrop and close action.
9. **Free / Community Giveaway Mode (0 ৳):**
   - Prominent emerald `FREE` badge on feed cards and detail screen for community donations and senior pass-downs.
10. **Handover Location Spotting & Dhaka Area Picker:**
    - Dedicated interactive location bar opening a full bottom sheet area picker.
    - Dual spring tabs: `Campus & Mirpur` (12 campus spots: Cafeteria, Library, Bldg 1/2/3 lobbies, Main Gate, etc.) and `Greater Dhaka` (44 commute areas: Uttara, Dhanmondi, Farmgate, Mohakhali, Gulshan, Banani, etc., sharing `ALL_DHAKA_COMMUTE_AREAS`).
    - Live search query filter across names, Bengali script names, and descriptions, plus custom area input.
11. **Spring-Animated Condition Bar:**
    - Interactive 3-option condition switcher in `MarketPostScreen.tsx` (`Brand New | Like New | Used`).
    - Driven by elevated indicator card with native spring interpolation (`tension: 68, friction: 10`) matching the design system standard.
12. **Course Cross-Referencing:**
    - Course codes auto-capitalized and linked to Study Hub (`CourseDetailScreen`).
13. **Listing Lifecycle & Owner Controls:**
    - Confirmation alerts for "Mark as Sold" and ability to "Mark Available" (re-list).
    - Status preservation on edit so sold items are not inadvertently revived.
    - Synchronous cache invalidation across all mutations (`create`, `edit`, `sold`, `relist`, `delete`).
14. **Native Sharing:**
    - Integrated native `Share.share` generating formatted listing summary for campus WhatsApp and social groups.
15. **360° Marketplace Bug-Hunting & Hardening:**
    - **Postgres Category Constraint Fix:** Loosened restrictive `check (category in (...))` from migration `0016` which broke new drafting/lab gear items and student custom category entries. Migration `20261013020000_marketplace_360_hardening.sql` safely replaced it with `check (char_length(category) >= 2)`, fully applied and verified on Supabase backend `xhgpxvyqrufbbuivttmi`.
    - **Custom Category Feed Aggregation:** Unified feed counting and category filtering so custom-named categories dynamically map under "Other" filter badges without ever being hidden from campus feeds.
    - **Price Sanitization:** Added strict regex sanitization `/[^0-9]/g` in `MarketPostScreen.tsx` preventing `NaN` crashing integer Postgres check constraints.
    - **Upload Race Protection:** Added active upload state locks (`!uploading`) with `ActivityIndicator` feedback on image cards and submit buttons preventing premature form submission while photos are in-flight.
    - **Edit Form Custom Category Roundtrip:** Fixed `MarketPostScreen.tsx` to pre-populate custom category text and set category dropdown to `'Other'` when editing custom-categorized listings.
    - **Dual Photo Sync:** Populated both `photo_url` and `photos: [photoUri]` array upon creation and editing for backward compatibility and multi-photo array integrity.
    - **Detail & Card Localization:** Localized condition badges on both feed cards and item detail cards (`Brand New`, `Like New`, `Used`) across English and Bengali with proper contrast.

### 13.4 Campus Jobs & Internships Hub (Community Parity & Architecture)

The Jobs & Internships module (`JobsBrowseScreen.tsx`, `JobDetailScreen.tsx`, `JobPostScreen.tsx`, `src/services/jobsService.ts`) connects BUBT students with verified internships, campus tutoring/tuitions, on-campus student work, part-time jobs, and freelance opportunities.

1. **Expanded Job Types & Taxonomy:**
   - 6 Core Types: `internship`, `tuition`, `on_campus`, `part_time`, `full_time`, `freelance`.
   - Department Targeting: Filter and target by academic department (`department_code`: `CSE`, `EEE`, `BBA`, `LAW`, `ENG`, `TEXTILE`, `ALL`).
   - Dhaka Area Integration: Presets matching `ALL_DHAKA_COMMUTE_AREAS` (Mirpur, Uttara, Dhanmondi, etc.) stored in `area_name`.
   - Compensation Models: `Paid`, `Unpaid`, `Stipend`, `Negotiable` with explicit salary text.
   - Student Level Targeting: `min_semester` (1–12) to ensure applicants meet senior year or prerequisite thresholds.
   - Alumni Referral Tag: `is_alumni_referral` boolean flag highlighting postings referred by verified BUBT alumni.
   - Skill Tags & Circular Attachment: Dynamic skill chips (`skills[]`) and optional PDF circular uploads (`circular_url` stored in Supabase `photos` bucket).
2. **Application Pipeline (`public.job_applications`):**
   - Direct In-App Applications: Students submit applications with a cover note and optional resume/CV attachment (`resume_url`).
   - Lifecycle States: `'submitted'`, `'viewed'`, `'shortlisted'`, `'rejected'`.
   - RLS Enforcement: Applicants can view/insert their own applications; recruiters/posters can view applications and update applicant statuses for their own jobs.
   - Realtime Triggers: Database triggers notify the recruiter upon new application submission (`trg_notify_job_application`) and notify the applicant upon status advancement (`trg_notify_application_status`).
3. **Browse UI Overhaul & Anti-Clutter Design (`JobsBrowseScreen.tsx`):**
   - **Spring-Animated Main Tabs:** Single segmented bar with spring-animated sliding pill indicator (`tension: 68, friction: 10, useNativeDriver: true`) switching between `Browse`, `Saved`, and `My Applications`.
   - **Spring-Animated Status Switcher:** Sliding indicator across `Open`, `Closing Soon` (≤ 3 days left), and `Expired`.
   - **Dual Dropdown Filter Row:** Clean horizontal row replacing stacked scrolling bars:
     - Left: `[ Type ∨ ]` opens a native bottom-sheet modal with job types, post counts, and active checkmarks.
     - Right: `[ Dept ∨ ]` opens a native bottom-sheet modal with departments, featuring a "Your Dept" highlight badge.
   - Active filter indicators display accent pills when non-default criteria are active.
   - FAB button `[ + Post Job ]` elevated with theme shadow and colors.
4. **Detailed Job View & Poster Controls (`JobDetailScreen.tsx`):**
   - **Dhaka Countdown:** Deterministic deadline calculation using `localToday()` to avoid UTC midnight shifts.
   - **4-Cell Specs Grid:** Compensation, Workplace Mode, Min Semester, and Referral badges.
   - **Direct Recruiter Contact:** Integrated `ContactSheet.tsx` for 1-tap phone calls, WhatsApp messages, emails, and in-app chat.
   - **Poster Candidate Management Sheet:** Post owners can review applicants, read cover notes, open resumes, and shortlist/reject candidates directly in the screen.
5. **Offline Storage & Caching (`jobsService.ts`):**
   - Bookmarks saved in `@c1_saved_jobs` via `AsyncStorage` with optimistic state toggling.
   - Cache invalidation across create, edit, application, and withdraw operations.
6. **Gemini AI Grounding:**
   - Grounding tool in `supabase/functions/chat/index.ts` allowing the Gemini assistant to provide accurate, live answers for student queries about open internships, tuitions, and deadlines.

---

## 27. Blood Donation Module: UI Architecture, 2-Tab Dual Pane System & Animation Standards

### 27.1 2-Tab Dual Pane Architecture (`AreaPickerModal.tsx`)
- **Removal of "All" Tab:** Replaced the previous 3-tab layout (`All`, `Hospitals`, `Areas`) with an institutional 50/50 dual-tab bar (`Hospitals` vs `Areas`). Eliminates jumbled mixing of institutions and residential neighborhoods.
- **Permanent 0ms Tab Switching Fix (Pre-Mounted Dual Tab Panes):**
  - Both tab lists (`FlatList` for Hospitals and `FlatList` for Areas) remain mounted in memory using Yoga's `display: 'flex'` and `display: 'none'`.
  - Switching between Hospitals and Areas destroys 0 views and creates 0 views. Tab transition is instantaneous ($0.0\text{ ms}$).
  - Preserves scroll positions on both tabs independently (user never loses their place).
- **Precomputed Datasets:** Pre-indexes static data arrays at module load (`STATIC_HOSPITAL_ITEMS_WITH_ALL`, `STATIC_HOSPITAL_ITEMS_NO_ALL`, `STATIC_AREA_ITEMS_WITH_ALL`, `STATIC_AREA_ITEMS_NO_ALL`) to eliminate runtime array allocations.
- **Search System:** When the user types into the search box (`search.trim().length > 0`), the UI switches to a dedicated search `FlatList` matching against precomputed `_searchKey` values in sub-millisecond time.
- **Filter Reset Option:** When `allowAll` is true (in `BloodScreen.tsx`), an `AllOptionRow` ("All Dhaka Locations / সমগ্র ঢাকা") sits at the top of the list allowing students to clear location filters back to all of Dhaka.

### 27.2 Standardized Animation & Spring Physics
- **Universal Damped Spring:** Aligned all sliding indicators across `AreaPickerModal`, `BloodScreen` (`Requests` vs `Donors`), and `BloodRequestScreen` (`Urgency` selector) with the golden critically-damped spring formula:
  ```ts
  tension: 68,
  friction: 10,
  useNativeDriver: true
  ```
  Guarantees smooth glides with zero bouncing or wobble.
- **Zero Bouncy Scales on Buttons:** Removed underdamped spring scale transforms (`friction: 4, tension: 130/140`) on blood group cells. Taps respond instantly with crisp native touch highlights (`activeOpacity: 0.7`), matching Ride Share and Marketplace.

### 27.3 Patient & Clinical Details Redesign (`BloodRequestScreen.tsx`)
- **Decluttering:** Completely removed messy cabin, ward, and bed number text inputs.
- **Card-Style Dropdowns:** Replaced cluttered chip grids with clean dropdown selector cards opening dedicated modal bottom sheets:
  - **Case Reason / Requirement:** Curated categories (*Emergency Surgery*, *Dengue / Low Platelets*, *Road Accident / Trauma*, *Childbirth / C-Section*, *Thalassemia*, *ICU Critical Care*, *Routine / Other*). Automatically switches on platelet mode if Dengue is selected.
  - **Patient Affiliation:** Curated categories (*BUBT Student*, *Faculty / Staff*, *Family Member*, *General Patient*).

### 27.4 Blood Request Card Redesign & Multi-Bag Donor Pledge Architecture (`BloodScreen.tsx` & `BloodRequestDetailScreen.tsx`)
- **Metadata Decomposition (`parseBloodRequestMeta` in `src/utils/blood.ts`):**
  - Parses composite `patient` string (`"${patientName} · ${medicalReason} (${affiliation})"`) into distinct typed fields: `patientName`, `medicalReason`, `affiliation`, `isPlatelet`, and `unitCount`.
  - Cleans up trailing parentheses, supports `[Platelets]` tags, and handles plain patient names gracefully.
  - Added helpers `getMedicalReasonIcon` and `getAffiliationIcon` for standardized clinical iconography.
- **Institutional Visual Hierarchy & Anti-Clutter Layout:**
  - **52×52 Squircle Badge (`RequestBloodBadge`):** Prominently displays blood group (17px extra bold) with micro-label (`BLOOD` or `PLATELETS` in 7.2px bold with single-line clipping guard) and amber glow for platelets or crimson tint for whole blood.
  - **Header Row:** Shows Patient Name (15.5px bold), urgency pill (`Urgent`, `Today`), and integrated subtitle with affiliation (`Family Member`, `BUBT Student`) and relative timestamp (`Posted 31m ago`).
  - **Hospital & Location Line:** Clean typographic line with hospital icon, bold hospital name, and muted area tag, replacing heavy nested gray boxes.
  - **Clinical Chips Row:** Highlights bags needed (`2 Bags Needed` in deep crimson) and medical reason chip (`Emergency Surgery`, `Dengue`, etc.).
  - **Pledge Progress Strip:** Sleek status strip with feather icon indicating bags covered and donor response status.
- **Compact 8-Group Quick-Filter Grid & Unified Scroll Hierarchy:**
  - Modernized the 8-group summary grid into an ultra-compact, sleek 4×2 card layout (`height: 34dp` per tile, 6dp gap, 10dp padding).
  - Each tile displays blood group and count side-by-side (`[ O+  1 ]`, `[ AB+ 1 ]`), with subtle sector crimson tint and border on active/available groups and quiet contrast for zero counts.
  - Sits directly below the emergency action button/status card, preserving full visibility for request cards without forcing them off-screen.
  - **Unified Full-Height Scrolling:** Shifted `actBtn` ("Request Blood") and `myStatusCard` ("Donor Status") along with the 4×2 grid inside the scrollable container (`styles.scroll`). The top fixed area remains slim and stable (`SubBar`, `SegmentedTabs`, and `searchAreaRow`), allowing cards and grid to scroll naturally up beneath the search bar on both Requests and Donors tabs.
- **Multi-Bag Donor Pledge Progression:**
  - Clearly supports multi-bag requests (2 or 3 bags):
  - When `pledge_count === 0`: Shows status banner indicating `X donors needed · No donors pledged yet`.
  - When `pledge_count > 0`: Displays real-time progress banner: `X donors offered help (X/Y bags covered · Z more needed)` with emerald badge if all covered.
  - Other eligible campus donors can continue offering help until the request is fulfilled.
- **High-Visibility Contextual Action Buttons:**
  - **Post Owner:** `Manage Responses (${pledge_count})`.
  - **Pledged Donor:** Solid emerald green button (`Call / WhatsApp Requester`) allowing instant coordination with the patient/family.
  - **Eligible Donor:** Solid crimson button (`I Can Help (${unitsLeft} More Needed)`) with bold white text.
- **Requester Response Management Sheet (`BloodRequestDetailScreen.tsx`):**
  - Requesters can view all responding donors, check 90-day eligibility, tap the phone icon to open `ContactSheet` for 1-tap call/WhatsApp, and confirm donation.

### 27.5 Universal 90-Day Standard & Donor Form Streamlining (`DonorRegisterScreen.tsx`)
- **Removal of Gender / Recovery Interval Confusion:**
  - Completely removed the previous `RECOVERY INTERVAL (WHO STANDARD)` gender toggle and WHO female anemia disclaimer text.
  - Standardized on the universal 90-day (3-month) donation interval across all campus donors.
  - Eliminated local `@donor_gender_${user.id}` device storage; simplified `donorEligibility` and `scheduleRechargedReminder` to zero-config defaults.
- **Visual Polish & Institutional Card Refinements:**
  - Replaced awkward `{group} Donors` title on registered profiles with clean `Blood Group: {group}` accompanied by the green `Verified` badge.
  - Replaced the raw text box and tiny red link with a full-width tappable **Living Area Selector Card** opening `AreaPickerModal` with 152 Dhaka areas and instant search.
  - Added quick-action date helper pills (`Today` and `Clear`) for the optional Last Donated date field.

---

## 28. Home Screen Ergonomics, Status Strips & Shortcut Customization Architecture

### 28.1 Status Strips Sizing & Institutional Presence (`HomeStatusStrips.tsx`)
- **Explore Card Parity:** Scaled the four live glance strips (**Reports**, **Bus**, **Prayer**, and **Blood**) from their previous compact slim bars (`paddingVertical: 9`, `borderRadius: 8`) to full-height cards (`paddingVertical: 13`, `paddingHorizontal: 12`, `borderRadius: 16`, `gap: 10`).
- **Typography & Metric Readability:**
  - Left title pill widened to 88dp with 14.5px extra bold text and 14px Feather chevrons.
  - Live metric numerals enlarged to 16.5px extra bold with 20px line height (`metricValText` to 13.5px).
  - Subtitles raised to 10.5px medium with clear 2.5px margins.
  - Vertical dividers elongated from 24dp to 30dp.
  - Transit and Azan progress tracks widened to 48dp with 4dp height.

### 28.2 User-Configurable Quick Shortcuts (`HomeFrequentTools.tsx`)
- **Customizable 4-Shortcut Grid:** Students can personalize which 4 features appear in the "Frequently Used" row instead of being locked to static defaults.
- **Campus Feature Catalog (`ALL_TOOLS`):** Supports selection from 19 campus features including Study Hub, Routines, Cover Page, CGPA Calc, Bus, Prayer, Blood, Marketplace, Campus Rides, Lost & Found, Clubs, Events, Announcements, Student Jobs, Student Directory, Faculty, Academic Calendar, PDF Maker, and Issue Reports.
- **Customization Modal Sheet:**
  - Header displays live selection counter badge (`4/4` in emerald when complete, warning pill when incomplete).
  - Tap-to-select grid with color-coded sector icon tiles, active tinted background, colored outline, and numerical selection badges (1 through 4).
  - Auto-replace convenience: tapping a new item when 4 are already selected replaces the 4th item smoothly without requiring manual deselect first.
  - "Reset Defaults" restores the baseline Study Hub, Routines, Cover Page, and CGPA Calc shortcuts.
- **Local Persistence:** Selections are cached per-user in `AsyncStorage` via `@campusone_frequent_tools_${userId}` and load instantly on mount with zero flicker.

### 28.3 Community Updates Segmented Switcher Polish (`HomeCommunityUpdates.tsx`)
- **Touch Target & Height:** Enlarged the segmented filter tab switcher (`All`, `Notices`, `Clubs`, `Events`) from ~36dp to standard 48dp ergonomics (`paddingVertical: 10`, `borderRadius: 16`, `padding: 4`, `TRACK_PADDING = 4`).
- **Tactile Scale:** Feather tab icons increased from 12px to 13.5px, label typography from 12px to 13px bold, and count badges expanded with comfortable horizontal padding (`paddingHorizontal: 6`, `minWidth: 19`).

---

## 29. Codebase Audit, Security Hardening & Zero-Bloat Optimization

An exhaustive multi-agent audit spanning Security/SecOps, Logic/QA, and Performance/UI identified and remediated 42 issues across three tiers:

### 29.1 Tier 1: Critical Security, Storage & Edge Function Hardening
- **Edge Function Fail-Closed Verification (`send-push`):** Hardened against missing service account secrets or project configurations, returning 500 fail-closed immediately. Enforced internal authorization verification to block unauthorized direct HTTP triggers.
- **Private Storage Bucket RLS (`job-circulars`):** Created policy `job-circulars: applicant or poster resume read` restricting read access for uploaded applicant resumes (`resumes/{user_id}/*`) strictly to the applicant, admins, and the verified poster of the job applied to (`job_applications.student_id` & `jobs.posted_by`).
- **Encrypted Session Profile Caching (`authStore.ts`):** Replaced unencrypted `AsyncStorage` caching of active user profiles with hardware-backed `SecureStore` (`c1_profile_${uid}`). Cached profiles are loaded synchronously at boot to prevent UI flashes while maintaining zero cleartext exposure on-disk.
- **Mutation Error Feedback:** Audited all Supabase JS v2 mutations across all screens (`StudyUploadScreen`, `RidesScreen`, `ListingFormScreen`, `MarketplaceScreen`, `BloodRequestScreen`, `JobDetailScreen`) to ensure every `error` response is caught and reported to users via toast rather than failing silently.

### 29.2 Tier 2: Database Policies, Synchronization, Dhaka Time & List Virtualization
- **Attributive Spoofing Prevention:** Locked down `study_materials` and `study_question_bank` inserts via migration `20261017000000_tier2_security_hardening.sql` requiring `uploaded_by = auth.uid()` and verified section membership.
- **Privacy-Preserving Contact Reveal (`ride_contact`):** Hardened `ride_contact` RPC to honor `profiles.show_whatsapp` preferences across both offering drivers and requesting passengers, while allowing resolution by both ride code and ride UUID.
- **Public RPC Probe Prevention:** Revoked `anon` execute permissions on `email_is_registered(text)` to eliminate unauthenticated email enumeration vectors.
- **Dhaka Time UTC+6 Alignment:** Replaced all remaining raw `new Date().toISOString().split('T')[0]` calls across screens and services with `localToday()` from `src/utils/format.ts`.
- **List Virtualization & Memory Efficiency:** Added optimal windowing (`initialNumToRender: 8-10`, `maxToRenderPerBatch: 10`, `windowSize: 5`, `removeClippedSubviews: true`) across heavy lists including Marketplace, Study Hub, Blood Directory, Faculty, and Student Jobs.
- **Inverted FlatList Empty States:** Replaced all inverted `ListEmptyComponent` instances with standalone non-inverted empty state views to eliminate upside-down rendering bugs on Fabric architecture.

### 29.3 Tier 3: UI Tokens, Typography & Async Lifecycle Guards
- **Strict Theme Token Adherence:** Eliminated hardcoded hex color values across screens, standardizing on semantic `C.*` and `SectorColors.*` tokens.
- **Copy Typography Compliance:** Removed all forbidden em-dashes (`—`) in user-visible UI copy across screens, replacing them with `-` or `,`.
- **Async Component Lifecycle Protection:** Added unmounted-state guards and cleanup returns across asynchronous fetching hooks and realtime channel subscriptions to eliminate unmounted state update memory warnings.

---

## 30. Faculty 360 Architecture: Live Automated Sync, Office Locator & Research Mentor Discovery

The Faculty directory is modernized into an institutional tool providing automated freshness, campus office wayfinding, live consultation tracking, and research paper mentorship discovery.

### 30.1 Live Cloud Crawler & Automated Schedule (`sync-faculty` Edge Function & `pg_cron`)
- **Automated Web Crawler:** Cloud Edge Function `supabase/functions/sync-faculty/index.ts` extracts `window.academicHierarchy` from `bubt.edu.bd`, systematically traversing all 13 BUBT academic departments.
- **Roster & Metadata Extraction:** Parses official teacher routine initial codes (`/profile/{code}`), high-resolution portraits, academic designations, official emails, room locations, blood groups, and Scopus profile URLs.
- **SSL Resilience:** Gracefully handles legacy department subdomains (e.g. `cse.bubt.edu.bd`) without failing the overall crawl.
- **Audit Logging (`faculty_sync_logs`):** Each crawl logs start time, completion duration, total scanned count, new additions, rank promotions, and photo updates.
- **Cron Scheduling:** Automated monthly sync scheduled via `pg_cron` (`20261018010000_faculty_sync_cron.sql`) at 03:00 AM Dhaka time (21:00 UTC) on the 1st of every month.
- **Admin In-App Trigger:** 1-tap manual sync button on `ManageFacultyScreen.tsx` with live progress modal and detailed diff report.

### 30.2 Database Schema Enhancements (`20261018000000_faculty_360_enhancements.sql`)
- **Columns Added to `faculty`:**
  - `short_code` (TEXT): Official teacher routine initial code (e.g. `DALM`, `SR`, `SAM`).
  - `room_number` (TEXT): Faculty room number (e.g. `402`, `601`).
  - `building` (TEXT): Campus building (e.g. `Building 2`, `Building 1`).
  - `floor` (TEXT): Campus floor (e.g. `4th Floor`, `6th Floor`).
  - `counseling_hours` (TEXT): Formatted schedule slots (e.g. `Sun 10:00 AM - 11:30 AM | Tue 02:00 PM - 03:30 PM`).
  - `blood_group` (TEXT): Emergency blood group.
  - `scopus_url` (TEXT): Scopus author profile link.
  - `is_accepting_research` (BOOLEAN): Flag indicating faculty openness to student research paper guidance.

### 30.3 Campus Office Locator & Routine Initial Search
- **Routine Initial Search:** Search bars in `FacultyScreen.tsx`, `FacultyDeptScreen.tsx`, and `ManageFacultyScreen.tsx` match routine initial codes, enabling students to instantly look up teacher details directly from their class routine sheet.
- **Campus Office Card:** `FacultyProfileScreen.tsx` highlights building, room number, and floor with a 1-tap copy button for fast wayfinding.

### 30.4 Real-Time Counseling Hours Tracker (Dhaka UTC+6)
- **Live Status Calculation (`getCounselingStatus` in `facultyShared.tsx`):** Parses weekly slots against Dhaka local time (UTC+6).
- **Presence Indicators:**
  - Active counseling: Emerald badge (`Counseling now (Xm left)` / `Counseling available now`) with avatar presence indicator dot.
  - Upcoming today: Informational blue badge (`Counseling today at X:XX AM/PM`).
  - Scheduled slots: Clean list view with calendar icons on `FacultyProfileScreen.tsx`.

### 30.5 Research Paper Mentorship & Co-Author Discovery
- **Varsity Context:** BUBT centrally assigns Capstone/Thesis supervisors, but students independently seek faculty co-authors and mentors for research paper publishing, IEEE conferences, and journal submissions.
- **Research Mentors Tab:** Segmented filter isolating faculty members open to paper publication guidance (`is_accepting_research = true`), with publication domain chips.
- **Draft Paper Proposal Modal:** Formats a structured academic email populated with student name, intake, and section from the caller's CampusOne profile, launching the native email client with subject and body pre-filled.

### 30.6 Design System & Institutional Standards
- **High-Density Institutional Cards (`FacultyCard` & `TeacherBar`):** Displays avatar, presence dot, initial code badge, designation, office location, counseling status pill, research pills, and direct `ContactSheet` launcher.
- **Bilingual Internationalization:** Full translation key parity in `src/i18n/en.ts` and `src/i18n/bn.ts` (`faculty2` and `manage` namespaces).

### 30.7 Faculty Categories Drilling Hierarchy (`FacultyScreen.tsx` & `FacultyDeptScreen.tsx`)
- **Level 1 (Faculty Categories):** Full-width bars representing the 5 official BUBT Faculties:
  - *Faculty of Engineering & Applied Sciences* (`cpu`, CSE, EEE, Civil, Textile, Data Science)
  - *Faculty of Business* (`briefcase`, Management, Accounting, Marketing, Finance)
  - *Faculty of Arts & Humanities* (`book-open`, English)
  - *Faculty of Social Sciences* (`globe`, Economics, Mathematics & Statistics)
  - *Faculty of Law* (`shield`, Law & Justice)
- **Level 2 (Department Listing):** Drilling into a faculty category reveals its constituent departments as full-width bars.
- **Hardware & Gesture Back Navigation:** Android `BackHandler` and `SubBar` back action automatically pop the drilled category view (`setSelectedCategory(null)`) returning to the 5 Faculty Categories list instead of exiting the screen. Redundant in-screen back buttons removed.
- **Level 3 (Department Roster):** `FacultyDeptScreen.tsx` renders faculty members as compact `TeacherBar`s. Tapping opens `FacultyProfileScreen.tsx` for full dossier, contact options, and counseling schedules.

### 30.8 Dropdown Selector Bars, Bottom Sheet Bars & Tab Performance
- **Dropdown Selector Bars:** Full-width institutional selector bars for Department and Publication Domain in both *Research Mentors* and *My Teachers* tabs.
- **Modal Bar Layout:** Inside both *Select Department* and *Select Publication Domain* bottom sheets, items are rendered as distinct, rounded bars (`styles.pickerBar`) with icon tiles, bold titles, subtitle counts, and checkmark indicators (replacing flat list rows).
- **Tab Switching Zero-Lag Windowing:** Renders an initial slice of 25 mentors (`INITIAL_RENDER_LIMIT = 25`) with a "Show more" button, and decouples research domain aggregation from active mode. Tab switching runs at 60fps without JS thread frame drops.
- **Header App Logo:** SubBar top app bar right slot uses the official `<LogoMark size={28} shadow={false} />` (star icon removed).

---

## 31. Announcements 360: Automated BUBT Notice Sync, In-App PDF Reader & Department Targeting

The Campus Announcements architecture is transformed from a manual posting board into an automated, real-time varsity circulars intelligence engine.

### 31.1 Automated BUBT Crawler & Sync Engine (`sync-notices` & `pg_cron`)
- **Direct Website Ingestion:** Cloud Edge Function `supabase/functions/sync-notices/index.ts` fetches `https://www.bubt.edu.bd/notice`, extracting the server-embedded `notices: [...]` array (1,500+ circular archive) via regex parsing.
- **Attachment & Archive Resolution:**
  - Modern PDFs (`.pdf`): saved to `attachment_url` pointing directly to BUBT's public CDN (`https://www.bubt.edu.bd/storage/notices/...`). Zero Supabase storage usage.
  - Historical BUBT Circulars (`notice_document` field): 838+ notices host their PDF under `https://www.bubt.edu.bd/uploads/{notice_document}`. Automatically detected and resolved.
  - Image posters (`.jpg`, `.png`): extracted from `file`, `notice_document`, or description HTML and saved to `image_url` for inline flyer presentation.
- **High-Performance Chunked Upsert:** Evaluates batch codes in a single query and upserts in chunks of 50, crawling 300+ notices in ~1.5 seconds without function timeouts. Supports `x-deep-crawl` header for deep archives (up to 600+ items).
- **Intelligent Classification:** Title analysis automatically categorizes viva schedules, exam routines, and admit cards into `Exam related` (`exam-related`) with `Important` priority, and holiday/vacation notices into `Offday` with `Urgent` priority and pinned status.
- **Deduplication:** Notices use deterministic codes (`BUBT-N-${id}`). Sync operations perform upserts on conflict, preventing duplicates.
- **Automated Cron Schedule:** Migration `20261019010000_notices_sync_cron.sql` schedules automated sync via `pg_cron` and `pg_net` every 30 minutes between 02:00 and 16:00 UTC (08:00 AM to 10:00 PM Dhaka time).
- **In-App Triggers:** Manual sync on SubBar header triggers immediate refresh; authenticated users are gated with a 2-minute throttle to prevent server spam.

### 31.2 Database Schema & Targeting (`20261019000000_announcements_360_sync.sql`)
- **Columns on `announcements`:**
  - `source`: `'bubt_official'` vs `'manual'`.
  - `category`: BUBT notice category name (`Exam related`, `Offday`, `Semester`, `Class Related`, `General`, `Tender`).
  - `category_slug`: Category slug for filtering.
  - `department_code`: Target department (`CSE`, `EEE`, `Civil`, `Textile`, `BBA`, `Law`, `ENG`, `ECON`, `EXAM`, `REG`, `ALL`).
  - `external_id`: Original BUBT notice ID.
  - `external_url`: Deep link to BUBT website notice details (`https://www.bubt.edu.bd/notice/details/{slug}`).
- **Bookmarking Join Table (`announcement_bookmarks`):**
  - Allows students to pin/save circulars (such as exam routines and payment schedules) for offline access.
  - Protected with user-scoped RLS policies (`user_id = auth.uid()`).
- **Audit Logging (`notice_sync_logs`):**
  - Tracks every automated crawler run, recording duration, status, total scanned, new additions, and update counts.
- **Department-Targeted Push Notifications:**
  - Enhanced trigger function `notify_new_announcement()` routes notifications based on scope:
    - University-wide notices (holidays, exam routines, rules) -> alerts all student profiles.
    - Department-specific notices (e.g. CSE project defense or Civil lab notice) -> targets only students in matching departments (`profiles.department`), eliminating notification fatigue.

### 31.3 UI/UX Design System & Feed Architecture (`AnnouncementsScreen.tsx` & `AnnouncementDetailScreen.tsx`)
- **3-Segment Animated Switcher:** `All`, `Urgent`, and `Saved` tabs featuring the identical native spring sliding indicator as `HomeCommunityUpdates.tsx` (`innerTrackWidth / 3`, `tension: 68`, `friction: 10`), dynamic badge counters, and font auto-scaling (`adjustsFontSizeToFit`, `minimumFontScale: 0.85`) to guarantee no text spills outside on mobile screens.
- **Dual Dropdown Selectors with Distinct Bar Sheets:** Category and Department dropdown buttons on the main screen open modal bottom sheets where options are styled as distinct, rounded bars (`pickerBar`) with icon squircles, bold titles, and checkmark indicators.
- **Synchronized Scoped Counts:** Tab badge counters are derived dynamically from the active department and category scope, ensuring badge counts and list results are always 100% consistent.
- **Varsity-Wide Notice Preservation:** Department filtering (such as Economics or CSE) preserves university-wide notices (`ALL`, Controller of Examinations, Registrar) so students never miss general mid-term/final routines or holiday closures.
- **Institutional Official Link Bar:** Prominent circular card bar on `AnnouncementDetailScreen` with an official BUBT globe squircle, verified green portal badge (`BUBT OFFICIAL PORTAL`), title, and direct external navigation.
- **In-App PDF Viewer Modal:** Uses `react-native-webview` with `scalesPageToFit={false}`, responsive mobile viewport injection, removal of Google Docs' dark letterbox margins and toolstrip, `#f8fafc` background, and centered document pages.
- **Pinch-to-Zoom Flyer Viewer:** `resolveNoticeImage` supports local banner mappings, remote CDNs, `uploads/`, and BUBT storage paths. Uses explicit window dimensions (`winWidth`, `winHeight * 0.78`) to prevent height collapse inside Android's `ScrollView`.
- **Home Community Feed Realtime Sync:** `HomeCommunityUpdates.tsx` orders announcements chronologically by `created_at desc` with increased limit (25) and automated cache refresh, keeping community news live and up-to-date.
- **Bilingual Support:** Complete localization parity in `src/i18n/en.ts` and `src/i18n/bn.ts` under the `announce2` namespace.

### 31.4 Performance Hardening, Edge-to-Edge PDF Viewer & Security Architecture
- **60 FPS Virtualized List & Stable Memoization (`AnnouncementsScreen.tsx`):**
  - Replaced un-virtualized `<ScrollView>` with an optimized `<FlatList>` (`initialNumToRender: 8`, `maxToRenderPerBatch: 10`, `windowSize: 7`, `removeClippedSubviews: Platform.OS === 'android'`).
  - Wrapped `AnnouncementCard` in `React.memo` and stabilized row callbacks (`handleToggleSave`, `deleteAnnouncement`, `handlePressCard`, `renderCard`) via `useCallback` to prevent cascading re-renders during live search filtering and tab changes.
  - Configured `keyboardDismissMode="on-drag"` and `keyboardShouldPersistTaps="handled"` so keyboard dismissals never swallow card selections.
  - Separated modal bottom sheet containers from outer `<Pressable>` backdrops using `StyleSheet.absoluteFill` to eliminate accidental sheet dismissals when tapping whitespace.
- **Edge-to-Edge PDF Rendering & Pinch-to-Pan Usability (`AnnouncementDetailScreen.tsx`):**
  - Injected aggressive full-width CSS (`width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 0 10px 0 !important;`) eliminating dark side letterbox voids and matching Chrome on Android.
  - Enabled horizontal panning during pinch-to-zoom (`overflow-x: auto !important;`) so wide exam routines and tabular schedules can be panned across columns.
  - Conditionally mounts `<WebView>` only when the PDF modal is active (`pdfModalVisible && googleDocsPdfViewer`), eliminating background network fetching and DOM polling when not viewing PDFs.
  - Themed loader background dynamically (`{ backgroundColor: C.bg }`) to prevent dark mode white flashes.
- **Home Community Hub 3-Segment Switcher (`HomeCommunityUpdates.tsx`):**
  - Removed legacy `All` tab to feature 3 focused segments: **`Notices`**, **`Clubs`**, and **`Events`**, defaulting to `Notices` so students see active circulars on launch.
  - Synchronized tab badge pills using `pillBg()` helper to ensure notice/club/event badges maintain color harmony.
  - Enforced minimum 44dp touch target heights (`minHeight: 44`) on segmented tab buttons and footer navigation actions.
- **Humanized Notice Metadata & Clean Badges:**
  - Removed cryptic developer acronyms (`REG`) and internal database flags (`Pinned`).
  - Converted technical database slug `offday` into a humanized **`Official Holiday`** badge with warm amber/orange styling (`#ea580c`) and sun icon.
  - Guarded universal notice inclusion (`deptFilter !== 'EXAM' && deptFilter !== 'REG'`) so administrative office filters only return circulars for the selected office.
- **Edge Function Security & Throttle Enforcement (`supabase/functions/sync-notices/index.ts`):**
  - Enforces mandatory caller authentication: verifies either the database cron secret (`app_config.sync_secret`) or valid authenticated user JWT (`supabase.auth.getUser`).
  - Rejects unauthorized invocations with 401 Unauthorized.
  - Enforces 90-second cooldown throttle; only administrative users (`profile.role === 'admin'`) or verified cron jobs can force bypass.

---

## 32. Events 360 & Automated BUBT Event Sync Architecture

### 32.1 Automated BUBT Official Event Crawler (`sync-events`)
- **Portal Endpoint:** `https://www.bubt.edu.bd/news` serves as BUBT's primary public event hub for academic research weeks, club committee meetings, conferences, seminars, farewell receptions, and sports tournaments.
- **Engine Execution:** Supabase Edge Function `sync-events` parses event articles, extracting high-resolution promotional flyers from `https://www.bubt.edu.bd/storage/news/...`, titles, dates, descriptions, and article URLs.
- **Auto-Categorization:** Maps keywords to standard campus categories: `Academic`, `Cultural`, `Sports`, `Club`, or `Career`.
- **Club Linking:** Automatically scans event text against BUBT's 16 active clubs, linking `events.club_id` to the matching club in the `clubs` table.
- **Cron Scheduling:** Migration `20261020010000_events_sync_cron.sql` configures `auto-sync-bubt-events` to run every 30 minutes between 02:00 and 16:00 UTC (08:00 AM to 10:00 PM Dhaka time).
- **Audit Logging:** Every sync run is logged in `event_sync_logs` with duration, total scanned, new additions, and error tracking.

### 32.2 4-Tier Real-Time Status & Dhaka Time Engine (`eventsService.ts`)
- **Real-Time Statuses:**
  - `Ongoing` (Live / In Progress): Displays green pulsing badge when current time is between event start and end time.
  - `Today`: Amber badge showing countdown (e.g. `Starts in 2h`).
  - `Upcoming`: Blue badge indicating days until event (e.g. `Tomorrow`, `In 3 days`).
  - `Ended`: Slate badge for completed campus programs.
- **Calculation Precision:** Uses `Asia/Dhaka` timezone date/time conversions to ensure midnight transitions match Bangladesh Standard Time (UTC+6).

### 32.3 Digital BUBT Event Pass & Student Utilities
- **Personalized Entry Pass:** Modal on `EventDetailScreen` generates a varsity-branded admission ticket featuring Student Name, Student ID, Intake, Event Title, Date, Venue, and verifiable QR token (`PASS-EVT-***-***`) for door check-in at BUBT Auditorium or Hall.
- **One-Tap Event Bookmarks:** Backed by `event_bookmarks` table and atomic `toggle_event_bookmark(p_event_id)` RPC with instant optimistic updates and dedicated "Saved" tab on `EventsBrowseScreen`.
- **Flyer Poster Integration:** Full cover image resolution for both synced news flyers and mobile-uploaded posters via `BUCKETS.photos` (`events/{user_id}/*`).
- **Native Sharing:** One-tap OS share sheet formatting campus event title, schedule, venue, and official link.
### 32.4 Universal Banner Resolver, Resilient Fallbacks & Dhaka Time Integrity
- **Universal Banner Resolver (`resolveBannerSource`):** Supports bundled local varsity assets (`hackathon-2026.jpg`, `blood-drive.jpg`, etc.), remote web URLs (`http://`, `https://`), relative web seed paths (`https://campus-theta.vercel.app/*`), BUBT storage paths (`storage/*`, `notices/*`), and upload paths (`uploads/*`). Handles null/undefined inputs seamlessly with resilient category fallback headers on load failure.
- **Strict Dhaka Time Date Arithmetic:** Event presets calculate dates via `Date.UTC` arithmetic on `localToday()`, preventing UTC midnight off-by-one errors.
- **Soft-Delete Filtering:** Home community feed query enforces `.is('deleted_at', null)` to strictly hide removed events.

---

## 33. BUBT Medical Unit 360 & Campus Health Architecture

### 33.1 Official BUBT Facility & Campus Context
- **Official Identity:** Managed under BUBT's **Health & Community Development** department (**BUBT Medical Unit**).
- **Location:** **Room No. 205, 1st Floor, Building 3**, BUBT Main Campus (Rupnagar, Mirpur-2, Dhaka-1216).
- **Direct Contact:** Intercom **Ext. 112** (`+8801741129235`) · Official Email: `medical@bubt.edu.bd` · Counseling Email: `moujuliet@bubt.edu.bd`.
- **Operating Hours:** Sunday to Thursday, 9:00 AM – 5:00 PM (Closed Fridays & Saturdays).
- **Walk-in Triage Policy:** All consultations, vital sign checks, and basic dispensary medicines are completely free of charge upon presenting a valid BUBT Student or Employee ID card.

### 33.2 Database Schema Enhancements & Official Roster
- **Migration `20261021000000_bubt_medical_unit_enhancements.sql`:**
  - Added `qualifications`, `phone`, `email`, `role_type` (`'doctor'`, `'psychologist'`, `'nurse'`, `'staff'`), `is_on_leave`, and `leave_note` to `public.doctors`.
- **Authentic BUBT Personnel:**
  - **Dr. Nurun Nabi Md Mustafa Kamal** — Senior Medical Officer (`MBBS`)
  - **Dr. Ekra Binte Musa** — Medical Officer (`MBBS`)
  - **Mou Juliet Rebeiro** — Campus Psychologist (`M.Sc in Psychology · Mental Health & Well-being`)
  - **Room 205 Nursing & Triage Desk** — Nursing Staff (`Smriti Akter / Nasima Khatun`)
  - Visiting consultant doctors (`d1`–`d6`) retain specialized clinic hours with credentials and intercom extensions.

### 33.3 3-Tab Medical Hub (`MedicalScreen.tsx` & `DoctorDetailScreen.tsx`)
- **Universal `SegmentedTabs`:**
  1. **Doctors & Staff (`staff`):** Real-time search across names, specialties, rooms, and qualifications; filter chips (`All`, `Doctors`, `Mental Health`, `On Duty Today`); smart duty status engine calculating `on_duty` (with live countdown e.g. `Ends in 1h 25m`), `starting_soon`, `off_duty`, and `on_leave` (with custom absence note).
  2. **Clinic Services & Dispensary (`services`):** Documents 8 core on-campus medical capabilities (Doctor Consultation, Mental Health Counseling, Vitals Monitoring, Blood Glucose Screening, Emergency First Aid, Asthma Nebulization, Wound Dressing, Wheelchair/Stretcher Support) and 7 free over-the-counter dispensary medicines (Paracetamol, ORS, Antacids/Omeprazole, Antihistamines, Antispasmodics, Burn Cream, Povidone-Iodine).
  3. **Emergency & Nearby Hospitals (`emergency`):** 1-tap rapid dialers for BUBT Medical Desk (Ext. 112), National Emergency (`999`), and Campus Security; curated directory of 5 nearby Mirpur 24/7 hospitals (National Heart Foundation, Delta Medical College, Mirpur General, Kidney Foundation, Dhaka Dental College) with distances, hotlines, and Google Maps navigation links.

### 33.4 Mental Health, Admin Controls & Ecosystem Sync
- **Confidential Psychological Support:** Dedicated highlight card on `DoctorDetailScreen` for Campus Psychologist **Mou Juliet Rebeiro** with a 1-tap `Request Confidential Session` mailto action.
- **In-App Admin Management:** Added `manageMedicalCenter` tile to `AdminDashboardScreen` and an inline admin quick-edit modal on `MedicalScreen` to toggle `is_on_leave`, set leave notes, and update room locations.
- **`CampusToday` Live Widget:** Displays the currently on-duty doctor or `"BUBT Medical Unit Open · Room 205, Bldg 3"` on the Home feed during operating hours.

---

## 34. BUBT Campus Shuttle Bus 360 & Transit Architecture

### 34.1 Official BUBT Transport Intelligence & Campus Context
- **Fleet Launch:** Dedicated institutional shuttle bus service officially launched on **July 8, 2025**, inaugurated by Vice-Chancellor Prof. Dr. A B M Shawkat Ali and BUBT Trust.
- **Service Policy:** **100% Free** campus transportation for registered students, faculty, and administrative staff. Boarding strictly requires presenting a valid physical **BUBT Student ID Card**.
- **Core Corridors:**
  - `BR-07` (Uttara Line): Uttara House Building, Airport, Khilkhet, Mirpur-14, Mirpur-12, BUBT Campus (`BUBT-07`, Helper: Md. Jasim `+8801712554477`).
  - `BR-03` (Mirpur Line): Mirpur-1, Mirpur-2, Mirpur-10, Mirpur-11, Rupnagar, BUBT Campus (`BUBT-03`, Helper: Sohel Rana `+8801813220099`).
  - `BR-05` (Dhanmondi Line): Dhanmondi 27, Shyamoli, Gabtoli, Technical, Mirpur-1, BUBT Campus (`BUBT-05`, Helper: Abdul Karim `+8801911778822`).
  - `BR-09` (Mohammadpur Line): Mohammadpur Bus Stand, Shyamoli Square, Kallyanpur, Mirpur-1, Rupnagar, BUBT Campus (`BUBT-09`, Helper: Rasel Ahmed `+8801677334411`).
  - `BR-02` (Gulshan Line): Gulshan-1, Mohakhali, Bijoy Sarani, Agargaon, Mirpur-10, BUBT Campus (`BUBT-02`, Helper: Tanvir Hossain `+8801556990011`).
  - `BR-11` (Savar Line): Savar Bazar, Hemayetpur, Amin Bazar, Gabtoli, Technical, BUBT Campus (`BUBT-11`, Helper: Mizanur Rahman `+8801722446688`).
- **Schedule & Operations:** Runs Saturday to Wednesday (with adjusted shifts during Midterm/Final exam routines). Regular service is suspended on Fridays & Government Holidays.
- **Metro Rail Connectivity:** Permanent campus in Rupnagar, Mirpur-2 is centrally accessible via **MRT Line-6** through **Pallabi Metro Station** (1.2 km, 5 min rickshaw ~30 BDT) and **Mirpur-11 Metro Station** (1.4 km).
- **Transport Desk Support:** Direct line to the BUBT One Stop Service / Transport Division at `01810033740` (`medical@bubt.edu.bd` / `02-4803-6351`).

### 34.2 Database Schema & Remote Supabase Migration
- **Migration `20261022000000_bus_schedule_enhancements.sql`:**
  - Granted `SELECT` on `public.bus_routes` to `anon` and `authenticated`, enabling guest/unauthenticated students to read route details, helper phone numbers, and timetable schedules without 42501 permission errors.
  - Added RLS policy `bus_routes_anon_select` (`active = true`).
  - Upserted accurate records for all 6 active BUBT shuttle lines with complete stop lists, leg intervals (`leg_mins`), to-campus morning departures, and from-campus afternoon departures.

### 34.3 Mobile UI/UX & Design System Integration (`BusScreen.tsx` & `BusDetailScreen.tsx`)
- **Universal 58dp Standard:**
  - **Direction Switcher:** 58dp `SegmentedTabs` (`To Campus` | `From Campus`) with native spring indicator animation. Auto-selects direction by Dhaka local hour (<12:00 -> *To Campus*, >=12:00 -> *From Campus*).
  - **Search Bar:** 58dp fixed height (`height: 58`, `borderRadius: 16`, `borderWidth: 1`, `paddingHorizontal: 16`), searching route title, area, bus number, and all intermediate stops with visual *"Stops at [Stop Name]"* matching badge.
  - **Admin Route Editor Modal:** Sheet inputs and primary submit button standardized to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`, wrapped in `KeyboardAvoidingView behavior="padding"`.
- **Live Upcoming Departure Hero Card:**
  - Prominent transit card calculating the soonest departure across user's bookmarked routes (falling back to all routes) for the selected direction.
  - Displays dynamic countdown pill (`in 15m` / `Tomorrow`), formatted clock departure, origin stop, and bus registration.
- **Stop-by-Stop Calculated Clock Timetable (`BusDetailScreen.tsx`):**
  - Interactive departure trip selector pills (`Trip 1: 06:45 AM`, `Trip 2: 07:30 AM`).
  - Calculates and renders the exact projected arrival clock time at every individual stop along the route using `toMinutes()` + cumulative `leg_mins` offsets (e.g., `06:45 AM` Uttara -> `07:00 AM` Airport -> `07:15 AM` Khilkhet -> `07:35 AM` Mirpur-14 -> `07:50 AM` BUBT Campus).
- **Route In-Charge & Helper Contact Card:**
  - Displays helper name, bus registration number, and verified contact number.
  - 1-tap Phone Call action (`Linking.openURL('tel:...')`).
  - 1-tap WhatsApp action (`Linking.openURL('https://wa.me/...')` with automatic `+880` formatting).
- **Cross-Feature Synergies:**
  - Fallback button: *"Missed the bus? Check student campus rides"* linking to `RidesScreen`.
  - Recovery button: *"Left an item on the bus? Check Lost & Found"* linking to `LostFoundBrowseScreen`.
- **Home Screen Widget Parity (`HomeStatusStrips.tsx`):**
  - Updated `bus_routes` query to select both `to_departures` and `from_departures`.
  - Automatically transitions at 12:00 PM Dhaka time to calculate and display afternoon departures leaving campus, eliminating the bug where morning departures showed "Tomorrow" during the afternoon commute.

---

## 35. Automated BUBT Notice Synchronization & Faculty Directory Crawler

### 35.1 Official Notice Synchronization Engine (`sync-notices`)
- **Root Cause & Architectural Fix:**
  - Notice 1634 ("Notice on Rescheduling of Classes Suspended on October 22, 2026") and 40 preceding circulars were previously failing to sync due to a PostgREST key-mismatch error: `PGRST102 (All object keys must match)`.
  - The upsert array conditionally included `id` only for pre-existing records (`...(existing?.id ? { id: existing.id } : {})`), violating PostgREST's requirement that all objects in a batch payload have identical key sets.
  - **The Fix:** Eliminated `id` from the upsert payload completely. Upserts now rely purely on the Postgres conflict target `onConflict: 'code'`, allowing PostgreSQL to auto-generate UUIDs for new records and update existing records smoothly.
  - **Uniform Payload Contract:** Normalized all optional fields (`department`, `department_code`, `attachment_url`, `attachment_name`, `image_url`, `external_url`, `external_id`) to explicit `null` defaults instead of `undefined`.
  - **Batch Chunking & Row-by-Row Fallback:** Upserts in chunks of 50 with automatic individual row-level fallback upon chunk rejection so a single malformed row cannot prevent other notices from saving.
  - **Live Verification:** Edge Function successfully verified in production, syncing 300 scanned notices, adding 41 new notices, and updating 259 notices in under 8 seconds. Notice 1634 (`BUBT-N-1634`) confirmed in `public.announcements`.

### 35.2 Scalable Faculty Directory Crawler & Routine Short-Code Engine (`sync-faculty`)
- **Root Cause & Architectural Fix:**
  - 81% of faculty records (339 teachers) were previously missing their routine short codes (`short_code`), causing timetable lookups and search-by-initial to fail.
  - Missing new faculty onboarding (e.g., Shaila Shaznin `SSN` in CSE).
  - Previous crawler ran into an N+1 synchronous database waterfall (making >800 individual HTTP queries sequentially), hitting the Edge Function execution timeout after ~35 seconds and aborting after scanning only 78 teachers.
  - **The Fix (In-Memory Set Diffing):** Pre-fetches all existing faculty records and department IDs into memory maps (`byDeptAndExact`, `byDeptAndNorm`, `byShortCode`, `byNormOnly`).
  - **Full Department Coverage:** Crawls all 13 active BUBT department rosters in parallel/batches, extracting routine short codes directly from profile URLs (`/faculty/profile/([A-Z0-9_-]+)`).
  - **High Performance Batch Execution:** Collects `rowsToInsert` and `rowsToUpdate` and executes in 50-row chunks via `insert()` and `upsert(..., { onConflict: 'id' })`. Complete sync of 405 teachers across all 13 departments now finishes in ~16 seconds (down from timeout).
  - **Automated New Teacher Discovery:** Successfully detected and onboarded new teachers including **Shaila Shaznin** (`SSN`, Lecturer, Dept of CSE) with photo, profile URL, and routine initial.
  - **Live Verification:** 403 out of 476 faculty members now have verified short codes populated in `public.faculty`.

### 35.3 Modern Canonical BUBT Profile Link Architecture
- **Elimination of Broken Subdomains & 404s:**
  - 107 legacy CSE profile links pointed to the dead server `https://cse.bubt.edu.bd/facultydetails/<id>/` (503 Service Unavailable / expired SSL).
  - 312 other links pointed to old numeric patterns (`/department/<num>/faculty/profile/<numeric_id>`) returning 404 Not Found.
  - Standardized modern canonical URL format: `https://www.bubt.edu.bd/department/${deptSlug}/faculty/profile/${shortCode}` (verified 200 OK across all departments).
  - Cleaned all legacy `cse.bubt.edu.bd` records in `public.faculty` (0 dead links remaining).
- **Client-Side Safeguard (`FacultyProfileScreen.tsx`):**
  - Added `resolveFacultyProfileUrl(member)` helper function.
  - Dynamically rewrites any legacy/cached URLs to the modern canonical BUBT URL format.
  - The "View official profile on bubt.edu.bd" action now computes `effectiveProfileUrl`, ensuring users are never exposed to broken or offline web pages.

### 35.4 Multi-Agent Faculty Audit, 58dp Ergonomics & Fuzzy Initial Search
- **58dp Fixed Height & Control Bar Compliance:**
  - Standardized `dropdownBar` in `FacultyScreen.tsx` to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
  - Standardized `sheetCloseBtn` in `FacultyScreen.tsx` to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
  - Standardized `proposalBtn` and `contactBtn` bottom dock CTAs in `FacultyProfileScreen.tsx` to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
  - Standardized `sendProposalBtn` in research collaboration modal to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
  - Standardized `saveBtn` and `closeReportBtn` in `ManageFacultyScreen.tsx` to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
- **Fuzzy Routine Initial Search:**
  - Implemented sanitized alphanumeric search (`cleanQ`) across `FacultyScreen.tsx`, `FacultyDeptScreen.tsx`, and `ManageFacultyScreen.tsx`.
  - Allows searching initials with spaces or periods (e.g. `S.S.N.`, `s s n`, `S-S-N`, `SSN`) to cleanly resolve to teacher records with matching routine short codes.
- **Android Modal Keyboard Resilience:**
  - Replaced conditional iOS-only padding in modal bottom sheets with unconditional `behavior="padding"` ensuring keyboard offsets adapt cleanly across modern Android 15 edge-to-edge screens.

---

## 36. Interactive Vector Map, GPS & Location Architecture

### 36.1 Architectural Overview & High-Resolution Vector Engine
- **Engine Implementation:** Combines high-resolution **OpenFreeMap Vector GL Styles** (`https://tiles.openfreemap.org/styles/liberty` for light, `https://tiles.openfreemap.org/styles/dark` for dark) within a hardware-accelerated **MapLibre GL engine** embedded via `react-native-webview` (v13.16.1) combined with native device geolocation (`expo-location`).
- **Hardware-Accelerated Retina Vector Rendering:** Renders vector geometry directly on the mobile GPU at native device pixel ratio, completely eliminating blurry 256px raster tiles, pixelated street labels, and stretched roads.
- **Native Dark Vector Theme:** In dark theme, loads the dedicated OpenFreeMap Dark vector style with deep dark surfaces and vibrant street accents, eliminating CSS canvas color inversion filters.
- **Geographic Boundary & Drift Guard:** Restricts panning and zooming to Bangladesh coordinates (`minZoom: 10, maxZoom: 20`, `maxBounds: [[88.0, 20.5], [92.8, 26.7]]`), preventing map drift into the ocean or foreign territories.

### 36.2 Core Services & Components
1. **`src/services/locationService.ts`:**
   - **Device GPS Retrieval:** `getCurrentUserCoordinates()` requests foreground permission and retrieves device position via `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`.
   - **BUBT Permanent Campus Exact Calibration:** Calibrated `BUBT_COORDS` to official Permanent Campus grounds at `(23.8119, 90.3572)` on the east side of Rupnagar Road inside the block bounded between Road 5 and Road 9 (OSM Way `976260677`, Rupnagar, Mirpur-2). Subtext standardized to `'Permanent Campus · Road 9 & 5, Rupnagar'`. Added distinct landmark entries for BUBT Main Campus, BUBT Building 4 (BBA & Admission on Road 6: `23.8098, 90.3567`), BUBT Building 2 & 3 (Road 10: `23.8122, 90.3572`), Super Hostel-04 (`23.8112, 90.3562`), and Follow Fashion (`23.8106, 90.3560`). Distinct coordinates for Banani 11 and Jatra Biroti.
   - **Comprehensive Dhaka Landmark & Transit Registry:** Contains pre-indexed coordinates, Bangla names, keywords, and place types for over 70+ major Dhaka destinations.
   - **Two-Stage Instant Prefix Search & Autocomplete:**
     - `searchPlacesLocal`: Synchronous (0ms) local prefix trie matching with length-prioritized ranking (typing `son` immediately returns `Sony Square (Sony Cinema)` with live distance text).
     - `searchPlacesOnline`: Debounced (280ms) high-speed **Photon Geocoding API** (<150ms latency) with `AbortController` cancellation, seamlessly merged with local curated matches and backed by OpenStreetMap Nominatim as fallback.
   - **Strict 65m Landmark Snapping:** `findNearestLandmark(coords, 65)` snaps only when directly on landmark grounds (within 65m), preventing distant roads in Rupnagar from falsely snapping to BUBT.
   - **High-Accuracy Reverse Geocoding (`reverseGeocodeCoords`):** Prioritizes OpenStreetMap Nominatim Reverse (`zoom=18, addressdetails=1`) for true road, building, and quarter resolution, backed by native geocoder fallback.
2. **`src/components/location/LocationPickerModal.tsx`:**
   - **Memoized HTML & Zero Re-render Flashing:** The WebView HTML source is memoized via `useMemo(() => generateMapLibreHtml(startCoords, isDark), [isDark])`. Dynamic map panning and pin relocation are handled exclusively via RenderThread `postMessage` (`FLY_TO`), preventing WebView re-renders and bridge flashing during text input or pin motion.
   - **Pure SVG Vector Pin Geometry & Vertical Needle Alignment:** Native floating pin layer anchored via `centerAnchor: { width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }`. Ground reticle (`left: -14, top: -14`), ground shadow (`left: -11, top: -3.5`), and authentic 38x48 SVG vector teardrop pin container (`left: -19, top: -47.5`) with bottom needle tip touching `(0, 0)` with sub-pixel precision pointing vertically straight down directly onto the target coordinate.
   - **Solid Opaque Active Commute Hub Chips:** Active commute hub chips render on solid backgrounds (`#fee2e2` in light mode / `#261b1e` in dark mode) so the map streets, building outlines, and text labels never bleed through.
   - **Streamlined Single-Line Search Capsule:** Search bar input enforced with single-line layout (`multiline={false}, numberOfLines={1}`) and generous status bar inset buffer (`Math.max(insets.top, 24) + 12`), eliminating double-line wrapping and status bar overlap.
   - **Reverse Geocode In-Flight Abort Guard:** Managed via `reverseGeocodeAbortRef`. When the user pans or jumps to a new location, any active in-flight reverse geocode network request is immediately aborted, eliminating race condition overwrites where an old slow network response would overwrite a newly selected position.
   - **Android Hardware Back Button Handling:** Integrates `BackHandler` so pressing the Android back button when the search dropdown is open dismisses the search overlay and soft keyboard first, preventing accidental closure of the entire modal.
   - **Contextual `title` Pill Badge:** Displays the caller's contextual `title` prop (e.g. `"SELECT PICKUP POINT"`, `"SELECT DESTINATION"`, `"SELECT MEETUP LOCATION"`) in a styled accent pill inside `selectedLocationCard72`.
   - **Offline & CDN Resilience:** Listens for `window.onerror`, MapLibre `error` events, `onError`, and `onHttpError`, presenting an offline warning banner with a "Retry" button without blocking local landmark selection.
   - **Recent Searches & Suggestions:** Persists last 5 chosen places in `@campusone_recent_map_searches` via AsyncStorage. Surfaces recent searches and campus hubs on focus with a "Clear" option.
   - **Single Closest Hub Detection:** Commute hub chips use `activeHubLabel` (single closest hub within 120m threshold), ensuring multiple chips never light up simultaneously.
   - **Z-Index & FAB Overlay Protection:** FAB column is rendered before the search overlay and hidden during active search, with `elevation: 10` on the top bar ensuring search dropdown touches are never intercepted.
   - **Reverse Geocode Overwrite Protection (`isProgrammaticMoveRef`):** Programmatic movements (selecting search suggestions, tapping Quick Commute Hub chips, initial modal open, or snapping to BUBT Campus) flag `isProgrammaticMoveRef.current = true`. This prevents `moveend` from triggering reverse geocoding and overwriting user-selected place names.
   - **Universal 58dp Control Bar Standard:** Standardized top search bar (`searchCapsule`) and back button (`frostedCloseBtn`) to `height: 58, borderRadius: 16`.
   - **Strict 2D Locked Orientation:** `map.touchZoomRotate.disableRotation()` locks two-finger gestures to pure zoom without accidental rotation.
   - **Universal 72dp Content Card:** Live selected location preview card (`minHeight: 72, padding: 14, borderRadius: 16`) with 44dp map pin icon box, context title badge, resolved place title, and coordinates subtitle.
   - **Universal 58dp Primary CTA:** Standardized "Confirm Location" button (`height: 58, borderRadius: 16`).

### 36.3 App-Wide Feature Integration
- **Campus Rides (`RidePostScreen.tsx`):** Map trigger buttons on pickup and destination bars and commute area sheet.
- **Student Marketplace (`MarketPostScreen.tsx`):** 58dp map trigger card in handover location sheet.
- **Blood Donation (`AreaPickerModal.tsx`):** Sibling modal integration allowing donors and requesters to pinpoint hospitals and areas on the map. Explicitly resets `setMapPickerOpen(false)` upon location confirmation.
- **Lost & Found (`PostItemFormScreen.tsx`):** "Pick on Map" button in quick location row.
- **Database & Web Parity:** All selections resolve to clean human-readable address strings, maintaining 100% backward and forward compatibility with Supabase backend tables and the sibling web app (`CampusOneWeb`).

---

## 37. Universal Tactile Squish Switch Architecture (`src/components/ui/TactileSwitch.tsx`)
- **21st.dev Component Source:** Inspired by `kuratlielia/switch` (`https://21st.dev/@kuratlielia/components/switch`).
- **Zero-Crash Native Architecture:**
  - Converted entirely to `useNativeDriver: true` for all animated nodes (`posAnim`, `flightScale`, `pressScale`).
  - Combined scale via `Animated.multiply(flightScale, pressScale)` executed directly on Android's RenderThread at 120 FPS.
  - Prevents React Native's fatal `Invariant Violation: Got combination of native and non-native animated values in transform`.
- **Layered Track Views & No `overflow: 'hidden'` Clipping:**
  - Base track view renders `inactiveTrackColor` (`C.surface3` / `C.border2`).
  - Overlay track view renders `activeTrackColor` (`C.brand`), smoothly fading in/out via native `opacity` clamped interpolation. Completely eliminates native color string parsing exceptions on Android.
  - `overflow: 'hidden'` is omitted from the track container: on Android RN 0.85 Fabric, clipping containers cut native-driver `scaleX` transforms whenever the thumb stretches outside layout bounds. The pill shape is achieved cleanly via `borderRadius` on both base track and overlay.
- **Synchronized Flight Stretch & Anticipation Squish:**
  - `flightScale` is mathematically interpolated directly from `posAnim` (`[0, 0.5, 1] -> [1, 1.20, 1]`), ensuring peak stretch occurs at the 0.5 velocity midpoint without timing race conditions or glitchy sequences.
  - `pressScale` springs to `1.10` on `onPressIn` and settles back to `1.0` on `onPressOut`.
  - Thumb travels across the track (`0 -> travel` dp) using clamped interpolation (`extrapolate: 'clamp'`) with critically damped spring physics (`tension: 280, friction: 20`).
- **Touch Ergonomics & Row Card Tap Integration:**
  - Standalone `TactileSwitch` uses `TouchableOpacity` with `hitSlop={12}` (effective 72 × 52 dp touch target).
  - In row cards (`SettingCard` in `SettingsScreen.tsx`, master toggles in `NotifSettingsScreen.tsx`), the entire row card is interactive via `onPress` while the embedded `TactileSwitch` has `pointerEvents="none"` and `disabled={!onValueChange}`. Users can tap anywhere across the row (icon, title, or switch knob) to toggle the setting cleanly without double-firing.
- **App-Wide Deployment:**
  - Replaced legacy React Native `<Switch>` across all 16 locations: Settings (Sync, Dark Mode, Language), Notifications (Pause All, Quiet Hours, Category Channels), Profile (Directory, WhatsApp), Marketplace (Hide Sold, Free, Negotiable), Study Hub (Public/Private), Medical (Doctor Leave), Manage Faculty (Mentorship, Leave), and Announcements (Pin to Top).





