# CampusOne — Full Audit (App + Supabase)

_Generated 2026-06-19. Multi-agent sweep: 22 code-domain bug lanes + live Supabase advisors._

## ✅ Remediation status — 2026-06-20

**All P0 + P1 + most P2 fixed and pushed to `main`** (17 commits, migrations 0062–0064). Project is type-clean (`tsc --noEmit` passes). Security advisors **75 → 67** (every actionable item cleared; remainder are expected `SECURITY DEFINER` RPC warnings + 1 dashboard toggle).

- **Security (0062):** ride_requests RLS locked + counts RPC; donor_contact consent; public_profiles invoker; bucket-listing closed; search_path pinned; anon revoked
- **Crashes:** 5→ now 7 Rules-of-Hooks guards moved below hooks (incl. ClubManage)
- **Auth:** profile-fail no longer drops admin/staff to student UI
- **Data/schema:** prayer key, NOT NULL floor_desc, phantom columns, removed-job/doctor/faculty spinners
- **Staleness:** refresh-on-focus across 27 screens
- **Writes:** optimistic mutations error-checked + rollback everywhere; dashboards (assign/advance/ISSUE_MAP/timeAgo)
- **Perf:** 33 FK covering indexes (0063); Directory virtualized (FlatList)
- **Reports/Directory:** edit round-trip, RLS no-op guards, single status source, dead code removed
- **Dates:** real calendar + not-past validation; UTC+6 local-date boundary
- **Events:** upcoming truncation fixed; calendar month nav; atomic RSVP capacity RPC (0064)
- **Medical:** queue role-gate race closed; loading states
- **Confirmed intended (no change):** open-join study `join_code`; campus_reports feed with names

**P2 tail — now also done:** FlatList virtualization (Directory, MyReports, AssignedToMe, AllReports); loading/error states (Clubs, Jobs, JobsModerate, Medical, Market); medical overnight-shift + NaN-time + null-slot guards; Market orders Available before Sold; date validation; calendar nav; collision-safe codes; RSVP capacity RPC.

**Truly remaining (negligible):** ManageUsers/ManageClubs virtualization (admin-only, capped, kept to preserve the single-card layout); a few Alert dialog button labels not yet localized; enable leaked-password protection in the Supabase dashboard (a setting only you can toggle).

---

> **Caveat:** the automated adversarial-verify pass was cut short by a Claude usage-cap.
> Findings below are evidence-backed (file:line, columns checked against live DB) but
> a few may be intentional design. Recurring patterns that appear across many domains
> (hooks, refresh-on-focus, swallowed errors, data leaks) are high-confidence.
> Not yet audited: notifications, home/explore/profile, lost&found, announcements detail.

---

## TL;DR — health

- **Architecture solid.** 90 screens, 61 migrations, theme tokens, i18n, RLS. Good bones.
- **3 real data-leaks at the DB layer** (ride requesters, donor WhatsApp, campus reports) — fix first. _(all 3 verified against live DB)_
- **4 Rules-of-Hooks crashes** waiting to happen (early-return before hooks). _(verified in code)_
- **Refresh-on-focus missing in ~13 screens** → stale data after every post/edit. Biggest "feels broken" UX bug.
- **Pervasive: swallowed Supabase errors** (no error/loading/empty states) → silent blank screens.
- **DB perf debt:** 77 RLS init-plan re-evals, 28 unindexed FKs — cheap, big win at scale.

**Top 3 to fix now:** (1) tighten `ride_requests` + `donor_contact` + `campus_reports` exposure, (2) fix the 4 hooks-order crashes, (3) fix authStore profile-fail → student-UI fallback.

> **Verification note (2026-06-19):** DB-layer + crash claims above re-checked against the live database and source. **One earlier finding was wrong:** `club_member_counts` was reported as a *missing* RPC — it actually **exists** in the live DB (SECURITY DEFINER, granted to `authenticated`), so club member counts work at runtime. Real issue is smaller (see below). Other un-verified lanes (notifications, home, lost&found, announcements) remain un-checked.

---

## 1. CRITICAL / HIGH bugs

### Security / data exposure (DB layer — fix first)
| # | Where | Problem | Fix |
|---|-------|---------|-----|
| S1 | `ride_requests` RLS (`ride_req_select` qual=true) · RideDetailScreen.tsx:50 | **Any** authenticated user can read **every** ride's requester rows incl. names. UI only hides them. | RLS: `requester_id = auth.uid() OR EXISTS(rides r WHERE r.id=ride_id AND r.driver_id=auth.uid())`. Only fetch names when viewer is driver. |
| S2 | `donor_contact` RPC · BloodScreen.tsx:78 | SECURITY DEFINER RPC returns donor WhatsApp ignoring `profiles.show_whatsapp` consent flag → contact leak. | Return whatsapp only when `show_whatsapp = true`, else null. |
| S3 | `campus_reports` RPC · reportsService.ts:36 | Returns every non-deleted report's full description + reporter real name to all students. | Confirm intent; exclude sensitive categories or gate reporter_name. |
| S4 | `public_profiles` view (advisor **ERROR**) | View runs definer-rights (no `security_invoker`) → bypasses caller RLS. _Verified; exposes only id/name/role/dept/expertise/avatar — **no contact PII**, so lower real severity._ | `ALTER VIEW public.public_profiles SET (security_invoker=on);` |
| S5 | 4 public storage buckets (`attachments`, `club-covers`, `job-circulars`, `photos`) | Broad SELECT policy allows **listing all files** in the bucket. | Drop the list policy; object URLs still work without it. |
| S6 | study public sections · StudyHubScreen.tsx:457 | `loadPublicSections` selects `join_code` for every public section → secret join codes handed to non-members. | Drop `join_code` from the browse select. |

### Crashes — Rules of Hooks (early `return` before hooks)
| Where | Note |
|-------|------|
| CourseDetailScreen.tsx:48 · DoctorDetailScreen.tsx:58 · RideDetailScreen.tsx:28 · BusDetailScreen.tsx:19 | `if (!id) return null;` runs **before** useState/useEffect → "Rendered fewer hooks than expected" crash if param ever absent. Move guard **below** all hooks. |

### Missing backend / wrong data
| Where | Problem | Fix |
|-------|---------|-----|
| authStore.ts:84 | Profile-fetch error sets `profileLoaded:true, profile:null` → admin/staff silently dropped into **student UI** on any transient failure, no retry. _(verified)_ | Keep `profileLoaded:false` on error + retry screen. |
| JobDetailScreen.tsx:47 | Removed job → `.single()` errors for non-admin → **infinite spinner**. | `.maybeSingle()` + not-found state. |
| FacultyProfileScreen.tsx:48 · DoctorDetailScreen.tsx:62 | Fetch error / bad id → permanent spinner, no error path. | Track `loading`/`notFound`, render error view. |
| EventsBrowseScreen.tsx:90 | `.order(date asc).limit(50)` fills quota with **past** events → upcoming list drops rows. | Split upcoming (`gte today`) / past queries. |
| MarketDetailScreen.tsx:156 | Renders `listing.location` — **column doesn't exist** → blank line. | Remove or use a real field. |
| StudyHubScreen.tsx:415 | `study_courses` has no `material_count`/etc → every course shows "0 files". | Counts via view/RPC or drop label. |
| PrayerScreen.tsx:40 | Jummah key `'jumuah'` ≠ DB `'jummah'` → Friday logic is dead code, Jummah picked as "next prayer". | Fix all literals to `'jummah'`. |
| PrayerScreen.tsx:110 | Inserts `floor_desc: null` into a **NOT NULL** column → save fails. | Default `''`. |

### Optimistic writes with no error check (UI/DB desync)
Faculty/Jobs/Bus bookmark toggles · MarketDetail `markSold` · AdminDashboard `assignReport` · AllReports status · StaffDashboard `advanceStatus` · Study `toggleVisibility`. All update local state without checking `{ error }` → star/status flips while DB unchanged. **Fix pattern:** `const {error}=await…; if(error){toast();return;} setState()`.

---

## 2. MEDIUM / LOW (grouped — recurring patterns)

- **Missing refresh-on-focus** (stale after post/edit/delete) — Events, Market, Rides, Blood, Medical(×3), Directory, Faculty(×3), StudyHub, Jobs, Prayer, Reports(×3), AllReports, ManageUsers/Staff/Clubs/Faculty. App already standardized this (commit c663282); these screens were missed. **Fix:** `useFocusEffect(useCallback(()=>{load()},[load]))`.
- **Swallowed query errors + no loading/empty state** — nearly every `load()` destructures only `.data`, ignores `.error`. Failed fetch = silent blank/empty-state, indistinguishable from "no data". Add `loading` flag + error/retry + empty state.
- **`.map` inside ScrollView (no virtualization)** — Directory (unbounded RPC), MyReports/AssignedToMe (200 rows), ManageUsers (500). Convert to FlatList.
- **Edit corrupts structured location** — ReportFormScreen.tsx:96 can't reverse `"2nd floor · Lab 5"`, hardcodes `Ground/Other`, re-save mangles it cumulatively. Store structured location in columns.
- **RLS no-op treated as success** — report edit / connection accept-decline update 0 rows when status changed, `error===null` → false success. Add `.select()` + check row count, and `.eq('status','pending')`.
- **Weak ID/code generation** — events/announcements use `performance.now()` (float, collision-prone); bus route id slugified from name (empty for Bangla). Use DB default/uuid.
- **Date validation regex-only** — rides/jobs accept `2026-13-40`, past dates. Parse + round-trip check.
- **i18n gaps (hardcoded English)** — Blood, Directory ("Wants to connect"), Rides, ClubPost. Route through `t.*`.
- **Dead/unsafe code** — `searchDirectory()` (profileService.ts:31) `select('*')` no role/reciprocity gate (latent leak); `useReports` hook unused + hardcoded page size; `jobs.status`/`closed` branch never reachable.
- **Source-control drift** — `club_member_counts` RPC **exists in live DB but is in no migration file** → won't reproduce on a fresh deploy; also granted to `anon`. Add the migration; revoke `anon`. _(This corrects an earlier "missing RPC" finding — counts work at runtime.)_
- **wa.me links** built from local `01…` numbers (need `880…`); `Linking.openURL` unguarded everywhere → unhandled rejection.
- **Capacity/seat races** — Event RSVP + ride seats enforced client-side only; concurrent users exceed capacity.

---

## 3. Supabase — security & performance

**Security advisors (75):** 1 ERROR (S4 above), 74 WARN.
- 65 `*_security_definer_function_executable` — RPCs callable by `authenticated`/`anon`. Mostly **expected** for an RPC app, but **revoke `anon`** on the 15 anon-exposed ones unless truly public.
- 4 `public_bucket_allows_listing` (S5). 4 `function_search_path_mutable` (`set_ride_expires_at`, `donor_contact`, `gen_section_join_code`, `set_section_join_code`) → add `SET search_path = ''`.
- `auth_leaked_password_protection` OFF → enable HaveIBeenPwned check in Auth settings.

**Performance advisors (143):**
- **77× `auth_rls_initplan`** across 34 tables — policies call `auth.uid()`/`current_setting()` **per row**. Wrap as `(select auth.uid())` → big speedup on every list query. Highest-leverage DB fix.
- **28× unindexed foreign keys** (announcement_reads, claims, club_members, event_rsvps, jobs, study_*, …) → add covering indexes.
- **23× unused index** — drop to cut write cost (verify first).
- **10× multiple_permissive_policies** (bus_routes, doctors, faculty, prayer_times, study_sections, …) → merge duplicate SELECT policies.

---

## 4. What's left / What to do (prioritized)

**P0 — stop the bleeding (Week 1)**
1. RLS/RPC data-leaks S1–S3, S6; bucket listing S5; `public_profiles` → `security_invoker=on` (S4).
2. Fix 4 Rules-of-Hooks crashes.
3. authStore profile-fail → don't drop to student UI.
4. Fix NOT NULL `floor_desc`, Jummah key (`jumuah`→`jummah`), removed-job infinite spinner.
5. Add `club_member_counts` migration + revoke `anon` (drift fix, not runtime-breaking).

**P1 — correctness + the "stale" feel (Weeks 2–3)**
6. Add `useFocusEffect` to all ~13 stale screens (single sweep).
7. Error/loading/empty-state helper, applied across every `load()`.
8. Optimistic-write error-check pattern across all mutations.
9. Fix schema-mismatch renders (listings.location, course counts, jobs.status).
10. Report-edit location round-trip; RLS no-op success checks.
11. `(select auth.uid())` RLS rewrite + add the 28 FK indexes.

**P2 — polish + scale (Month 2)**
12. FlatList virtualization on large lists; pagination on feeds.
13. i18n sweep for hardcoded strings; wa.me/openURL guards.
14. Date pickers replacing free-text date fields.
15. Server-side capacity/seat enforcement (RPC w/ atomic check).
16. Drop unused indexes, merge duplicate policies, enable leaked-password protection.
17. Audit the 4 un-swept domains (notifications, home, lost&found, announcements).

---

## 5. Feature improvements (by leverage)

**Deepen what exists**
- **Search & filters everywhere** — directory, jobs, market, faculty, study all need real server-side search (most cap at 100 rows alphabetically).
- **Cancel/withdraw actions** — outgoing connection request can't be retracted; same dead-end pattern elsewhere.
- **Calendar** — events calendar locked to current month, no prev/next.
- **Pagination / load-more** — feeds hard-cap at 30–60–200 rows then silently truncate.

**Add (premium expectations)**
- **Push notifications** — currently in-app only (`expo-notifications` not installed). Biggest perceived-quality gap for a campus app.
- **In-app chat / comments / reactions** — clubs, events, reports, marketplace all want lightweight discussion.
- **Profile completeness + avatars** — avatar/photo debt noted in memory; drives directory/connections value.
- **Offline cache + optimistic queue** — RN apps feel premium when they survive bad campus wifi.
- **Share / deep links** — no deep-link readiness; sharing a report/event/job link is impossible.
- **Global search** — one search across all sectors.

---

## 6. UI/UX → "million-dollar" polish

_(Visual/states/nav agents didn't complete before the cap — these are from the theme system + code patterns observed.)_

**States & motion (highest impact)**
- Replace spinners with **skeleton loaders** on every list/detail.
- Every screen needs the **loading / empty / error** trio (today: false "no data" flashes everywhere).
- **Optimistic UI done right** (with rollback) + **toast confirmation** after every action.
- **Haptics** on key actions (post, connect, claim). **Pull-to-refresh** everywhere.
- Shared-element / fade **transitions** between list→detail.

**Visual system**
- Finish the theme-token sweep (~43 screens still have hardcoded hex per memory) — consistency is what reads as "premium".
- Consistent **elevation/shadow** scale, spacing rhythm, one button/input state system.
- **Dark mode** (theme infra exists; wire it through).

**Nav & a11y**
- Accessibility labels, ≥44px hit targets, contrast + font-scaling support.
- First-run **onboarding** (3 cards) + role-relevant home.
- Empty states that **teach** (illustration + CTA), not blank scrolls.

---

## 7. Roadmap

- **Week 1 — Stop the bleeding:** P0 list (security leaks, missing RPC, crashes, auth fallback).
- **Weeks 2–3 — Correctness + parity:** focus-refresh sweep, error/empty/loading helper, optimistic-write fix, schema-mismatch renders, RLS perf rewrite + FK indexes.
- **Month 2 — Premium feel:** skeletons + motion + haptics, push notifications, search/filters, FlatList/pagination, dark mode, theme-token finish, deep links.

---

_Detailed per-finding evidence (file:line, problem, fix) for all 22 lanes: see `AUDIT_RECOVERED.md`._
