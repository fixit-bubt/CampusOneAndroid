import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { formatPrice } from '../../utils/format';
import { openUrl } from '../../utils/link';
import type { Coordinates } from '../../services/locationService';

interface RideRouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  originCoords?: Coordinates | null;
  destCoords?: Coordinates | null;
  notes?: string | null;
  fare?: number;
  vehicle?: string;
  direction?: string;
}

const RIDE_COLOR = SectorColors.ride;

function generateRouteMapHtml(
  originCoords: Coordinates,
  destCoords: Coordinates,
  originName: string,
  destName: string,
  meetingPoint: string | null | undefined,
  isDark: boolean
): string {
  const bgColor = isDark ? '#121418' : '#f8fafc';
  const styleUrl = isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';

  const oLng = originCoords.longitude;
  const oLat = originCoords.latitude;
  const dLng = destCoords.longitude;
  const dLat = destCoords.latitude;

  const minLng = Math.min(oLng, dLng);
  const maxLng = Math.max(oLng, dLng);
  const minLat = Math.min(oLat, dLat);
  const maxLat = Math.max(oLat, dLat);

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
      margin: 0; padding: 0; width: 100%; height: 100%;
      background-color: ${bgColor};
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #map { width: 100%; height: 100%; }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { display: none !important; }

    /* Custom Pulsing Markers */
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .marker-origin {
      background: #10b981;
      border: 3px solid #ffffff;
      color: white;
    }
    .marker-dest {
      background: #ef4444;
      border: 3px solid #ffffff;
      color: white;
    }
    .marker-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      opacity: 0.35;
      animation: pulse 2s infinite ease-out;
    }
    .pulse-origin { background: #10b981; }
    .pulse-dest { background: #ef4444; }

    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .marker-label {
      position: absolute;
      top: 36px;
      background: ${isDark ? 'rgba(20,24,33,0.92)' : 'rgba(255,255,255,0.94)'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new maplibregl.Map({
      container: 'map',
      style: '${styleUrl}',
      center: [${(oLng + dLng) / 2}, ${(oLat + dLat) / 2}],
      zoom: 13,
      minZoom: 9,
      maxZoom: 19,
      dragRotate: false,
      attributionControl: false
    });

    map.on('load', function() {
      // 1. Draw Connecting Route Line
      map.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': [
              [${oLng}, ${oLat}],
              [${dLng}, ${dLat}]
            ]
          }
        }
      });

      map.addLayer({
        'id': 'route-line-casing',
        'type': 'line',
        'source': 'route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': {
          'line-color': '${isDark ? '#1e293b' : '#cbd5e1'}',
          'line-width': 7,
          'line-opacity': 0.8
        }
      });

      map.addLayer({
        'id': 'route-line',
        'type': 'line',
        'source': 'route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': {
          'line-color': '#275efe',
          'line-width': 4,
          'line-dasharray': [1.8, 1.4]
        }
      });

      // 2. Add Pickup Marker (Green)
      var elOrigin = document.createElement('div');
      elOrigin.style.position = 'relative';
      elOrigin.style.display = 'flex';
      elOrigin.style.alignItems = 'center';
      elOrigin.style.justifyContent = 'center';

      var pulseOrigin = document.createElement('div');
      pulseOrigin.className = 'marker-pulse pulse-origin';
      elOrigin.appendChild(pulseOrigin);

      var dotOrigin = document.createElement('div');
      dotOrigin.className = 'custom-marker marker-origin';
      dotOrigin.textContent = '●';
      elOrigin.appendChild(dotOrigin);

      var lblOrigin = document.createElement('div');
      lblOrigin.className = 'marker-label';
      lblOrigin.textContent = 'Pickup: ' + ${JSON.stringify(originName)};
      elOrigin.appendChild(lblOrigin);

      new maplibregl.Marker({ element: elOrigin })
        .setLngLat([${oLng}, ${oLat}])
        .addTo(map);

      // 3. Add Destination Marker (Red)
      var elDest = document.createElement('div');
      elDest.style.position = 'relative';
      elDest.style.display = 'flex';
      elDest.style.alignItems = 'center';
      elDest.style.justifyContent = 'center';

      var pulseDest = document.createElement('div');
      pulseDest.className = 'marker-pulse pulse-dest';
      elDest.appendChild(pulseDest);

      var dotDest = document.createElement('div');
      dotDest.className = 'custom-marker marker-dest';
      dotDest.textContent = '■';
      elDest.appendChild(dotDest);

      var lblDest = document.createElement('div');
      lblDest.className = 'marker-label';
      lblDest.textContent = 'Drop-off: ' + ${JSON.stringify(destName)};
      elDest.appendChild(lblDest);

      new maplibregl.Marker({ element: elDest })
        .setLngLat([${dLng}, ${dLat}])
        .addTo(map);

      // 4. Fit Bounds with generous padding & maxZoom constraint
      map.fitBounds([
        [${minLng}, ${minLat}],
        [${maxLng}, ${maxLat}]
      ], {
        padding: { top: 90, bottom: 200, left: 60, right: 60 },
        maxZoom: 15.5,
        duration: 800
      });
    });
  </script>
</body>
</html>
`;
}

export function RideRouteMapModal({
  visible,
  onClose,
  origin,
  destination,
  originCoords,
  destCoords,
  notes,
  fare,
  vehicle,
  direction,
}: RideRouteMapModalProps) {
  const insets = useSafeAreaInsets();
  const { C, isDark } = useTheme();

  // Fallback coords to BUBT if missing
  const safeOrigin = originCoords || { latitude: 23.8119, longitude: 90.3572 };
  const safeDest = destCoords || { latitude: 23.7529, longitude: 90.3752 };

  const htmlContent = useMemo(() => {
    return generateRouteMapHtml(
      safeOrigin,
      safeDest,
      origin,
      destination,
      notes,
      isDark
    );
  }, [safeOrigin, safeDest, origin, destination, notes, isDark]);

  function handleOpenGoogleMaps() {
    const originParam = `${safeOrigin.latitude},${safeOrigin.longitude}`;
    const destParam = `${safeDest.latitude},${safeDest.longitude}`;
    openUrl(`https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`);
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        {/* Floating Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={[styles.headerPill, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.headerDot} />
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {origin} → {destination}
            </Text>
          </View>
        </View>

        {/* In-App MapLibre Map View */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            renderLoading={() => (
              <View style={[styles.loadingOverlay, { backgroundColor: C.bg }]}>
                <ActivityIndicator color={RIDE_COLOR} size="large" />
                <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Loading campus route map…
                </Text>
              </View>
            )}
            startInLoadingState={true}
          />
        </View>

        {/* Sleek Bottom Route Details Card */}
        <View style={[styles.bottomCard, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Stops preview */}
          <View style={styles.stopsTrack}>
            <View style={styles.stopItem}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stopType, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>PICKUP</Text>
                <Text style={[styles.stopName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {origin}
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

            <View style={styles.stopItem}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stopType, { color: '#ef4444', fontFamily: FontFamily.jakartaBold }]}>DESTINATION</Text>
                <Text style={[styles.stopName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {destination}
                </Text>
              </View>
            </View>
          </View>

          {/* Secondary External Navigation Option */}
          <TouchableOpacity
            style={[styles.externalNavBtn, { backgroundColor: isDark ? 'rgba(39, 94, 254, 0.12)' : '#eff6ff', borderColor: isDark ? 'rgba(39, 94, 254, 0.3)' : '#bfdbfe' }]}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.8}
          >
            <Feather name="navigation" size={16} color={C.brand} />
            <Text style={[styles.externalNavBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              Open Voice Turn-by-Turn in Google Maps
            </Text>
            <Feather name="arrow-up-right" size={15} color={C.brand} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#275efe',
  },
  headerTitle: {
    fontSize: 13.5,
    flex: 1,
  } as TextStyle,

  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingTxt: {
    fontSize: 13,
  } as TextStyle,

  bottomCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  stopsTrack: {
    gap: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopType: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  } as TextStyle,
  stopName: {
    fontSize: 13.5,
  } as TextStyle,
  meetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 20,
  },
  meetingTxt: {
    fontSize: 12,
    flex: 1,
  } as TextStyle,

  externalNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  externalNavBtnTxt: {
    fontSize: 13,
  } as TextStyle,
});
