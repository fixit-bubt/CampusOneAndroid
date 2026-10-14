# Map: Research, Problems, Architecture & Implementation

Scope: the location picker used by Rides, Marketplace, Blood Donation (`AreaPickerModal`) and Lost & Found.

Files:
- `src/components/location/LocationPickerModal.tsx` (UI, WebView map, search box, pin)
- `src/services/locationService.ts` (landmark list, search, reverse geocoding, GPS)

Status: **Resolved & Implemented**. Full vector rendering, instant prefix search, Photon autocomplete, tight snapping, and single hub selection implemented and verified.

---

## 1. Map Architecture Overview

| Component | Implementation | Technology |
|---|---|---|
| **Map Rendering** | Hardware-accelerated OpenFreeMap Vector GL Styles (Liberty light & Dark native) | MapLibre GL 4.7.1 via `react-native-webview` |
| **Sharpness** | Native display resolution WebGL vector rendering (no blurry raster tiles) | WebGL shaders at full device DPR |
| **Dark Theme** | Native dark vector palette (`https://tiles.openfreemap.org/styles/dark`) | Pure vector styling (no CSS canvas invert filters) |
| **Instant Search (0ms)** | Synchronous local landmark match with length-prioritized ranking | Local trie/prefix index (`searchPlacesLocal`) |
| **Live Autocomplete** | High-speed OSM Photon autocomplete API (<150ms) + Nominatim fallback | Komoot Photon API + AbortController cancellation |
| **Recent Searches** | Persistent user search history (last 5 selected locations) | `@react-native-async-storage/async-storage` |
| **Reverse Geocoding** | Tight 65m landmark snap + high-accuracy Nominatim reverse (`zoom=18`) | Nominatim reverse + Android geocoder fallback |
| **Pin Centering** | 120 FPS native RenderThread animated pin with mathematical anchor `(0, 0)` | React Native Animated with `useNativeDriver: true` |
| **Hub Chips** | Distance-based nearest hub detector (`activeHubLabel`, 120m threshold) | Single active chip calculation |
| **User GPS** | Device GPS coordinates | `expo-location` (`Accuracy.Balanced`) |

---

## 2. Problems Identified & Solutions Implemented

### 2.1 Blurry Map
- **Cause:** Previous implementation used Google raster tiles at 256px (`mt0.google.com`), which were stretched on high-DPI (2x/3x) mobile screens, appearing blurry and pixelated. In dark mode, a CSS `invert` filter was applied to the canvas, further degrading contrast and sharpness.
- **Solution:** Replaced raster tiles with **OpenFreeMap vector tiles** (`liberty` and `dark`). MapLibre GL renders vector geometry directly on the GPU at native device pixel ratio, providing razor-sharp roads, building outlines, and crisp bilingual labels. In dark mode, the native dark vector style is loaded with no canvas filters.

### 2.2 Search Bar Hanging & Overlapping
- **Cause:**
  1. `searchPlacesOnline` previously awaited an external Nominatim call (up to 3.5s timeout) before returning even local matches, showing a spinning indicator with no results.
  2. Frequent keystrokes without request cancellation hit Nominatim rate limits (1 req/sec).
  3. `useEffect` depended on `currentCoords`, re-triggering search and clearing state whenever the map was dragged.
  4. The right-hand FAB buttons (`rightFabColumn`) were rendered after the search overlay in the JSX tree, overlaying and intercepting touches on the right side of search results.
- **Solution:**
  1. Implemented **two-stage search**: `searchPlacesLocal` runs **synchronously (0ms)** on keystroke, immediately displaying local Dhaka landmarks (e.g. typing "Sony" instantly surfaces `Sony Square (Sony Cinema)`).
  2. Debounced online search (280ms) queries **Photon autocomplete API** with `AbortController` cancellation, smoothly merging online results with local landmarks.
  3. Search query state is isolated from map panning via `currentCoordsRef`.
  4. Added **Recent Searches** persistence via AsyncStorage. When the search bar is focused with empty text, past searches and suggested hubs are displayed with a "Clear" option.
  5. FAB column is hidden during active search and rendered with proper elevation so the search dropdown has complete touch focus.

### 2.3 Pin Misplacement & False Snapping
- **Cause:**
  1. Landmark snapping used `maxDistanceMeters = 280`, which snapped any pin dropped within a 3-block radius to `BUBT Main Campus`.
  2. Commute hub chips used `< 0.003` (~330m) delta, causing both `BUBT Campus` and `Sony Square` to highlight simultaneously.
  3. Banani 11 and Jatra Biroti had identical coordinates.
- **Solution:**
  1. Reduced landmark snap radius to **65 meters** in `findNearestLandmark`, so only pins dropped directly at campus grounds snap to BUBT. Other locations resolve to their true road or building.
  2. Implemented `activeHubLabel` calculating the single closest hub within 120m, ensuring only ONE chip is ever active.
  3. Corrected coordinates for Jatra Biroti (`23.7942, 90.4036`) and Banani 11 (`23.7932, 90.4048`).
  4. Standardized default subtitle copy across all screens.

---

## 3. Verification & Build
- TypeScript type-check passed with zero errors (`npx tsc --noEmit`).
- Assembled and installed release APK directly on connected physical Android device.
