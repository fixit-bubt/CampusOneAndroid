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
- **Alias & Password:** Configured in `android/app/build.gradle` (`signingConfigs.release`).
- **Google Sign-In Dependency:** Google Sign-In is registered against the **release keystore's SHA-1 fingerprint**. Debug builds (`npx expo run:android`) fail Google Sign-In with `DEVELOPER_ERROR`. Real testing must use the release APK.
- **Build Release APK Locally (No EAS required):**
  ```bash
  cd android
  ./gradlew assembleRelease
  ```
- **Install on Device via ADB:**
  ```bash
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  adb shell am start -n com.bubt.campusone/.MainActivity
  ```

---

## 12. Capstone Project Thesis Report

- **Document Location:** `c:\Users\dracu\Desktop\CampusOne\Copy of Capstone_Project_Report_Format-DOCX (1).docx` (Backup: `...BACKUP.docx`).
- **Current State:** Chapters 1–4 completed (Introduction, Background Study, Methodology, Implementation & Result Analysis). Chapters 5–6 (Constraints/Milestones, Conclusion) remain template placeholders.
- **Report Strategy:** Mobile app and Web app are presented as **one unified system** with two client interfaces sharing a single backend.
- **Editing Tool:** Edit using `python-docx` (`pip show python-docx` is available). Always confirm scope before altering document structure.
