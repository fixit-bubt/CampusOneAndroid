import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { openUrl } from '../../utils/link';
import {
  BUBT_COORDS,
  getCurrentUserCoordinates,
  isWithinBangladesh,
  getDistanceMeters,
  type Coordinates,
} from '../../services/locationService';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';

interface HospitalMapModalProps {
  visible: boolean;
  onClose: () => void;
  hospital: string;
  area?: string;
  coords?: Coordinates;
}

interface RouteInfo {
  coordinates: [number, number][];
  distanceM: number;
  durationS: number;
}

function generateHospitalMapHtml(
  originCoords: Coordinates,
  originLabel: string,
  destCoords: Coordinates,
  destLabel: string,
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
  const safeOriginLabel = originLabel.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const safeDestLabel = destLabel.replace(/'/g, "\\'").replace(/"/g, '&quot;');

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

    /* Start Marker: Live Google Maps Style Blue Navigation Dot with Pulsing Radar Ring */
    .origin-container {
      position: relative;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .origin-pulse {
      position: absolute;
      width: 34px;
      height: 34px;
      border-radius: 17px;
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
      top: 34px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 5px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      pointer-events: none;
      border: 1px solid rgba(255,255,255,0.2);
    }

    /* Destination Marker: Google Maps Style Red Teardrop Hospital Pin (Exact Twin of Map Picker) */
    .dest-pin-wrap {
      position: relative;
      width: 38px;
      height: 48px;
      cursor: pointer;
    }
    .dest-pin-shadow {
      position: absolute;
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 22px;
      height: 6px;
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.45);
    }
    .dest-pin-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 38px;
      height: 48px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
    }
    .dest-tag {
      position: absolute;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isDark ? 'rgba(18, 18, 18, 0.94)' : 'rgba(255, 255, 255, 0.96)'};
      color: ${isDark ? '#f4f4f5' : '#0f172a'};
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'};
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    /* Floating Trip Summary Bar */
    .route-bar {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      background: ${isDark ? 'rgba(18, 18, 18, 0.92)' : 'rgba(255, 255, 255, 0.96)'};
      backdrop-filter: blur(10px);
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
      border-radius: 14px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0,0,0,0.28);
      z-index: 10;
    }
    .route-bar-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .route-bar-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .route-time {
      font-size: 15px;
      font-weight: 800;
      color: #34d399;
    }
    .route-dist {
      font-size: 13px;
      font-weight: 600;
      color: ${isDark ? '#a1a1aa' : '#64748b'};
    }
    .route-via {
      font-size: 11px;
      font-weight: 500;
      color: ${isDark ? '#71717a' : '#94a3b8'};
    }

    /* Floating Google Maps Style Recenter Button (Symmetrical, Upright Crosshairs) */
    .map-controls {
      position: absolute;
      right: 14px;
      bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10;
    }
    .ctrl-btn {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: ${isDark ? '#1e1e1e' : '#ffffff'};
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)'};
      color: ${isDark ? '#f4f4f5' : '#0f172a'};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      outline: none;
    }
    .ctrl-btn:active {
      transform: scale(0.92);
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Floating Trip Summary Bar -->
  <div id="route-bar" class="route-bar" style="display: none;">
    <div class="route-bar-left">
      <div class="route-bar-main">
        <span id="route-time" class="route-time">-- min</span>
        <span id="route-dist" class="route-dist">(-- km)</span>
      </div>
      <span class="route-via">Driving route from ${safeOriginLabel}</span>
    </div>
  </div>

  <!-- Symmetrical, Upright Google Maps Crosshairs Recenter Button -->
  <div class="map-controls">
    <button class="ctrl-btn" id="btn-recenter" title="Recenter Route" onclick="recenterRoute()">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="8"></circle>
        <line x1="12" y1="2" x2="12" y2="5"></line>
        <line x1="12" y1="19" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="5" y2="12"></line>
        <line x1="19" y1="12" x2="22" y2="12"></line>
        <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
      </svg>
    </button>
  </div>

  <script>
    var startLng = ${startLng};
    var startLat = ${startLat};
    var destLng = ${destLng};
    var destLat = ${destLat};
    var initialCoords = ${initialCoordinatesJson};
    var initialDist = ${initialDistance};
    var initialDur = ${initialDuration};
    var activeRouteCoords = null;
    var map = null;

    function recenterRoute() {
      if (!map || !activeRouteCoords || activeRouteCoords.length === 0) return;
      var bounds = new maplibregl.LngLatBounds();
      activeRouteCoords.forEach(function(c) { bounds.extend(c); });
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 45, left: 45, right: 45 },
        maxZoom: 16.5,
        duration: 700
      });
    }

    if (typeof maplibregl !== 'undefined') {
      try {
        map = new maplibregl.Map({
          container: 'map',
          style: '${styleUrl}',
          center: [(startLng + destLng) / 2, (startLat + destLat) / 2],
          zoom: 13,
          minZoom: 9,
          maxZoom: 19,
          dragRotate: false,
          touchPitch: false,
          attributionControl: false
        });

        // 1. Start Marker (Your Live Location or BUBT)
        var originEl = document.createElement('div');
        originEl.className = 'origin-container';
        originEl.innerHTML = '<div class="origin-pulse"></div><div class="origin-dot"></div><div class="origin-tag">${safeOriginLabel}</div>';
        new maplibregl.Marker({ element: originEl, anchor: 'center' })
          .setLngLat([startLng, startLat])
          .addTo(map);

        // 2. Destination Marker: Google Maps Style Red Teardrop Hospital Pin (Exact Twin of Map Picker)
        var destEl = document.createElement('div');
        destEl.className = 'dest-pin-wrap';
        destEl.innerHTML = '<div class="dest-pin-shadow"></div>' +
          '<svg class="dest-pin-svg" width="38" height="48" viewBox="0 0 38 48">' +
          '<path d="M 19 47.5 C 18 45.5, 2 27, 2 19 A 17 17 0 1 1 36 19 C 36 27, 20 45.5, 19 47.5 Z" fill="#c7344a" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>' +
          '<circle cx="19" cy="18" r="7.5" fill="#ffffff"/>' +
          '<path d="M 17.5 13.5 H 20.5 V 16.5 H 23.5 V 19.5 H 20.5 V 22.5 H 17.5 V 19.5 H 14.5 V 16.5 H 17.5 Z" fill="#c7344a"/>' +
          '</svg>' +
          '<div class="dest-tag">${safeDestLabel}</div>';
        new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
          .setLngLat([destLng, destLat])
          .addTo(map);

        function renderPolylineOnMap(coordinates, distanceM, durationS) {
          if (!map) return;
          activeRouteCoords = coordinates;

          if (map.getSource('nav-route')) {
            map.getSource('nav-route').setData({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: coordinates }
            });
          } else {
            map.addSource('nav-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: coordinates }
              }
            });

            // Outer dark casing border for contrast
            map.addLayer({
              id: 'nav-route-casing',
              type: 'line',
              source: 'nav-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '${isDark ? '#081738' : '#1e3a8a'}',
                'line-width': 8.5,
                'line-opacity': 0.8
              }
            });

            // Core electric blue navigation route line
            map.addLayer({
              id: 'nav-route-line',
              type: 'line',
              source: 'nav-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#275efe',
                'line-width': 5.5,
                'line-opacity': 0.98
              }
            });

            // Subtle white dashed inner trail (Traffic flow indicator like Google Maps)
            map.addLayer({
              id: 'nav-route-dash',
              type: 'line',
              source: 'nav-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#ffffff',
                'line-width': 1.6,
                'line-opacity': 0.7,
                'line-dasharray': [2, 3]
              }
            });
          }

          recenterRoute();

          // Update floating summary bar
          var bar = document.getElementById('route-bar');
          var timeEl = document.getElementById('route-time');
          var distEl = document.getElementById('route-dist');
          if (bar && timeEl && distEl) {
            if (distanceM && durationS) {
              var km = (distanceM / 1000).toFixed(1);
              var mins = Math.max(1, Math.round(durationS / 60));
              timeEl.innerText = mins + ' min';
              distEl.innerText = '(' + km + ' km)';
            } else {
              timeEl.innerText = 'Directions';
              distEl.innerText = 'Connected';
            }
            bar.style.display = 'flex';
          }
        }

        map.on('load', function() {
          if (initialCoords && initialCoords.length > 0) {
            renderPolylineOnMap(initialCoords, initialDist, initialDur);
            return;
          }

          var defaultDirectLine = [
            [startLng, startLat],
            [destLng, destLat]
          ];

          var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + startLng + ',' + startLat + ';' + destLng + ',' + destLat + '?overview=full&geometries=geojson';

          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timeoutId = setTimeout(function() {
            if (controller) controller.abort();
          }, 3500);

          fetch(osrmUrl, { signal: controller ? controller.signal : undefined })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              clearTimeout(timeoutId);
              if (data && data.routes && data.routes.length > 0) {
                var r = data.routes[0];
                renderPolylineOnMap(r.geometry.coordinates, r.distance, r.duration);
              } else {
                renderPolylineOnMap(defaultDirectLine, 0, 0);
              }
            })
            .catch(function() {
              renderPolylineOnMap(defaultDirectLine, 0, 0);
            });
        });
      } catch (e) {}
    }
  </script>
</body>
</html>
  `.trim();
}

export function HospitalMapModal({
  visible,
  onClose,
  hospital,
  area,
  coords,
}: HospitalMapModalProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  // Dynamic user live GPS origin state (Starts at BUBT, auto-updates to phone location)
  const [originCoords, setOriginCoords] = useState<Coordinates>(BUBT_COORDS);
  const [originLabel, setOriginLabel] = useState<string>('BUBT Campus');
  const [isLiveUserLocation, setIsLiveUserLocation] = useState<boolean>(false);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Intelligent verified hospital location resolution (108 hospitals, multi-branch aware)
  const resolvedHospital = useMemo(() => {
    if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
      return {
        coords,
        verifiedName: hospital,
        subLocation: area || 'Dhaka',
        searchQuery: `${coords.latitude},${coords.longitude}`,
        isExactMatch: true,
      };
    }
    return resolveHospitalLocation(hospital, area);
  }, [hospital, area, coords]);

  const destCoords = resolvedHospital.coords;
  const destName = resolvedHospital.verifiedName;
  const destSub = resolvedHospital.subLocation;
  const destQuery = resolvedHospital.searchQuery;

  // Attempt to obtain phone's real GPS coordinates when modal is opened
  useEffect(() => {
    if (!visible) {
      setOriginCoords(BUBT_COORDS);
      setOriginLabel('BUBT Campus');
      setIsLiveUserLocation(false);
      return;
    }

    let active = true;
    getCurrentUserCoordinates().then(loc => {
      if (!active || !loc) return;
      if (isWithinBangladesh(loc)) {
        setOriginCoords(loc);
        setOriginLabel('Your Location');
        setIsLiveUserLocation(true);
      }
    });

    return () => {
      active = false;
    };
  }, [visible]);

  // Fetch native driving route from originCoords (user's real phone GPS or BUBT) to destCoords
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

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timer);
        if (cancelled) return;
        if (data && data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          setRouteInfo({
            coordinates: r.geometry.coordinates,
            distanceM: r.distance,
            durationS: r.duration,
          });
        }
      })
      .catch(() => {
        // Fallback handled seamlessly
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [visible, originCoords, destCoords]);

  const distanceText = useMemo(() => {
    const originText = isLiveUserLocation ? 'your location' : 'BUBT Campus';
    if (routeInfo?.distanceM) {
      const km = (routeInfo.distanceM / 1000).toFixed(1);
      const mins = Math.max(1, Math.round(routeInfo.durationS / 60));
      return `~${mins} min (${km} km) from ${originText}`;
    }
    const meters = getDistanceMeters(
      originCoords.latitude,
      originCoords.longitude,
      destCoords.latitude,
      destCoords.longitude
    );
    if (!Number.isFinite(meters) || meters <= 0) return null;
    const km = (meters / 1000).toFixed(1);
    return `${km} km from ${originText}`;
  }, [originCoords, destCoords, routeInfo, isLiveUserLocation]);

  const mapHtml = useMemo(() => {
    return generateHospitalMapHtml(
      originCoords,
      originLabel,
      destCoords,
      destName,
      routeInfo,
      isDark
    );
  }, [originCoords, originLabel, destCoords, destName, routeInfo, isDark]);

  function handleOpenGoogleMaps() {
    // Launch turn-by-turn driving directions in Google Maps app.
    // By omitting origin, Google Maps automatically defaults origin to the user's live GPS location!
    // Using destQuery ensures Google Maps opens the verified hospital POI by name instead of a random restaurant.
    const query = encodeURIComponent(destQuery);
    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
    openUrl(dirUrl);
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: C.bg,
              borderColor: C.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.hospitalIconPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                <AnimatedIcon family="mci" name="hospital-building" size={16} color={C.text} animation="spring" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  Hospital Route & Directions
                </Text>
                <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  {isLiveUserLocation ? 'Driving directions from your live location' : 'Driving directions from BUBT Campus'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {routeLoading && (
                <ActivityIndicator size="small" color={SectorColors.blood} />
              )}
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive In-App Map with Live Turn-by-Turn Route Lines */}
          <View style={[styles.mapWrapper, { borderColor: C.border }]}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: mapHtml, baseUrl: 'https://openfreemap.org' }}
              style={styles.webView}
              scrollEnabled={false}
              overScrollMode="never"
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>

          {/* Hospital Details Card */}
          <View style={[styles.detailsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.hospitalTitleRow}>
              <Text style={[styles.hospitalName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {destName}
              </Text>
            </View>

            <View style={styles.metaRow}>
              {destSub ? (
                <View style={styles.metaItem}>
                  <AnimatedIcon family="feather" name="map-pin" size={12} color={C.textMuted} animation="spring" />
                  <Text style={[styles.metaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {destSub}
                  </Text>
                </View>
              ) : null}

              {distanceText ? (
                <View style={styles.metaItem}>
                  <AnimatedIcon family="feather" name="navigation" size={12} color={C.textMuted} animation="spring" />
                  <Text style={[styles.metaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {distanceText}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Universal 58dp Primary Navigation Button (Launches Native Google Maps Navigation) */}
          <View style={{ paddingHorizontal: Layout.screenPadding, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: SectorColors.blood }]}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.85}
            >
              <AnimatedIcon family="feather" name="navigation" size={18} color="#fff" animation="spring" />
              <Text style={[styles.navBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                Start Live Navigation in Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  container: {
    height: '84%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  hospitalIconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: 15,
  } as TextStyle,
  headerSub: {
    fontSize: 11,
  } as TextStyle,
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  mapWrapper: {
    flex: 1,
    borderBottomWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  } as ViewStyle,
  detailsCard: {
    marginHorizontal: Layout.screenPadding,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  hospitalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  hospitalName: {
    fontSize: 16,
    flex: 1,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  } as ViewStyle,
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } as ViewStyle,
  metaTxt: {
    fontSize: 12,
  } as TextStyle,
  navBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  } as ViewStyle,
  navBtnTxt: {
    fontSize: 15,
  } as TextStyle,
});
