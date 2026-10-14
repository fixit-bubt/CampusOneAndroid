import { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
  searchPlacesOnline,
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
  const bgColor = isDark ? '#111317' : '#f8fafc';
  // Standard detailed Liberty vector style (111 layers) with full street names, building footprints, parks, water, transit
  const styleUrl = 'https://tiles.openfreemap.org/styles/liberty';

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
    var map = new maplibregl.Map({
      container: 'map',
      style: '${styleUrl}',
      center: [${initial.longitude}, ${initial.latitude}],
      zoom: 15.5,
      minZoom: 10,
      maxZoom: 19,
      pixelRatio: window.devicePixelRatio || 2,
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

    var mapReady = false;
    var pendingFlyTo = null;

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
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK' }));
      }
      map.easeTo({
        center: [e.lngLat.lng, e.lngLat.lat],
        duration: 400
      });
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

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'FLY_TO') {
          var flyOpts = {
            center: [data.lng, data.lat],
            zoom: data.zoom || 16,
            duration: 1200,
            essential: true
          };
          if (mapReady && map) {
            map.flyTo(flyOpts);
          } else {
            pendingFlyTo = flyOpts;
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
    subText: 'Permanent Campus · Rupnagar, Mirpur-2',
    formattedAddress: initialPlaceName || 'BUBT Main Campus',
    coords: startCoords,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [locatingGps, setLocatingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const isProgrammaticMoveRef = useRef(false);

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

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Zoom controls
  const handleZoomIn = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
  };

  const handleZoomOut = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
  };

  // Real-time Places Search (Prefix-aware local index + Nominatim online fallback)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlacesOnline(searchQuery, currentCoords);
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, currentCoords]);

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

  // Reverse geocode when map center moves
  const onMapCenterChanged = useCallback((coords: Coordinates) => {
    setCurrentCoords(coords);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip reverse geocode if center was changed programmatically via search suggestion, hub, or snap
    if (isProgrammaticMoveRef.current) {
      isProgrammaticMoveRef.current = false;
      return;
    }

    setGeocoding(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const place = await reverseGeocodeCoords(coords);
        setSelectedPlace(place);
      } catch (err) {
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
    }, 400);
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
      } else if (data.type === 'MOVE_START') {
        if (data.isUserGesture) {
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
        setIsSearching(false);
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  // Confirm and return location
  const handleConfirmLocation = () => {
    onSelectLocation(selectedPlace);
    onClose();
  };

  // Select place from search suggestion
  const handleSelectSearchPlace = (place: GeocodedPlace) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearching(false);
    isProgrammaticMoveRef.current = true;
    setSelectedPlace(place);
    flyToCoordinates(place.coords, 16.5);
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
      subText: 'Permanent Campus · Rupnagar, Mirpur-2',
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

      const timer = setTimeout(() => {
        isProgrammaticMoveRef.current = true;
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
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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
          source={{ html: generateMapLibreHtml(startCoords, isDark) }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          bounces={false}
          scrollEnabled={false}
          geolocationEnabled
          androidLayerType="none"
          originWhitelist={['*']}
        />

        {/* Native Floating Pin & Reticle Layer (High-Performance 120 FPS on Android RenderThread) */}
        <View pointerEvents="none" style={styles.nativePinCenterOverlay}>
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
          {/* Spring Floating Pin - Only pin lifts, bottom point touches (0, 0) when resting */}
          <Animated.View
            style={[
              styles.nativePinContainer,
              {
                transform: [{ translateY: pinTranslateY }],
              },
            ]}
          >
            <View style={[styles.nativePinHead, { backgroundColor: accentColor }]}>
              <View style={styles.nativePinDot} />
            </View>
          </Animated.View>
        </View>

        {/* Floating Top Bar (Back button + Interactive Search) - Universal 58dp Standard */}
        <View style={[styles.topBarWrapper, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={[styles.frostedCloseBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close map"
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={[styles.searchCapsule, { backgroundColor: C.surface, borderColor: isSearching ? accentColor : C.border }]}>
            {searchLoading ? (
              <ActivityIndicator size="small" color={accentColor} style={styles.searchIcon} />
            ) : (
              <Feather name="search" size={18} color={isSearching ? accentColor : C.textMuted} style={styles.searchIcon} />
            )}
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder="Search any place, hospital, road in Dhaka..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={text => {
                setSearchQuery(text);
                setIsSearching(text.length > 0);
              }}
              onFocus={() => setIsSearching(searchQuery.length > 0)}
              returnKeyType="search"
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
          </View>
        </View>

        {/* Floating Live Places Autocomplete Dropdown */}
        {isSearching && (searchResults.length > 0 || searchLoading || searchQuery.trim().length >= 2) && (
          <View style={[styles.searchResultsOverlay, { top: insets.top + 76, backgroundColor: C.surface, borderColor: C.border }]}>
            {searchResults.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 240 }}
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

        {/* Right Floating Action Buttons (FAB Column) */}
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
                const isActive =
                  Math.abs(hub.coords.latitude - currentCoords.latitude) < 0.003 &&
                  Math.abs(hub.coords.longitude - currentCoords.longitude) < 0.003;
                return (
                  <TouchableOpacity
                    key={hub.label}
                    style={[
                      styles.hubChip,
                      {
                        backgroundColor: isActive ? `${accentColor}24` : C.surface,
                        borderColor: isActive ? accentColor : C.border,
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
    fontSize: 14.5,
    paddingVertical: 0,
  },
  searchResultsOverlay: {
    position: 'absolute',
    left: Layout.screenPadding,
    right: Layout.screenPadding,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
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
  },
  searchResultSub: {
    fontSize: 11,
    marginTop: 1,
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
  nativeReticleRing: {
    position: 'absolute',
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
    width: 22,
    height: 7,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    top: -3.5,
  },
  nativePinContainer: {
    position: 'absolute',
    width: 42,
    height: 42,
    top: -51,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativePinHead: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderBottomRightRadius: 2,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  nativePinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
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
