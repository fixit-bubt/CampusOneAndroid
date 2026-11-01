# Unified 60dp Top Bar & Comprehensive Bangla/English Parity Audit

## Phase 1: Unified 60dp Top Bar Architecture & Implementation
- [x] Standardize `TopBar.tsx`:
  - Standardize `TopBar` height to exactly `60dp` (`height: 60`, surface background, border bottom `hairlineWidth`).
  - Standardize `SubBar` height to exactly `60dp` (upgraded from 54dp so screen height never jumps).
  - Main Tab mode: `[LogoMark]` on the left (32dp), Page Title beside it (`fontFamily: FontFamily.jakartaExtraBold`, `fontSize: 18`), subtitle or badges if present, right action button on the right.
  - Sub-screen mode (`SubBar`): `[ ← ]` back button on the left, Page Title centered, and `[LogoMark]` on the right (or right action slot) for perfect bilateral symmetry.
- [x] Audit & Standardize all 5 Root Tabs:
  - `HomeScreen`: Uses `TopBar` (brand logo + title + subtitle + bell).
  - `ExploreScreen`: Replaced raw text header with unified `TopBar` (`title={t.tabs.explore}`, subtitle={t.exploreGroups.exploreSubtitle}).
  - `MessagesHome`: Replaced raw text header with unified `TopBar` (`title={t.messages.title}`, subtitle={t.messages.subtitle}, right directory action).
  - `SettingsScreen`: Replaced raw text header with unified `TopBar` (`title={t.tabs.settings}`, subtitle={t.mainx.settingsSubtitle}).
  - `StudyHubScreen`: Replaced back button header with root `TopBar` on root tab, and `SubBar` when inside sub-views.
- [x] Audit & Standardize child screens to use `SubBar` (height 60dp, left `[←]`, right `[LogoMark]`).

## Phase 2: Bangla Layout & "Screen Dropdown" Investigation
- [x] Audit font sizes, line heights, and container heights across Home and main screens:
  - Inspected `HomeScreen`, `HomeStatusStrips`, `HomeFrequentTools`, `HomeHeroBanner`, `HomeCommunityUpdates`, `SettingsScreen`, `ExploreScreen`.
  - Identified root cause of Bangla dropdown: `SettingCard` had `minHeight: 72` and wrapped long Bangla strings to 2 lines; `HomeCommunityUpdates` cards lacked fixed heights and `cardBody` had `numberOfLines={2}`; `ExploreScreen` lacked fixed heights on `featuredCard` and `childBar`.
  - Enforced `height: 72` fixed heights and single-line clamping `numberOfLines={1}` across all cards.
  - Guaranteed font sizes between English and Bangla maintain identical 1:1 vertical balance.

## Phase 3: Comprehensive English/Bangla i18n Audit & Translation
- [x] Compared `en.ts` and `bn.ts` dictionaries key-by-key for missing or untranslated strings.
- [x] Added localized strings for:
  - `sectorTitles` & `sectorDescs` (20 sectors in English and Bengali)
  - `frequentTools` (header, customize, modal titles, 19 tool names)
  - `statusStrips` (header, customize, titles, all metrics labels)
  - `communityUpdates` (header, live badge, tab labels, view-all CTAs)
  - `exploreGroups.exploreSubtitle`, `messages.subtitle`, `mainx.language`, `mainx.settingsSubtitle`, `study2.studyHubSubtitle`, `chatbot.exploreDesc`.
- [x] Hooked components to use `t.*` keys dynamically.

## Phase 4: Review & Verification Gate
- [x] Reviewed all modified files for regressions, styling mistakes, or unintended changes.
- [x] Type check with `npx tsc --noEmit` — 0 TypeScript errors.
- [x] Built release APK locally with Android SDK & Gradle: `cd android; .\gradlew assembleRelease` — BUILD SUCCESSFUL in 37s.
- [x] Installed onto connected phone (`8734b5da`) via ADB:
  - Force-stop: `adb shell am force-stop com.bubt.campusone`
  - Install: `adb install -r android/app/build/outputs/apk/release/app-release.apk`
  - Launch: `adb shell am start -n com.bubt.campusone/.MainActivity`

## Phase 5: Documentation & Git Remote Push
- [x] Updated `DESIGN.md` with Section 11 (60dp Top Bar standard) and Section 12 (Bilingual Parity & Zero-Dropdown Layout Constraints).
- [x] Updated project memory (`AGENTS.md` and `CLAUDE.md`) synchronously per rules.
- [x] Committed with clean human commit message (NO AI tells/footprints) and pushed to `origin/main`.

## Phase 6: BUBT Crawler Parity & Cover Page Generator Faculty Linking
- [x] Audited all 7 crawler adapters against 74 database tables; fixed `department` null fallback in `notices.ts`.
- [x] Executed database permissions grant for `faculty`, `courses`, and `departments` in Supabase.
- [x] Deployed updated `bubt-crawler` Edge Function to Supabase and verified live execution.
- [x] Upgraded `CoverPageFormScreen.tsx` with normalized multi-word and punctuation-tolerant search for teachers and courses.
- [x] Decoupled faculty list loading from department sync with `.limit(1000)` and robust fallbacks.
- [x] Compiled release APK locally with native Gradle and installed via ADB to physical device `8734b5da`.
- [x] Synchronized `AGENTS.md` and `CLAUDE.md` and pushed commits to GitHub `origin/main`.

## Phase 7: Triple-Axis Audit, Zero-Slop, Performance Optimization & Native Deployment
- [x] Full codebase audit across 236 source files (`/zero-slop`, `/performance-optimization`, `/code-review-and-quality`).
- [x] Zero-slop UI standard: 100% elimination of emojis in UI & code comments, replaced em-dashes with middle-dots/hyphens.
- [x] Performance & battery optimization: Capped infinite `setInterval` in `CampusPdfViewerModal` and `AnnouncementDetailScreen` to 30 iterations (6s max); throttled Home status strips parallel queries to active strips with `.limit(50)`.
- [x] The 4 UI states rule compliance: Added cold mount loading & explicit retry error cards in `FacultyScreen`, `MessagesHome`, `AssignedToMeScreen`, and Admin/Staff dashboards.
- [x] Deep linking: Configured `campusone://` scheme and `https://campusonebubt.vercel.app` routes in `RootNavigator`.
- [x] Native Gradle compilation & ADB installation onto connected phone (`8734b5da`).
- [x] Synchronized `AGENTS.md` and `CLAUDE.md` across both locations.
