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

5. **Student Profile Direct Action & Status Cards (`StudentProfileScreen.tsx`):**
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
   * **Dropdown Selector Cards (`BloodRequestScreen.tsx` - Case Reason, Affiliation, Hospital, Area):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with `borderRadius: 13 dp`, `14.5 px` Title, `11.5 px` Subtitle.
   * **Dengue Platelet Emergency Card (`plateletCard` in `BloodRequestScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box.
   * **Area Selector Card (`selectorCard` in `DonorRegisterScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box with spring `map-pin`.
   * **Notification Sensitivity Cards (`UrgencyCard` in `DonorRegisterScreen.tsx`):** Standalone tactile cards (`minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` icon box, `14.5 px` Title, `11.5 px` Subtitle, spring `AnimatedIcon`, and spring press feedback `0.96 ➔ 1.02 ➔ 1.0`).
   * **Verified Blood Group Card (`lockedCard` in `DonorRegisterScreen.tsx`):** `minHeight: 72 dp`, `padding: 14 dp`, `borderRadius: 16 dp`, `44 × 44 dp` badge box.
   * **Area Picker Items (`AreaPickerModal.tsx`):** Standalone items (`padding: 14 dp`, `borderRadius: 16 dp`, `itemIconBox` `44 × 44 dp`).

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
5. **Sharp Contrast Typography & Clean Active State:**
   - **Active Tab:** Electric blue (`#60a5fa`), Plus Jakarta Sans Bold, with native bouncy vector icon entrance pop. Uncluttered design eliminates bottom dots for a clean, distraction-free aesthetic.
   - **Inactive Tabs:** Sharp high-contrast slate (`rgba(203, 213, 225, 0.85)` / `#cbd5e1`), Plus Jakarta Sans Medium.
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


