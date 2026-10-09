# AGENTS.md — CampusOne Knowledge & Engineering Reference

This document is the single, authoritative reference for any AI agent or developer working on the **CampusOne** project. It synthesizes all project memory, live code patterns, database schemas, environment constraints, and developer preferences.

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

### 3.3 User Communication Style
1. **Non-Technical & Click-by-Click:** The user prefers clear, numbered, step-by-step guidance for external dashboards (Google AI Studio, Supabase, Android settings).
2. **Plain English First:** Explain "what it does" in simple terms before diving into technical details.
3. **Typo Tolerance:** The user frequently types shorthand and colloquial typos (`naw` → now, `lick` → like, `loock` → look, `dose` → does, `stuff` → staff). Read intent generously.
4. **Iterative UI Polish:** Ship a solid first pass, test on device, and welcome incremental refinements.

---

## 4. Tech Stack & Dependencies

| Layer | Technology | Details |
|---|---|---|
| **Framework** | React Native 0.85.3 + Expo SDK 56.0.15 | TypeScript 6, React 19.2.3 |
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
- **Dynamic Semantic Colors (`C.*`):** `C.bg`, `C.surface`, `C.border`, `C.text`, `C.textMuted`, `C.brand`, `C.success`, `C.warn`, `C.danger` (`#d63d35`).
- **Feature Sector Accents (`SectorColors`):** Use `SectorColors.<sector>` for feature tiles and icons (`reports`, `bus`, `study`, `medical`, `blood`, `ride`, `prayer`, `jobs`, `market`, `clubs`, `events`, `announce`, `lostfound`, `directory`, `faculty`, `pdfmaker`).
- **Typography:** Bilingual support with `FontFamily.jakarta*` and `FontFamily.hind*` (matra-aware line height).

### 5.2 Layout Rules: Full-Width Rows
- **Navigation Lists:** Always use **full-width rows** (icon on left, title, subtitle/description below, chevron on right).
- **Prohibited:** Never use 2-column grid cards for navigation destinations, and **never mix grids and rows on the same screen**.
- **Reference Layout:** `styles.toolCard` in `src/screens/main/ExploreScreen.tsx`.

---

## 6. Expo SDK 56 & Android Quirks

Expo SDK 56 enforces Android 15 edge-to-edge mode. This breaks two standard React Native conventions:

### 6.1 KeyboardAvoidingView on Android
- **Old Broken Pattern:** `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` relies on native `adjustResize`, which fails in edge-to-edge mode.
- **Rule:** Use `behavior="height"` on Android (or handle insets via `react-native-safe-area-context`).

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
| **Blood Donors** | `donors` (NOT `blood_donors`) | Columns: `user_id`, `blood_group`, `area`, `last_donated`. No phone column (phone is in `profiles.whatsapp`). Contact via `donor_contact(p_user_id)` RPC. 90-day wait enforced. |
| **Blood Pledges** | `blood_pledges` | Columns: `request_id`, `donor_id`. Used when a student pledges "I can help". |
| **Events** | `events` | Date column is `date` (NOT `event_date`); location is `venue` (NOT `location`). Whitelist: `event_organizers`. |
| **Clubs** | `clubs` & `club_posts` | `clubs.about` (NOT `description`), filter `is_active = true`. Posts: `club_posts.body` (NOT `content`), `author_id`. |
| **Jobs** | `jobs` | **NO status column**. Removed jobs have `deleted_at IS NOT NULL`. Withdraw a job by setting `deleted_at = now()`. |
| **Reports** | `reports` | Columns: `code`, `reporter_id`, `assigned_staff_id`, `status` (`'Open'`, `'In Progress'`, `'Resolved'`, `'Rejected'`, `'Closed'`). Trade assignment matches `profiles.expertise`. |
| **Connections** | `connections` | `requester_id`, `addressee_id`, `status` (`'pending'`, `'accepted'`). |
| **Medical** | `doctors` & `appointments` | Clinic is walk-in / directory only. Doctors: `room`. Appointments: `student_id`, `slot`, `date`. |
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
- **Install on Device via ADB:**
  ```bash
  & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" install -r android/app/build/outputs/apk/release/app-release.apk
  & "C:\Users\dracu\Android\sdk\platform-tools\adb.exe" shell am start -n com.bubt.campusone/.MainActivity
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

### 13.2 Visual Media Pipeline & Attachments
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
  3. Three Luxury Status Strips (`HomeStatusStrips.tsx`):
     - Reports Strip: Indigo blueprint gradient with Open, In Progress, Resolved counters linking to `MyReports`.
     - Bus Strip: Dark transit amber gradient with route, departure, wait countdown, and 120-min cycle progress bar.
     - Prayer Strip: Midnight Islamic emerald gradient with Salah name, Azan time, wait countdown, and interval progress bar.
  4. Browse Lost & Found action card linking to `LostFoundBrowse`.
  5. Campus Today Highlights (`CampusToday.tsx` with `hide={['bus', 'prayer']}`): Shows urgent blood requests and campus job opportunities.
- **De-cluttered Efficiency:** Old `Quick Actions` row and redundant `My Reports` card list are eliminated since Reports, Bus, and Prayer are directly represented in the status strips.
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
- **Categorization:** High-level grouping matches the web sidebar:
  - **Academics:** Study Hub, Class Routines, Academic Calendar, Faculty, Cover Page Generator, CGPA Calculator, and PDF Maker.
  - **Campus Life:** Clubs, Events, Announcements, Prayer Times, Jobs & Internships.
  - **Services:** Medical Center, Bus Schedule, Lost & Found.
  - **Community:** Student Marketplace, Ride Share, Blood Donation, Student Directory.
  - **Top Pinned Cards:** AI Assistant and Campus Issues.
- **Default State (Collapsed):** All categories start **collapsed by default** (`defaultOpen = false`). When the user taps the Explore tab, only the category headers are visible, preventing an overwhelming 20+ item wall.
- **Accordion Behavior:** Tapping any category smoothly expands it (`chevD` `v`) and closes other open categories, keeping the screen compact and matching the web application (`AppShell.jsx`) 1:1. Tapping an open category collapses it back (`chevR` `>`).
- **Feather Icon Reliability:** Directly uses `name={isOpen ? 'chevD' : 'chevR'}` instead of fragile CSS/style rotation transforms on font components.
- **Admin Dashboard Integrity:** `AdminDashboardScreen.tsx` explicitly sets `defaultOpen={true}` on its single Manage section to maintain visibility on the dashboard.

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

