# Master Specification: Transferring Mobile Phone Design & Functionality to Web (CampusOne)

This document serves as the single authoritative specification and engineering blueprint for transforming the mobile viewport of **CampusOne Web** (`CampusOneWeb`) to achieve a **100% pixel-and-behavior-identical match** with the **CampusOne Android Mobile App** (`CampusOne`).

When a student, faculty member, or staff opens the website on a mobile phone browser, the layout, navigation hierarchy, component rhythms, interactive modals, touch gestures, and tactile feedback will be indistinguishable from the native Android application.

---

## 1. Executive Principles & Architectural Alignment

### 1.1 Zero Database Changes
Both the Web application (`CampusOneWeb`) and the Mobile application (`CampusOne`) run on the exact same Supabase backend:
- **Project Ref:** `xhgpxvyqrufbbuivttmi` (Region: `ap-south-1` / Mumbai)
- **Shared Schema:** Identical database tables (`listings`, `rides`, `donors`, `blood_requests`, `blood_pledges`, `reports`, `study_sections`, `study_courses`, `clubs`, `events`, `announcements`, `jobs`, `profiles`, `faculty`, `crawler_audit_logs`).
- **Shared Business Logic:** Contact reveal RPCs (`listing_contact`, `ride_contact`, `donor_contact`), background triggers, and storage buckets (`photos`, `reports`, `study-files`).
- **Scope:** Zero SQL migrations or database alterations are required. The entire transformation is pure frontend design, component ergonomics, navigation routing, responsive CSS token alignment, and client-side processing.

### 1.2 Viewport Isolation & Container Scaling Strategy
- **Desktop (Viewport $\ge$ 1280px / `xl`):** Remains 100% intact with the floating navigation capsule, `MegaMenu` multi-level dropdowns, desktop dashboard banners, and wide-screen layouts.
- **Mobile Handheld (Viewport < 768px / `md`):** Automatically switches to the native mobile app shell, adopting the 60px headers, flat midnight navy bottom navigation bar, 58/72 ergonomic scale, native bottom sheet modals, and mobile card layouts.
- **Tablet & Medium Windows (768px $\le$ Viewport < 1280px):** If the mobile interface is displayed on viewports wider than a handheld phone (such as iPads or medium browser windows), the content area **must be constrained in a centered mobile viewport container** (`max-w-md mx-auto` or `max-w-lg mx-auto`) with a neutral backdrop. 58px buttons and 72px rows must **never stretch unconstrained across a 1000px+ screen**.

### 1.3 State Role String Casing Guard
* **Database & Android Auth:** The Supabase `profiles.role` column and Android `authStore.ts` store lowercase strings: `'student'`, `'admin'`, `'staff'`.
* **Web Frontend State (`data/store.jsx`):** On Web, `currentUser.role` is normalized to title-case: `'Student'`, `'Staff'`, `'Admin'`.
* **Rule:** All web route guards and role-adaptive conditions must evaluate against title-case `currentUser.role === 'Student'` (or use a case-insensitive helper `currentUser.role?.toLowerCase() === 'student'`) to prevent broken role guards.

---

## 2. Universal Ergonomic Standards: The 58 / 72 System

The native mobile app strictly enforces the **58 / 72 System** across all 19 feature sectors (`DESIGN.md`). Web components must adopt these exact dimensional tokens on mobile viewports:

```
┌────────────────────────────────────────────────────────┐
│  1. CONTROLS, TABS, SEARCH, AND CTAs        ── 58 px   │
├────────────────────────────────────────────────────────┤
│  2. CONTENT CARDS, FEED ROWS, AND LIST ROWS ── 72 px   │
└────────────────────────────────────────────────────────┘
```

### 2.1 Standard A: 58 px Universal Control Bar
- **Outer Height:** Fixed `58px` (`h-[58px]`).
- **Corner Radius:** `16px` (`rounded-2xl`).
- **Border:** `1px` solid `var(--border)`.
- **Applied Controls:**
  1. **Segmented Switcher Tabs (`SegmentedTabs.jsx`):**
     - Outer container: `height: 58px`, `borderRadius: 16px`, `padding: 4px`, background `var(--surface-2)`.
     - Sliding indicator pill: `height: 50px`, `borderRadius: 12px`, background `var(--surface)`, subtle elevation shadow.
     - Label: `13.5px`, bold active / medium inactive.
     - Counter badge pill: `height: 22px`, `minWidth: 20px`, `borderRadius: 999px`, font `11px`, bold white text on `#ef4444`.
  2. **Search Inputs:**
     - Container: `height: 58px`, `borderRadius: 16px`, `paddingHorizontal: 16px`, background `var(--surface-2)`.
     - Icon: 18px search glyph. Text: 14.5px, medium weight. 300ms debounce handler on input change.
  3. **Dual Sub-Filter Bars & Dropdown Triggers:**
     - Buttons: `height: 58px`, `borderRadius: 16px`, `paddingHorizontal: 14px`.
  4. **Primary Action CTAs & Form Submission Buttons:**
     - Connect, Submit, Create, Offer, Sell, Join: `height: 58px`, `borderRadius: 16px`, font `14.5px`, bold.
  5. **Emergency Action Buttons:**
     - "Request Blood" / "Report Campus Issue": `height: 58px`, `borderRadius: 16px`, prominent danger/brand fills.
  6. **Google Sign-In Button (`GoogleButton.jsx`):**
     - `height: 58px`, `borderRadius: 16px`, 1.5px border, white 28×28px G-box with authentic multi-color SVG Google logo.

### 2.2 Standard B: 72 px Universal Content & Card Row
- **Outer Height:** `72px` (`min-h-[72px]` or fixed `h-[72px]`).
- **Corner Radius:** `16px` (`rounded-2xl`).
- **Border:** `1px` solid `var(--border)`.
- **Padding:** `12px` to `14px` horizontal and vertical.
- **Thumbnail / Icon Box:** `44 × 44 px` with `13px` radius (or `48 × 48 px` with `12px` radius for image previews).
- **Typography:** Title `14.5px` (Bold, clamped to 1 line `truncate`), Subtitle `11.5px` (Medium, clamped to 1 line `truncate`).
- **Applied Components:**
  - Status Strips on Home.
  - Explore Screen Category Child Bars.
  - Student Directory Rows.
  - Faculty Directory Rows with Monospace Short-Codes.
  - Blood Donor Rows & Blood Request Cards.
  - Lost & Found Feed Rows (`LFCard`).
  - Community Updates & Notice Feed Rows.
  - Frequent Tool Shortcut Cards.
  - Handover Meetup Location Cards.

### 2.3 Global Layout & Spacing Tokens
- **Screen Gutters:** Exactly `16px` horizontal padding (`px-4`).
- **Item Gaps:** `10px` to `12px` vertical gap between list cards (`space-y-2.5` / `gap-2.5`).
- **Card Margins:** `10px` to `11px` bottom margin.

### 2.4 Strict Zero-Emoji Compliance Standard
- **Universal Project Rule:** No raw Unicode emojis (`🚗`, `🛺`, `🏍️`, `🩸`, `⚡`, `🎉`, `✨`, etc.) are permitted in button text, filter chips, list badges, or UI microcopy.
- **Vector Badges:** All status indicators, vehicle categories, and urgencies must strictly use vector badges (`StatusBadge` or `@expo/vector-icons` / Lucide React) with curated semantic color tokens.

---

## 3. Shell & Navigation Architecture Overhaul (`AppShell.jsx`)

### 3.1 Header Transformation: Replacing 44px Header with 60px TopBar & SubBar
On mobile viewports, the legacy 44px (`h-11`) header with the hamburger drawer button is completely replaced by two dedicated 60px headers:

#### 1. Root Tab TopBar (`<TopBar />`) — For Root Tabs (Home, Study Hub, Messages, Explore, Settings)
- **Height:** Fixed `60px` (`h-[60px]`).
- **Background:** `var(--surface)` with hairline bottom border `var(--border)`.
- **Left Slot:**
  - Houses the authentic 32×32px vector `LogoMark`.
  - **Beside-Logo Single Title or Brandmark:**
    - On **Home Tab:** Displays `Campus` (`19px`, `var(--text)`, ExtraBold) and `One` (`19px`, `#34d399` in dark / `#059669` in light) accompanied by a dynamic Role Badge (`ADMIN` or `STAFF`).
    - On **Other Root Tabs:** Displays the single localized title (`Study Hub`, `Messages`, `Explore`, `Settings`) in `18.5px` ExtraBold (`var(--text)`) with zero subtitle clutter.
- **Right Slot:** Dedicated 40×40px tactile icon button (`var(--surface-2)`, `border: 1px solid var(--border)`, `borderRadius: 14px`) housing the notification bell with red unread count badge. Tapping navigates to `/notifications`.

#### 2. Child Screen SubBar (`<SubBar />`) — For All Internal Sub-Routes
- **Height:** Fixed `60px` (`h-[60px]`).
- **Bilateral Symmetry Standard:**
  - **Left Side:** 40×40px tactile icon button (`rounded-2xl`, `border`, `bg-surface-2`) housing a 20px back arrow (`ArrowLeft`).
    - **Safe Back Fallback:** If `window.history.state && window.history.state.idx > 0`, it calls `window.history.back()`; otherwise, it cleanly falls back to the parent feature route (e.g., direct navigation to `/marketplace`).
  - **Center:** Clamped 1-line centered title (`16.5px`, bold, `text-center`, `truncate`).
  - **Right Side:** 40×40px alignment box housing the 28×28px `LogoMark` or a custom contextual action button (such as Filter, Add, or Call).

#### 3. Complete Elimination of the Slide-In Hamburger Drawer on Mobile
- The sliding hamburger drawer is retired on mobile. All services are directly accessible via the bottom navigation tabs and the in-app `Explore` screen.

---

### 3.2 Bottom Navigation Bar: Flat-Top Midnight Navy Standard

The current web mobile navigation features a center valley cradle notch and an elevated 3D Cosmic Glass AI Orb. The native mobile app retired the center cradle notch in favor of a clean, flat-top design with an electric blue full-tab sliding card.

#### 1. Retirement of the Center Valley Cradle Notch
- Web's existing curved cradle SVG path calculations (`cradleLeft`, `cradleCenter`, `cradleRight` in `BottomNavBackdrop`) and the elevated floating AI orb (`isCenterFab`) are **completely removed from the bottom bar**.
- The AI Assistant is relocated to the student `ExploreScreen` as a prominent 72px Quick Access card.

#### 2. 1-Piece Continuous SVG Backdrop
- **Gradient Stops:** Linear vertical gradient from `#0f2862` (top) to `#0a1b42` (bottom).
- **Top Rim Highlight Stroke:** `1px` continuous crisp stroke in `rgba(255, 255, 255, 0.16)`.
- **Top Geometry:** Flat top edge across all tabs with `20px` rounded outer shoulders (`r = 20px`):
  ```svg
  M 0,20 A 20,20 0 0 1 20,0 L ${width - 20},0 A 20,20 0 0 1 ${width},20 L ${width},${height} L 0,${height} Z
  ```
- **Height:** `62px` + `env(safe-area-inset-bottom)` padding.

#### 3. Role-Adaptive Tab Distribution
- **Students (5 Tabs):**
  1. `Home` (`/dashboard`, icon: `Home`)
  2. `Study Hub` (`/study-hub`, icon: `BookOpen`)
  3. `Messages` (`/messages`, icon: `MessageCircle`, with dynamic red unread count badge)
  4. `Explore` (`/explore`, icon: `Grid`)
  5. `Settings` (`/settings`, icon: `Settings`)
- **Admin (4 Tabs):** `Home` (`/admin`) | `Study Hub` (`/study-hub`) | `Explore` (`/explore`) | `Settings` (`/settings`)
- **Staff (3 Tabs):** `Home` (`/staff`) | `Explore` (`/explore`) | `Settings` (`/settings`)

#### 4. Active Tab Sliding Indicator Card Standard
* **Indicator Design:** The active tab is highlighted by a **full-tab sliding card** (not an isolated box around the icon):
  * Dimensions: `width: tabWidth - 6px`, `height: 50px`, `borderRadius: 14px`.
  * Fill: `rgba(96, 165, 250, 0.18)` with `1px solid rgba(96, 165, 250, 0.35)` border.
  * Placement: Slides behind **both the icon and label**.
  * Animation: Smooth, critically damped spring transition (`duration: 250ms`, `ease-out`) with zero bounce.
* **Active State:** Icon and label in `#60a5fa` (Plus Jakarta Sans SemiBold, 10.5px).
* **Inactive State:** Icon and label in soft muted slate `rgba(148, 163, 184, 0.55)`. Active dot below the label is eliminated.

---

## 4. Native Bottom Sheet Modal Architecture Standard

On the mobile phone app, secondary forms, pickers, and detail views never render as centered desktop dialog boxes. On web mobile viewports, all modals must transform into **Native Bottom Sheets**:
- **Positioning:** Fixed to viewport bottom: `fixed inset-x-0 bottom-0 z-50`.
- **Backdrop:** Semi-transparent scrim: `bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs`.
- **Sheet Container:**
  - Top rounded corners: `rounded-t-[24px]`.
  - Max height: `max-h-[85vh]` or `max-h-[90vh]` with internal smooth scrolling (`overflow-y-auto`).
  - Top Drag Indicator Bar: `width: 40px`, `height: 4px`, `borderRadius: 999px`, background `var(--border)`, centered at top with `my-2.5`.
  - Header: 60px height with sheet title (`16.5px` bold) and right close `X` button (`36×36px` pill).
- **Dismissal:** Tap on backdrop, press Escape key, or tap the close button.

---

## 5. Universal Interactive Contact Sheet (`ContactSheet.jsx`)

Used universally across Blood Donation, Campus Rides, Marketplace, and Student Directory for 1-tap contact reveal:
- **Presentation:** Native Bottom Sheet with 40×4px grab handle.
- **Header:** 54×54px Avatar, Full Name (`17px` bold), Role/Intake subtitle (`12px` muted), close `X` button.
- **Phone Display Card (72 px):**
  - Height: `72px`, background `var(--surface-2)`, border `var(--border)`.
  - Phone icon, bold phone number text (`15.5px`).
  - "Copy" button: copies clean digits to clipboard, triggers floating Toast (`"Phone number copied to clipboard"`).
- **Direct 1-Tap Communication CTAs (58 px):**
  - **WhatsApp Button:** 58 px height, `#25D366` green background, WhatsApp icon, opens `https://wa.me/...`.
  - **CampusOne Chat Button:** 58 px height, Brand Blue, opens in-app direct chat thread (`/messages/:threadId`).
  - **Call Phone Button:** 58 px height, `#10B981` emerald background, opens `tel:...` dialer.
  - **Send Email Button:** 58 px height, `#8B5CF6` purple background, opens `mailto:...`.

---

## 6. Authentication & Onboarding Flow Parity

### 6.1 Sign In (`Login.jsx`)
- **Header:** 60 px `SubBar` with back arrow, centered "Sign In", logo on right.
- **Quick Domain Chips:**
  - Directly above the email input: two 1-tap pills (`@bubt.edu.bd` and `@gmail.com`).
  - Tapping auto-completes or appends the university domain.
- **58 px Form Inputs:**
  - Email input (`58px` height, `16px` radius).
  - Password input (`58px` height, `16px` radius) with toggle visibility eye icon.
- **58 px Primary CTA:** "Sign In" button (`bg-brand`, bold white text).
- **58 px Google Button (`GoogleButton.jsx`):**
  - "Continue with Google" (`58px` height, `16px` radius, 1.5px border).
  - Authentic multi-color SVG Google 'G' glyph in white 28×28px bounding box.
  - `OrDivider`: Horizontal hairline with center pill ("or").
- **Footer:** "Forgot Password?" link and "Don't have an account? Sign Up" navigation.

### 6.2 Sign Up & Onboarding (`Register.jsx`, `VerifyEmail.jsx`, `RolePending.jsx`)
- **Register Form:** Full name, University email, Student ID (digits only with automated hyphenation), Department dropdown (72 px), Password & Confirmation (58 px).
- **Email Verification:** 6-digit verification code input cells with resend timer countdown.
- **Role Pending State (`RolePending.jsx`):**
  - 96 px status hero card for newly registered Staff or Admin accounts awaiting master team approval.

---

## 7. Authenticated Explore Hub (`/explore`) & Settings Hub (`/settings`)

### 7.1 Authenticated Explore Hub (`/explore`)
Web currently has explore views only for unauthenticated landing routes. The authenticated phone app features `ExploreScreen.tsx` as its central directory engine:

1. **Header:** Root `TopBar` with title "Explore".
2. **Quick Access Cards (Strictly Student-Only):**
   - **Fixi AI Assistant:** 72 px card, electric blue icon box (`MessageCircle`), title "AI Assistant", subtitle "Ask questions, get help with campus life", chevron right. Navigates to `/chatbot`. Hidden for Staff and Admin.
   - **Campus Issues Board:** 72 px card, danger icon box (`AlertTriangle`), title "Campus Issues", subtitle "Public student issues and community votes", chevron right. Navigates to `/campus-issues`. Hidden for Staff and Admin.
3. **4 Top-Level Collapsible Accordion Sections:**
   - **Academics (`#2ba0c9` / Cyan) — Hidden for Staff:**
     - Header: 72 px card, study icon, title "Academics", subtitle "Notes, routines, annex & tools", stacked stat block `8 TOOLS` (or `7 TOOLS` for Admin).
     - Children: Study Hub, Class Routines, Academic Calendar, Faculty Directory, Cover Page, Annex Portal, CGPA Calculator, PDF Maker (student-only).
   - **Campus Life (`#e0568a` / Rose):**
     - Header: 72 px card, clubs icon, title "Campus Life", subtitle "Clubs, events, prayer & jobs", stacked stat block `5 SERVICES`.
     - Children: Clubs, Events, Announcements, Prayer Times, Jobs & Internships. (Staff view filtered to Prayer & Announcements).
   - **Services (`#4f6bed` / Electric Blue):**
     - Header: 72 px card, medical icon, title "Services", subtitle "Clinic, bus routes & lost items", stacked stat block `3 SERVICES`.
     - Children: Medical Center, Bus Schedule, Lost & Found.
   - **Community (`#2e9e63` / Emerald):**
     - Header: 72 px card, market icon, title "Community", subtitle "Market, rides, blood & directory", stacked stat block `4 HUBS`.
     - Children: Student Marketplace, Campus Rides, Blood Donation, Student Directory (student-only).
4. **Child Row Standard (`styles.childBar`):**
   - Fixed `72px` outer height, `16px` border radius, `1px` border.
   - **4.5 px Left Accent Spine:** `border-l-[4.5px]` tinted in the sector's vibrant accent color.
   - Authentic 42×42px sector vector icon, 1-line bold title, 1-line subtitle, right chevron.

---

### 7.2 Dedicated Settings Hub (`/settings`)
1. **Header:** Root `TopBar` with title "Settings".
2. **Profile Identity Hero Card (96 px):**
   - Height: Fixed `96px`, padding `16px`, background `var(--surface)`.
   - Left: 54×54px Avatar.
   - Center: Full Name (`17px`, bold), Student ID + Intake/Section meta (`12px`), Role Badge pill (`22px` height).
   - Right: "View Profile" link with right chevron.
3. **Appearance Group:**
   - **Theme Switcher:** Single-line 58 px card (`[Moon Icon] [Dark Mode] [LiquidToggle]`). Syncs with `html.dark` class and `localStorage.getItem('fixit.theme')`.
   - **Language Switcher:** Single-line 58 px card (`[Globe Icon] [বাংলা ভাষা / English] [LiquidToggle]`).
4. **Notifications Group:**
   - Single-line 58 px card with master notifications switch and link to `/notifications/settings`.
5. **Data & Storage Group:**
   - Offline Data Sync switch.
   - Storage Cache counter (`X MB cached`) with "Clear App Cache" action.
6. **Security Group:**
   - Change Password trigger opening bottom sheet modal.
7. **About & University Group:**
   - BUBT institutional info, version `v2.4.0 (Build 56)`, developer team credits.
8. **Account Actions:**
   - 58 px Secondary "Sign Out" button.
   - 58 px Destructive "Delete Account" button with confirmation dialog.

---

## 8. Interactive Map Engine & Real-Time Proximity Architecture

Consolidated into one single universal mapping and direction modal standard across Marketplace, Blood Donation, Campus Rides, and Lost & Found:

### 8.1 Core Mapping Standards (`DirectionMapModal.jsx`, `HospitalMapModal.jsx`, `RideRouteMapModal.jsx`)
- **Presentation:** 84% Bottom Sheet on mobile view with 60 px SubBar and close `✕` button.
- **Engine:** MapLibre GL JS / Leaflet running vector tiles from OpenFreeMap:
  - Light Mode: `https://tiles.openfreemap.org/styles/liberty`
  - Dark Mode: `https://tiles.openfreemap.org/styles/dark`
- **Live Road Routing via OSRM:**
  - Queries `https://router.project-osrm.org/route/v1/{driving|foot}/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`.
  - Renders authentic highway polyline: 8px dark casing layer (`#0f172a`, opacity `0.35`) underneath a 5.5px core electric blue road polyline (`#2563eb`, opacity `0.95`).
- **Live Device GPS Proximity & Radar:**
  - Queries `navigator.geolocation.getCurrentPosition()`.
  - Calculates geodesic distance using Haversine formula (`X km away · ~Y min drive/walk`).
  - Displays pulsating blue GPS dot with expanding radar ring at user's current coordinates.
- **Floating Trip Summary Banner:** Frosted glass pill showing duration (`28 min`), distance (`20.2 km`), and ETA clock time (`11:45 PM`).
- **1-Tap Google Maps Voice Navigation CTA (58 px):**
  - Universal 58 px button launching external Google Maps:
    `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destCoords}&travelmode=${mode}`.

---

## 9. Automated BUBT Crawler & Sync Infrastructure

The campus information ecosystem relies on the **automated BUBT crawler infrastructure** (`bubt-crawler`, `sync-notices`, `sync-faculty`). The web app must reflect and interface with this engine:

### 9.1 Edge Function Tiers & Execution
- **Fast Cycle (`tier=fast`):** Auto-crawls official BUBT notices, circulars, and campus events every 6 hours via `pg_cron`.
- **Daily Faculty Cycle (`tier=faculty`):** Auto-crawls all 13 BUBT department rosters daily. Scrapes teacher designations, emails, modern canonical BUBT profile URLs (`https://www.bubt.edu.bd/department/${slug}/faculty/profile/${shortCode}`), and extracts teacher routine short codes (`short_code`).

### 9.2 Crawler Audit & Silent Mode
- **Audit Table (`crawler_audit_logs`):** Stores logs of all sync jobs: `feature` (notices, events, faculty), `triggered_by` (cron vs admin), `status`, `items_processed`, `items_added`, `items_updated`, and `error_message`.
- **Silent Mode Suppression:** During bulk crawler updates, the database sets `app.crawler_silent_mode = 'on'` to prevent firing hundreds of individual push notifications to students.

### 9.3 Admin 1-Tap Live Crawler Sync CTA
In Admin Management (`ManageFaculty.jsx`, `AllReports.jsx`), provide a dedicated 58 px control:
- **Button:** "Sync with BUBT Website" (58 px height, brand fill, spinning sync icon on active).
- **Status Pill (72 px):** Displays last sync outcome: *"Last synced: 24 mins ago · 403 faculty matched · 0 dead links"*.

### 9.4 Crawler Relative PDF URL Normalization
Official BUBT circulars stored by the crawler frequently contain relative paths (`uploads/notices/...`). Web must use a universal utility (`pdfUrl.js`) that prepends `https://www.bubt.edu.bd/` to all crawler relative links, ensuring error-free PDF previews and downloads.

---

## 10. Client-Side PDF Maker Suite & Academic Tools Architecture

### 10.1 PDF Maker Suite (`PdfMaker.jsx`)
A 100% on-device, client-side utility suite with **zero server uploads**, ensuring complete student privacy and compatibility with university upload caps:
- **Code-Splitting:** Lazily loaded via `React.lazy()` (~500KB gzipped).
- **Threading Model:**
  - `pdfjs-dist` (pdf.js) runs on the main thread for canvas rendering and thumbnail generation (required for DOM font loading).
  - `pdf-lib` document assembly and photo re-compression run in a background Web Worker (`pdfWorker.js`) using `OffscreenCanvas`.
- **The 4 Tools:**
  1. **Photos to PDF (`ToolImages.jsx`):**
     - Corrects smartphone EXIF orientation (`imageOrientation: "from-image"`).
     - Standardizes images onto A4 canvas (`595.28 × 841.89 pt`) with 24pt margins.
     - Optional **Vector BUBT Cover Page Prepend:** Inserts the official assignment cover page as Page 1 without re-rasterizing.
  2. **Merge PDFs (`ToolMerge.jsx`):**
     - Combines multiple PDFs and images. Copies pages at the vector level without re-encoding, preserving selectable text.
  3. **Organize Pages (`ToolOrganize.jsx`):**
     - Reorders, deletes, and rotates pages (90° / 180° / 270°) by updating the `/Rotate` metadata flag.
  4. **Compress PDF (`ToolCompress.jsx`):**
     - Multi-pass binary downsampler to shrink scanned assignments to fit portal limits (< 2MB or < 5MB).
     - Guard: Detects pure vector text PDFs to prevent raster inflation.

### 10.2 Academic Tools Suite
1. **Cover Page Generator (`CoverPage.jsx`):** Form with BUBT header, Course Code/Title, Student ID/Name/Intake/Section, Teacher Name/Designation, Submission Date, and client-side vector PDF export.
2. **CGPA Calculator (`Cgpa.jsx`):** Semester grade entry, target GPA simulator, and credit weighting tracker.
3. **Class Routines (`Routines.jsx`):** Department/Intake/Section weekly schedule with day filter and current ongoing class indicator.
4. **Academic Calendar (`Calendar.jsx`):** University semester timeline, exam periods, and government holidays.
5. **Annex Portal (`Annex.jsx`):** Embedded BUBT student portal with integrated SubBar back navigation.

---

## 11. Faculty Routine Short-Codes & Department Authorities System

### 11.1 Routine Short-Code Monospace Badges (`short_code`)
Students look up teachers primarily by their routine initials (e.g. `SSN`, `MMR`, `MAHB`, `FK`):
- Every faculty card must display a **monospace short-code badge**:
  - `fontFamily: monospace`, font `13px`, bold, `padding: 2px 8px`, `borderRadius: 6px`, background `var(--surface-3)`.
- **Punctuation-Stripped Fuzzy Search:**
  - Search queries must strip punctuation and spaces: searching `S.S.N.`, `s s n`, or `ssn` matches teacher `SSN` (Shaila Shaznin).

### 11.2 Department Authorities Component (`DepartmentAuthoritiesDropdown.jsx`)
Pinned at the top of each department faculty roster:
- Displays **Dean of Faculty**, **Department Chairman**, and **Program Coordinators**.
- 72 px Authority Cards featuring designation badges, office room numbers, official BUBT profile links, and direct email/phone call action buttons.

---

## 12. Screen-by-Screen Detailed Parity Blueprint

### 12.1 Home Dashboard (`StudentDashboard.jsx`)
1. **TopBar (60 px):** Vector Logo + `Campus` + green `One` + role badge pill + Bell with unread badge.
2. **Hero Banner Carousel:**
   - 6-slide max capacity.
   - Touch-swipe gestures (`onTouchStart`, `onTouchMove`, `onTouchEnd`).
   - 5000ms auto-scroll interval with pause-on-touch.
   - Elongated active pill indicator + inactive dot indicators.
   - Admin photo eligibility enforcement (`ManageBanner.jsx`).
3. **Campus Pulse Status Strips (72 px):**
   - 100px left navigation pill + 3 metric columns (Bus: Next Route, Time, Countdown; Prayer: Current, Next, Time; Reports: Open, In Progress, Resolved). Customization modal (select 3 of 19).
4. **Frequently Used Tools (72 px):**
   - 4 horizontal 72 px shortcut cards (`flex: 1` each), 34×34 px icon box, 1-line title. Customization modal (select 4).
5. **Community Updates Feed:**
   - 58 px `SegmentedTabs`: Notices | Clubs | Events. 72 px card rows.

### 12.2 Medical Center (`Medical.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Medical Center", logo right.
2. **Top Emergency Bar (58 px):**
   - "Call Campus Clinic Hotline" button (`tel:...`, emerald background).
   - "Emergency Ambulance" button (`tel:...`, danger background).
3. **Duty Schedule & Doctor Cards (72 px):**
   - Doctor Name, Medical Officer designation, room number (Building 1).
   - Doctor On-Leave status badge (Red danger tag when doctor is away).
   - Duty hours schedule and campus first-aid guidance card.

### 12.3 Clubs & Communities (`Clubs.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Campus Clubs", logo right.
2. **Controls:** 58 px Search bar + 58 px Category switcher tabs.
3. **Club Directory Cards (72 px):** 44×44px Club crest thumbnail, club name, category badge, total members count.
4. **Club Detail View (`ClubDetail.jsx`):**
   - Hero banner image, club description, executive committee members list.
   - 58 px "Request to Join" CTA button.
   - Club notice feed with photo attachments.

### 12.4 Campus Events & Seminars (`Events.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Campus Events", logo right.
2. **Controls:** 58 px Search bar + 58 px Category chips (All, Cultural, Tech, Sports, Academic).
3. **Event Cards (72 px+):**
   - Date badge block (Month + Day).
   - Title, organizing club/department, venue with map indicator.
   - 58 px RSVP Action CTA: "Going" / "Interested" toggle with live headcount.

### 12.5 Official Announcements & Circulars (`Announcements.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Announcements", logo right.
2. **Controls:** 58 px Search bar + 58 px Category filter chips (Academic, Exam, Routine, Holiday, General).
3. **Notice Cards (72 px):**
   - Pinned notices at top with pin icon.
   - Title, publishing date, official circular number (e.g. `BUBT-N-1634`).
   - 1-Tap PDF preview / download button with resolved crawler URL.

### 12.6 Student Jobs & Internships (`Jobs.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Jobs & Careers", logo right.
2. **Controls:** 58 px Search bar + 58 px Type filter tabs (All, Internship, Part-Time, Full-Time).
3. **Job Cards (72 px):**
   - Company/Organization logo box, Job title, Job type pill, Salary/Stipend tag (`Tk XX,XXX/month` or `Unpaid`).
   - Deadline countdown pill (`X days left`).
   - Application link / HR email reveal button.

### 12.7 Blood Donation (`Blood.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Blood Donation", logo right.
2. **Controls:** Top 58 px Emergency Request Blood CTA (`#ef4444`) + 58 px `SegmentedTabs` ("Requests" vs "Donors") + 58 px Search & Area picker.
3. **Request Cards:** Custom blood group badge (`A+`, `BLOOD` / `PLATELETS`), patient details, interactive hospital location card with `Map ↗` badge opening `HospitalMapModal`, 58 px "I Can Help" pledge CTA.
4. **Donor Cards (72 px):** Avatar, donor name, verified blood badge, area, eligibility indicator (Recharged vs Waiting `X days`), 1-tap `ContactSheet` reveal.

### 12.8 Campus Rides (`Rides.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Campus Rides", logo right.
2. **Controls:** Top 58 px "Offer a Ride" CTA + 58 px `SegmentedTabs` ("To BUBT" | "From BUBT" | "My Rides") + 58 px Search bar.
3. **Ride Cards:** Driver/Passenger badge, vehicle badge (`rickshaw`, `motorbike`, `taxi`, `car-side`), seats available badge, fare pill (`Tk XX`), and **Uber-style connected route timeline spine** (🟢 Pickup $\rightarrow$ 📍 Meeting Landmark $\rightarrow$ 🔴 Destination).
4. **Ride Detail:** 84% bottom-sheet with live GPS distance, `RideRouteMapModal`, seat selector stepper, and driver contact sheet.

### 12.9 Student Marketplace (`Marketplace.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Marketplace", logo right.
2. **Controls:** Top 58 px "Sell an Item" CTA + 58 px `SegmentedTabs` ("All Items" | "My Listings" | "Saved") + 58 px Dual Control Bar (Category + Filter) + 58 px Search bar.
3. **2-Column Mobile Item Grid:** Photo container with fixed aspect ratio, status pill ("Available" / "Sold"), price in bold emerald (`৳ XXX`), 1-line clamped title, handover spot with map-pin, seller avatar, and favorite heart button.
4. **Detail View:** Photo carousel, handover spot card with live GPS distance, 1-tap `DirectionMapModal`, seller profile, and contact reveal modal.

### 12.10 Lost & Found (`LostFoundBrowse.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Lost & Found", logo right.
2. **Controls:** Top 58 px "Report Item" CTA + 58 px `SegmentedTabs` ("Lost Items" | "Found Items" | "My Posts") + 58 px Search & Filter sheet.
3. **Feed Cards (`LFCard`, 72 px+):** Thumbnail box (44×44px), title, location with pin, relative date, type dot badge (Lost: Red / Found: Green), category chip.
4. **Detail View:** Handover spot on map, claim flow with proof image upload, claim withdrawal danger button.

### 12.11 Study Hub (`StudyHub.jsx`)
1. **Header:** 60 px `SubBar` (or root `TopBar` when navigated from tab).
2. **Controls:** 58 px `SegmentedTabs` ("Courses" vs "Archive") + 72 px Section Header Card (Intake, Section, CR badge, join code copy).
3. **Course Rows (72 px):** Course code badge, course name, counts (Materials, CT Questions, Textbooks).
4. **Course Detail View:** 3 Category switcher tabs (Notes, CT Questions, Textbooks), download file action with signed URL, CR moderation modals.

### 12.12 Bus Schedule (`Bus.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Bus Schedule", logo right.
2. **Top Transit Cards:** Metro Rail transit card and Transport Desk Hotline button (`tel:...`).
3. **Direction Switcher:** 58 px `SegmentedTabs` ("To Campus" vs "From Campus").
4. **Bus Route Cards (72 px):** Route name, next departure countdown pill, active cycle progress bar, weekend schedule timetable modal.

### 12.13 Prayer Times (`Prayer.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Prayer Times", logo right.
2. **Hero Card:** Current / Next prayer countdown banner, sunrise and sunset times, active interval progress bar.
3. **5 Daily Salah Cards (72 px):** Fajr, Dhuhr, Asr, Maghrib, Isha + Friday Jummah with Azan and Jamaat times.
4. **Campus Musallah Directory:** Building 1 and Building 2 Musallah cards with floor and ablution guidance.

### 12.14 Student Directory & Profile (`StudentDirectory.jsx` & `Profile.jsx`)
1. **Directory:** 60 px `SubBar` + 58 px Search bar + 72 px Department Picker trigger card + 72 px Student Row Cards (Avatar, Name, Intake/Sec, Connect button).
2. **Profile View:** 72 px Identity Hero Card. If mutually connected: 72 px 1-tap direct communication cards (CampusOne Chat, WhatsApp, Call Phone, Send Email). If pending/unconnected: appropriate status and request CTAs.

### 12.15 Messages & Direct Chat (`Messages.jsx`)
1. **Messages Home:** Root `TopBar` with title "Messages", full-width 72 px thread row cards (Avatar, Name, snippet, timestamp, unread badge).
2. **Message Thread:** 60 px `SubBar` with contact avatar, name, and direct phone call shortcut. Chat bubbles with timestamps, sent/read receipts. 58 px bottom input bar.

### 12.16 Campus Maintenance & Issues (`Reports.jsx`, `ReportIssue.jsx`, `ReportDetail.jsx`)
1. **Public Board:** 60 px `SubBar`, Search bar, Status tabs, anonymous cards with "Me Too" vote button.
2. **My Reports:** 58 px "Report an Issue" CTA, 72 px Report cards with status badge (Open: Amber, In Progress: Info Blue, Resolved: Green).
3. **Detail View:** Visual progress timeline (Submitted $\rightarrow$ Assigned $\rightarrow$ In Progress $\rightarrow$ Resolved), trade badge, before/after photo slider, staff notes.

### 12.17 Notifications Hub (`Notifications.jsx`)
1. **Header:** 60 px `SubBar` with back arrow, centered "Notifications", right Settings gear icon linking to `/notifications/settings`.
2. **Filter Tabs (58 px):** "All" | "Mentions" | "System".
3. **Controls:** "Mark All as Read" action button.
4. **Notification Cards (72 px):** Category vector icon, notification title, relative timestamp, unread blue dot indicator. Tapping navigates to target item.

### 12.18 Role Dashboards (Staff & Admin)
1. **Staff Dashboard (`StaffDashboard.jsx`):**
   - 3 Bottom Tabs: `Home` (`/staff`), `Explore` (`/explore`), `Settings` (`/settings`).
   - Home: Stats cards (Assigned to Me, In Progress, Completed), quick advance buttons ("Start Work", "Mark Resolved" with photo upload), decline report modal with reason selector.
2. **Admin Dashboard (`AdminDashboard.jsx`):**
   - 4 Bottom Tabs: `Home` (`/admin`), `Study Hub` (`/study-hub`), `Explore` (`/explore`), `Settings` (`/settings`).
   - Home: Report Triage table with trade/staff assignment modal, shortcuts to Manage Users, Manage Faculty, Emergency Banners, and System Logs.
   - **Manage Faculty View (`ManageFaculty.jsx`):** Live BUBT crawler 1-tap sync button, sync audit log display, faculty search with routine short codes.

---

## 13. Mobile Browser Ergonomics & Technical Considerations

### 13.1 Dynamic Viewport Height & Safe Areas
- **The Issue:** Mobile Safari and Chrome dynamically expand and collapse their URL and bottom navigation bars during page scroll. Using static `100vh` results in content clipping and jitter.
- **The Solution:** Use dynamic viewport height `min-h-[100dvh]`.
- **Bottom Navigation Padding:** Bottom navigation bar must declare:
  ```css
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  ```
- **Main Scroll Container:** To guarantee that the last card in any scroll view is never hidden underneath the 62px bottom navigation bar, all screens must apply:
  ```css
  padding-bottom: calc(62px + env(safe-area-inset-bottom, 0px) + 20px);
  ```

### 13.2 Soft Keyboard Focus Handling
When a student focuses an input field (such as chat input or a search bar), mobile browsers display the on-screen software keyboard. Fixed bottom bars will jump erratically unless guarded:
- The bottom navigation bar must listen to window resize or input focus events, hiding itself or anchoring cleanly when the keyboard is open.

---

## 14. Implementation Phases (Execution Order)

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Responsive Shell, 60px TopBar & SubBar, Flat Bottom Nav Bar  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Create Missing Core Routes (/explore, /settings, /notif)      │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: 58/72 Standard Component Primitives & Bottom Sheet Engine    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Home Dashboard 1:1 Parity (Banner Carousel, Strips, Tools)   │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Core Services Parity (Blood, Rides, Market, Lost & Found)     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 6: Faculty Short-Codes, Crawler Sync & Academic Tools Suite      │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 7: Viewport Verification Gate & Zero-Regression Testing          │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Phase 1 — Shell & Navigation (`AppShell.jsx`):**
   - Detect mobile viewport `< 768px` (or enclose `< 1280px` in centered `max-w-md mx-auto`).
   - Mount 60 px `TopBar` for root tabs and 60 px `SubBar` with safe back fallback for child routes.
   - Retire the curved cradle SVG and elevated AI orb; render the flat-top midnight navy bottom nav bar with active 50px electric blue sliding card.
2. **Phase 2 — Core Missing Routes:**
   - Add `/explore` route using the 4-category accordion layout with role-gated Quick Access cards.
   - Add `/settings` route using the unified profile hero and appearance toggles.
   - Add `/notifications` route with filter tabs and mark-all-read action.
3. **Phase 3 — 58/72 Primitives & Bottom Sheets:**
   - Build reusable `SegmentedTabs.jsx` (58 px outer height, 50 px sliding pill, count badge).
   - Build reusable `ContentCardRow.jsx` (72 px outer height, 44×44 px icon/avatar, clamped 1-line text).
   - Build `BottomSheet.jsx` (drag handle, backdrop dismiss, rounded top corners).
4. **Phase 4 — Home Dashboard:**
   - Update `StudentDashboard.jsx` to render the 6-slide touch-swipe banner carousel, 72 px Status Strips, 4 horizontal 72 px Frequent Tools, and 58 px Community Updates tabs.
5. **Phase 5 — High-Impact Services:**
   - Blood Donation: 58 px CTAs, `HospitalMapModal`, 72 px donor rows.
   - Campus Rides: Uber timeline route spine, `RideRouteMapModal`.
   - Marketplace: 2-column item grid, 58 px dual control bar, `DirectionMapModal`.
   - Lost & Found: 72 px `LFCard` rows, proof claim flow.
6. **Phase 6 — Faculty Short-Codes, Crawler Sync & Academic Tools:**
   - Faculty: Add monospace short-code badges, punctuation-free fuzzy search, and `DepartmentAuthoritiesDropdown.jsx`.
   - Crawler: Add Admin 1-tap live website crawler sync button and normalized PDF URL links.
   - PDF Maker: Integrate lazy-loaded client-side PDF maker suite and BUBT cover page generator.
7. **Phase 7 — Verification & Release:**
   - Test across iPhone (390px, 428px) and Android (360px, 412px) viewports.
   - Validate dynamic height (`100dvh`), soft keyboard behavior, zero emoji compliance, and desktop isolation on $\ge$ 1280px screens.

---

*This document is the authoritative design and technical specification for the CampusOne Web mobile transformation. All future development on mobile parity must reference and adhere to the tokens and structures defined herein.*
