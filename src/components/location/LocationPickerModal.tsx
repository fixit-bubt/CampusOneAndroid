import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../ui/Toast';
import { Icon } from '../ui/Icon';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import {
  BUBT_COORDS,
  CAMPUS_AND_DHAKA_LANDMARKS,
  getCurrentUserCoordinates,
  reverseGeocodeCoords,
  findLandmarkByName,
  type Coordinates,
  type GeocodedPlace,
} from '../../services/locationService';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (place: GeocodedPlace) => void;
  initialCoords?: Coordinates;
  initialPlaceName?: string;
  accentColor?: string;
  title?: string;
}

const QUICK_COMMUTE_HUBS = [
  { label: 'BUBT Campus', coords: { latitude: 23.8103, longitude: 90.3567 } },
  { label: 'Sony Square', coords: { latitude: 23.8093, longitude: 90.3578 } },
  { label: 'Mirpur 10 Metro', coords: { latitude: 23.8071, longitude: 90.3686 } },
  { label: 'Mirpur 1', coords: { latitude: 23.7956, longitude: 90.3537 } },
  { label: 'Mirpur 12', coords: { latitude: 23.8277, longitude: 90.3644 } },
  { label: 'Uttara 3', coords: { latitude: 23.8696, longitude: 90.3986 } },
  { label: 'Farmgate', coords: { latitude: 23.7570, longitude: 90.3888 } },
  { label: 'Dhanmondi 27', coords: { latitude: 23.7529, longitude: 90.3752 } },
  { label: 'Mohakhali', coords: { latitude: 23.7776, longitude: 90.4054 } },
  { label: 'Kuril Flyover', coords: { latitude: 23.8172, longitude: 90.4208 } },
];

function generateLeafletHtml(initial: Coordinates, isDark: boolean, accentColor: string): string {
  const tileLayerUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: ${isDark ? '#000000' : '#ffffff'};
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #map {
      width: 100%;
      height: 100%;
    }
    .leaflet-control-zoom {
      display: none !important;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: ${isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'} !important;
      color: ${isDark ? '#888' : '#555'} !important;
    }
    .leaflet-control-attribution a {
      color: ${accentColor} !important;
    }
    /* Fixed Center Pin */
    .center-pin-wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.15s ease-out;
    }
    .pin-shadow {
      position: absolute;
      bottom: -6px;
      width: 14px;
      height: 6px;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 50%;
      transform: scale(1);
      transition: transform 0.15s ease-out, opacity 0.15s ease-out;
    }
    .pin-head {
      width: 38px;
      height: 38px;
      background: ${accentColor};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 14px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
    }
    .pin-inner-dot {
      width: 11px;
      height: 11px;
      background: #ffffff;
      border-radius: 50%;
      transform: rotate(45deg);
    }
    /* Dragging animation */
    body.is-moving .center-pin-wrapper {
      transform: translate(-50%, -130%);
    }
    body.is-moving .pin-shadow {
      transform: scale(0.6);
      opacity: 0.3;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin-wrapper">
    <div class="pin-head">
      <div class="pin-inner-dot"></div>
    </div>
    <div class="pin-shadow"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${initial.latitude}, ${initial.longitude}], 16);

    L.tileLayer('${tileLayerUrl}', {
      maxZoom: 19,
      attribution: '${tileAttribution}'
    }).addTo(map);

    // Send center change on pan/zoom
    function sendCenter() {
      var center = map.getCenter();
      var msg = JSON.stringify({
        type: 'CENTER_CHANGED',
        lat: center.lat,
        lng: center.lng
      });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      }
    }

    map.on('movestart', function() {
      document.body.classList.add('is-moving');
    });

    map.on('moveend', function() {
      document.body.classList.remove('is-moving');
      sendCenter();
    });

    map.on('click', function(e) {
      map.panTo(e.latlng, { animate: true, duration: 0.5 });
    });

    // Handle messages from React Native
    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'FLY_TO') {
          if (typeof map !== 'undefined' && map && map.flyTo) {
            map.flyTo([data.lat, data.lng], data.zoom || 16, {
              duration: 1.2
            });
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    // Initial trigger once map is loaded
    setTimeout(sendCenter, 300);
  </script>
</body>
</html>
`;
}

export function LocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
  initialCoords,
  initialPlaceName,
  accentColor = SectorColors.ride,
  title = 'Pick Location on Map',
}: LocationPickerModalProps) {
  const { C, isDark } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const startCoords = initialCoords || BUBT_COORDS;
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(startCoords);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace>({
    name: initialPlaceName || 'BUBT Main Campus',
    zone: 'Mirpur & Campus',
    subText: 'Permanent Campus · Rupnagar, Mirpur-2',
    formattedAddress: initialPlaceName || 'BUBT Main Campus',
    coords: startCoords,
  });

  const [locatingGps, setLocatingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger flyTo in WebView
  const flyToCoordinates = useCallback((coords: Coordinates, zoom = 16) => {
    setCurrentCoords(coords);
    const msg = JSON.stringify({
      type: 'FLY_TO',
      lat: coords.latitude,
      lng: coords.longitude,
      zoom,
    });
    webViewRef.current?.postMessage(msg);
  }, []);

  // Handle GPS "Use My Current Location"
  const handleUseCurrentLocation = async () => {
    setLocatingGps(true);
    try {
      const gpsCoords = await getCurrentUserCoordinates();
      if (!gpsCoords) {
        toast({
          type: 'error',
          title: 'Location permission needed',
          message: 'Please allow location permission in Android settings.',
        });
        setLocatingGps(false);
        return;
      }

      flyToCoordinates(gpsCoords, 17);
      toast({
        type: 'success',
        title: 'Location detected',
        message: 'Centered to your current GPS position.',
      });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to detect location',
        message: 'Could not fetch device GPS coordinates.',
      });
    } finally {
      setLocatingGps(false);
    }
  };

  // Reverse geocode when map center moves
  const onMapCenterChanged = useCallback((coords: Coordinates) => {
    setCurrentCoords(coords);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setGeocoding(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const place = await reverseGeocodeCoords(coords);
        setSelectedPlace(place);
      } catch (err) {
        // Fallback display
        setSelectedPlace({
          name: `Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
          zone: 'Dhaka',
          subText: 'Custom Map Pin',
          formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          coords,
        });
      } finally {
        setGeocoding(false);
      }
    }, 450);
  }, []);

  // Handle WebView bridge message
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CENTER_CHANGED' && data.lat && data.lng) {
        onMapCenterChanged({
          latitude: Number(data.lat),
          longitude: Number(data.lng),
        });
      }
    } catch (e) {
      // Ignore
    }
  };

  // Confirm and return location
  const handleConfirmLocation = () => {
    onSelectLocation(selectedPlace);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      const matched = findLandmarkByName(initialPlaceName);
      const coords = initialCoords || matched?.coords || BUBT_COORDS;
      setCurrentCoords(coords);
      setSelectedPlace({
        name: initialPlaceName || matched?.name || 'BUBT Main Campus',
        zone: matched?.zone || 'Mirpur & Campus',
        subText: matched?.desc || (initialPlaceName ? '' : 'Permanent Campus · Rupnagar, Mirpur-2'),
        formattedAddress: initialPlaceName || matched?.name || 'BUBT Main Campus',
        coords,
      });

      // Fly map to selected coordinates once WebView layout mounts
      const timer = setTimeout(() => {
        flyToCoordinates(coords, 16);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible, initialCoords, initialPlaceName, flyToCoordinates]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        {/* Top Header Bar */}
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: C.surface2 }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close map modal"
          >
            <Feather name="x" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {title}
            </Text>
            <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Drag map to place the pin
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* 1. Universal 58dp Control Bar: "Use My Current Location" */}
        <View style={styles.controlBarWrapper}>
          <TouchableOpacity
            style={[
              styles.gpsButton58,
              {
                backgroundColor: C.surface,
                borderColor: locatingGps ? accentColor : C.border,
              },
            ]}
            onPress={handleUseCurrentLocation}
            disabled={locatingGps}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.gpsIconBox,
                { backgroundColor: `${accentColor}1e` },
              ]}
            >
              {locatingGps ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <AnimatedIcon
                  name="navigation"
                  size={19}
                  color={accentColor}
                  animation="pulse"
                  loop
                />
              )}
            </View>
            <View style={styles.gpsTextWrap}>
              <Text
                style={[
                  styles.gpsTitle,
                  { color: C.text, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                {locatingGps ? 'Locating Your Device...' : 'Use My Current Location'}
              </Text>
              <Text
                style={[
                  styles.gpsSub,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                ]}
              >
                Auto-detect via GPS coordinates
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 2. Quick Dhaka & BUBT Shortcuts Chips */}
        <View style={styles.chipsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_COMMUTE_HUBS.map(hub => {
              const isActive =
                Math.abs(hub.coords.latitude - currentCoords.latitude) < 0.003 &&
                Math.abs(hub.coords.longitude - currentCoords.longitude) < 0.003;
              return (
                <TouchableOpacity
                  key={hub.label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? `${accentColor}22` : C.surface,
                      borderColor: isActive ? accentColor : C.border,
                    },
                  ]}
                  onPress={() => flyToCoordinates(hub.coords, 16)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="mapPin"
                    size={13}
                    color={isActive ? accentColor : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isActive ? accentColor : C.text,
                        fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    {hub.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Interactive Leaflet Map via WebView */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{
              html: generateLeafletHtml(startCoords, isDark, accentColor),
            }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit={false}
            bounces={false}
            scrollEnabled={false}
            geolocationEnabled
            androidLayerType={Platform.OS === 'android' ? 'hardware' : 'none'}
          />

          {/* Quick Reset to BUBT Floating Button */}
          <TouchableOpacity
            style={[
              styles.floatingBubtBtn,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => flyToCoordinates(BUBT_COORDS, 17)}
            activeOpacity={0.85}
          >
            <Feather name="compass" size={18} color={accentColor} />
            <Text
              style={[
                styles.floatingBubtTxt,
                { color: C.text, fontFamily: FontFamily.jakartaSemiBold },
              ]}
            >
              BUBT Campus
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Bottom Card & CTA */}
        <View style={[styles.bottomSection, { borderTopColor: C.border, backgroundColor: C.bg }]}>
          {/* Universal 72dp Content Card: Selected Place Preview */}
          <View
            style={[
              styles.selectedLocationCard72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View
              style={[
                styles.locationIconBox44,
                { backgroundColor: `${accentColor}1e` },
              ]}
            >
              <Feather name="map-pin" size={20} color={accentColor} />
            </View>

            <View style={styles.locationTextColumn}>
              <View style={styles.locationNameRow}>
                <Text
                  style={[
                    styles.locationTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                  numberOfLines={1}
                >
                  {selectedPlace.name}
                </Text>
                {geocoding && (
                  <ActivityIndicator
                    size="small"
                    color={accentColor}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.locationSubtitle,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                ]}
                numberOfLines={1}
              >
                {selectedPlace.subText || `${selectedPlace.coords.latitude.toFixed(4)}, ${selectedPlace.coords.longitude.toFixed(4)}`}
              </Text>
            </View>
          </View>

          {/* Universal 58dp Primary CTA Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton58,
              { backgroundColor: accentColor },
            ]}
            onPress={handleConfirmLocation}
            activeOpacity={0.85}
          >
            <Feather name="check" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text
              style={[
                styles.confirmButtonText,
                { fontFamily: FontFamily.jakartaExtraBold },
              ]}
            >
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  controlBarWrapper: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
  },
  /* Universal 58dp Control Standard */
  gpsButton58: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  gpsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsTextWrap: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14.5,
  },
  gpsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  chipsSection: {
    paddingBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: Layout.screenPadding,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 12.5,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  floatingBubtBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  floatingBubtTxt: {
    fontSize: 12.5,
  },
  bottomSection: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  /* Universal 72dp Content Card Standard */
  selectedLocationCard72: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  locationIconBox44: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 14.5,
  },
  locationSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  /* Universal 58dp Primary Action CTA Standard */
  confirmButton58: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
  },
});
