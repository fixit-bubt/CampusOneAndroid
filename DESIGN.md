# CampusOne Design System & Layout Standards

This document establishes the official visual, ergonomic, and sizing standards across the **CampusOne** Android application. Every screen, component, modal, and control bar must strictly adhere to these rules to maintain design consistency and touch ergonomics.

---

## 1. Core Dimension Standards: The 58 / 72 System

CampusOne relies on two universal vertical dimension standards:

```
┌────────────────────────────────────────────────────────┐
│  1. CONTROLS, TABS, SEARCH, AND CTAs        ── 58 dp   │
├────────────────────────────────────────────────────────┤
│  2. CONTENT CARDS, FEED ROWS, AND LIST ROWS ── 72 dp   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Standard A: 58 dp Universal Control Bar Standard

All segmented tabs, search inputs, dropdown filters, primary buttons, and bottom action links must use a fixed outer height of **58 dp** with a border radius of **16 dp** (`Layout.controlHeight = 58`, `Layout.controlRadius = 16`).

### Specifications:
* **Outer Height:** `58 dp`
* **Border Radius:** `16 dp`
* **Border Width:** `1 dp`
* **Horizontal Screen Margin:** Standardized to `Layout.screenPadding = 16 dp` on both sides.

### Applied Components:
1. **Segmented Switcher Tabs (`SegmentedTabs.tsx`):**
   * Outer track: `height: 58 dp`, `borderRadius: 16 dp`, `padding: 4 dp`.
   * Sliding indicator: `height: 50 dp`, `borderRadius: 12 dp`.
   * Label: `fontSize: 13.5 px`, Plus Jakarta Sans Bold (active) / Medium (inactive).
   * Count badge pill: `height: 22 dp`, `minWidth: 20 dp`, `borderRadius: 999 dp`, text `11 px`.
   * Count rules: Maximum 3 tabs, minimum 2 tabs (equal width distribution).

2. **Search Bars:**
   * Outer container: `height: 58 dp`, `borderRadius: 16 dp`, `paddingHorizontal: 16 dp`.
   * Search icon: `18 px` (Feather `search`).
   * Input text: `fontSize: 14.5 px`, Plus Jakarta Sans Medium, vertically centered.

3. **Dual Sub-Filter Bars & Dropdown Triggers:**
   * Filter buttons: `height: 58 dp`, `borderRadius: 16 dp`, `paddingHorizontal: 14 dp`.
   * Icons: `14 px` (Feather).
   * Label text: `fontSize: 13.5 px`, Plus Jakarta Sans Bold.

4. **Primary CTAs & Form Submission Buttons:**
   * Connect, Submit, Create, and Join buttons: `height: 58 dp`, `borderRadius: 16 dp`.
   * Button label: `fontSize: 14.5 px`, Plus Jakarta Sans Bold.

5. **Feed Footer Action Buttons:**
   * "View All Campus Notices" / "Browse All Clubs": `height: 58 dp`, `borderRadius: 16 dp`.
   * Symmetrically frames the 72 dp cards between the 58 dp top switcher and 58 dp bottom action.

6. **Blood Donation Controls & Action CTAs:**
   * Top Emergency Request Blood Button (`actBtn` in `BloodScreen.tsx`): `height: 58 dp`, `borderRadius: 16 dp`.
   * Search Bar & Area Picker Trigger (`BloodScreen.tsx`): `height: 58 dp`, `borderRadius: 16 dp`.
   * Main Feed Tabs (`SegmentedTabs.tsx` - Requests vs Donors): `height: 58 dp`, `borderRadius: 16 dp`.
   * Urgency Switcher (`SegmentedTabs.tsx` - Urgent / Today / Week): `height: 58 dp`, `borderRadius: 16 dp`.
   * Request Action CTAs (`cardActionBtn` in `BloodScreen.tsx` - *"I Can Help"*, *"Call Requester"*, *"Manage Responses"*): `height: 58 dp`, `borderRadius: 16 dp`.
   * Form Submission CTAs (`submitBtn` in `BloodRequestScreen.tsx` & `DonorRegisterScreen.tsx`, `fulfillBtn` in `BloodRequestDetailScreen.tsx`): `height: 58 dp`, `borderRadius: 16 dp`.

---

## 3. Standard B: 72 dp Universal Content & Card Row Standard

All primary content cards, directory items, department pickers, and feed rows across the application are standardized to **72 dp** total outer height.

### Specifications:
* **Total Height:** **72 dp**
* **Border Radius:** `16 dp`
* **Border Width:** `1 dp`
* **Card Gap:** `11` to `13 dp` between icon and text column.
* **Vertical Padding:** `12` to `14 dp` balanced with the inner thumbnail/icon size.

### Applied Components:

1. **Explore Screen Tool Cards (`ExploreScreen.tsx`):**
   * Outer card: `padding: 14 dp`, `borderRadius: 16 dp`, `marginBottom: 11 dp`.
   * Icon box: `44 × 44 dp`, `borderRadius: 13 dp`, icon `22 px`.
   * Calculation: `44 dp + 14 dp top + 14 dp bottom = 72 dp`.
   * Title: `fontSize: 14.5 px` (Bold), Description: `fontSize: 11.5 px` (Medium).

2. **Student Directory Row Cards (`DirectoryScreen.tsx`):**
   * Outer card: `padding: 14 dp`, `borderRadius: 16 dp`, `borderWidth: 1 dp`.
   * Avatar (`size="md"`): `44 × 44 dp`, `borderRadius: 22 dp`.
   * Calculation: `44 dp + 14 dp top + 14 dp bottom = 72 dp`.
   * Student name: `fontSize: 14.5 px` (Bold), Connect button: `32 dp` height.

3. **Department Picker Row Cards (`DirectoryScreen.tsx` modal):**
   * Outer card: `padding: 14 dp`, `borderRadius: 16 dp`, `marginBottom: 8 dp`.
   * Icon box: `44 × 44 dp`, `borderRadius: 13 dp`, icon `20 px`.
   * Calculation: `44 dp + 14 dp top + 14 dp bottom = 72 dp`.
   * Code label: `fontSize: 13.5 px` (Bold), Department name: `fontSize: 13 px` (Bold).

4. **Home Notice & Community Feed Cards (`HomeCommunityUpdates.tsx`):**
   * Outer card: `padding: 12 dp`, `borderRadius: 16 dp`, `borderWidth: 1 dp`.
   * Thumbnail image box: `48 × 48 dp`, `borderRadius: 12 dp`.
   * Calculation: `48 dp + 12 dp top + 12 dp bottom = 72 dp`.
   * Category badge: `fontSize: 9.5 px`, Title: `13 px` (Bold), Snippet: `11.5 px` (Regular).

5. **Home Campus Pulse Status Strips (`HomeStatusStrips.tsx`):**
   * Outer strip card: `height: 72 dp`, `paddingHorizontal: 10 dp`, `borderRadius: 16 dp`, `borderWidth: 1 dp`.
   * Calm neutral foundation: `C.surface` surface and `C.border` subtle outline.
   * Left pill container (`leftPill`): `width: 100 dp`, `height: 48 dp`, `paddingLeft: 8 dp`, `paddingRight: 6 dp`, `borderRightWidth: 1 dp`.
   * Icon-Less Navigation Pill Standard: Removed the cramped 22px icon box and 6px gap from the left pill. The pill now presents pure bold typography (`pillText`: `fontSize: 13.5 px`, `FontFamily.jakartaExtraBold`, `letterSpacing: -0.2`) paired with a clean `chevron-right` (size 13). This provides ~72 dp of unconstrained text space, permanently preventing title truncation (such as *"Reports"*, *"Prayer"*, *"Directory"*, *"Calendar"*).
   * Customization Sheet modal: Full 19 campus features available in catalog with sector icons, title, subtitle, and radio check badges. Equal-width 50/50 footer action buttons (`cancelBtn` & `saveBtn`: `flex: 1`, `height: 50 dp`, `borderRadius: 14 dp`).

6. **Home Frequently Used Academic Tools (`HomeFrequentTools.tsx`):**
   * Shortcut card: `height: 72 dp`, `borderRadius: 14 dp`, `borderWidth: 1 dp`, `paddingHorizontal: 4 dp`, `paddingVertical: 6 dp`.
   * Calm neutral foundation: `C.surface` background and `C.border` boundary.
   * Icon box: `34 × 34 dp`, `borderRadius: 10 dp`, `borderWidth: 1 dp`, `alignItems: 'center'`, `justifyContent: 'center'`.
   * Customization Sheet modal: Full 19 tools catalog with title + subtitle and 40×40dp icon boxes. Equal-width 50/50 footer buttons (`resetBtn` & `saveBtn`: `flex: 1`, `height: 50 dp`, `borderRadius: 14 dp`).

7. **Student Profile Direct Action & Status Cards (`StudentProfileScreen.tsx`):**
   * Outer card: `height: 72 dp`, `paddingHorizontal: 14 dp`, `borderRadius: 16 dp`.
   * Action icon box: `44 × 44 dp`, `borderRadius: 13 dp`, icon `20–22 px`.
   * **Mutually Connected:** Direct 1-tap communication cards: CampusOne In-App Chat (Brand Blue), WhatsApp (`#25D366`), Call Phone (`#10B981`), and Send Email (`#8B5CF6`).
   * **Pending Outgoing Request:** 72 dp Amber Status Card (*"Connection Request Pending"*, pulsing clock icon) paired with a 58 dp `Cancel Connection Request` control button.
   * **Unconnected:** 72 dp Shield Privacy Card (*"Contact Details Protected"*, floating shield icon) paired with a 58 dp `Send Connection Request` primary CTA button.
   * **Incoming Request:** 72 dp Request Card (*"Incoming Connection Request"*, spring user-check icon) paired with dual 58 dp symmetrical `Accept` and `Decline` action buttons.
   * **Identity Hero Card:** Pure profile identity (Avatar, Name, Intake/Section meta, and `badgeRow` containing CR, Blood Group, and Connection Status Badge). Zero crammed inline buttons.

6. **Blood Donation Content Cards & Rows:**
   * **Units Stepper Card (`BloodRequestScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` droplet icon box with `20 px` droplet, `14.5 px` Title (*"1 Bag Needed"*), `11.5 px` Subtitle (*"Clinical blood units required"*), and 36 dp stepper buttons. Standardized to 72 dp in accordance with the 2-line layout rule (icon box + 2 lines of text = 72 dp). Squeezing into 58 dp was eliminated.
   * **Standalone Donor Row Cards (`BloodScreen.tsx`):** Standalone cards (`styles.donorCard`: `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `borderWidth: 1 dp`, `marginBottom: 10 dp`, `size="md"` 44 dp Avatar), separated by clean 10 dp margins matching `DirectoryScreen.tsx` and eliminating the flat glued container with hairlines.
   * **Standalone Responder Cards (`BloodRequestDetailScreen.tsx`):** Standalone cards (`styles.responderCard`: `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `borderWidth: 1 dp`, `marginBottom: 10 dp`, `size="md"` 44 dp Avatar).
   * **Registered Donor Status Card (`myStatusCard` in `BloodScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` blood badge box.
   * **Register as Donor Prompt Card (`registerPromptCard` in `BloodScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` droplet icon box.
   * **Unified Location & Hospital Card (`BloodRequestScreen.tsx`):** Single unified `minHeight: 72 dp` dropdown card (`HOSPITAL OR LOCATION`), `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with spring `hospital-building` or `map-marker-radius`, neutral `C.surface` foundation and `C.border` boundary (zero red border glow). Replaced the previous split dual-dropdown system.
   * **Dropdown Selector Cards (`BloodRequestScreen.tsx` - Case Reason, Affiliation):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with `borderRadius: 13 dp`, `14.5 px` Title, `11.5 px` Subtitle, neutral `C.surface` foundation and `C.border` subtle outline.
   * **Dengue Platelet Emergency Card (`plateletCard` in `BloodRequestScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box.
   * **Area Selector Card (`selectorCard` in `DonorRegisterScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with spring `map-pin`, calm neutral foundation.
   * **Notification Sensitivity Cards (`UrgencyCard` in `DonorRegisterScreen.tsx`):** Standalone tactile cards (`minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box, `14.5 px` Title, `11.5 px` Subtitle, spring `AnimatedIcon`, and spring press feedback `0.96 ➔ 1.02 ➔ 1.0`).
   * **Verified Blood Group Card (`lockedCard` in `DonorRegisterScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` badge box.
   * **Unified Area & Hospital Picker Items (`AreaPickerModal.tsx`):** Explore-style collapsible area bars (`minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with `AnimatedIcon` `map-pin`, `14.5 px` Title, `11.5 px` Subtitle) with `1 px` vertical divider line, stat column (`statVal` hospital count, `statSub` `HOSPITALS`), and animated chevron. Expands to reveal child hospital cards (`minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with `AnimatedIcon` `hospital-building`) plus "Select Entire Area" card. Clean monochrome styling with zero red glow or pink boxes.
   * **Map & GPS Trigger Bar (`mapTriggerCard58` in `AreaPickerModal.tsx`):** `58 dp` fixed control height, neutral foundation (`C.surface`, `C.border`), featuring a live floating animated map icon (`AnimatedIcon` `name="map"` `animation="float"` `loop={true}`).

---

## 4. Spacing & Layout Tokens

Always import from `src/theme/spacing.ts`:

| Token | Value | Usage |
|---|---|---|
| `Layout.screenPadding` | `16 dp` | Horizontal gutters on all screens |
| `Layout.cardPadding` | `14–16 dp` | Inner padding for standalone cards |
| `Layout.itemGap` | `10–12 dp` | Vertical gap between list items |
| `Layout.controlHeight` | `58 dp` | Universal height for controls, tabs, and search bars |
| `Layout.controlRadius` | `16 dp` | Universal border radius for control bars |
| Card Border Radius | `16 dp` | Universal corner radius for all cards |

---

## 5. Typography Scale

* **English Font:** Plus Jakarta Sans (`FontFamily.jakarta*`)
* **Bengali Font:** Hind Siliguri (`FontFamily.bn*`)

| Role | Font Size | Weight | Line Height |
|---|---|---|---|
| Screen Title | `26 px` | ExtraBold (`800`) | `32 px` |
| Section / Modal Title | `16–18 px` | Bold (`700`) | `24 px` |
| Primary Item / Card Title | `14.5 px` | Bold (`700`) | `20 px` |
| Control Bar / Tab Labels | `13.5–14 px` | Bold / Medium | `18 px` |
| Body / Secondary Text | `12–13 px` | Medium (`500`) | `18 px` |
| Subtitles / Metadata | `11–11.5 px` | Medium / Regular | `16 px` |
| Badges & Counter Pills | `9.5–11 px` | Bold (`700`) | `14 px` |

---

## 6. Text Containment & Overflow Rules

1. **Flex Wrappers on Text Containers:**
   * Any `<Text>` sibling inside a `flexDirection: 'row'` container MUST specify `flex: 1` or `flexShrink: 1`.
   * Prevents text from breaking out of cards on narrower screens or large font settings (e.g. `lockedTxt` in profile sheets).
2. **Title Truncation:**
   * Titles in rows and cards must set `numberOfLines={1}`.
   * Descriptions and snippet bodies must set `numberOfLines={2}`.

---

## 7. Iconography & Color Binding

1. **Established Human Vector Icons Only:**
   * Strictly use Feather (`@expo/vector-icons`), Material Community Icons, or vetted 21st.dev vector sets.
   * AI-generated clip-art, 3D icons, or raw Unicode emojis in buttons/badges are forbidden.
2. **Sector Color Binding:**
   * Directory: `#3b82f6` (Blue)
   * Marketplace: `#f97316` (Orange)
   * Ride Share: `#06b6d4` (Cyan)
   * Blood Donation: `#ef4444` (Red)
   * Announcements / Notices: `#3b82f6` (Electric Blue)
3. **Contrast & Color Discordance Prevention:**
   * Avoid placing conflicting shades of the same color side-by-side (e.g. Call Phone uses `C.brand`, while WhatsApp exclusively uses official `#25D366`).
4. **RenderThread Overflow Safety Standard for Vector Icons:**
   * Never wrap an `AnimatedIcon` using scaling transforms (`spring`, `entrance`, `pulse`) inside a parent or ancestor with `overflow: 'hidden'` on Android. Android hardware layer canvas clipping aggressively slices transformed glyphs at the un-transformed layout boundary.
   * Container wrappers must explicitly declare `overflow: 'visible'`. Text truncation should always be handled directly on the `<Text>` component (`flexShrink: 1`, `numberOfLines={1}`, `ellipsizeMode="tail"`).
   * Geometric Icon Boxes: Always give icons a dedicated bounding box (e.g. `pillIconBox`: `22 × 22 dp` for `16 px` icons, `iconBox`: `34 × 34 dp` for `18 px` icons) with centered alignment (`alignItems: 'center'`, `justifyContent: 'center'`) to ensure symmetric scaling around the visual center.
   * Physics Tuning: Entrance animations start at `scale: 0.85` (never at `0.3`) with zero default delay (`delay ?? 0`) to prevent icons from appearing as tiny shrunken dots or freezing on reload. Spring animations pop from `1.0 ➔ 1.22 ➔ 1.0` for lively tactile feedback without overshooting container boundaries.

---

## 8. Universal Liquid Gooey Toggle Switch Standard (`LiquidToggle.tsx` / `TactileSwitch.tsx`)

All toggle switches across CampusOne strictly implement the **Liquid Toggle** standard (inspired by 21st.dev `deepaksslibra/liquid-toggle`), engineered for 120 FPS native Android performance with zero geometric artifacts:
1. **Fluid Viscous Morphing Physics:**
   * Single cohesive fluid droplet thumb with volume-preserving squash-and-stretch (`scaleX: 1.0 -> 1.40 -> 1.0`, `scaleY: 1.0 -> 0.84 -> 1.0`, `translateX: 0 -> travel`) driven by a 460ms silky fluid cubic-bezier curve (`Easing.bezier(0.32, 0.0, 0.18, 1.0)`).
   * Completely eliminates multi-view seams, overlapping boxes, corner cuts, and subpixel shadow smudges. Pure, continuous fluid gel capsule motion.
2. **Standard Sizing & Ergonomic Proportions:**
   * **Default Size:** Track `52 × 32 dp` (radius `16 dp`), Thumb `24 × 24 dp` (radius `12 dp`), uniform `4 dp` margin, travel `20 dp`. Centers at `x = 16` (OFF) and `x = 36` (ON).
   * **Compact Size (`sm`):** Track `44 × 26 dp` (radius `13 dp`), Thumb `20 × 20 dp` (radius `10 dp`), uniform `3 dp` margin, travel `18 dp`. Centers at `x = 13` (OFF) and `x = 31` (ON).
3. **100% Native Driver Performance (120 FPS):**
   * All transforms (`translateX`, `scaleX`, `scaleY`) and track color crossfades execute exclusively on Android's RenderThread (`useNativeDriver: true`), ensuring zero JS-thread frame drops even during full-tree theme/language re-renders.
4. **Color Variants & Semantic Mapping:**
   * `default`: Electric Brand Blue (`#275EFE` / `C.brand`)
   * `success`: Emerald (`#10B981` / `C.success`) - used for Language, Free Donation mode, etc.
   * `warning`: Amber (`#F59E0B` / `C.warn`)
   * `danger`: Red (`#EF4444` / `C.danger`) - used for Doctor On-Leave, Master Pause, Faculty On-Leave.
   * Custom override: `trackColor?: { false?: string; true?: string }` support across modules.
5. **Touch Ergonomics & Row Card Integration:**
   * Standalone `LiquidToggle` uses `TouchableOpacity` with `hitSlop={12}` (effective 76 × 56 dp touch target).
   * In row cards (`SettingCard` in `SettingsScreen.tsx`, master toggles in `NotifSettingsScreen.tsx`), the entire row card is interactive via `onPress` while the embedded `TactileSwitch` has `pointerEvents="none"` and `disabled={!onValueChange}`. Users can tap anywhere across the row (icon, title, or switch knob) to toggle cleanly without double-firing.
6. **Universal Application:**
   * Deployed across all 16 toggle locations in the app (Settings, Notifications, Profile, Marketplace, Study Hub, Medical, and Announcements).

---

## 9. 1:1 Sibling Web Mobile Bottom Navigation Bar (`BottomTabNavigator.tsx`)

The mobile app bottom navigation bar is ported 1:1 from the sibling web app (`CampusOneWeb/src/components/AppShell.jsx`), featuring:
1. **Midnight Navy Gradient Backdrop:**
   - 1-piece seamless SVG canvas with linear gradient:
     - Top Stop: `#0f2862`
     - Bottom Stop: `#0a1b42`
   - Clean, crisp top rim highlight stroke: `rgba(255, 255, 255, 0.16)` with 1px stroke width.
2. **Clean Flat Top Line with Rounded Outer Shoulders:**
   - Left and right outer shoulders retain smooth 20 dp rounded corners (`r = 20 dp`), while the top edge across all tabs is completely flat.
   - Zero middle notch or cradle dip, ensuring a clean, flush appearance across the entire screen width.
3. **Seamless Screen Edge Integration:**
   - All tab screens (`HomeScreen`, `StudyHubScreen`, `MessagesHome`, `ExploreScreen`, `SettingsScreen`, `AdminDashboardScreen`, `StaffDashboardScreen`) strictly use `<SafeAreaView edges={['top', 'left', 'right']}>`.
   - Prevents `SafeAreaView` from injecting device bottom insets as a dead colored band (`C.bg`: black in dark mode, white in light mode) above the navbar.
   - The navigation bar handles `insets.bottom` internally (`barHeight = 62 + Math.max(insets.bottom, 10)`), sitting completely flush with screen content.
4. **Clean In-Line Messages Tab (Option 2 — Messages in Center):**
   - Messages button sits cleanly in-line with other tab items in the middle position (tab 3 of 5 for students).
   - Dynamic red unread count badge (`#ef4444`) anchored on the top-right of the message icon.
5. **Sharp Contrast Typography & Active Capsule Pill Highlight:**
   - **Active Tab:** Icon is housed inside an electric blue translucent capsule pill (`width: 48 dp, height: 28 dp, borderRadius: 14 dp`, `backgroundColor: 'rgba(96, 165, 250, 0.20)'`, `borderColor: 'rgba(96, 165, 250, 0.35)'`), with electric blue typography (`#60a5fa`, Plus Jakarta Sans Bold) and native bouncy vector icon entrance pop. Uncluttered design eliminates bottom dots for a clean, distraction-free aesthetic.
   - **Inactive Tabs:** Soft muted slate (`rgba(148, 163, 184, 0.50)`), Plus Jakarta Sans Medium, delivering effortless glanceability and clear distinction of current location.
   - **Unread Badge Alignment:** Dynamic badge anchored at `right: 2` relative to the capsule pill boundary.
6. **Role-Adaptive Tab Layout:**
   - **Students (5 tabs):** `Home` | `Study Hub` | `Messages` | `Explore` | `Settings`
   - **Admin (4 tabs):** `Home` | `Study Hub` | `Explore` | `Settings`
   - **Staff (3 tabs):** `Home` | `Explore` | `Settings`
7. **120 FPS Native Rubberband Bounce Tap Micro-Interactions:**
   - All tab buttons execute on Android RenderThread (`useNativeDriver: true`).
   - Press-in: tactile squish to `0.84` scale (`tension: 400, friction: 12`).
   - Release: energetic spring bounce pop (`0.72 -> 1.30 -> 1.0`), matching Explore entrance animation physics.
8. **Annex Portal Relocation:**
   - Relocated from bottom navigation bar into **Explore -> Academics** section with its own interactive tool card and header back button.

---

## 10. Explore Screen Accordion & Campus Pulse Category Standard (`ExploreScreen.tsx` & `CollapsibleSection.tsx`)

The Explore screen organizes campus features into 4 top-level directory categories (`Academics`, `Campus Life`, `Services`, `Community`) using an accordion hierarchy inspired by the Home screen's **Campus Pulse** layout:

### 1. Category Header Standard (Campus Pulse Metric Block)
* **2-Line Text Hierarchy:** Category cards feature a bold 14.5px title (`FontFamily.jakartaBold`) and an 11.5px medium subtitle (`FontFamily.jakartaMedium`), completely eliminating dead center whitespace:
  - **Academics:** *Notes, routines, annex & tools* (Cyan `#2ba0c9`)
  - **Campus Life:** *Clubs, events, prayer & jobs* (Rose `#e0568a`)
  - **Services:** *Clinic, bus routes & lost items* (Electric Blue `#4f6bed`)
  - **Community:** *Market, rides, blood & directory* (Emerald `#2e9e63`)
* **Hairline Vertical Divider:** `width: 1 dp`, `height: 30 dp`, `backgroundColor: C.border`, `marginHorizontal: 2 dp`, cleanly separating the text column from the stat block.
* **Stacked Stat Block:**
  - Metric value (`statVal`): `fontSize: 16.5 px`, `FontFamily.jakartaExtraBold`, `lineHeight: 20 px`, colored in the sector's vibrant `accentColor`.
  - Metric sub-label (`statSub`): `fontSize: 9.5 px`, `FontFamily.jakartaBold`, `letterSpacing: 0.5`, uppercase text (`TOOLS` in EN / `টুলস` in BN), colored in `C.text3`.
* **Active Card Highlighting:** When expanded, the header card gains a `1.5 dp` border in `accentColor` and points its chevron downward (`chevD`).

### 2. Full-Width Child Bars with Category Colored Left Spine (`styles.childBar`)
* **Grid Alignment:** Full width matching parent cards (`marginLeft: 0`), aligned with `Layout.screenPadding = 16 dp`.
* **Category Colored Left Spine:** A bold `4.5 dp` left border (`borderLeftWidth: 4.5`, `borderLeftColor: accentColor`) and matching tinted right chevron (`>`). When users scroll through an open category, the left colored spine acts as an instant location anchor ("Know Where We Are").
* **Vector Logos:** Each child displays its authentic 42×42dp vector logo (`SectorIcon` size="md" or `toolIcon`).

### 3. 120 FPS Native RenderThread Physics
* **Tactile Spring Bounce on Toggle:** Parent category icons and chevrons use `AnimatedIcon` with `animation={isOpen ? 'spring' : 'entrance'}` (rubberband pop from `1.0 -> 1.22 -> 1.0`).
* **Staggered Cascade Entrance:** All child icons animate in with `animation="entrance"` (`0.85 -> 1.18 -> 1.0`) and a 35ms staggered cascade delay (`delay={index * 35}`), creating a smooth ripple effect as the accordion unfolds.
* **RenderThread Canvas Clipping Safety:** Bounding boxes declare `overflow: 'visible'` with centered alignment to ensure transforms never get sliced by Android hardware canvas layers.

---

## 11. Universal 60 dp Header & Navigation Standard (`TopBar.tsx`)

All top bars across the application are standardized to **60 dp** fixed outer height (`styles.topbar` & `styles.subbar`) with hairline bottom borders (`borderBottomColor: C.border`, `borderBottomWidth: StyleSheet.hairlineWidth`) and horizontal padding aligned with `Layout.screenPadding = 16 dp`.

### 1. Root Tab TopBar (`<TopBar />`)
* **Outer Height:** Fixed `60 dp`.
* **Left Brandmark Anchor:** Houses the authentic 32×32 dp vector `LogoMark` on the left.
* **Beside-Logo Single Title / Brandmark Hierarchy:**
  * Clean, clutter-free single title or brandmark vertically centered beside the 32dp `LogoMark` with zero secondary subtitle clutter beneath.
  * Title: `fontSize: 18.5 px`, Plus Jakarta Sans ExtraBold (`FontFamily.jakartaExtraBold`), line height 28 px, `letterSpacing: 0`, and `includeFontPadding: false` to ensure Bengali characters with upper matras (ি, ী, র্, ঁ) are never sliced off at the top and never truncate with ellipsis (`...`).
  * Home Screen Brandmark: On `HomeScreen`, `AdminDashboardScreen`, and `StaffDashboardScreen`, renders `Campus` (`fontSize: 19 px`, `C.text`) and `One` (`fontSize: 19 px`, `#34d399` dark / `#059669` light) with dynamic role badge pill (`ADMIN` / `STAFF`: `paddingHorizontal: 6`, `paddingVertical: 2`, `borderRadius: 6`).
* **Other Root Tabs:** Displays the single localized tab title (`t.study2.studyHub`, `t.messages.title`, `t.tabs.explore`, `t.tabs.settings`) beside the 32dp LogoMark with zero redundant subtitles.
* **Right Slot:** Standard 40×40 dp container supporting notification bell (with unread badge) or directory search shortcut.

### 2. Child Sub-Screen SubBar (`<SubBar />`)
* **Outer Height:** Fixed `60 dp` (standardized from legacy 54 dp for 100% height parity).
* **Bilateral Symmetry Standard:**
  * **Left Side:** 40×40 dp tactile icon button (`styles.iconBtn`, `borderRadius: 14 dp`, `borderWidth: 1 dp`, `backgroundColor: C.surface2`) housing a 20 px left arrow (`arrowL`).
  * **Center:** Centered title text (`subbarTitle`: `fontSize: 16.5 px`, `lineHeight: 24 px`, `letterSpacing: 0`, `includeFontPadding: false`, Plus Jakarta Sans Bold, `textAlign: 'center'`), single-line clamped (`numberOfLines={1}`).
  * **Right Side:** Dedicated 40×40 dp alignment box (`subbarRightBox`) housing a 28×28 dp `LogoMark` (or custom action button), delivering perfect bilateral symmetry so the title remains dead-center.
* **App-Wide Adoption:** Applied automatically across all ~40 child sub-screens that import `SubBar`.

---

## 12. Bilingual Parity, Matra Protection & Clean Settings Standard (Option A)

Switching between English and Bengali must NEVER cause vertical jumping, card stretching, or screen dropdown shifts.

### 1. Root Cause Analysis
Bengali typography utilizes diacritics (matras) and compound characters that can expand font line heights and wrap words onto a second line if card containers lack fixed heights or unbounded line counts. In particular, unconstrained profile cards (`padding: 16` without explicit height) expanded by +14dp in Bengali due to ascender matras (ি, ী, র্, ঁ). Furthermore, tight line-height constraints sliced off upper matras and negative letter-spacing broke conjunct cluster calculations, causing false ellipsis (`...`) truncation.

### 2. Mandatory Structural Constraints
1. **Option A Clean Settings Standard:**
   - Setting items in `SettingsScreen.tsx` and category cards in `NotifSettingsScreen.tsx` are standardized to clean single-line rows (`[Icon] [Title] [Chevron / Switch]`) with zero redundant subtitle clutter.
   - `cardLabel` uses `fontSize: 15.5 px`, `lineHeight: 22 px`, `letterSpacing: 0`, and `includeFontPadding: false`.
2. **Fixed Card & Profile Heights Everywhere:**
   - Profile Card in Settings must use fixed `height: 96 dp`, `paddingHorizontal: 16 dp`, and explicit `justifyContent: 'center'`.
   - Content cards, setting items, and feed cards must use explicit fixed heights (`height: 72 dp` or `height: 58 dp`), NEVER unbounded `minHeight`.
3. **Matra-Safe Line Heights & Typography Scale:**
   - Setting labels use `lineHeight: 22 px`.
   - Profile name uses `fontSize: 17 px`, `lineHeight: 22 px`. Profile meta uses `fontSize: 12 px`, `lineHeight: 16 px`.
   - Role badge pill uses fixed `height: 22 dp`, `borderRadius: 11 dp`, and `roleText` `lineHeight: 15 px` so the top ref (র্) on "শিক্ষার্থী" is never clipped.
   - Section labels use relaxed `letterSpacing: 0.2` (avoiding Latin `0.8` that breaks Bengali ligatures).
3. **Mandatory Single-Line Text Clamping:**
   - Every card label, title, subtitle, and badge description must declare `numberOfLines={1}`.
   - Long Bengali words are gracefully truncated with an ellipsis (`...`) rather than breaking into a second line and expanding parent card geometry.
4. **Bilingual Parity Coverage:**
   - All sector titles, sector descriptions, shortcut tool titles, status strip metrics, community updates, settings items, and role workspaces (Admin Dashboard / Staff Workspace) have matching localized Bengali entries in `src/i18n/bn.ts`.

---

## 13. Zero-Jank Tab Switching & Native Inset Stability Standard

Switching between bottom navigation tabs must be completely seamless, 120 FPS instantaneous, and physically free of any vertical jumping or safe area flickering.

### 1. Root Cause Analysis
1. **Android Fragment Detachment (`detachInactiveScreens`):** In React Navigation bottom tabs on Android, `detachInactiveScreens` defaults to `true`. When navigating to a tab, `react-native-screens` attaches the Android native `ScreenFragment` to the window.
2. **Native `RNCSafeAreaView` Latency:** When an Android Fragment is attached, the native `RNCSafeAreaView` component inside it mounts with `insets.top = 0` on its first frame. 16-32ms later, Android dispatches `onApplyWindowInsets`, jumping `paddingTop` from `0` to `36-40 dp`, causing the entire screen (topbar + content) to visibly leap down.
3. **Abrupt Tab Scale Snapping:** Hard `scale.setValue(0.72)` on tab button press abruptly snaps the icon size during route changes.

### 2. Mandatory Architecture & Layout Rules
1. **Permanent Native Fragment Attachment (`detachInactiveScreens: false`):**
   - In `src/navigation/BottomTabNavigator.tsx`, `<Tab.Navigator>` declares `detachInactiveScreens={false}`.
   - All 5 root screens remain permanently attached in the native view hierarchy, preventing Android fragment re-mounts, window inset resets, and scroll position drops.
2. **Synchronous React Insets (`useSafeAreaInsets`):**
   - Root tab screens (`HomeScreen`, `StudyHubScreen`, `MessagesHome`, `ExploreScreen`, `SettingsScreen`, `AdminDashboardScreen`, `StaffDashboardScreen`) MUST use `useSafeAreaInsets()` from `react-native-safe-area-context` paired with a standard `<View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>`.
   - Never use native `<SafeAreaView edges={['top', ...]}>` on bottom tab root screens. `insets.top` from the root `<SafeAreaProvider>` is known synchronously in JavaScript on render frame 1, guaranteeing zero layout shift.
3. **Pixel-Identical 10 dp Content Distance:**
   - Content immediately below the 60 dp `TopBar` is standardized across all tabs to start at exactly **10 dp** (`styles.scroll` `paddingTop: 10`, `FlatList` `paddingTop: 10`, or `marginTop: 10`), ensuring identical vertical baseline alignment when switching tabs.
4. **Smooth Spring Tap Micro-Interactions:**
   - Tab button tap uses continuous spring transitions (`scale: 0.88 -> 1.15 -> 1.0`) with zero hard `setValue` resets.

---

## 14. Blood Donation Hospital Navigation & Master Database Standard (`HospitalMapModal.tsx`)

All hospital locations and blood request navigation interfaces across CampusOne adhere to the following interactive mapping and spatial layout rules:

### 1. Interactive Hospital Row Touch Ergonomics
* **Full-Width Tappable Row (`hospitalTouchRow`):**
  - Outer container: `borderRadius: 12 dp`, `borderWidth: 1 dp`, `paddingHorizontal: 12 dp`, `paddingVertical: 10 dp`, `marginTop: 10 dp`.
  - Left icon: `Feather name="map-pin"` (13 px, muted color).
  - Typographic hierarchy: Hospital Name (`FontFamily.jakartaBold`, `C.text`) followed by muted middle-dot area tag (`· Area`, `FontFamily.jakartaMedium`, `C.textMuted`).
  - Right interactive hint badge: `mapHintBadge` with `Map` text (`11 px`, `FontFamily.jakartaBold`) and `Feather name="arrow-up-right"` (11 px).
  - Touch feedback: Standard tactile press with `activeOpacity: 0.75` opening the modal sheet instantly without layout lag.

### 2. Symmetrical Upright GPS Crosshairs Standard
* **Recenter Button Geometry:**
  - Standardized on the upright, symmetrical Google Maps crosshairs icon (`width: 44 dp, height: 44 dp, borderRadius: 22 dp`).
  - Replaced tilted or skewed polygon pointers with 4 perpendicular axis tick lines (`x1/y1/x2/y2`), a concentric outer ring (`r = 7.5`), and a centered location dot (`r = 2.5`).
  - Guarantees zero perceived angle distortion or "bent" button appearance across any screen aspect ratio.

### 3. Live Physical Device GPS Integration
* **Real-Time Origin Calculation:**
  - Asynchronously queries device GPS via `getCurrentUserCoordinates()` (`expo-location`).
  - Origin displays **"Your Location"** with the live coordinates of the physical device.
  - Automatically calculates real travel distance in kilometers and draws a clean animated dashed route line from the user's actual physical spot to the hospital.
  - Gracefully falls back to BUBT Campus (`23.8103, 90.3578`) only when GPS permissions are denied or device location services are switched off.

### 4. Ground-Floor POI Reverse-Geocode Protection
* **External Google Maps Launch Intent:**
  - Maps URL structure: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospitalQuery)}`.
  - Omits `origin` parameter to allow Google Maps to bind natively to the phone's live location provider.
  - Strictly uses clean, official facility POI strings rather than raw coordinates (`destination=lat,lng`). This eliminates Google Maps reverse-geocoding errors that previously caused hospitals to open as ground-floor food shops or local restaurants.

### 5. Universal 58 dp Footer CTA Standard
* **Modal Bottom Action Bar:**
  - Floating Google Maps CTA button (`openGmapsBtn`): `height: 58 dp`, `borderRadius: 16 dp`, `Layout.screenPadding = 16 dp`.
  - Center label: `fontSize: 14.5 px`, `FontFamily.jakartaBold`, paired with an 18 px external link vector icon.

---

## 15. Master Locations & Vector Map Standards (`LocationPickerModal.tsx`, `dhakaMasterLocations.ts`)

All location picking, geolocation services, and map-based features adhere to the following master location architecture:

### 1. Ground-Truth Master Dataset (516 Places)
* **Coverage:** Comprehensive coverage across all Dhaka sectors: MRT-6 metro stations (Diabari to Motijheel), BUBT campus facilities, universities, inter-district transit terminals, all 108 hospitals and specialized clinics, landmarks, and residential areas.
* **Geographic Bounds Verification:** Every coordinate is strictly bounded within official Dhaka limits (`latitude: 23.50 - 24.15`, `longitude: 90.15 - 90.65`).
* **Multi-Lingual Parity:** Every record includes English and localized Bengali (`nameBn`, `zoneBn`, `keywords`) ensuring instant search hits in both languages.

### 2. High-Performance Search Indexing (Zero Frame Drops)
* **Precomputed `SEARCH_INDEX` & O(1) `CLEAN_MAP`:** Search index is constructed once at module evaluation time. Normalizes tokens, English strings, and Bengali characters using `/[^a-z0-9\u0980-\u09FF]/gi`.
* **Hyphen Preservation:** Delimiter splitting operates on `/`, `&`, `(`, `)`, and `,` while strictly preserving hyphens (`-`). This ensures compound sector names like `Mirpur-11`, `Gulshan-2`, and `Dhanmondi-27` do not truncate into parent hubs.

### 3. Tap-to-Pin & Selection Lock Controls
* **Tap-to-Pin Centering:** Tapping anywhere on the interactive map animates the camera (`easeTo`) and centers the custom location under the pin.
* **2500ms Selection Lock:** Programmatic camera moves (from search suggestion selection, quick commute chips, or initial modal load) set `selectionLockUntilRef.current = Date.now() + 2500` to prevent camera settling and reverse-geocoding events from overwriting the chosen location.
* **Instant GPS Lock Reset:** Tapping "Use My Current Location" clears the selection lock (`selectionLockUntilRef.current = 0`), allowing immediate reverse-geocoding of live device GPS coordinates.

### 4. Dimensional Standards (58 dp / 72 dp)
* **Control Trigger & Search Bar:** 58 dp fixed outer height (`height: 58`, `borderRadius: 16`).
* **Selected Place Card:** 72 dp content row (`height: 72`, `borderRadius: 16`) displaying place name, Bengali name, and geographic sub-location with checkmark indicator.

---

## 16. Explore-Style Collapsible Area Bars & Blood Module Micro-Interactions (`AreaPickerModal.tsx`, `BloodScreen.tsx`, `BloodRequestScreen.tsx`)

All location and hospital selectors across the Blood Donation system strictly follow Explore screen visual standards for 1:1 cross-app harmony:

### 1. Collapsible Area Bars & 4.5 dp Left Accent Stripes
* **Zone Header Bar (72 dp, Explore Parity):**
  - Modeled directly on Explore's `CollapsibleSection` and `featuredCard`.
  - Strict fixed height: `height: 72, paddingHorizontal: 14, borderRadius: 16`.
  - When expanded: 1.5 dp accent border (`${SectorColors.blood}85` in dark mode, `${SectorColors.blood}65` in light mode), translucent blood pill icon box (`pillBg(SectorColors.blood, isDark)`), vibrant blood map-pin (`SectorColors.blood`), blood red hospital count stat, and blood red animated chevron.
  - When collapsed: neutral surface with soft tinted icon container.
* **Child Hospital Cards (72 dp, Explore `childBar` Parity):**
  - Formatted with a prominent 4.5 dp left accent stripe (`borderLeftWidth: 4.5`, `borderLeftColor: SectorColors.blood`).
  - Strict fixed 72 dp content row height (`height: 72`, `paddingHorizontal: 14`, `gap: 13`, `borderRadius: 16`, `borderWidth: 1`, `marginBottom: 8`), eliminating font matra vertical expansion beyond 72 dp.
  - Full-width edge alignment with the parent area bar: `expandedChildContainer` uses `marginTop: 8, marginBottom: 2` with zero horizontal indentation (`paddingLeft: 0`) and clean 8 dp card spacing.
  - Typography locked: `includeFontPadding: false`, `lineHeight: 20` for hospital name, `lineHeight: 16` for subtitle, guaranteeing perfect vertical centering inside the 72 dp card.
  - Child icon container: `width: 44, height: 44, borderRadius: 13`, `backgroundColor: pillBg(SectorColors.blood, isDark)`.
  - Official hospital vector icon: `hospital-building` (MaterialCommunityIcons, 20 px) with theme-adaptive contrast: crisp white (`#ffffff`) in dark mode inside the crimson pill for maximum pop, and vivid `SectorColors.blood` in light mode for full readability.
  - Right interactive chevron: `Feather name="chevron-right"` in `SectorColors.blood`.

### 2. Micro-Animation Architecture (Explore Parity, Zero Looping)
* **Single-Shot Tactile Micro-Interactions:**
  - All icons across the blood donation module use single-shot `animation="entrance"` (with subtle staggered item reveals) or tactile `animation="spring"` on tap/accordion toggles.
  - Strict ban on endless looping animations (`loop={true}`, continuous float/pulse/bounce), preventing visual clutter and preserving Android RenderThread 120 FPS performance.

### 3. Semantic Icon Colors & Dropdown Triggers
* **Blood Donation Screens (`BloodScreen.tsx`, `BloodRequestScreen.tsx`, `DonorRegisterScreen.tsx`):**
  - Active location filter trigger: 1.5 dp `SectorColors.blood` border and translucent blood pill container when filtered.
  - Clinical Case Reasons: Distinct semantic color tokens (Surgery `SectorColors.blood`, Dengue `#eab308`, Trauma `#f87171`, Childbirth `#ec4899`, Thalassemia `SectorColors.blood`, ICU `#8b5cf6`, Other `#3b82f6`) with matching 4 dp left accent stripes and tinted icon pills.
  - Campus Affiliation: Semantic category colors (Student `#3b82f6`, Faculty `#8b5cf6`, Family `#10b981`, General `#64748b`) with matching 4 dp left stripes and tinted icon pills.

---

## 17. Ride Share Uber-Style Connected Route Spine & In-App Map Architecture (`RidesScreen.tsx`, `RidePostScreen.tsx`, `RideDetailScreen.tsx`, `RideRouteMapModal.tsx`, `CommuteAreaPickerModal.tsx`)

### 1. Distinct Role & Vehicle Iconography Standard (`StatusBadge.tsx`)
- **Zero-Duplicate Icon Rule:** Replaced the legacy `car-side` icon for ride offers with `steering` (MaterialCommunityIcons steering wheel), clearly distinguishing drivers from passengers and vehicles.
- **Role Variants:**
  - `Offer` (Driver): `steering` (MaterialCommunityIcons, 🛞 steering wheel in Indigo/Slate).
  - `Need Ride` (Passenger): `hand-back-right` (MaterialCommunityIcons, 🙋 raised hailing hand in Purple).
- **Vehicle Badges:**
  - `Rickshaw`: `rickshaw` in Sky Blue.
  - `Bike`: `motorbike` in Orange.
  - `CNG`: `taxi` in Emerald.
  - `Car`: `car-side` in Indigo.
  - Eliminates duplicate car glyphs (e.g. `[ 🛞 Offers ] [ 🛺 CNG ]` instead of duplicate cars).

### 2. Uber Connected Route Timeline & Zero-Clipping Ergonomics (`RideDetailScreen.tsx`)
- **Connected Visual Spine:**
  - 🟢 **Pickup Point:** Circular beacon with emerald dot and zone subtitle (e.g., `Permanent Campus · Rupnagar, Mirpur 2`).
  - 📍 **Meeting Landmark:** Compact callout attached along the route spine with inline label and note text (e.g., `MEETING SPOT: Gate 1 near Cafeteria`).
  - 🔴 **Destination:** Square beacon with crimson dot and zone subtitle (e.g., `Dhanmondi 27 · Dhaka South`).
- **Live GPS Proximity Placement:**
  - Distance and walking/driving estimates (`241m from you · ~3 min walk`) are positioned directly inside the Pickup stop container (`alignSelf: 'flex-start'`) rather than squeezed into the card header. Completely prevents text clipping on all mobile viewports.
- **Decluttered Header:** Removed internal database codes (`RD-xxx`) from user-facing hero badges; consolidated departure time and pricing.

### 3. In-App Interactive Route Map Modal (`RideRouteMapModal.tsx`)
- **Full Parity with HospitalMapModal:** Upgraded `RideRouteMapModal.tsx` to match the exact same engine and visual design standards as Blood Donation's `HospitalMapModal`:
  - **Live Road Routing via OSRM:** Fetches turn-by-turn road geometry coordinates, driving distance (meters), and duration (seconds) via `https://router.project-osrm.org/route/v1/driving/...`, replacing straight-line approximations with true street-following navigation.
  - **Triple-Layer Highway Polyline:** Renders an 8.5px dark casing layer (`#081738` / `#1e3a8a`), 5.5px core electric blue road line (`#275efe`), and a 1.6px white dashed inner trail (`line-dasharray: [2, 3]`) simulating live Google Maps traffic flow.
  - **Floating Trip Summary Banner:** Frosted glass pill over the top of the map showing estimated driving time (`28 min`), distance (`20.2 km`), and origin/destination metadata.
  - **Symmetrical Upright Crosshairs Recenter Control:** Bottom-right floating action button with Google Maps target crosshairs icon; invokes `recenterRoute()` with `LngLatBounds()` to smoothly re-frame the journey.
  - **Authentic Google-Style Markers:** Pickup marker features an active pulsing green radar wave with centered dot and dark tag; destination features a grounded red SVG teardrop pin with coordinate/label tag.
  - **84% Bottom Sheet Presentation:** Replaced fullscreen modal with standard bottom-sheet sheet (`height: '84%'`, `borderTopLeftRadius: 24`, 60dp header with close `✕` button, and semi-transparent backdrop).
  - **Bottom Route Details & 58dp Primary Action:** Shows Pickup, Meeting Point, Drop-off, estimated drive time and distance (`~28 min (20.2 km) driving route`), and a universal 58dp button to launch turn-by-turn Google Maps navigation.

### 4. Universal 58dp & 72dp Bar Standard Alignment
- Departure Time selector standardized to 72dp Dropdown Card (`height: 72`, `borderRadius: 16`, 44×44 icon box).
- Stepper, Fare, Meeting Point, Search, and Action Buttons strictly standardized to the Universal 58dp height standard (`height: 58`, `borderRadius: 16`).

---

## 18. Student Marketplace Design Standards & Handover Location Picker (`MarketScreen.tsx`, `MarketPostScreen.tsx`, `MarketDetailScreen.tsx`)

### 1. Universal 72dp Handover Location & Category Picker Standards
- **Elimination of Stacked Duplicate Inputs:** Replaced redundant stacked input fields with the Universal 72dp Dropdown Card standard (`minHeight: 72`, `dropdownIconBox: 44x44`, sector highlight, clear `X` button).
- **Dual Mode Switcher:** Features a dedicated mode switcher button between:
  - **"Choose from list":** Opens modal with pre-curated BUBT campus hubs, campus gates, canteen/field spots, and Greater Dhaka commute hubs.
  - **"Type custom":** Instant free-text entry for specific spots with live clear button.
- **Handover Sheet 72dp Standardization (`styles.locCard`):** All location cards in both Campus and Greater Dhaka tabs strictly follow `height: 72`, `borderRadius: 16`, `paddingHorizontal: 14`, `44 × 44 dp` icon box (`borderRadius: 14 dp`), and `18 px` Feather icons.
- **Interactive Map & GPS Trigger Card (`styles.mapTriggerCard72`):** Fixed `height: 72`, `borderRadius: 16`, `44 × 44 dp` icon box with Feather `map` icon.
- **Category Picker Modal Standard (`styles.modalItemCard`):** Fixed `height: 72`, `borderRadius: 16`, `paddingHorizontal: 14`, `44 × 44 dp` icon box.
- **Multi-Line Text Truncation Safety:** Enforced `numberOfLines={1}` across title, subtitle, and Bengali names to prevent uneven card expansion (eliminating the issue where 1-line and 2-line cards created uneven heights).

### 2. Universal 58dp Form Controls & Screen Bars
- **Posting Form Inputs (`MarketPostScreen.tsx`):** Item Title, Price, Custom Category, Custom Spot, and Course Code inputs standardized to Universal 58dp Controls (`height: 58`, `borderRadius: 16`).
- **Condition Selector:** Standardized 3-tab segmented control (`SegmentedTabs.tsx`: New, Like New, Used) with 58dp height.
- **Feed Bars (`MarketScreen.tsx`):** Hero Action Button ("Sell an Item"), Dual Category Control Bar, Search Bar, and Filter Trigger strictly aligned to the Universal 58dp Standard (`height: 58`, `borderRadius: 16`).

### 3. Real-Time GPS Proximity & Interactive Direction Map
- **Live GPS Distance Calculation:** In `MarketDetailScreen.tsx`, the Meetup Handover Spot card automatically detects the customer's live GPS coordinates via `getCurrentUserCoordinates()` and calculates geodesic distance via Haversine formula (`X km away · Tap for directions`).
- **1-Tap Interactive Map:** Tapping the Meetup Spot card opens the unified `DirectionMapModal.tsx` showing the user's location, the handover spot, OSRM road route, duration, distance, and ETA.

---

## 19. Universal Single Direction Map Architecture (`DirectionMapModal.tsx`)

To maintain zero code bloat and unified design integrity across the entire application, all mapping features are consolidated into **one single universal direction map component** (`src/components/location/DirectionMapModal.tsx`):

### 1. Full-Bleed Edge-to-Edge Screen & Floating 58dp Frosted Glass Top Bar
- **Edge-to-Edge Presentation:** Modals use `presentationStyle="fullScreen"` with `statusBarTranslucent`, allowing vector map tiles to flow seamlessly across the entire viewport behind the Android status bar and navigation bar with zero clipping or awkward black header cutoffs.
- **Floating 58dp Frosted Back Button (`styles.frostedCloseBtn`):** `58 × 58 dp`, `borderRadius: 16 dp`, 1px border, backdrop-blur effect with subtle elevation shadow, housing a centered `arrow-left` icon.
- **Floating 58dp Route Header Capsule (`styles.headerCapsule`):** `height: 58 dp`, `borderRadius: 16 dp`, 1px border, backdrop-blur effect with origin icon pill (`38 × 38 dp`), bold route title, and subtitle, positioned at `top: insets.top + 12 dp` with standard `Layout.screenPadding = 16 dp`.
- **Location Picker Live GPS Auto-Center (`LocationPickerModal.tsx`):** When opened without `initialCoords` (fresh pick), automatically queries `getCurrentUserCoordinates()`, centers the interactive camera over the user's standing GPS position at `16.5` zoom with reverse-geocoded address, using BUBT Campus strictly as an offline/denied fallback.

### 2. Core Map Engine & Vector Tile Infrastructure
- **MapLibre GL JS + OpenFreeMap Vector Tiles:** Zero-cost, high-performance vector map engine running in a hardware-accelerated WebView.
- **Automatic Theme Synchronization:** Synchronizes tile styles with the user's app theme:
  - Dark Mode: `https://tiles.openfreemap.org/styles/dark` with pitch-black OLED background (`#121212`).
  - Light Mode: `https://tiles.openfreemap.org/styles/liberty` with neutral slate background (`#f8fafc`).
- **OSRM Road-Snapping Routing:** Fetches turn-by-turn road geometry coordinates, driving distance, and duration via OSRM (`https://router.project-osrm.org/route/v1/...`) with speed-adjusted duration estimates for driving, bicycling, and walking.

### 3. Google Maps Visual Identity & Floating Controls
- **Pulsing Blue GPS Dot:** Origin marker features an authentic Google Maps style blue dot (`#275efe`) with an animated pulsing radar wave ring and origin label tag.
- **Teardrop Destination Pin:** Destination marker features a grounded SVG teardrop pin with coordinate/label tag and sector color accent.
- **Route Polyline with Drop-Shadow Casing:** Renders an 8px dark casing layer (`#0f172a` at 35% opacity) beneath a 5.5px core electric blue road polyline (`#2563eb` at 95% opacity).
- **Floating Right-Rail Action Controls:**
  - 🧭 **Reset Compass / North FAB:** Resets pitch and bearing smoothly to north.
  - ⤢ **Fit Whole Route Bounds FAB:** Dynamically computes `LngLatBounds()` around both origin and destination with padding.
  - 🎯 **Recenter Live Location FAB:** Smoothly flies the camera to the user's current GPS position.

### 4. Google Maps Style Bottom Navigation Card
- **Travel Mode Selector:** 3-mode segmented switcher (🚗 Drive, 🏍️ Bike, 🚶 Walk) with live route re-calculation.
- **Metrics Display:** Big bold duration (`14 min`), distance (`3.8 km`), and live arrival clock time (`Arrive by ~07:35 AM · from your location`).
- **Dual Destination Layouts:**
  - **Point-to-Point Stops Track (Campus Rides):** Pickup point with green dot, meeting spot callout with amber map-pin badge, and drop-off destination with red dot, plus fare pill and vehicle badge.
  - **Single Destination Box (Marketplace, Blood, Lost & Found):** Destination name, zone/subtitle, and sector icon box.
- **1-Tap Google Maps Navigation:** Primary CTA button deep-links directly into the native Google Maps app (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...&travelmode=...`) for turn-by-turn voice directions.

### 5. Zero-Bloat Wrapper Architecture & App-Wide Unification
- **100% Backward Compatibility:**
  - `src/components/blood/HospitalMapModal.tsx` wraps `DirectionMapModal` with blood styling (`SectorColors.blood`, `hospital-building` icon).
  - `src/components/rides/RideRouteMapModal.tsx` wraps `DirectionMapModal` with ride styling (`SectorColors.ride`, `navigation` icon, stops track, fare, and vehicle).
- **Universal Feature Coverage:**
  - **Marketplace:** Handover meetup spot directions in `MarketDetailScreen.tsx`.
  - **Blood Donation:** Hospital and clinic directions in `BloodScreen.tsx`.
  - **Campus Rides:** Route overview and directions in `RideDetailScreen.tsx`.
  - **Lost & Found:** Item location and handover spot directions in `LostFoundDetailScreen.tsx`.

---

## 20. Campus Bus Transit & Lost & Found Form Control Standards

### 1. Lost & Found 58dp Form Standard & Claim Withdrawal Design
- **Posting Inputs (`PostItemFormScreen.tsx`):** Title input, location input, and description textarea standardized to the Universal 58dp Standard (`height: 58`, `borderRadius: 16`, `paddingHorizontal: 16`).
- **Category Trigger Cards:** Category buttons standardized to `height: 58`, `borderRadius: 16`, `paddingHorizontal: 14`, with `36 × 36 dp` icon boxes.
- **Claim Withdrawal Action:** Pending claims display a danger pill button (`height: 36`, `borderRadius: 10`, `paddingHorizontal: 11`) allowing claimants to cleanly cancel their claim.
- **Defensive Storage Hygiene:** Automatic file cleanup on image replacement via `deleteFile`.

### 2. Campus Bus UI & Transport Desk Standards (`BusScreen.tsx`)
- **Transport Desk Hotline:** Enhanced call button (`height: 44`, `borderRadius: 12`, `paddingHorizontal: 14`) with Feather phone icon.
- **Weekend Badges:** Deterministic `Sat: HH:MM AM` badges on weekend departures.
- **Bilingual Transit Link Cards:** Equal typography and responsive text containers for Metro Rail and Hotline cards across English and Bengali.

---

## 21. Medical Screen Minimal Monochromatic Standards (`MedicalScreen.tsx`)

### 1. Unified Medical Crimson Identity
- **Monochromatic Foundation:** Replaced rainbow multi-color clutters across doctor roles, service cards, emergency hospitals, and dispensary medicines with unified BUBT Medical Crimson (`MED_COLOR` = `SectorColors.medical` `#e2483d`, `MED_BG` = `${SectorColors.medical}1e`).
- **Icon Diversity Preserved:** Maintained distinct vector glyphs (`heart`, `needle`, `award`, `stethoscope`, `activity`, `shield`, `droplet`, `tooth-outline`) and smooth 120 FPS native transforms (`spring`, `pulse`, `bounce`, `entrance`) while standardizing icon containers and typography.
- **Roster Filter Dropdown & Sheet:** All 4 roster options (`all`, `doctors`, `psychologist`, `today`) standardized to `MED_COLOR` and `MED_BG`. Selected state in the 72dp dropdown card and bottom sheet modal highlights cleanly in Medical Crimson.
- **Dispensary & Medicine Badges:** Dispensary accordion trigger and medicine row pill badges unified to `MED_BG` and `MED_COLOR`. Doctor subtitles reset to clean `C.textMuted`.

---

## 22. Lost & Found Filter & Card Minimal Gold Palette (`LostFoundBrowseScreen.tsx`)

### 1. Warm Amber Identity & Contrast Protection
- **Eliminated Rainbow Collages:** Replaced discordant multi-color fills (blue for Personal/All, amber for Electronics/Open, green for Documents/Resolved, slate for Other) with the unified warm amber/gold Lost & Found identity (`LF_COLOR` = `SectorColors.lostfound` `#c77d1a`, `LF_BG` = `${SectorColors.lostfound}18`).
- **Clean Inactive States:** Filter options display on neutral dark-glass surfaces (`C.surface2`, `C.border`, `C.text2`) and gracefully highlight with `LF_BG` and `LF_COLOR` on selection.
- **Top Segmented Tab Switcher:** Cleaned up the 'Mine' tab from arbitrary purple (`#8B5CF6`) to `LF_COLOR`.
- **Card Focal Hierarchy:** Category badges on `LFCard` converted to neutral dark-glass pills (`isDark ? rgba(255,255,255,0.06) : C.surface2`, text `C.text2`), ensuring the core semantic `Lost` (Crimson / Red) and `Found` (Emerald / Green) badges remain the clear, uncluttered visual focus.

---

## 23. Lost & Found 72dp Dropdown & Unified Map Selector Architecture (`PostItemFormScreen.tsx`)

### 1. Universal 72dp Category Dropdown Standard
- **Outer Dropdown Card (`styles.dropdownCard72`):** Standardized to strict `height: 72`, `borderRadius: 16`, with `44×44dp` icon box (`styles.dropdownIconTile44`, `borderRadius: 14`), animated icon bouncy entrance (`AnimatedIcon`), dynamic category title, subtitle preview, and dropdown chevron.
- **Inside Bottom Sheet Modal (`catModalVisible`):** Each category option card (`optionCard72`) is strictly `height: 72`, `borderRadius: 16`, with a `44×44dp` icon box, bilingual category label and examples, and gold checkmark badge when selected. Tapping selects the category and automatically closes the sheet.

### 2. Multi-Tier Location Selector Architecture
- **Outer Location Card (`styles.dropdownCard72`):** Standardized to `height: 72`, `borderRadius: 16`. Displays type-aware placeholder ("Where was it lost?" / "Where was it found?"), clear button (`clearPill32`), and a dedicated 36dp mini map shortcut button (`mapMiniBtn36`) allowing 1-tap jump to the interactive map.
- **Inside Location Bottom Sheet Modal (`locModalVisible`):**
  1. **Custom Spot / Room TextInput:** Universal 58dp fixed outer height standard (`styles.locInputRow58`, `height: 58`), featuring a 58dp TextInput and 58dp "Set" button (`locSetBtn`) with check icon for instant room entry (e.g. "Room 402, B2").
  2. **Unified Interactive Map & GPS Action Card (`styles.mapActionCard72`):** Strictly 72dp card with pulsing map pin icon (`AnimatedIcon animation="pulse"`), gold border highlight, and direct connection to the existing unified `LocationPickerModal` with MapLibre & live GPS reverse-geocoding. Zero redundant map code or duplicate engines.
  3. **BUBT Campus Presets:** All 9 BUBT Campus Presets (Central Library, Cafeteria, B1 Admin & Academic, B2 Academic Complex, B3/Annex, Campus Mosque, Computer Labs, Exam Hall & Auditorium, Campus Grounds) rendered as strict 72dp cards (`styles.optionCard72`) with 44×44dp icon tiles, bilingual titles, and selection checkmarks.
- **Unified Location Picker Callback:** When a location is picked on the MapLibre map or reverse-geocoded via GPS, the address updates seamlessly across `loc` and `locInputText`.

---

## 24. Universal Header Action & Official PDF Document Launcher Standard

### 1. Architectural Purpose & User Experience
Campus companions must give students instant, 1-tap access to primary source institutional documents (such as official university bus schedules, semester academic calendars, and exam circulars) without navigating through nested sub-menus or searching through hundreds of general notices.

### 2. Header Action Capsule (`pdfBtn` in `SubBar.rightSlot`)
- **Container Structure (`styles.pdfBtn`):**
  - Layout: `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 4 dp` (or `5 dp`).
  - Sizing & Insets: `paddingHorizontal: 8 dp` (up to `10 dp`), `paddingVertical: 4 dp` (up to `5 dp`), `borderRadius: 8 dp` (`Radius.sm`).
  - Surface & Border: `borderWidth: 1 dp`, `borderColor: C.border`, subtle transparent/surface background that harmonizes with the header bar.
  - Sibling Actions (`styles.headerActions`): When paired with administrative action triggers (e.g., `plus-circle` route editor or add event), items are aligned in a horizontal flex row with `gap: 8 dp`.
- **Typography & Iconography:**
  - Icon: Feather `file-text` vector icon, size `13-14 px`, color `C.text2`.
  - Label: `"PDF"`, `fontSize: 11.5 px` (`FontSize.xs`), `fontFamily: FontFamily.jakartaBold`, color `C.text2`.
  - Accessibility: `accessibilityLabel` clearly states the document purpose (e.g. `"Official Bus Schedule PDF"` / `"Official Academic Calendar PDF"`).

### 3. High-Performance Instant Caching
- **Zero-Latency Offline Display:** To prevent UI flicker and loading delays, screens fetch the document URL from local memory cache first:
  - `CacheKeys.BUS_SCHEDULE_PDF_URL` in `BusScreen.tsx`.
  - `CacheKeys.CALENDAR_PDF_URL` in `AcademicCalendarScreen.tsx`.
- **Background Synchronization:** In parallel, the app asynchronously checks `public.app_config` for updated circular URLs (`latest_bus_schedule_url`, `current_academic_calendar_url`) generated by the `bubt-crawler` Edge Function, persisting fresh links to both component state and cache.
- **Native OS Deep-Link Dispatch:** Tapping opens the document directly in the user's preferred native PDF viewer or browser via `openUrl()` without in-app memory overhead.

---

## 25. PDF Maker (CamScanner Engine) & Document Workspace Design Standards

### 1. Architectural Purpose & CamScanner Parity
Students frequently capture photos of handwritten class notes, assignments, and exam scripts with varying phone camera aspect ratios (4:3 and 16:9). Standard PDF generators introduce large letterbox/pillarbox empty white voids (up to 148pt) when placing photos onto A4 pages. CampusOne's PDF Maker solves this at the engine level with 100% on-device processing, zero-void page fitting, continuous multi-page capture, in-app inspection, and true device downloads.

### 2. Zero-Void Page Layout Modes (`layoutDocumentPage`)
- **Borderless A4 (Standard):** Fills 100% of the standard A4 page edge-to-edge with 0 margin (`x: 0, y: 0, w: pageW, h: pageH`). Matches CamScanner document scanning output and completely eliminates letterbox/pillarbox voids.
- **Smart Fit:** Applies a uniform 12pt micro-margin for printed documents while computing maximum scale with `Math.floor` bounds safety.
- **Adaptive:** Scales page geometry to match the source photo's aspect ratio at 150 DPI without stretching or clipping.

### 3. Universal 58dp & 72dp Metric System Alignment
Controls and actions adhere strictly to the 58dp / 72dp design system:
- **58dp Document Title Input:** `height: 58`, `borderRadius: 16`, `borderWidth: 1`, housing Feather `type` icon and real-time sanitized filename state.
- **58dp Segmented Image Toolbar (`ToolImagesScreen.tsx`):**
  - Container: `height: 58`, `borderRadius: 16`, `borderWidth: 1`, `padding: 4`, `flexDirection: 'row'`, `gap: 6`.
  - Items: 3 balanced buttons with `borderRadius: 12`: `[+ Add More]`, `[📷 Camera]` (continuous batch capture), and `[🗑️ Clear All]` (danger tint). Matches the exact height and geometry of the Page Layout selector.
  - Page Counter: Header badge displaying current photo count (e.g. `4 photos`).
- **58dp Layout & Quality Segment Toggles:** `SegmentToggle` with `height: 58`, `borderRadius: 16`, `padding: 4`.
- **58dp Academic Stamp Toggle:** `height: 58`, `borderRadius: 16`, 1-tap vector stamping of header (`BUBT CampusOne`) and footer (`Page X of Y`).
- **58dp Full-Width Stacked Action Bars (`ResultPanel` in `components.tsx`):**
  - Replaces cramped horizontal button rows with dedicated, full-width 58dp action bars stacked vertically:
    1. **`[ 👁️ Preview PDF ]`:** `height: 58`, `borderRadius: 16`, surface2 background, border, Feather `eye` icon in brand accent.
    2. **`[ ⬇️ Save to Downloads ]`:** `height: 58`, `borderRadius: 16`, surface2 background, border, Feather `download` icon.
    3. **`[ ↗️ Share PDF ]`:** `height: 58`, `borderRadius: 16`, brand-filled, Feather `share-2` icon.
    4. **`[ 🔄 Start Over ]`:** `height: 58`, `borderRadius: 16`, outline border, Feather `rotate-ccw` icon.
- **72dp Rows & Banner Cards:**
  - Tool navigation cards (`PdfMakerScreen.tsx`): `minHeight: 72`, `borderRadius: 16`, `paddingHorizontal: 16`.
  - File rows (`FileRow`): `minHeight: 72`, `borderRadius: 16`, `padding: 12`, with 40×40dp icon box.
  - Assignment Cover Page Banner: `minHeight: 72`, `borderRadius: 16`, with 44×44dp cover icon linking directly to `CoverPageFormScreen`.

### 4. True Android File Download via StorageAccessFramework (`savePdfToDevice`)
- **Direct Download Engine:** Uses `LegacyFS.StorageAccessFramework` (`requestDirectoryPermissionsAsync`, `createFileAsync`, `writeAsStringAsync` with base64).
- **Zero Share Sheet Trigger:** Directly creates and writes `.pdf` files into user-selected device folders (such as Android `Downloads`) with confirmation toast alerts, avoiding the system share dialog when downloading.
- **Permission Memory & Graceful Recovery:** Supports directory URI persistence and falls back gracefully to system share if SAF is denied or unsupported.

### 5. 100% On-Device Offline Architecture
- **Zero External Network Dependencies:**
  - Document generation executed via pure JavaScript `pdf-lib`.
  - Document rasterization executed via local vendored `pdf.js` assets (`assets/pdfjs/*.txt`) unpacked from APK assets.
  - WebView containers (`engineHtml.ts` and `viewerHtml.ts`) enforce strict Content Security Policies (`default-src 'none'`) operating exclusively over local `file://` origins.
- **Human Vector Iconography:** Strictly `@expo/vector-icons` (`Feather`). Zero AI-generated clip-art or raw emojis.

---

## 13. Cover Page Generator & Offline Template System (`CoverPageFormScreen.tsx`)

### 1. Architectural Purpose
Academic cover pages at BUBT require strict university branding (monochrome official crest, bilingual header, standardized department naming, and student/faculty credentials). The Cover Page Generator provides an all-in-one, 100% offline-capable generator covering:
- **Assignment Cover:** Standard individual course assignment cover with 5 style templates.
- **Lab Report Cover:** Laboratory experiment report with experiment date, number, and title.
- **Project / Capstone Report:** Multi-member semester project with group member tables.
- **Internship Report:** Dual-supervisor format (academic supervisor & organizational company info).
- **Experiment Index Page:** Full-page printable laboratory index log with customizable rows.

### 2. 72dp Modular Bar Architecture (`Bar72` & `InputBar72`)
All document configuration selectors and input fields follow the 72dp layout standard matching Explore's Academics card:
- **Clean Border Standard:** Uniform 1px border (`C.border`) with 16dp radius (`borderRadius: 16`), zero side color stripes, and smooth surface backgrounds (`C.surface`).
- **Right-Side Stat Column & Divider:** Clickable selection bars feature an icon container on the left, primary title and value in the center, a 1px vertical divider (`verticalDivider`), a bold stat/status indicator (`statVal` and `statSub`), and a chevron indicator (`chevBox`).
- **58dp Bottom Actions:** Floating action panel with 58dp Primary CTA (`Generate BUBT Cover Page`) paired with 58dp secondary actions (`View / Preview`, `Save to Downloads`, `Share PDF`, and `Direct Print`).

### 3. Bottom Sheet Ergonomics & Gesture Dismissal
- **Tri-Fold Dismissal:** Modals can be dismissed instantly via:
  1. Touching the semi-transparent backdrop overlay.
  2. Pressing the physical/gesture Android back button (handled via `BackHandler` and `onRequestClose`).
  3. Tapping the top-right circular `X` close button (`closeXBtn`).
- **Zero Keyboard Blocking:** Modal sheets housing search bars (`sBar` and `sInput`) are wrapped in `KeyboardAvoidingView` with handled tap persistence to prevent keyboard obstruction.
- **Teacher Short Code Support:** Faculty picker searches across teacher full names, departments, designations, and official teacher short codes (e.g. `SRM`, `MHR`).

### 4. 100% Offline Resilience & Caching Strategy
- **Embedded Vector Logos:** Official BUBT crest and bilingual header logos are stored as embedded Base64 data URIs (`BUBT_LOGO_CREST`, `BUBT_LOGO_HEADER`), eliminating external network image fetching.
- **Three-Tier Data Hydration:**
  1. *Immediate Fallback:* Pre-bundled arrays (`DEFAULT_BUBT_DEPARTMENTS`, `DEFAULT_BUBT_COURSES`) ensure instant zero-latency UI rendering on fresh installs.
  2. *Local Storage Cache:* `AsyncStorage` caching via `getCache` and `setCache` for `COVER_DEPTS`, `COVER_COURSES`, and `COVER_FACULTY`.
  3. *Background Network Sync:* Asynchronous Supabase queries fetch latest faculty lists and department mappings without blocking the UI, gracefully failing when the device is disconnected.
- **On-Device PDF Generation & Inspection:**
  - PDF compilation executed locally via Android's native Chromium printing pipeline (`Print.printToFileAsync`).
  - In-app inspection powered by `CampusPdfViewerModal` with local `file://` scheme decoding.
  - File persistence via `savePdfToDevice` (Android StorageAccessFramework) and `sharePdf` (Android Intent).

### 5. Single-Page Academic Layout Constraints
- **Group Member Cap:** Group reports are capped at maximum 6 members to ensure all data fits strictly on a single A4 page without spilling into a second page. The UI displays a friendly limit badge once 6 members are reached.
- **Index Row Clamp:** Experiment index tables are clamped between 1 and 20 rows (`Math.min(Math.max(rows, 1), 20)`) to maintain single-page printable geometry.
- **String Sanitizers:**
  - `cleanDeptName()`: Removes redundant `"Department of"` prefixes to prevent duplicate `"Dept. of Department of..."` strings.
  - `fmtDesig()` / `rawDesig()`: Trims pre-existing parentheses from designations before formatting.





