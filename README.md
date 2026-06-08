# CampusOne

A mobile app for BUBT students built with React Native (Expo) and Supabase.

---

## What it does

CampusOne covers the day-to-day needs of a university campus in a single app:

- **Report issues** — submit maintenance or safety reports, track status updates
- **Lost & Found** — post lost items, file claims with proof photos
- **Campus marketplace** — buy and sell books, electronics, notes between students
- **Clubs** — browse clubs, join, and manage events if you're a lead
- **Study Hub** — share and download course notes organized by intake and section
- **Blood donation** — register as a donor, post urgent requests
- **Jobs & internships** — browse and post campus recruitment listings
- **Ride sharing** — coordinate travel with other students
- **Faculty directory** — search staff by department, view research profiles
- **Medical center** — doctor listings and appointment queue tokens
- **Campus info** — bus routes, prayer times, official notices
- **Staff/Admin dashboards** — assign and resolve reports, manage users

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.76 + Expo SDK 52 |
| Language | TypeScript |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Icons | `@expo/vector-icons` (Feather) |
| State | React Context + useReducer |

---

## Project structure

```
src/
  components/      shared UI components (Icon, TopBar, cards)
  hooks/           useTheme, useAuth, etc.
  lib/             supabase client
  navigation/      stack and tab navigator definitions
  screens/         one folder per feature area
  services/        all Supabase query functions
  store/           auth context + reducer
  theme/           colors, typography, spacing tokens
  types/           database type definitions

supabase/
  config.toml      local dev config
  migrations/      61 ordered SQL migrations (full schema history)
```

---

## Getting started

**Prerequisites:** Node 18+, Expo CLI, an iOS/Android simulator or Expo Go.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go or press `i`/`a` to open in a simulator.

### Environment

No `.env` file needed for development — the Supabase anon key is safe to ship in the client bundle. The client is configured in `src/lib/supabase.ts`.

---

## Database

The schema is maintained as numbered SQL migrations in `supabase/migrations/`. Each file is a self-contained, idempotent migration that can be applied in order to any blank Postgres 15 database.

To apply locally with the Supabase CLI:

```bash
supabase start
supabase db reset   # applies all migrations from scratch
```

Migrations cover: core schema and constraints (0001), RLS policies (0002–0003), storage buckets (0004, 0010), feature schemas (0016+), and a series of incremental security hardening patches through 0061.

---

## Authentication

Supabase Auth with email/password. A database trigger in migration 0001 automatically creates a row in `public.profiles` when a user signs up. Role values: `student`, `staff`, `admin`.

---

## Contributing

1. Branch off `main`
2. Keep migrations additive — never edit an existing migration file
3. New migrations follow the `XXXX_short_description.sql` naming convention
4. Run `npx expo start` and verify on both iOS and Android before opening a PR
