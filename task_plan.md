# task_plan.md — Permanent Sync, Crawler, Faculty Short-Codes & Deep QA System

## Core Objectives
Implement permanent, robust solutions for notice synchronization, automated faculty directory crawling with initial/short codes, modern official BUBT profile URLs, missing faculty onboarding (e.g. Shaila Shaznin `SSN`), frontend search and fallback resilience, deployment to Supabase & GitHub, followed by an exhaustive multi-agent faculty module audit, bug fixes, verification, build, and memory synchronization.

## Phases
- [ ] **Phase 1: Fix `sync-notices` Edge Function**
  - Strip `id` from `rowsToUpsert` so all rows have uniform keys (preventing PostgREST 400 `PGRST102` error).
  - Normalize all optional fields with explicit `null` defaults.
  - Implement chunk-level batch upsert with row-by-row fallback so single invalid records never poison the batch.
  - Ensure counts (`newAdded`, `updatedCount`) only increment upon successful DB commits.
- [ ] **Phase 2: Fix `sync-faculty` Edge Function**
  - Replace N+1 sequential query waterfall (>800 DB calls) with pre-loaded in-memory set diffing.
  - Parse all 13 BUBT department rosters completely (overcoming the 78-faculty timeout).
  - Extract routine short codes (`SSN`, `SR`, `MAHB`, etc.) from profile link slugs.
  - Store active, modern BUBT profile URLs (`https://www.bubt.edu.bd/department/${slug}/faculty/profile/${shortCode}`).
  - Implement batch inserts for new faculty (e.g. Shaila Shaznin) and batch upserts for existing faculty updates (chunks of 50).
  - Isolated error handling per department.
- [ ] **Phase 3: Deploy & Execute Edge Functions**
  - Deploy `sync-notices` and `sync-faculty` to Supabase project `xhgpxvyqrufbbuivttmi`.
  - Trigger `sync-notices` and verify Notice 1634 (`BUBT-N-1634`) is inserted into `public.announcements`.
  - Trigger `sync-faculty` and verify Shaila Shaznin (`SSN`) is in `public.faculty` and short codes are populated for all teachers.
- [ ] **Phase 4: Frontend Safeguard in `FacultyProfileScreen.tsx`**
  - Dynamic URL normalization in `openLink` to rewrite legacy `cse.bubt.edu.bd` or numeric URLs to modern BUBT links on the fly.
- [ ] **Phase 5: First Verification, Build & GitHub Push**
  - TypeScript type check (`npx.cmd tsc --noEmit`).
  - Deploy edge functions to Supabase.
  - Git commit (zero AI footprint, user as author) and push to GitHub `origin main`.
  - Initial memory update (`AGENTS.md` and `CLAUDE.md`).
- [ ] **Phase 6: Multi-Agent Deep Audit of Faculty Module (50 Lenses)**
  - Audit across Search, Navigation, 58dp Standard, Design System, Type Safety, Bookmarking, Mentorship, Admin CRUD, Offline Cache, Empty/Loading States, Accessibility, Re-render performance.
  - Fix any discovered bugs/imperfections.
- [ ] **Phase 7: Final Verification, Build, Push & Final Memory Update**
  - Full TypeScript and packaging verification.
  - Deploy any updated edge functions/DB changes.
  - Git commit and push to `origin main`.
  - Final synchronization of `AGENTS.md` and `CLAUDE.md`.
