# findings.md — Campus Events 360 Research & Discoveries

## 1. Official BUBT Web Portals (bubt.edu.bd)
- `https://www.bubt.edu.bd/news`: Main campus event & program hub. Hosts seminars, workshops, sports fests (e.g. "Kings of Futsal!"), research conferences ("BUBT Research Week"), receptions, and club handovers.
- `https://www.bubt.edu.bd/storage/news/...`: Official flyer and poster images stored here in high-res format.
- `https://www.bubt.edu.bd/notice`: Administrative deadlines, exam schedules, registration deadlines, and holiday closures with embedded JSON (`notices: [...]`).
- 16 Active BUBT Clubs: BNCC, Rover Scout, IT Club, Cultural Club, Sports Club, Debating Club, Photography Club, Civil Engineering Club, EEE Club, IEEE Student Branch, Moot Court Society, Business Club, Economics Club, English Language Club, Social Welfare Club, BASIS Students Forum.

## 2. Existing Codebase Analysis
- Supabase table `events` already contains `banner_url`, `capacity`, `club_id`, `venue`, `date`, `time`, `end_time`.
- However, mobile `EventsBrowseScreen.tsx` and `EventDetailScreen.tsx` ignored `banner_url` and only rendered category icon boxes.
- Mobile only has binary status (`Upcoming` / `Past`), whereas Web sibling `Events.jsx` calculates 4-tier status (`Upcoming`, `Today`, `Ongoing`, `Ended`).
- Missing features in mobile: Search bar, saved/bookmarked events, QR digital event pass, flyer upload in post form, native share sheet, club deep linking.

## 3. Proven Synchronization Pipeline
- Notices sync runs every 30m via `pg_cron` calling Edge Function `sync-notices`.
- We will replicate this pattern with `sync-events` to crawl `bubt.edu.bd/news` and academic milestones.

