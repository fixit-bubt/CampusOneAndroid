import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { openUrl } from '../../utils/link';
import {
  BUBT_COORDS,
  getCurrentUserCoordinates,
  isWithinBangladesh,
  getDistanceMeters,
  findMasterLocationByName,
  type Coordinates,
} from '../../services/locationService';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';

export type TravelMode = 'driving' | 'walking' | 'bicycling';

export interface DirectionMapModalProps {
  visible: boolean;
  onClose: () => void;
  // Destination Details
  destination: string;
  destinationSub?: string | null;
  destinationCoords?: Coordinates | null;
  // Origin Details (defaults to user's real GPS or BUBT)
  origin?: string;
  originCoords?: Coordinates | null;
  // Additional Route Metadata (optional)
  notes?: string | null;
  fare?: number | null;
  vehicle?: string | null;
  // Visual & Feature Customization
  title?: string;
  sectorColor?: string;
  iconName?: keyof typeof Feather.glyphMap;
  badgeText?: string;
}

interface RouteInfo {
  coordinates: [number, number][];
  distanceM: number;
  durationS: number;
}

function escapeMapLabel(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/[\r\n]+/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

function generateDirectionMapHtml(
  originCoords: Coordinates,
  originLabel: string,
  destCoords: Coordinates,
  destLabel: string,
  accentColor: string,
  initialRoute: RouteInfo | null,
  isDark: boolean
): string {
  const bgColor = isDark ? '#121212' : '#f8fafc';
  const styleUrl = isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
  const startLng = originCoords.longitude;
  const startLat = originCoords.latitude;
  const destLng = destCoords.longitude;
  const destLat = destCoords.latitude;
  const initialCoordinatesJson = initialRoute ? JSON.stringify(initialRoute.coordinates) : 'null';
  const initialDistance = initialRoute ? initialRoute.distanceM : 0;
  const initialDuration = initialRoute ? initialRoute.durationS : 0;
  const safeOriginLabel = escapeMapLabel(originLabel);
  const safeDestLabel = escapeMapLabel(destLabel);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: ${bgColor};
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background-color: ${bgColor};
    }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo, .maplibregl-compact {
      display: none !important;
    }

    /* Google Maps Live Location Blue Dot with Pulsing Radar Ring */
    .origin-container {
      position: relative;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .origin-pulse {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: rgba(39, 94, 254, 0.35);
      animation: pulse-ring 2s infinite ease-out;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .origin-dot {
      position: relative;
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: #275efe;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
      z-index: 2;
    }
    .origin-tag {
      position: absolute;
      top: 36px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }

    /* Google Maps Style Destination Teardrop Pin */
    .dest-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .dest-pin {
      width: 32px;
      height: 32px;
      border-radius: 16px 16px 16px 4px;
      background: ${accentColor};
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      border: 2px solid #ffffff;
    }
    .dest-pin-inner {
      width: 12px;
      height: 12px;
      border-radius: 6px;
      background: #ffffff;
      transform: rotate(45deg);
    }
    .dest-tag {
      margin-top: 8px;
      background: ${accentColor};
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 7px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid rgba(255,255,255,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    var map;
    var startLng = ${startLng};
    var startLat = ${startLat};
    var destLng = ${destLng};
    var destLat = ${destLat};
    var originMarker = null;
    var destMarker = null;

    try {
      map = new maplibregl.Map({
        container: 'map',
        style: '${styleUrl}',
        center: [(startLng + destLng) / 2, (startLat + destLat) / 2],
        zoom: 13,
        pitch: 28,
        attributionControl: false
      });

      // 1. Origin Marker (Live GPS Blue Dot)
      var originEl = document.createElement('div');
      originEl.className = 'origin-container';
      originEl.innerHTML = '<div class="origin-pulse"></div><div class="origin-dot"></div><div class="origin-tag">${safeOriginLabel}</div>';
      originMarker = new maplibregl.Marker({ element: originEl })
        .setLngLat([startLng, startLat])
        .addTo(map);

      // 2. Destination Marker (Pin)
      var destEl = document.createElement('div');
      destEl.className = 'dest-container';
      destEl.innerHTML = '<div class="dest-pin"><div class="dest-pin-inner"></div></div><div class="dest-tag">${safeDestLabel}</div>';
      destMarker = new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
        .setLngLat([destLng, destLat])
        .addTo(map);

      function fitBothBounds() {
        if (!map) return;
        var bounds = new maplibregl.LngLatBounds();
        bounds.extend([startLng, startLat]);
        bounds.extend([destLng, destLat]);
        map.fitBounds(bounds, {
          padding: { top: 70, bottom: 120, left: 50, right: 50 },
          maxZoom: 16,
          duration: 1000
        });
      }

      function renderPolylineOnMap(coords) {
        if (!map || !coords || coords.length < 2) return;
        var geojson = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords }
        };

        if (map.getSource('route-line')) {
          map.getSource('route-line').setData(geojson);
        } else {
          // Route casing (drop shadow border)
          map.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: { type: 'geojson', data: geojson },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#0f172a',
              'line-width': 8,
              'line-opacity': 0.35
            }
          });

          // Core Route line (Electric Blue)
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: { type: 'geojson', data: geojson },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#2563eb',
              'line-width': 5.5,
              'line-opacity': 0.95
            }
          });
        }
      }

      map.on('load', function() {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
        fitBothBounds();
        var initialCoords = ${initialCoordinatesJson};
        if (initialCoords && initialCoords.length > 0) {
          renderPolylineOnMap(initialCoords);
        }
      });

      // Exposed Global Methods for Native React Native Bridge
      window.updateOrigin = function(lng, lat, label) {
        startLng = Number(lng);
        startLat = Number(lat);
        if (originMarker) {
          originMarker.setLngLat([startLng, startLat]);
        }
        if (label) {
          var tag = originEl.querySelector('.origin-tag');
          if (tag) tag.textContent = label;
        }
        fitBothBounds();
      };

      window.recenterToUser = function() {
        if (!map) return;
        map.flyTo({ center: [startLng, startLat], zoom: 16, duration: 800 });
      };

      window.recenterToDest = function() {
        if (!map) return;
        map.flyTo({ center: [destLng, destLat], zoom: 16, duration: 800 });
      };

      window.fitRouteBounds = function() {
        fitBothBounds();
      };

      window.resetCompass = function() {
        if (!map) return;
        map.resetNorthPitch({ duration: 600 });
      };

      window.updateRoute = function(coords) {
        renderPolylineOnMap(coords);
      };
    } catch (e) {
      console.warn('MapLibre init error', e);
    }
  </script>
</body>
</html>
  `.trim();
}

export function DirectionMapModal({
  visible,
  onClose,
  destination,
  destinationSub,
  destinationCoords,
  origin,
  originCoords: propOriginCoords,
  notes,
  fare,
  vehicle,
  title,
  sectorColor = SectorColors.market,
  iconName = 'map-pin',
  badgeText,
}: DirectionMapModalProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [originCoords, setOriginCoords] = useState<Coordinates>(propOriginCoords || BUBT_COORDS);
  const [originLabel, setOriginLabel] = useState<string>(origin || 'BUBT Campus');
  const [isLiveUserLocation, setIsLiveUserLocation] = useState<boolean>(!!propOriginCoords);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const mapReadyRef = useRef(false);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        mapReadyRef.current = true;
        if (originCoords) {
          webViewRef.current?.injectJavaScript(`
            if (window.updateOrigin) {
              window.updateOrigin(${originCoords.longitude}, ${originCoords.latitude}, '${originLabel.replace(/'/g, "\\'")}');
            }
            true;
          `);
        }
        if (routeInfo?.coordinates) {
          webViewRef.current?.injectJavaScript(`
            if (window.updateRoute) {
              window.updateRoute(${JSON.stringify(routeInfo.coordinates)});
            }
            true;
          `);
        }
      }
    } catch (e) {}
  }, [originCoords, originLabel, routeInfo]);

  // 1. Resolve destination coordinates from DB / master landmarks / hospital registry
  const resolvedDest = useMemo(() => {
    if (destinationCoords && Number.isFinite(destinationCoords.latitude) && Number.isFinite(destinationCoords.longitude)) {
      return {
        coords: destinationCoords,
        verifiedName: destination,
        subLocation: destinationSub || 'Dhaka',
        searchQuery: `${destinationCoords.latitude},${destinationCoords.longitude}`,
      };
    }

    // 1. Check Dhaka Master Landmark & Hospital Registry first (519 verified places)
    const landmark = findMasterLocationByName(destination);
    if (landmark) {
      return {
        coords: landmark.coords,
        verifiedName: landmark.name,
        subLocation: landmark.subLocation || landmark.zone || 'Dhaka',
        searchQuery: `${landmark.coords.latitude},${landmark.coords.longitude}`,
      };
    }

    // 2. Check Hospital Registry & Area Disambiguation
    const hosp = resolveHospitalLocation(destination, destinationSub || undefined);
    if (hosp.isExactMatch) {
      return hosp;
    }

    // 3. Fallback coords
    return {
      coords: hosp.coords || BUBT_COORDS,
      verifiedName: destination,
      subLocation: destinationSub || 'Dhaka',
      searchQuery: hosp.coords ? `${hosp.coords.latitude},${hosp.coords.longitude}` : destination,
    };
  }, [destination, destinationSub, destinationCoords]);

  const destCoords = resolvedDest.coords;
  const destName = resolvedDest.verifiedName;
  const destSub = resolvedDest.subLocation;
  const destQuery = resolvedDest.searchQuery;

  // 2. Fetch origin coordinates (prop, master landmark, or live phone GPS)
  useEffect(() => {
    if (!visible) {
      mapReadyRef.current = false;
      if (!propOriginCoords) {
        setOriginCoords(BUBT_COORDS);
        setOriginLabel('BUBT Campus');
        setIsLiveUserLocation(false);
      }
      return;
    }

    if (propOriginCoords) {
      setOriginCoords(propOriginCoords);
      setOriginLabel(origin || 'Selected Origin');
      setIsLiveUserLocation(false);
      return;
    }

    if (origin && origin !== 'Your Location') {
      const originLm = findMasterLocationByName(origin);
      if (originLm) {
        setOriginCoords(originLm.coords);
        setOriginLabel(originLm.name);
        setIsLiveUserLocation(false);
        return;
      }
    }

    let active = true;
    getCurrentUserCoordinates().then(loc => {
      if (!active || !loc) return;
      if (isWithinBangladesh(loc)) {
        setOriginCoords(loc);
        setOriginLabel('Your Location');
        setIsLiveUserLocation(true);
        webViewRef.current?.injectJavaScript(`
          if (window.updateOrigin) {
            window.updateOrigin(${loc.longitude}, ${loc.latitude}, 'Your Location');
          }
          true;
        `);
      }
    });

    return () => {
      active = false;
    };
  }, [visible, propOriginCoords, origin]);

  // 3. Fetch real-time route geometry from OSRM based on selected travel mode
  useEffect(() => {
    if (!visible) {
      setRouteInfo(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);

    const startLng = originCoords.longitude;
    const startLat = originCoords.latitude;
    const destLng = destCoords.longitude;
    const destLat = destCoords.latitude;

    const osrmProfile = travelMode === 'walking' ? 'foot' : 'driving';
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timer);
        if (cancelled) return;
        if (data && data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          // For bike mode, estimate based on driving route with 1.35x speed factor
          let duration = r.duration;
          if (travelMode === 'bicycling') {
            duration = Math.round(r.duration * 0.75);
          }
          const info = {
            coordinates: r.geometry.coordinates,
            distanceM: r.distance,
            durationS: duration,
          };
          setRouteInfo(info);
          // Update WebView route line dynamically
          webViewRef.current?.injectJavaScript(`if (window.updateRoute) { window.updateRoute(${JSON.stringify(info.coordinates)}); } true;`);
        }
      })
      .catch(() => {
        // Graceful fallback
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [visible, originCoords, destCoords, travelMode]);

  // 4. Formatted distance & duration metrics
  const metrics = useMemo(() => {
    const originText = isLiveUserLocation ? 'your location' : 'BUBT Campus';
    let distanceKm = 0;
    let durationMins = 0;

    if (routeInfo?.distanceM) {
      distanceKm = Number((routeInfo.distanceM / 1000).toFixed(1));
      durationMins = Math.max(1, Math.round(routeInfo.durationS / 60));
    } else {
      const meters = getDistanceMeters(
        originCoords.latitude,
        originCoords.longitude,
        destCoords.latitude,
        destCoords.longitude
      );
      if (Number.isFinite(meters) && meters > 0) {
        distanceKm = Number((meters / 1000).toFixed(1));
        const speedKmh = travelMode === 'walking' ? 4.5 : travelMode === 'bicycling' ? 18 : 22;
        durationMins = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
      }
    }

    // Compute ETA Arrival Clock Time
    const now = new Date();
    const etaDate = new Date(now.getTime() + durationMins * 60 * 1000);
    const etaStr = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      distanceKm,
      durationMins,
      etaStr,
      originText,
    };
  }, [originCoords, destCoords, routeInfo, isLiveUserLocation, travelMode]);

  // 5. Generate MapLibre HTML
  const mapHtml = useMemo(() => {
    return generateDirectionMapHtml(
      originCoords,
      originLabel,
      destCoords,
      destName,
      sectorColor,
      routeInfo,
      isDark
    );
  }, [originCoords, originLabel, destCoords, destName, sectorColor, isDark]);

  // Floating map actions
  const handleRecenterUser = useCallback(() => {
    webViewRef.current?.injectJavaScript('if (window.recenterToUser) { window.recenterToUser(); } true;');
  }, []);

  const handleFitRoute = useCallback(() => {
    webViewRef.current?.injectJavaScript('if (window.fitRouteBounds) { window.fitRouteBounds(); } true;');
  }, []);

  const handleResetCompass = useCallback(() => {
    webViewRef.current?.injectJavaScript('if (window.resetCompass) { window.resetCompass(); } true;');
  }, []);

  // 1-Tap Google Maps Launch
  function handleOpenGoogleMaps() {
    const originParam = encodeURIComponent(origin || (isLiveUserLocation ? `${originCoords.latitude},${originCoords.longitude}` : 'BUBT'));
    const query = destCoords
      ? `${destCoords.latitude},${destCoords.longitude}`
      : encodeURIComponent(destQuery || destName);
    const mode = travelMode === 'walking' ? 'walking' : travelMode === 'bicycling' ? 'bicycling' : 'driving';
    const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${query}&travelmode=${mode}`;
    openUrl(dirUrl);
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.rootContainer, { backgroundColor: isDark ? '#111317' : '#f8fafc' }]}>
        {/* Full-Bleed Edge-to-Edge Vector Map */}
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          startInLoadingState={true}
          onMessage={handleWebViewMessage}
          renderLoading={() => (
            <View style={[styles.mapLoader, { backgroundColor: C.surface }]}>
              <ActivityIndicator size="large" color={sectorColor} />
              <Text style={[styles.mapLoaderTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Loading interactive Dhaka map…
              </Text>
            </View>
          )}
        />

        {/* Floating Top Bar (Universal 58dp Standard: Frosted Back Button + Route Info Capsule) */}
        <View style={[styles.topBarWrapper, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <TouchableOpacity
            style={[styles.frostedCloseBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close directions map"
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={[styles.headerCapsule, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View
              style={[
                styles.headerIconPill,
                {
                  backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15`,
                  borderColor: sectorColor,
                  borderWidth: 1,
                },
              ]}
            >
              <AnimatedIcon
                family="feather"
                name={iconName}
                size={16}
                color={sectorColor}
                animation="spring"
              />
            </View>
            <View style={{ flex: 1, marginRight: 4 }}>
              <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {title || 'Route & Directions'}
              </Text>
              <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {isLiveUserLocation ? 'Directions from your live location' : 'Directions from BUBT Campus'}
              </Text>
            </View>
          </View>
        </View>

        {/* Google Maps Floating Action Controls (Right Rail) */}
        <View style={[styles.floatingControls, { top: insets.top + 76 }]}>
          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={handleResetCompass}
            activeOpacity={0.8}
            accessibilityLabel="Reset compass orientation"
          >
            <Feather name="compass" size={16} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={handleFitRoute}
            activeOpacity={0.8}
            accessibilityLabel="Fit route bounds"
          >
            <Feather name="maximize-2" size={15} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: isLiveUserLocation ? '#2563eb' : C.surface, borderColor: C.border }]}
            onPress={handleRecenterUser}
            activeOpacity={0.8}
            accessibilityLabel="Recenter to your location"
          >
            <Feather name="crosshair" size={17} color={isLiveUserLocation ? '#ffffff' : C.text} />
          </TouchableOpacity>
        </View>

        {/* Route Loading Indicator Badge */}
        {routeLoading && (
          <View style={[styles.routeLoaderBadge, { top: insets.top + 76, backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)' }]}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={[styles.routeLoaderTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Calculating best road route…
            </Text>
          </View>
        )}

        {/* Bottom Google Maps Navigation Sheet */}
        <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Travel Mode Switcher Tabs */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'driving' && [styles.modeTabActive, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15`, borderColor: sectorColor }],
              ]}
              onPress={() => setTravelMode('driving')}
              activeOpacity={0.75}
            >
              <Feather name="navigation" size={13} color={travelMode === 'driving' ? sectorColor : C.textMuted} />
              <Text style={[styles.modeTabTxt, { color: travelMode === 'driving' ? sectorColor : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                Drive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'bicycling' && [styles.modeTabActive, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15`, borderColor: sectorColor }],
              ]}
              onPress={() => setTravelMode('bicycling')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="motorbike" size={15} color={travelMode === 'bicycling' ? sectorColor : C.textMuted} />
              <Text style={[styles.modeTabTxt, { color: travelMode === 'bicycling' ? sectorColor : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                Bike / Ride
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'walking' && [styles.modeTabActive, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15`, borderColor: sectorColor }],
              ]}
              onPress={() => setTravelMode('walking')}
              activeOpacity={0.75}
            >
              <Feather name="user" size={13} color={travelMode === 'walking' ? sectorColor : C.textMuted} />
              <Text style={[styles.modeTabTxt, { color: travelMode === 'walking' ? sectorColor : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                Walk
              </Text>
            </TouchableOpacity>
          </View>

          {/* Travel Metrics Header (Big Duration, Distance & ETA) */}
          <View style={styles.metricsRow}>
            <View style={styles.metricsLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={[styles.durationTxt, { color: sectorColor, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {metrics.durationMins} min
                </Text>
                <Text style={[styles.distanceTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  ({metrics.distanceKm} km)
                </Text>
              </View>
              <Text style={[styles.etaTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                Arrive by ~{metrics.etaStr} · from {metrics.originText}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              {fare !== undefined && fare !== null && (
                <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.12)' }]}>
                  <Text style={[styles.badgePillTxt, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>
                    ৳{fare}
                  </Text>
                </View>
              )}

              {vehicle && (
                <View style={[styles.badgePill, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15` }]}>
                  <Text style={[styles.badgePillTxt, { color: sectorColor, fontFamily: FontFamily.jakartaBold }]}>
                    {vehicle}
                  </Text>
                </View>
              )}

              {badgeText && (
                <View style={[styles.badgePill, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15` }]}>
                  <Text style={[styles.badgePillTxt, { color: sectorColor, fontFamily: FontFamily.jakartaBold }]}>
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stops Track (if origin is distinct from Your Location) OR Destination Summary Box */}
          {origin && origin !== 'Your Location' ? (
            <View style={[styles.stopsTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.surface2, borderColor: C.border }]}>
              <View style={styles.stopRow}>
                <View style={[styles.stopDot, { backgroundColor: '#10b981' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stopMicro, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>
                    PICKUP POINT
                  </Text>
                  <Text style={[styles.stopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {originLabel}
                  </Text>
                </View>
              </View>

              {notes ? (
                <View style={[styles.meetingBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a' }]}>
                  <Feather name="map-pin" size={11} color="#f59e0b" />
                  <Text style={[styles.meetingTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Meeting: {notes}
                  </Text>
                </View>
              ) : null}

              <View style={styles.stopRow}>
                <View style={[styles.stopDot, { backgroundColor: '#ef4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stopMicro, { color: '#ef4444', fontFamily: FontFamily.jakartaBold }]}>
                    DROP-OFF DESTINATION
                  </Text>
                  <Text style={[styles.stopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {destName}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.destSummaryBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.surface2, borderColor: C.border }]}>
              <View style={[styles.destIconWrap, { backgroundColor: isDark ? `${sectorColor}25` : `${sectorColor}15` }]}>
                <Feather name={iconName} size={14} color={sectorColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.destTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {destName}
                </Text>
                <Text style={[styles.destSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                  {destSub}
                </Text>
              </View>
            </View>
          )}

          {/* Action CTA: 1-Tap Google Maps Navigation (PRESERVED 100%) */}
          <TouchableOpacity
            style={[styles.startNavBtn, { backgroundColor: '#2563eb' }]}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.85}
          >
            <Feather name="navigation" size={17} color="#ffffff" />
            <Text style={[styles.startNavBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
              Start Live Directions in Google Maps
            </Text>
            <Feather name="arrow-up-right" size={15} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
  } as ViewStyle,
  webView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  } as ViewStyle,
  topBarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    gap: 10,
    zIndex: 100,
    elevation: 10,
  } as ViewStyle,
  frostedCloseBtn: {
    width: Layout.controlHeight, // 58dp
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  } as ViewStyle,
  headerCapsule: {
    flex: 1,
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  } as ViewStyle,
  headerIconPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: 14.5,
  } as TextStyle,
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,

  mapLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  } as ViewStyle,
  mapLoaderTxt: {
    fontSize: 13,
  } as TextStyle,

  // Google Maps Floating Action Controls (Right Rail)
  floatingControls: {
    position: 'absolute',
    right: 14,
    gap: 10,
    zIndex: 10,
  } as ViewStyle,
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,

  routeLoaderBadge: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  } as ViewStyle,
  routeLoaderTxt: {
    fontSize: 12,
  } as TextStyle,

  // Bottom Navigation Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
    zIndex: 95,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  } as ViewStyle,
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  modeTab: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  } as ViewStyle,
  modeTabActive: {
    borderWidth: 1,
  } as ViewStyle,
  modeTabTxt: {
    fontSize: 12.5,
  } as TextStyle,

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  } as ViewStyle,
  metricsLeft: {
    flex: 1,
  } as ViewStyle,
  durationTxt: {
    fontSize: 22,
  } as TextStyle,
  distanceTxt: {
    fontSize: 14,
  } as TextStyle,
  etaTxt: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  } as ViewStyle,
  badgePillTxt: {
    fontSize: 11.5,
  } as TextStyle,

  stopsTrack: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,
  stopMicro: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  } as TextStyle,
  stopTitle: {
    fontSize: 13.5,
  } as TextStyle,
  meetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 20,
  } as ViewStyle,
  meetingTxt: {
    fontSize: 11.5,
  } as TextStyle,

  destSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  destIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  destTitleTxt: {
    fontSize: 13.5,
  } as TextStyle,
  destSubTxt: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,

  // 58dp Primary Navigation Action Button
  startNavBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  } as ViewStyle,
  startNavBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,
});
