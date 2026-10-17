import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LandmarkLocation {
  name: string;
  nameBn?: string;
  zone: string;
  coords: Coordinates;
  desc?: string;
  type?: 'hospital' | 'transit' | 'landmark' | 'university' | 'area';
  keywords?: string[];
}

export interface GeocodedPlace {
  name: string;
  zone: string;
  subText: string;
  formattedAddress: string;
  coords: Coordinates;
  distanceKm?: number;
  distanceText?: string;
  placeType?: 'hospital' | 'transit' | 'landmark' | 'university' | 'area';
}

export const BUBT_COORDS: Coordinates = {
  latitude: 23.8119,
  longitude: 90.3572,
};

import {
  DHAKA_MASTER_LOCATIONS,
  findMasterLocationByName,
  searchMasterLocations,
  findNearestMasterLocation,
  type MasterLocation,
} from '../constants/dhakaMasterLocations';

export { findMasterLocationByName };

export const CAMPUS_AND_DHAKA_LANDMARKS: LandmarkLocation[] = DHAKA_MASTER_LOCATIONS.map(m => ({
  name: m.name,
  nameBn: m.nameBn,
  zone: m.zone,
  coords: m.coords,
  desc: m.address || m.subLocation || (m.zone + ' · ' + m.coords.latitude.toFixed(4) + ', ' + m.coords.longitude.toFixed(4)),
  type: m.category,
  keywords: m.keywords,
}));

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function findNearestLandmark(
  coords: Coordinates,
  maxDistanceMeters: number = 65
): LandmarkLocation | null {
  const result = findNearestMasterLocation(coords, maxDistanceMeters);
  if (!result) return null;
  const m = result.location;
  return {
    name: m.name,
    nameBn: m.nameBn,
    zone: m.zone,
    coords: m.coords,
    desc: m.address || m.subLocation || (m.zone + ' · ' + m.coords.latitude.toFixed(4) + ', ' + m.coords.longitude.toFixed(4)),
    type: m.category,
    keywords: m.keywords,
  };
}

export function findLandmarkByName(name?: string | null): LandmarkLocation | null {
  if (!name || !name.trim()) return null;
  const m = findMasterLocationByName(name);
  if (m) {
    return {
      name: m.name,
      nameBn: m.nameBn,
      zone: m.zone,
      coords: m.coords,
      desc: m.address || m.subLocation || (m.zone + ' · ' + m.coords.latitude.toFixed(4) + ', ' + m.coords.longitude.toFixed(4)),
      type: m.category,
      keywords: m.keywords,
    };
  }
  return null;
}

export function searchLandmarks(
  query: string,
  limit: number = 8,
  userCoords?: Coordinates | null
): LandmarkLocation[] {
  if (!query || !query.trim()) return [];
  const results = searchMasterLocations(query, limit, userCoords);
  return results.map(m => ({
    name: m.name,
    nameBn: m.nameBn,
    zone: m.zone,
    coords: m.coords,
    desc: m.address || m.subLocation || (m.zone + ' · ' + m.coords.latitude.toFixed(4) + ', ' + m.coords.longitude.toFixed(4)),
    type: m.category,
    keywords: m.keywords,
  }));
}

export function searchPlacesLocal(
  query: string,
  userCoords?: Coordinates | null,
  limit: number = 8
): GeocodedPlace[] {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const landmarks = searchLandmarks(q, limit, userCoords);
  return landmarks.map(l => {
    let distanceKm: number | undefined;
    let distanceText: string | undefined;
    if (userCoords) {
      const m = getDistanceMeters(userCoords.latitude, userCoords.longitude, l.coords.latitude, l.coords.longitude);
      const km = m / 1000;
      distanceKm = km;
      distanceText = km < 1 ? `${Math.round(m)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
    }
    const cleanSub = l.desc || `${l.coords.latitude.toFixed(4)}, ${l.coords.longitude.toFixed(4)}`;
    const formattedAddress = l.desc && !l.name.includes(l.desc) ? `${l.name}, ${l.desc}` : l.name;
    return {
      name: l.name,
      zone: l.zone,
      subText: cleanSub,
      formattedAddress,
      coords: l.coords,
      distanceKm,
      distanceText,
      placeType: l.type || 'area',
    };
  });
}

export async function searchPlacesOnline(
  query: string,
  userCoords?: Coordinates | null,
  signal?: AbortSignal
): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  // 1. Instant local curated landmark match (0ms latency, prefix-aware)
  const localMatches = searchPlacesLocal(q, userCoords, 8);
  if (localMatches.length >= 6) {
    return localMatches;
  }

  // Helper for computing distance text
  const calcDist = (coords: Coordinates): { distKm: number; text: string } | null => {
    if (!userCoords) return null;
    const m = getDistanceMeters(userCoords.latitude, userCoords.longitude, coords.latitude, coords.longitude);
    const km = m / 1000;
    const text = km < 1 ? `${Math.round(m)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
    return { distKm: km, text };
  };

  const centerLat = userCoords?.latitude || BUBT_COORDS.latitude;
  const centerLon = userCoords?.longitude || BUBT_COORDS.longitude;

  // 2. Real-time Photon Geocoding API (High-performance OSM autocomplete, <150ms latency)
  try {
    const encoded = encodeURIComponent(q);
    const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&lat=${centerLat}&lon=${centerLon}&limit=8`;

    const res = await fetch(photonUrl, {
      headers: { 'User-Agent': 'CampusOne-BUBT-App/1.0' },
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      const onlineMatches: GeocodedPlace[] = [];
      const features = data.features || [];

      for (const feat of features) {
        const coordsArr = feat.geometry?.coordinates;
        if (!coordsArr || coordsArr.length < 2) continue;
        const lon = Number(coordsArr[0]);
        const lat = Number(coordsArr[1]);
        if (isNaN(lat) || isNaN(lon)) continue;

        if (!isWithinBangladesh({ latitude: lat, longitude: lon })) continue;

        const p = feat.properties || {};
        const primary = p.name || p.street || p.district || p.city || q;

        const isDuplicate =
          localMatches.some(
            lm =>
              lm.name.toLowerCase() === primary.toLowerCase() &&
              Math.abs(lm.coords.latitude - lat) < 0.001 &&
              Math.abs(lm.coords.longitude - lon) < 0.001
          ) ||
          onlineMatches.some(
            om =>
              om.name.toLowerCase() === primary.toLowerCase() &&
              Math.abs(om.coords.latitude - lat) < 0.001 &&
              Math.abs(om.coords.longitude - lon) < 0.001
          );
        if (isDuplicate) continue;

        const subParts = [p.street, p.locality || p.district, p.city || 'Dhaka'].filter(Boolean);
        const sub = subParts.join(', ') || p.country || 'Dhaka';

        let placeType: 'hospital' | 'transit' | 'landmark' | 'university' | 'area' = 'area';
        const typeStr = `${p.osm_key || ''} ${p.osm_value || ''} ${primary}`.toLowerCase();
        if (typeStr.includes('hospital') || typeStr.includes('clinic') || typeStr.includes('doctor') || typeStr.includes('medical')) {
          placeType = 'hospital';
        } else if (typeStr.includes('bus') || typeStr.includes('station') || typeStr.includes('terminal') || typeStr.includes('metro') || typeStr.includes('rail')) {
          placeType = 'transit';
        } else if (typeStr.includes('university') || typeStr.includes('college') || typeStr.includes('campus') || typeStr.includes('school')) {
          placeType = 'university';
        } else if (typeStr.includes('flyover') || typeStr.includes('bridge') || typeStr.includes('monument') || typeStr.includes('park') || typeStr.includes('mall') || typeStr.includes('cinema')) {
          placeType = 'landmark';
        }

        const d = calcDist({ latitude: lat, longitude: lon });
        onlineMatches.push({
          name: primary,
          zone: p.city || p.state || 'Dhaka',
          subText: sub,
          formattedAddress: `${primary}, ${sub}`,
          coords: { latitude: lat, longitude: lon },
          distanceKm: d?.distKm,
          distanceText: d?.text,
          placeType,
        });
      }

      if (onlineMatches.length > 0) {
        return [...localMatches, ...onlineMatches].slice(0, 10);
      }
    }
  } catch (err) {
    // Photon fallback
  }

  // 3. Fallback to OpenStreetMap Nominatim
  try {
    const encoded = encodeURIComponent(q);
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=bd&limit=6&addressdetails=1`;
    const res = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'CampusOne-BUBT-App/1.0 (academic capstone)',
      },
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      const onlineMatches: GeocodedPlace[] = [];

      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (isNaN(lat) || isNaN(lon)) continue;

        const addr = item.address || {};
        const primary =
          item.name ||
          addr.amenity ||
          addr.building ||
          addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          item.display_name.split(',')[0];

        const isDuplicate =
          localMatches.some(
            lm =>
              lm.name.toLowerCase() === primary.toLowerCase() &&
              Math.abs(lm.coords.latitude - lat) < 0.001 &&
              Math.abs(lm.coords.longitude - lon) < 0.001
          ) ||
          onlineMatches.some(
            om =>
              om.name.toLowerCase() === primary.toLowerCase() &&
              Math.abs(om.coords.latitude - lat) < 0.001 &&
              Math.abs(om.coords.longitude - lon) < 0.001
          );
        if (isDuplicate) continue;

        const areaParts = [
          addr.suburb || addr.quarter || addr.neighbourhood,
          addr.city || addr.county || 'Dhaka',
        ].filter(Boolean);
        const sub = areaParts.join(', ') || item.display_name;

        let placeType: 'hospital' | 'transit' | 'landmark' | 'university' | 'area' = 'area';
        const typeStr = `${item.type || ''} ${item.class || ''} ${primary}`.toLowerCase();
        if (typeStr.includes('hospital') || typeStr.includes('clinic') || typeStr.includes('doctor') || typeStr.includes('medical')) {
          placeType = 'hospital';
        } else if (typeStr.includes('bus') || typeStr.includes('station') || typeStr.includes('terminal') || typeStr.includes('metro') || typeStr.includes('rail')) {
          placeType = 'transit';
        } else if (typeStr.includes('university') || typeStr.includes('college') || typeStr.includes('campus') || typeStr.includes('school')) {
          placeType = 'university';
        } else if (typeStr.includes('flyover') || typeStr.includes('bridge') || typeStr.includes('monument') || typeStr.includes('park') || typeStr.includes('museum')) {
          placeType = 'landmark';
        }

        const coords = { latitude: lat, longitude: lon };
        const d = calcDist(coords);

        onlineMatches.push({
          name: primary,
          zone: addr.city || 'Dhaka',
          subText: sub,
          formattedAddress: `${primary}, ${sub}`,
          coords,
          distanceKm: d?.distKm,
          distanceText: d?.text,
          placeType,
        });
      }

      return [...localMatches, ...onlineMatches].slice(0, 10);
    }
  } catch (err) {
    // Return local matches if offline or timed out
  }

  return localMatches;
}

export function isWithinBangladesh(coords: Coordinates): boolean {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return false;
  }
  return (
    coords.latitude >= 20.5 &&
    coords.latitude <= 26.7 &&
    coords.longitude >= 88.0 &&
    coords.longitude <= 92.8
  );
}

export async function getCurrentUserCoordinates(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Fast-path: Check last known position first (0ms latency, prevents cold-start blocking)
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (
        last?.coords &&
        Number.isFinite(last.coords.latitude) &&
        Number.isFinite(last.coords.longitude)
      ) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
      }
    } catch {
      // Continue to fresh GPS fix
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (err) {
    console.warn('Failed to obtain device coordinates:', err);
    return null;
  }
}

export async function reverseGeocodeCoords(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<GeocodedPlace> {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return {
      name: 'BUBT Main Campus',
      zone: 'Mirpur & Campus',
      subText: 'Permanent Campus · Road 9 & 5, Rupnagar',
      formattedAddress: 'BUBT Main Campus',
      coords: BUBT_COORDS,
    };
  }

  const inBd = isWithinBangladesh(coords);

  // 1. Instant Landmark Match within verified 100-meter boundary
  const nearestLandmark = findNearestLandmark(coords, 100);
  if (nearestLandmark) {
    const formatted = nearestLandmark.desc && !nearestLandmark.name.includes(nearestLandmark.desc)
      ? `${nearestLandmark.name}, ${nearestLandmark.desc}`
      : nearestLandmark.name;
    return {
      name: nearestLandmark.name,
      zone: nearestLandmark.zone,
      subText: nearestLandmark.desc || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      formattedAddress: formatted,
      coords,
      placeType: nearestLandmark.type || 'landmark',
    };
  }

  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  // 2. OpenStreetMap Nominatim Reverse API (High-accuracy road, amenity & building resolution)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);
    const onSignalAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onSignalAbort);
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CampusOne-BUBT-App/1.0 (academic capstone)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onSignalAbort);
    }

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      // 1. Check if pinned directly on a verified landmark, hospital, or campus spot (within 70m)
      const exactLandmark = findNearestMasterLocation(coords, 70);
      if (exactLandmark) {
        const l = exactLandmark.location;
        const sub = l.subLocation || l.zone || 'Dhaka';
        return {
          name: l.name,
          zone: sub,
          subText: `${sub} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          formattedAddress: l.name,
          coords,
          placeType: l.category,
        };
      }

      // 2. Identify City / Suburb / Area cleanly
      const cityArea =
        addr.suburb ||
        addr.quarter ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.residential ||
        addr.village ||
        addr.town ||
        addr.city ||
        (inBd ? 'Dhaka' : addr.country || '');

      // 3. Resolve a clean, human-readable place name (never raw personal/ATM names)
      let placeName = '';
      const roadName = addr.road || addr.street;
      const publicAmenity = addr.hospital || addr.clinic || addr.university || addr.college || addr.school || addr.station;

      if (publicAmenity) {
        placeName = publicAmenity;
      } else if (roadName && cityArea && roadName.toLowerCase() !== cityArea.toLowerCase()) {
        placeName = `${roadName}, ${cityArea}`;
      } else if (roadName) {
        placeName = roadName;
      } else if (cityArea) {
        placeName = cityArea;
      } else {
        const nearby = findNearestLandmark(coords, 3000);
        placeName = nearby ? nearby.name : (inBd ? 'Dhaka Location' : 'Custom Map Pin');
      }

      const formatted = placeName.includes(cityArea) || !cityArea ? placeName : `${placeName}, ${cityArea}`;

      return {
        name: placeName,
        zone: cityArea || (inBd ? 'Dhaka' : 'Global'),
        subText: cityArea ? `${cityArea} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: formatted,
        coords,
      };
    }
  } catch (osmErr) {
    if (signal?.aborted) {
      throw new Error('Aborted');
    }
  }

  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  // 3. Native Android Geocoder fallback
  try {
    const nativePlaces = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (nativePlaces && nativePlaces.length > 0) {
      const p = nativePlaces[0];
      const primaryName = p.name || p.street || p.subregion || p.district || (inBd ? 'Dhaka Location' : 'Selected Location');
      const area = p.subregion || p.district || p.city || (inBd ? 'Dhaka' : p.country || '');
      const label = area && primaryName !== area ? `${primaryName}, ${area}` : primaryName;

      return {
        name: label,
        zone: area || (inBd ? 'Dhaka' : 'Global'),
        subText: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: label,
        coords,
      };
    }
  } catch (nativeErr) {
    // Native geocoder fallback
  }

  // 4. Clean Neighborhood / Landmark Fallback
  const nearby = findNearestLandmark(coords, 2500);
  const fallbackName = nearby ? nearby.name : (inBd ? 'Dhaka Location' : 'Selected Pin');
  const fallbackZone = nearby?.zone || (inBd ? 'Dhaka' : 'Map Pin');

  return {
    name: fallbackName,
    zone: fallbackZone,
    subText: inBd ? `${fallbackZone} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    formattedAddress: `${fallbackName} (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    coords,
  };
}
