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

## 8. Animated Curved Tab Bar Standard (`CurvedTabBar.tsx`)

CampusOne implements the organic curved tab bar inspired by 21st.dev (`abxlfazl__/animated-tab-bar`):
1. **Organic Curved Hill Pedestal:**
   * Width: `96 dp`, Height: `18 dp`.
   * Mathematical cubic Bezier path with exact C1 continuous horizontal tangents at both base and crest (`M 0 18 C 20 18, 32 0, 48 0 C 64 0, 76 18, 96 18`).
   * Seamlessly extends the tab bar upward into a smooth organic dome matching `C.surface`, with a `C.border` stroke hugging the crest.
   * Slides horizontally across tabs via `translateX` powered by `Animated.spring(slideAnim, { tension: 200, friction: 17, useNativeDriver: true })` running at 120 FPS on Android RenderThread.
2. **Elevated Active Bubble:**
   * Diameter: `48 dp` circle, poised on the crest of the hill (`top: -24 dp` relative to bar).
   * Background: Electric Brand Blue (`C.brand`: `#5b85f7` dark / `#2b5be3` light), with `elevation: 6` and `shadowRadius: 6`.
   * Bubble Pop Animation: Compresses to `0.85` on tap and springs to `1.12` before settling at `1.0` on arrival (`useNativeDriver: true`).
   * Houses the active Feather icon in `#ffffff` (21px).
3. **Aligned Tab Labels:**
   * All 5 navigation tab labels ("Home", "Explore", "Messages", "Annex", "Settings") sit on the exact same uniform baseline across the bottom of the bar.
   * Active tab label is tinted in bold `C.brand`, while inactive labels remain subtle `C.textMuted`. No missing or hidden labels.
4. **Dynamic Role Layout:**
   * Tab width is dynamically computed as `containerWidth / routesCount`.
   * Automatically adapts between 5 tabs (Students: Home, Explore, Messages, Annex, Settings) and 4 tabs (Staff & Admins: Home, Explore, Annex, Settings).
5. **Ergonomics & Insets:**
   * Bar height: `58 + Math.max(insets.bottom, 10) dp` to ensure ample clearance above Android 15 edge-to-edge navigation gesture handles.

---

## 9. Tactile Squish Switch Standard (`TactileSwitch.tsx`)

All legacy React Native `<Switch>` components across CampusOne are replaced with `TactileSwitch`, inspired by 21st.dev (`kuratlielia/switch`):
1. **100% Native Driver Performance:**
   * Both `posAnim` and `scaleXAnim` run entirely with `useNativeDriver: true`, preventing thread blocking and eliminating `Invariant Violation` errors.
2. **Layered Track Views:**
   * Base track displays `inactiveTrackColor` (`C.surface3` / `C.border2`), while an absolute overlay displays `activeTrackColor` (`C.brand`), smoothly fading in/out via native `opacity`. Eliminates color string interpolation crashes.
3. **Finger Squish Effect:**
   * On press down (`onPressIn`), the thumb stretches horizontally (`scaleX: 1.2`) with spring physics.
   * On toggle transition, the thumb momentarily expands to `scaleX: 1.16` for 75ms before snapping to rest (`1.0`), simulating fluid moving mass.
4. **Clamped Native Travel:**
   * The thumb travels `20 dp` across the track using clamped interpolation (`extrapolate: 'clamp'`) with critically damped spring physics (`tension: 280, friction: 20`).
5. **Universal Application:**
   * Deployed across all 16 toggle locations in the app (Settings, Notifications, Profile, Marketplace, Study Hub, Medical, and Announcements).

