# Progress Log

## Status: Starting Phase 1
- Root causes identified and verified against live BUBT HTML and Supabase database.
- Notice 1634 failure: Key mismatch in PostgREST batch array (`id` present on some objects, absent on others).
- Faculty short-code failure: N+1 sequential waterfall hit Edge Function timeout after scanning only 78 teachers, leaving 339 teachers un-updated and missing new teachers like Shaila Shaznin.
- Verified BUBT's new URL structure: `https://www.bubt.edu.bd/department/${slug}/faculty/profile/${shortCode}` returns 200 OK.
