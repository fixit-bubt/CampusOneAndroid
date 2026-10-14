import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Keyboard,
  Platform,
  Animated,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Svg, { Path, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../ui/Toast';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import {
  BUBT_COORDS,
  getCurrentUserCoordinates,
  reverseGeocodeCoords,
  findLandmarkByName,
  searchPlacesLocal,
  searchPlacesOnline,
  getDistanceMeters,
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

const RECENT_SEARCHES_KEY = '@campusone_recent_map_searches';

const QUICK_COMMUTE_HUBS = [
  { label: 'BUBT Campus', coords: { latitude: 23.8119, longitude: 90.3572 } },
  { label: 'Sony Square', coords: { latitude: 23.8093, longitude: 90.3578 } },
  { label: 'Mirpur 10', coords: { latitude: 23.8071, longitude: 90.3686 } },
  { label: 'Mirpur 1', coords: { latitude: 23.7956, longitude: 90.3537 } },
  { label: 'Mirpur 12', coords: { latitude: 23.8277, longitude: 90.3644 } },
  { label: 'Heart Foundation', coords: { latitude: 23.8055, longitude: 90.3600 } },
  { label: 'Square Hospital', coords: { latitude: 23.7533, longitude: 90.3817 } },
  { label: 'DMCH', coords: { latitude: 23.7257, longitude: 90.3976 } },
  { label: 'Farmgate', coords: { latitude: 23.7570, longitude: 90.3888 } },
  { label: 'Dhanmondi 27', coords: { latitude: 23.7529, longitude: 90.3752 } },
  { label: 'Uttara 3', coords: { latitude: 23.8696, longitude: 90.3986 } },
  { label: 'Mohakhali', coords: { latitude: 23.7776, longitude: 90.4054 } },
  { label: 'Kuril Flyover', coords: { latitude: 23.8172, longitude: 90.4208 } },
];

function generateMapLibreHtml(initial: Coordinates, isDark: boolean): string {
  const bgColor = isDark ? '#121418' : '#f8fafc';
  const styleUrl = isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
  const initLng = Number.isFinite(initial?.longitude) ? initial.longitude : 90.3572;
  const initLat = Number.isFinite(initial?.latitude) ? initial.latitude : 23.8119;

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
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    window.onerror = function(message) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_ERROR',
          error: String(message)
        }));
      }
      return false;
    };

    var map = null;
    var mapReady = false;
    var pendingFlyTo = null;

    if (typeof maplibregl !== 'undefined') {
      try {
        map = new maplibregl.Map({
          container: 'map',
          style: '${styleUrl}',
          center: [${initLng}, ${initLat}],
          zoom: 16.5,
          minZoom: 10,
          maxZoom: 20,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          maxPitch: 0,
          dragPan: { inertia: true, linearity: 0.25 },
          touchZoomRotate: { inertia: true },
          maxBounds: [
            [88.0, 20.5],
            [92.8, 26.7]
          ],
          attributionControl: false
        });

        if (map.touchZoomRotate) {
          map.touchZoomRotate.disableRotation();
        }

        map.on('movestart', function(e) {
          var isUserGesture = !!(e && e.originalEvent);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MOVE_START',
              isUserGesture: isUserGesture
            }));
          }
        });

        map.on('moveend', function() {
          sendCenter();
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MOVE_END' }));
          }
        });

        map.on('click', function(e) {
          if (e.point && e.point.y < 100) return;
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK' }));
          }
        });

        map.on('load', function() {
          mapReady = true;
          sendCenter();
          resizeMap();
          if (pendingFlyTo && map) {
            map.flyTo(pendingFlyTo);
            pendingFlyTo = null;
          }
        });

        map.on('error', function(e) {
          if (e && e.error && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_TILE_ERROR',
              error: e.error.message || 'Tile network error'
            }));
          }
        });
      } catch (mapInitErr) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_ERROR',
            error: String(mapInitErr)
          }));
        }
      }
    } else {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_ERROR',
          error: 'MapLibre GL failed to load'
        }));
      }
    }

    function resizeMap() {
      if (map) {
        map.resize();
      }
    }
    window.addEventListener('resize', resizeMap);
    window.addEventListener('load', resizeMap);
    setTimeout(resizeMap, 100);
    setTimeout(resizeMap, 300);
    setTimeout(resizeMap, 600);

    function sendCenter() {
      if (!map) return;
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

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'FLY_TO') {
          var targetLng = Number(data.lng);
          var targetLat = Number(data.lat);
          if (isFinite(targetLng) && isFinite(targetLat)) {
            var flyOpts = {
              center: [targetLng, targetLat],
              zoom: data.zoom || 16.5,
              duration: 1200,
              essential: true
            };
            if (mapReady && map) {
              map.flyTo(flyOpts);
            } else {
              pendingFlyTo = flyOpts;
            }
          }
        } else if (data.type === 'ZOOM_IN' && map) {
          map.zoomIn({ duration: 300 });
        } else if (data.type === 'ZOOM_OUT' && map) {
          map.zoomOut({ duration: 300 });
        } else if (data.type === 'RESIZE' && map) {
          map.resize();
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
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
    subText: 'Permanent Campus · Road 9 & 5, Rupnagar',
    formattedAddress: initialPlaceName || 'BUBT Main Campus',
    coords: startCoords,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<GeocodedPlace[]>([]);
  const [locatingGps, setLocatingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapError, setMapError] = useState(false);
  const isProgrammaticMoveRef = useRef(false);
  const currentCoordsRef = useRef<Coordinates>(startCoords);
  const searchAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);

  // Memoize HTML template to prevent unnecessary WebView reloads during typing or panning
  const mapHtml = useMemo(
    () => generateMapLibreHtml(startCoords, isDark),
    [isDark]
  );

  // Sync ref with currentCoords
  useEffect(() => {
    currentCoordsRef.current = currentCoords;
  }, [currentCoords]);

  // Android hardware back button handler: dismisses search dropdown first without closing modal
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      if (isSearching) {
        Keyboard.dismiss();
        setIsSearching(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, isSearching]);

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (e) {}
    })();
  }, []);

  // Single closest hub calculation (prevents multiple chips activating simultaneously)
  const activeHubLabel = useMemo(() => {
    let minD = 120; // 120 meters threshold
    let best: string | null = null;
    for (const hub of QUICK_COMMUTE_HUBS) {
      const d = getDistanceMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        hub.coords.latitude,
        hub.coords.longitude
      );
      if (d < minD) {
        minD = d;
        best = hub.label;
      }
    }
    return best;
  }, [currentCoords.latitude, currentCoords.longitude]);

  // High-performance 120 FPS native pin animation on Android RenderThread
  const pinLiftAnim = useRef(new Animated.Value(0)).current;
  const pinTranslateY = pinLiftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const shadowScale = pinLiftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.45],
  });
  const shadowOpacity = pinLiftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.12],
  });

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger flyTo in WebView
  const flyToCoordinates = useCallback((coords: Coordinates, zoom = 16.5) => {
    setCurrentCoords(coords);
    const msg = JSON.stringify({
      type: 'FLY_TO',
      lat: coords.latitude,
      lng: coords.longitude,
      zoom,
    });
    webViewRef.current?.postMessage(msg);
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
  };

  const handleZoomOut = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
  };

  // Instant local results + High-speed debounced Photon autocomplete
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchQuery(text);
    setIsSearching(true);

    if (!text || text.trim().length === 0) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      setSearchLoading(false);
      setSearchResults([]);
      return;
    }

    const trimmed = text.trim();

    // 1. Instant 0ms synchronous local landmark match
    const local = searchPlacesLocal(trimmed, currentCoordsRef.current, 8);
    setSearchResults(local);

    if (trimmed.length < 2) {
      setSearchLoading(false);
      return;
    }

    // 2. Debounced online autocomplete with request cancellation
    setSearchLoading(true);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const combined = await searchPlacesOnline(trimmed, currentCoordsRef.current, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(combined);
        }
      } catch (err) {
        // preserve local results
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 280);
  }, []);

  // Handle GPS "Use My Current Location"
  const handleUseCurrentLocation = async () => {
    setLocatingGps(true);
    Keyboard.dismiss();
    setIsSearching(false);
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

      isProgrammaticMoveRef.current = false; // Allow reverse geocoding to resolve address
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

  // Reverse geocode when map center moves (with active AbortController to prevent race condition jumps)
  const onMapCenterChanged = useCallback((coords: Coordinates) => {
    setCurrentCoords(coords);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (reverseGeocodeAbortRef.current) {
      reverseGeocodeAbortRef.current.abort();
      reverseGeocodeAbortRef.current = null;
    }

    // Skip reverse geocode if center was changed programmatically via search suggestion, hub, or snap
    if (isProgrammaticMoveRef.current) {
      isProgrammaticMoveRef.current = false;
      return;
    }

    setGeocoding(true);
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      reverseGeocodeAbortRef.current = controller;
      try {
        const place = await reverseGeocodeCoords(coords, controller.signal);
        if (!controller.signal.aborted) {
          setSelectedPlace(place);
        }
      } catch (err: any) {
        if (err?.message === 'Aborted') {
          return;
        }
        setSelectedPlace({
          name: `Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
          zone: 'Dhaka',
          subText: 'Custom Map Pin',
          formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          coords,
        });
      } finally {
        if (reverseGeocodeAbortRef.current === controller) {
          setGeocoding(false);
          reverseGeocodeAbortRef.current = null;
        }
      }
    }, 350);
  }, []);

  // Handle WebView bridge message
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CENTER_CHANGED') {
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          onMapCenterChanged({
            latitude: lat,
            longitude: lng,
          });
        }
      } else if (data.type === 'MOVE_START') {
        if (data.isUserGesture) {
          isProgrammaticMoveRef.current = false;
          Keyboard.dismiss();
          setIsSearching(false);
          Animated.spring(pinLiftAnim, {
            toValue: 1,
            tension: 200,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }
      } else if (data.type === 'MOVE_END') {
        Animated.spring(pinLiftAnim, {
          toValue: 0,
          tension: 220,
          friction: 9,
          useNativeDriver: true,
        }).start();
      } else if (data.type === 'MAP_CLICK') {
        Keyboard.dismiss();
      } else if (data.type === 'MAP_ERROR') {
        setMapError(true);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [onMapCenterChanged, pinLiftAnim]);

  // Confirm and return location
  const handleConfirmLocation = () => {
    onSelectLocation(selectedPlace);
    onClose();
  };

  // Select place from search suggestion
  const handleSelectSearchPlace = async (place: GeocodedPlace) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearching(false);
    isProgrammaticMoveRef.current = true;
    setSelectedPlace(place);
    flyToCoordinates(place.coords, 16.5);

    // Save to recent searches
    try {
      const filtered = recentSearches.filter(
        p => p.name.toLowerCase() !== place.name.toLowerCase()
      );
      const updated = [place, ...filtered].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {}
  };

  // Select Quick Commute Hub chip
  const handleSelectHub = (hub: (typeof QUICK_COMMUTE_HUBS)[0]) => {
    Keyboard.dismiss();
    setIsSearching(false);
    isProgrammaticMoveRef.current = true;
    const matched = findLandmarkByName(hub.label);
    const hubPlace: GeocodedPlace = {
      name: hub.label,
      zone: matched?.zone || 'Dhaka',
      subText: matched?.desc || `${hub.coords.latitude.toFixed(4)}, ${hub.coords.longitude.toFixed(4)}`,
      formattedAddress: hub.label,
      coords: hub.coords,
    };
    setSelectedPlace(hubPlace);
    flyToCoordinates(hub.coords, 16.5);
  };

  // Snap to BUBT Main Campus
  const handleSnapToBUBT = () => {
    Keyboard.dismiss();
    setIsSearching(false);
    isProgrammaticMoveRef.current = true;
    setSelectedPlace({
      name: 'BUBT Main Campus',
      zone: 'Mirpur & Campus',
      subText: 'Permanent Campus · Road 9 & 5, Rupnagar',
      formattedAddress: 'BUBT Main Campus',
      coords: BUBT_COORDS,
    });
    flyToCoordinates(BUBT_COORDS, 17);
  };

  // Sync coords on modal open
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setIsSearching(false);
      setMapError(false);
      const matched = findLandmarkByName(initialPlaceName);
      const coords = initialCoords || matched?.coords || BUBT_COORDS;
      setCurrentCoords(coords);
      setSelectedPlace({
        name: initialPlaceName || matched?.name || 'BUBT Main Campus',
        zone: matched?.zone || 'Mirpur & Campus',
        subText: matched?.desc || 'Permanent Campus · Road 9 & 5, Rupnagar',
        formattedAddress: initialPlaceName || matched?.name || 'BUBT Main Campus',
        coords,
      });

      const timer = setTimeout(() => {
        isProgrammaticMoveRef.current = true;
        flyToCoordinates(coords, 16);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (reverseGeocodeAbortRef.current) {
        reverseGeocodeAbortRef.current.abort();
        reverseGeocodeAbortRef.current = null;
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    }
  }, [visible, initialCoords, initialPlaceName, flyToCoordinates]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (reverseGeocodeAbortRef.current) {
        reverseGeocodeAbortRef.current.abort();
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        if (isSearching) {
          Keyboard.dismiss();
          setIsSearching(false);
        } else {
          onClose();
        }
      }}
    >
      <View style={[styles.rootContainer, { backgroundColor: isDark ? '#111317' : '#f8fafc' }]}>
        {/* Full-Bleed Edge-to-Edge Vector Map */}
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          onError={() => setMapError(true)}
          onHttpError={() => setMapError(true)}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          bounces={false}
          scrollEnabled={false}
          geolocationEnabled
          androidLayerType={Platform.OS === 'android' ? 'hardware' : 'none'}
          originWhitelist={['*']}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />

        {/* Offline Vector Map Fallback Banner */}
        {mapError && (
          <View style={[styles.mapErrorBanner, { top: insets.top + 76, backgroundColor: C.surface, borderColor: C.warn }]}>
            <Feather name="wifi-off" size={15} color={C.warn} style={{ marginRight: 8 }} />
            <Text style={[styles.mapErrorTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              Map preview limited offline · Landmarks active
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMapError(false);
                webViewRef.current?.reload();
              }}
              style={[styles.retryBtn, { backgroundColor: `${accentColor}18` }]}
            >
              <Text style={[styles.retryBtnTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Native Floating Pin & Reticle Layer (High-Performance 120 FPS on Android RenderThread) */}
        <View pointerEvents="none" style={styles.nativePinCenterOverlay}>
          <View style={styles.centerAnchor}>
            {/* Target Reticle on Ground */}
            <View style={[styles.nativeReticleRing, { borderColor: accentColor }]}>
              <View style={[styles.nativeReticleDot, { backgroundColor: accentColor }]} />
            </View>
            {/* Ground Shadow - Stays firmly grounded on (0, 0), shrinks and fades on lift */}
            <Animated.View
              style={[
                styles.nativeGroundShadow,
                {
                  transform: [{ scale: shadowScale }],
                  opacity: shadowOpacity,
                },
              ]}
            />
            {/* Spring Floating Pin - Authentic vector teardrop pointing straight down into (0, 0) */}
            <Animated.View
              style={[
                styles.nativePinContainer,
                {
                  transform: [{ translateY: pinTranslateY }],
                },
              ]}
            >
              <Svg width={38} height={48} viewBox="0 0 38 48">
                <Path
                  d="M 19 47.5 C 18 45.5, 2 27, 2 19 A 17 17 0 1 1 36 19 C 36 27, 20 45.5, 19 47.5 Z"
                  fill={accentColor}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <Circle cx="19" cy="19" r="6" fill="#ffffff" />
              </Svg>
            </Animated.View>
          </View>
        </View>

        {/* Search Dismiss Backdrop when dropdown is open */}
        {isSearching && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setIsSearching(false);
            }}
          />
        )}

        {/* Floating Top Bar (Back button + Interactive Search) - Universal 58dp Standard */}
        <View style={[styles.topBarWrapper, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <TouchableOpacity
            style={[styles.frostedCloseBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close map"
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={1}
            style={[styles.searchCapsule, { backgroundColor: C.surface, borderColor: isSearching ? accentColor : C.border }]}
            onPress={() => searchInputRef.current?.focus()}
          >
            {searchLoading ? (
              <ActivityIndicator size="small" color={accentColor} style={styles.searchIcon} />
            ) : (
              <Feather name="search" size={18} color={isSearching ? accentColor : C.textMuted} style={styles.searchIcon} />
            )}
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder="Search place, hospital, or road..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={handleSearchTextChange}
              onFocus={() => setIsSearching(true)}
              returnKeyType="search"
              multiline={false}
              numberOfLines={1}
              onSubmitEditing={() => {
                if (searchResults.length > 0) {
                  handleSelectSearchPlace(searchResults[0]);
                } else {
                  Keyboard.dismiss();
                }
              }}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearching(false);
                  Keyboard.dismiss();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={17} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Right Floating Action Buttons (FAB Column) - Rendered before search overlay so dropdown floats on top */}
        {!isSearching && (
          <View style={[styles.rightFabColumn, { top: insets.top + 76 }]}>
            {/* GPS Locate FAB */}
            <TouchableOpacity
              style={[styles.fabBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleUseCurrentLocation}
              disabled={locatingGps}
              activeOpacity={0.8}
              accessibilityLabel="Use My Current Location"
            >
              {locatingGps ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <AnimatedIcon name="navigation" size={20} color={accentColor} animation="pulse" loop />
              )}
            </TouchableOpacity>

            {/* Quick Snap to BUBT Campus */}
            <TouchableOpacity
              style={[styles.fabBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleSnapToBUBT}
              activeOpacity={0.8}
              accessibilityLabel="Center to BUBT Campus"
            >
              <Feather name="compass" size={20} color={accentColor} />
            </TouchableOpacity>

            {/* Zoom In */}
            <TouchableOpacity
              style={[styles.fabBtnSmall, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
              accessibilityLabel="Zoom In"
            >
              <Feather name="plus" size={18} color={C.text} />
            </TouchableOpacity>

            {/* Zoom Out */}
            <TouchableOpacity
              style={[styles.fabBtnSmall, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
              accessibilityLabel="Zoom Out"
            >
              <Feather name="minus" size={18} color={C.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Floating Live Places Autocomplete Dropdown with Recents & Recommendations */}
        {isSearching && (
          <View style={[styles.searchResultsOverlay, { top: insets.top + 76, backgroundColor: C.surface, borderColor: C.border }]}>
            {searchQuery.trim().length === 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 8 }}
                style={{ maxHeight: 290 }}
              >
                {/* Recent Searches Header */}
                {recentSearches.length > 0 && (
                  <View>
                    <View style={styles.dropdownHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="clock" size={13} color={C.textMuted} />
                        <Text style={[styles.dropdownSectionTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          RECENT SEARCHES
                        </Text>
                      </View>
                      <TouchableOpacity onPress={handleClearRecentSearches} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.clearBtnTxt, { color: accentColor, fontFamily: FontFamily.jakartaSemiBold }]}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {recentSearches.map(item => (
                      <TouchableOpacity
                        key={`recent-${item.name}-${item.coords.latitude}`}
                        style={[styles.searchResultItem, { borderBottomColor: C.border }]}
                        onPress={() => handleSelectSearchPlace(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.searchResultIconBox, { backgroundColor: isDark ? '#1f2430' : '#f1f5f9' }]}>
                          <Feather name="clock" size={14} color={C.textMuted} />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.searchResultTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[styles.searchResultSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                            {item.subText || item.zone}
                          </Text>
                        </View>
                        <Feather name="corner-down-left" size={13} color={C.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Popular Suggested Hubs */}
                <View style={styles.dropdownHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="compass" size={13} color={accentColor} />
                    <Text style={[styles.dropdownSectionTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      CAMPUS & DHAKA HUBS
                    </Text>
                  </View>
                </View>
                {[
                  {
                    name: 'BUBT Main Campus',
                    zone: 'Mirpur & Campus',
                    subText: 'Permanent Campus · Road 9 & 5, Rupnagar',
                    formattedAddress: 'BUBT Main Campus',
                    coords: BUBT_COORDS,
                    placeType: 'university' as const,
                  },
                  {
                    name: 'Sony Square (Sony Cinema)',
                    zone: 'Mirpur & Campus',
                    subText: 'Sony Square Roundabout · Mirpur-2',
                    formattedAddress: 'Sony Square (Sony Cinema)',
                    coords: { latitude: 23.8093, longitude: 90.3578 },
                    placeType: 'landmark' as const,
                  },
                  {
                    name: 'Mirpur 10 Metro Station',
                    zone: 'Mirpur & Campus',
                    subText: 'Metro Rail Station · Main Roundabout',
                    formattedAddress: 'Mirpur 10 Metro Station',
                    coords: { latitude: 23.8071, longitude: 90.3686 },
                    placeType: 'transit' as const,
                  },
                  {
                    name: 'Mirpur 1 (Muktodhara)',
                    zone: 'Mirpur & Campus',
                    subText: 'Muktodhara Roundabout · Darussalam Link',
                    formattedAddress: 'Mirpur 1 (Muktodhara)',
                    coords: { latitude: 23.7956, longitude: 90.3537 },
                    placeType: 'area' as const,
                  },
                  {
                    name: 'Dhanmondi 27',
                    zone: 'Central & West',
                    subText: 'Rapa Plaza · Mirpur Road',
                    formattedAddress: 'Dhanmondi 27',
                    coords: { latitude: 23.7529, longitude: 90.3752 },
                    placeType: 'area' as const,
                  },
                ].map(item => (
                  <TouchableOpacity
                    key={`suggested-${item.name}`}
                    style={[styles.searchResultItem, { borderBottomColor: C.border }]}
                    onPress={() => handleSelectSearchPlace(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.searchResultIconBox, { backgroundColor: `${accentColor}18` }]}>
                      <Feather name={item.placeType === 'transit' ? 'navigation' : item.placeType === 'university' ? 'book' : 'map-pin'} size={14} color={accentColor} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.searchResultTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.searchResultSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                        {item.subText}
                      </Text>
                    </View>
                    <Feather name="corner-down-left" size={13} color={C.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : searchResults.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 8 }}
                style={{ maxHeight: 290 }}
              >
                {searchResults.map(item => {
                  let iconName: 'plus-circle' | 'navigation' | 'flag' | 'book' | 'map-pin' = 'map-pin';
                  if (item.placeType === 'hospital') iconName = 'plus-circle';
                  else if (item.placeType === 'transit') iconName = 'navigation';
                  else if (item.placeType === 'landmark') iconName = 'flag';
                  else if (item.placeType === 'university') iconName = 'book';

                  return (
                    <TouchableOpacity
                      key={`${item.name}-${item.coords.latitude}-${item.coords.longitude}`}
                      style={[styles.searchResultItem, { borderBottomColor: C.border }]}
                      onPress={() => handleSelectSearchPlace(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.searchResultIconBox, { backgroundColor: `${accentColor}18` }]}>
                        <Feather name={iconName} size={15} color={accentColor} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.searchResultTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.searchResultSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                          {item.subText || item.zone}
                        </Text>
                      </View>
                      {item.distanceText ? (
                        <View style={[styles.distancePill, { backgroundColor: isDark ? '#1f2430' : '#f1f5f9', borderColor: C.border }]}>
                          <Text style={[styles.distancePillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                            {item.distanceText}
                          </Text>
                        </View>
                      ) : (
                        <Feather name="corner-down-left" size={13} color={C.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : searchLoading ? (
              <View style={styles.searchingStateRow}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={[styles.searchingStateTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Searching places in Dhaka...
                </Text>
              </View>
            ) : searchQuery.length >= 2 ? (
              <View style={styles.searchingStateRow}>
                <Feather name="info" size={15} color={C.textMuted} />
                <Text style={[styles.searchingStateTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  No matching places found. Try another keyword.
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Bottom Floating Area (Chips + 72dp Place Card + 58dp Primary CTA) */}
        <View style={styles.bottomFloatingDock}>
          {/* Quick Commute Hub Chips */}
          <View style={styles.chipsRowWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_COMMUTE_HUBS.map(hub => {
                const isActive = hub.label === activeHubLabel;
                return (
                  <TouchableOpacity
                    key={hub.label}
                    style={[
                      styles.hubChip,
                      {
                        backgroundColor: isActive
                          ? (isDark ? '#261b1e' : '#fee2e2')
                          : C.surface,
                        borderColor: isActive ? accentColor : C.border,
                        borderWidth: isActive ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => handleSelectHub(hub)}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name="map-pin"
                      size={12}
                      color={isActive ? accentColor : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.hubChipText,
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

          {/* Universal 72dp Content Card Standard */}
          <View
            style={[
              styles.selectedLocationCard72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View style={[styles.locationIconBox44, { backgroundColor: `${accentColor}18` }]}>
              <AnimatedIcon name="map-pin" size={22} color={accentColor} animation="spring" />
            </View>

            <View style={styles.locationTextColumn}>
              {!!title && (
                <View style={styles.contextBadgeRow}>
                  <View style={[styles.contextBadge, { backgroundColor: isDark ? `${accentColor}26` : `${accentColor}18`, borderColor: `${accentColor}44` }]}>
                    <View style={[styles.contextBadgeDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.contextBadgeTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {title.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
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

            {geocoding && (
              <ActivityIndicator size="small" color={accentColor} style={{ marginLeft: 8 }} />
            )}
          </View>

          {/* Universal 58dp Primary Action CTA Standard */}
          <TouchableOpacity
            style={[
              styles.confirmButton58,
              {
                backgroundColor: accentColor,
                marginBottom: Math.max(insets.bottom, 14),
              },
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'transparent',
  },
  mapErrorBanner: {
    position: 'absolute',
    left: Layout.screenPadding,
    right: Layout.screenPadding,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 110,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  mapErrorTxt: {
    flex: 1,
    fontSize: 12,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 6,
  },
  retryBtnTxt: {
    fontSize: 11.5,
  },
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
  },
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
  },
  searchCapsule: {
    flex: 1,
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchResultsOverlay: {
    position: 'absolute',
    left: Layout.screenPadding,
    right: Layout.screenPadding,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 500,
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  dropdownSectionTitle: {
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  clearBtnTxt: {
    fontSize: 11.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchResultIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
  },
  searchResultSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    includeFontPadding: false,
  },
  searchingStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchingStateTxt: {
    fontSize: 13,
  },
  rightFabColumn: {
    position: 'absolute',
    right: Layout.screenPadding,
    alignItems: 'center',
    gap: 10,
    zIndex: 90,
  },
  fabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  fabBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  bottomFloatingDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.screenPadding,
    zIndex: 95,
  },
  chipsRowWrap: {
    marginBottom: 10,
  },
  chipsScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  hubChipText: {
    fontSize: 12,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
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
  contextBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  contextBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  contextBadgeTxt: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 15,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
  },
  /* Native Floating Pin & Reticle Layer (High-Performance 120 FPS on Android RenderThread) */
  nativePinCenterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerAnchor: {
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeReticleRing: {
    position: 'absolute',
    left: -14,
    top: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  nativeReticleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nativeGroundShadow: {
    position: 'absolute',
    left: -11,
    top: -3.5,
    width: 22,
    height: 7,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  nativePinContainer: {
    position: 'absolute',
    left: -19,
    top: -47.5,
    width: 38,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePillTxt: {
    fontSize: 11,
  },
});
