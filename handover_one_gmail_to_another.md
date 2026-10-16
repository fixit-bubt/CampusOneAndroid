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
| **Firebase (Push Notifications)** | `campusone2026@gmail.com` (`campusone-511812`) | Service Account & FCM Active | **100% Completed** |
| **Google Gemini API (Campus AI Assistant)** | Personal Google account | `campusone2026@gmail.com` (`campusone-511812`) | **100% Completed** |
| **Custom SMTP (Verification Codes & OTPs)** | Default Supabase free tier | Deferred to Custom Domain (Default active; 95%+ use Google OAuth) | ⏳ **Deferred to Custom Domain** |
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

### 2.6 Firebase & Lockscreen Push Notifications
- **Firebase Project:** `campusone-511812` active under `campusone2026@gmail.com`.
- **Android App Registered:** `com.bubt.campusone` (SHA-1: `96:1D:69:A2:BB:57:98:4F:C2:EC:B7:BC:3B:59:09:3A:A9:31:34:72`).
- **Android Config:** `CampusOne/android/app/google-services.json` updated with project `22710751786` and client ID `22710751786-rbud0t5dkb7hiij9vtj6pumkdc29lrha.apps.googleusercontent.com`.
- **FCM Service Account Key:** Generated and securely deployed to Supabase Edge Function Secrets as `FCM_SERVICE_ACCOUNT`.
- **Push Pipeline:** Supabase `send-push` Edge Function and database triggers (`trg_push_on_notification`) are fully active for delivering urgent blood requests, ride bookings, and issue tracking directly to student lockscreens.

### 2.7 Google Gemini API (Campus AI Assistant)
- **Account:** Generated under `campusone2026@gmail.com` in Google AI Studio.
- **Linked Project:** `campusone` (Project number `22710751786`, ID `campusone-511812`).
- **Supabase Secret:** Deployed to project `xhgpxvyqrufbbuivttmi` Edge Function Secrets as `GEMINI_API_KEY`.
- **Status:** Tested and verified live with `gemini-flash-lite-latest` model powering the in-app campus chatbot.

---

## 3. Pending Work (What Is Left To Hand Over & Configure)

---

### Task 1: Google Cloud Console & Web Google Sign-In — ✅ COMPLETED
* **Completed on:** October 16, 2026.
* **Result:** Web Google Sign-In works without `redirect_uri_mismatch`, and Android Google Sign-In is linked to the unified master project.

---

### Task 2: Firebase & Lockscreen Push Notifications — ✅ COMPLETED
* **Completed on:** October 16, 2026.
* **Result:** Firebase Admin SDK private key is configured as `FCM_SERVICE_ACCOUNT` in Supabase Secrets, and `google-services.json` is updated in the Android app. Lockscreen push notifications are live and fully operational.

---

### Task 3: Email Verification Codes & Password Reset (SMTP) - ⏳ DEFERRED TO CUSTOM DOMAIN
* **Current Status:**
  - Supabase default transactional email service is active and handling standard signups and password resets.
  - 95%+ of students authenticate via unified Google OAuth, which bypasses SMTP completely.
* **Why Deferred:**
  1. Google App Passwords requires a FIDO2 Bluetooth Low Energy (BLE) proximity handshake that causes an infinite passkey challenge loop on PCs without BLE adapters.
  2. Brevo SMS 2FA delivery fails for Bangladesh numbers (+880) due to strict international A2P telecom filtering.
  3. Resend free tier without a verified custom domain only permits sending to the team's own email (`campusone2026@gmail.com`).
* **Next Action:**
  - When the custom production domain (`campusonebubt.com`) is connected, add DNS verification records (DKIM/SPF/MX) on Resend or Brevo to enable custom SMTP with zero SMS or passkey obstacles.

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
