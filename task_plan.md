# task_plan.md — Permanent Sync, Crawler, Faculty Short-Codes & Deep QA System

## Core Objectives
Implement permanent, robust solutions for notice synchronization, automated faculty directory crawling with initial/short codes, modern official BUBT profile URLs, missing faculty onboarding (e.g. Shaila Shaznin `SSN`), frontend search and fallback resilience, deployment to Supabase & GitHub, followed by an exhaustive multi-agent faculty module audit, bug fixes, verification, build, and memory synchronization.

## Phases
- [x] **Phase 1: Fix `sync-notices` Edge Function** `complete`
  - Stripped `id` from `rowsToUpsert` so all rows have uniform keys (preventing PostgREST 400 `PGRST102` error).
  - Normalized all optional fields with explicit `null` defaults.
  - Implemented chunk-level batch upsert with row-by-row fallback.
  - Live verified: Notice 1634 (`BUBT-N-1634`) successfully inserted into `public.announcements`. 41 new notices added, 259 updated.
- [x] **Phase 2: Fix `sync-faculty` Edge Function** `complete`
  - Replaced N+1 sequential query waterfall (>800 DB calls) with pre-loaded in-memory set diffing.
  - Crawled all 13 active BUBT department rosters completely in 16.8 seconds.
  - Extracted routine short codes (`SSN`, `SR`, `MAHB`, etc.) from profile link slugs.
  - Standardized active, modern BUBT profile URLs (`https://www.bubt.edu.bd/department/${slug}/faculty/profile/${shortCode}`).
  - Successfully onboarded new faculty member **Shaila Shaznin** (`SSN`, CSE).
  - Populated 403 out of 476 faculty members with routine short codes in `public.faculty`.
  - Cleaned all legacy `cse.bubt.edu.bd` records in database (0 dead links remaining).
- [x] **Phase 3: Deploy & Execute Edge Functions** `complete`
  - Deployed `sync-notices` and `sync-faculty` to Supabase project `xhgpxvyqrufbbuivttmi`.
  - Executed and verified live database updates for both.
- [x] **Phase 4: Frontend Safeguard in `FacultyProfileScreen.tsx`** `complete`
  - Added dynamic URL normalization in `resolveFacultyProfileUrl(member)` to rewrite legacy URLs to modern canonical BUBT URLs on the fly.
- [x] **Phase 5: First Verification, Build & GitHub Push** `complete`
  - Verified `tsc --noEmit` and Expo bundle export.
  - Committed with user-only author (no AI trailers) and pushed to GitHub `origin main`.
- [x] **Phase 6: Multi-Agent Deep Audit of Faculty Module (50 Lenses)** `complete`
  - **Search & Short-Code Matching:** Enhanced search across `FacultyScreen.tsx`, `FacultyDeptScreen.tsx`, and `ManageFacultyScreen.tsx` with stripped `cleanQ` matching so initials with punctuation or spaces (`S.S.N.`, `s s n`) match `short_code`.
  - **58dp Control Standard:** Standardized `dropdownBar`, `sheetCloseBtn` in `FacultyScreen.tsx`, `proposalBtn`, `contactBtn`, `sendProposalBtn` in `FacultyProfileScreen.tsx`, and `saveBtn`, `closeReportBtn` in `ManageFacultyScreen.tsx` to `Layout.controlHeight = 58` and `Layout.controlRadius = 16`.
  - **Modal Keyboard Ergonomics:** Replaced `Platform.OS === 'ios' ? 'padding' : undefined` with unconditional `behavior="padding"` on modal sheets in `FacultyScreen.tsx`.
- [x] **Phase 7: Final Verification, Build, Push & Final Memory Update** `complete`
  - Full TypeScript check: `npx.cmd tsc --noEmit` -> 0 errors.
  - Full bundle packaging: `npx.cmd expo export --no-bytecode` -> Exported `dist` successfully for Android & iOS.
  - Memory synchronized: `AGENTS.md` and `CLAUDE.md` updated in both workspace root and project root.
