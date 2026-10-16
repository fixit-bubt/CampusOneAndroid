# CampusOne Master Account Handover & Infrastructure Status
**From Old Personal Accounts to Master Team Account (`campusone2026@gmail.com`)**

This document tracks every service, database, login system, notification service, and credential needed to run CampusOne across both the Web Application and Android Mobile App.

---

## 1. Master Accounts & Credentials Overview

| Service | Old Account / Owner | New Master Team Account | Status |
|---|---|---|---|
| **Google Master Email** | Personal email(s) | `campusone2026@gmail.com` | **Active & In Use** |
| **Supabase (Database, Auth, Storage)** | Personal account | `campusone2026@gmail.com` (`campusone` org) | **100% Completed** |
| **Vercel (Web Hosting)** | Personal account | `campusone2026@gmail.com` (`campusone2026-4009`) | **100% Completed** |
| **GitHub (Web & Android Repos)** | `fixit-bubt` organization | `fixit-bubt` organization | **100% Completed** |
| **Google Cloud Console (OAuth & Sign-In)** | `campusone2026@gmail.com` (`campusone-511812`) | Web & Android OAuth Clients Active | **100% Completed** |
| **Firebase (Push Notifications)** | `campusone-853e6` | Needs linking to `campusone2026@gmail.com` | ⚠️ **Action Required** |
| **Custom SMTP (Verification Codes & OTPs)** | Default Supabase free tier | Needs custom provider (Resend / Brevo) | ⚠️ **Action Required** |
| **Google Play Console (App Store)** | Personal Account (`nawyaj morshed`) | In progress (NID/Passport & 20-tester rule) | ⏳ **In Progress** |

---

## 2. Completed Work (What Is Already Transferred & Working)

### 2.1 Supabase Backend (Project Ref: `xhgpxvyqrufbbuivttmi`)
- **Ownership:** Transferred to `campusone2026@gmail.com`.
- **Project Name:** `campusone` (Region: `ap-south-1` / Mumbai).
- **Data & Tables:** 100% preserved (all 88 migrations, all user accounts, student profiles, and tables intact).
- **Storage Buckets:** `photos` (listing items, profile photos, ride avatars, proof claims) fully working.
- **URL Configuration:**
  - Site URL set to: `https://campusonebubt.vercel.app`
  - Redirect URLs configured for: `https://campusonebubt.vercel.app/**` and `https://campusonebubt.vercel.app/#/auth/callback`

### 2.2 Vercel Web Deployment (Live Production)
- **Live URL:** [https://campusonebubt.vercel.app](https://campusonebubt.vercel.app)
- **Team Account:** `campusone2026@gmail.com` (username `campusone2026-4009`).
- **Project:** `campusonebubt` connected to GitHub repo `fixit-bubt/CampusOneWeb` on `main`.
- **Auto-Deploy:** Every code push to `main` automatically builds and deploys to production.
- **Environment Variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in Vercel.

### 2.3 Web In-App Notifications
- In-app notification center ([Notifications.jsx](file:///c:/Users/dracu/Desktop/CampusOneWeb/CampusOneWeb/src/screens/notifications/Notifications.jsx)) and top header bell counter are 100% working live with real-time database updates.

### 2.4 Android Mobile App Core Code
- Android app builds locally with release keystore (`campusone-release.keystore`, alias: `campusone`, pass: `campusone2026`).

### 2.5 Google Cloud Console & Unified Sign-In (Web + Android)
- **Project:** `campusone` (Project ID: `campusone-511812`, Project number: `22710751786`) under `campusone2026@gmail.com`.
- **OAuth Consent Screen:** Configured with user type External, published live to Production.
- **Web OAuth Client ID:** `22710751786-rbud0t5dkb7hiij9vtj6pumkdc29lrha.apps.googleusercontent.com`
  - Origins: `https://campusonebubt.vercel.app`, `https://xhgpxvyqrufbbuivttmi.supabase.co`
  - Redirect URI: `https://xhgpxvyqrufbbuivttmi.supabase.co/auth/v1/callback`
  - Synced to Supabase Authentication Google Provider.
  - Synced to Android `src/lib/googleAuth.ts` (`GOOGLE_WEB_CLIENT_ID`).
- **Android OAuth Client ID:** `22710751786-udnebs4hqg7e775ru67flmgpb84gjnkd.apps.googleusercontent.com`
  - Package: `com.bubt.campusone`
  - SHA-1 Fingerprint: `96:1D:69:A2:BB:57:98:4F:C2:EC:B7:BC:3B:59:09:3A:A9:31:34:72` (from `campusone-release.keystore`).

---

## 3. Pending Work (What Is Left To Hand Over & Configure)

---

### Task 1: Google Cloud Console & Web Google Sign-In — ✅ COMPLETED
* **Completed on:** October 16, 2026.
* **Result:** Web Google Sign-In works without `redirect_uri_mismatch`, and Android Google Sign-In is linked to the unified master project.

---

### Task 2: Firebase & Lockscreen Push Notifications
* **Why it is needed:** The Android app code (`push.ts`) and Supabase Edge Function (`send-push`) are fully coded. However, for Supabase to deliver lockscreen notifications through Google's servers to student phones, it needs the Firebase Service Account private key under the master team account.
* **Steps to Complete:**
  1. Go to [Firebase Console](https://console.firebase.google.com/) using `campusone2026@gmail.com`.
  2. Open or create the project for CampusOne (or transfer the existing `campusone-853e6`).
  3. Go to **Project Settings -> General**:
     - Download the latest `google-services.json` and replace `CampusOne/android/app/google-services.json`.
  4. Go to **Project Settings -> Service accounts**:
     - Click **Generate new private key**.
     - Download the JSON file.
  5. Open **Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets**:
     - Add/update secret named: **`FCM_SERVICE_ACCOUNT`**
     - Value: Paste the **entire contents of the downloaded JSON file**.
     - Save.
  6. **Result:** All campus notifications (urgent blood alerts, ride requests, issue updates) will immediately pop up on student Android lockscreens.

---

### Task 3: Email Verification Codes & Password Reset (SMTP)
* **Why it is needed:** Supabase's built-in default email service has a strict rate limit of only **3 to 4 emails per hour**. If multiple students sign up or request a password reset at once, verification emails get delayed or blocked.
* **Steps to Complete:**
  1. Create a free account at [Resend](https://resend.com) or [Brevo](https://brevo.com) using `campusone2026@gmail.com`.
  2. Generate an SMTP API Key.
  3. In **Supabase Dashboard -> Authentication -> Email Settings**:
     - Enable **Custom SMTP**.
     - Sender email: `noreply@campusonebubt.com` or `campusone2026@gmail.com`.
     - Host: e.g. `smtp.resend.com` (Port `465` or `587`).
     - Username & Password: The generated SMTP credentials.
  4. **Result:** Signup verification codes, 6-digit OTPs, and password reset links will deliver to student inboxes instantly with 0 delay.

---

### Task 4: Google Play Console Publishing Track
* **Current Owner:** Personal Account ID `6137426018535669538` (`nawyaj morshed`).
* **Requirements to Fulfill Before Production:**
  1. Complete Government Identity Verification (Passport or Bangladesh NID card) and SMS phone number check.
  2. Run the mandatory **20-tester closed test for 14 continuous days** (Google policy for personal accounts created after Nov 2023).
  3. Verify store listing privacy policies match the live hosted URLs:
     - Privacy Policy: `https://campusonebubt.vercel.app/privacy-policy.html`
     - Account Deletion: `https://campusonebubt.vercel.app/delete-account.html`
  4. Generate signed release bundle:
     ```bash
     cd android
     .\gradlew bundleRelease
     ```
     Upload `android/app/build/outputs/bundle/release/app-release.aab` to Google Play Console.

---

## 4. Emergency Contacts & Master Secrets Quick-Reference

- **Master Team Email:** `campusone2026@gmail.com`
- **Supabase Project Ref:** `xhgpxvyqrufbbuivttmi`
- **Live Web Production:** `https://campusonebubt.vercel.app`
- **Release Keystore File:** `CampusOne/campusone-release.keystore`
  - Keystore Alias: `campusone`
  - Keystore Password: `campusone2026`
- **GitHub Web Repo:** `https://github.com/fixit-bubt/CampusOneWeb.git`
- **GitHub Mobile Repo:** `https://github.com/fixit-bubt/CampusOneAndroid.git`
