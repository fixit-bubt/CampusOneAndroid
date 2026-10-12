# task_plan.md — Campus Events 360 & Automated BUBT Sync

## Goals & Objectives
Build a complete, varsity-pitch-ready 360-degree Events system for CampusOne and FixIt web companion, with automated background synchronization from official BUBT portals (bubt.edu.bd/news and notice board), digital QR event passes, rich flyer banners, live 4-tier countdown status, and complete club integration.

## Phases
- [x] **Phase 1: Database Schema & Cron Migration** `complete`
  - Created migration `20261020000000_events_360_sync.sql` (source, external_url, tags, bookmarks, sync logs, notification trigger).
  - Created migration `20261020010000_events_sync_cron.sql` (pg_cron + pg_net auto-sync every 30m).
- [x] **Phase 2: Automated Crawler Edge Function** `complete`
  - Created `supabase/functions/sync-events/index.ts` to crawl bubt.edu.bd/news and academic milestones, extract flyers, map clubs/categories, upsert into events table, and log execution.
- [x] **Phase 3: Frontend Data Services & Types** `complete`
  - Updated `src/types/database.ts` and `src/types/supabase.ts`.
  - Created `src/services/eventsService.ts` for queries, 4-tier status, search, bookmarks, digital passes, and sharing.
- [x] **Phase 4: Mobile Screen Overhauls** `complete`
  - Overhauled `EventsBrowseScreen.tsx`: Banners, search, 4-tier status badges, saved tab, calendar agenda.
  - Overhauled `EventDetailScreen.tsx`: Hero banner, digital BUBT Event Pass modal with QR code, share sheet, club deep linking, calendar export.
  - Overhauled `EventPostScreen.tsx`: Banner image upload, club selector, capacity validation, error handling.
- [x] **Phase 5: Sibling Web App Parity** `complete`
  - Updated `fixit-campus/src/screens/events/Events.jsx` for official source badges, links, and parity.
- [x] **Phase 6: Verification, Memories & Git Deployment** `in_progress`
  - Ran type checks (`cmd /c npx tsc --noEmit` -> 0 errors).
  - Ran web build (`cmd /c npm run build` -> passed in 3.67s).
  - Updated `AGENTS.md` and `CLAUDE.md`.
  - Commit with user-only author (no AI trailers) and push to GitHub remote.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Missing `}` on donors table in `supabase.ts` | 1 | Restored closing brace |
| `toggle_event_bookmark` RPC signature missing in `supabase.ts` | 1 | Added RPC function signature to `supabase.ts` |
| `scroll-velocity-text.tsx` had unresolved `motion/react` import | 1 | Changed import to `framer-motion` |
| `utils.ts` in web missing `clsx` package | 1 | Implemented zero-dependency `cn` helper |

## Next Step
Commit changes and push to git remotes.
