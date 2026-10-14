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
}

export interface GeocodedPlace {
  name: string;
  zone: string;
  subText: string;
  formattedAddress: string;
  coords: Coordinates;
}

export const BUBT_COORDS: Coordinates = {
  latitude: 23.8103,
  longitude: 90.3567,
};

export const CAMPUS_AND_DHAKA_LANDMARKS: LandmarkLocation[] = [
  // BUBT Campus & Mirpur Vicinity
  {
    name: 'BUBT Main Campus',
    nameBn: 'বিইউবিটি মেইন ক্যাম্পাস',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8103, longitude: 90.3567 },
    desc: 'Permanent Campus · Rupnagar, Mirpur-2',
  },
  {
    name: 'Sony Square (Sony Cinema)',
    nameBn: 'সনি স্কয়ার',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8093, longitude: 90.3578 },
    desc: 'Sony Square Roundabout · Mirpur-2',
  },
  {
    name: 'Commerce College Road',
    nameBn: 'কমার্স কলেজ রোড',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8080, longitude: 90.3550 },
    desc: 'Commerce College Gate · Mirpur-2',
  },
  {
    name: 'Rainkhola',
    nameBn: 'রাইনখোলা',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8130, longitude: 90.3525 },
    desc: 'Zoo Road entrance · Mirpur-2 link',
  },
  {
    name: 'Mirpur 2 Roundabout',
    nameBn: 'মিরপুর-২',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8078, longitude: 90.3582 },
    desc: 'Mirpur 2 Stadium & Market Link',
  },
  {
    name: 'Mirpur 10 Metro Station',
    nameBn: 'মিরপুর-১০ মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8071, longitude: 90.3686 },
    desc: 'Metro Rail Station · Main Roundabout',
  },
  {
    name: 'Mirpur 1 (Muktodhara)',
    nameBn: 'মিরপুর-১',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7956, longitude: 90.3537 },
    desc: 'Muktodhara Roundabout · Darussalam Link',
  },
  {
    name: 'Mirpur 11 Metro Station',
    nameBn: 'মিরপুর-১১ মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8175, longitude: 90.3662 },
    desc: 'Metro Rail Station · Purobi Cinema',
  },
  {
    name: 'Mirpur 12 Bus Depot',
    nameBn: 'মিরপুর-১২',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8277, longitude: 90.3644 },
    desc: 'Metro Rail Terminal · Bus Depot',
  },
  {
    name: 'Mirpur 14',
    nameBn: 'মিরপুর-১৪',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7997, longitude: 90.3850 },
    desc: 'BRTA Office · Kachukhet Link',
  },
  {
    name: 'Mirpur DOHS',
    nameBn: 'মিরপুর ডিওএইচএস',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8340, longitude: 90.3670 },
    desc: 'DOHS Residential Gate · Avenue 3/4',
  },
  {
    name: 'Pallabi Metro Station',
    nameBn: 'পল্লবী মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8245, longitude: 90.3640 },
    desc: 'Metro Rail Station · Section 12 Link',
  },
  {
    name: 'Rupnagar R/A',
    nameBn: 'রূপনগর আ/এ',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8155, longitude: 90.3510 },
    desc: 'Rupnagar Residential Area Gate',
  },
  {
    name: 'ECB Chattar',
    nameBn: 'ইসিবি চত্বর',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8242, longitude: 90.3885 },
    desc: 'Flyover Exit · Matikata · Cantonment Link',
  },
  {
    name: 'Technical Intersection',
    nameBn: 'টেকনিক্যাল মোড়',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7845, longitude: 90.3525 },
    desc: 'Technical Intersection · Gabtoli Highway',
  },
  {
    name: 'Kalyanpur Bus Stand',
    nameBn: 'কল্যাণপুর',
    zone: 'Central & West',
    coords: { latitude: 23.7780, longitude: 90.3585 },
    desc: 'Kalyanpur Footbridge · Bus Stand',
  },
  {
    name: 'Shyamoli Square',
    nameBn: 'শ্যামলী',
    zone: 'Central & West',
    coords: { latitude: 23.7715, longitude: 90.3620 },
    desc: 'Shyamoli Cinema · Ring Road Junction',
  },
  {
    name: 'Agargaon Metro Station',
    nameBn: 'আগারগাঁও',
    zone: 'Central & West',
    coords: { latitude: 23.7785, longitude: 90.3795 },
    desc: 'Passport Office · Biman Bhaban',
  },
  {
    name: 'Farmgate',
    nameBn: 'ফার্মগেট',
    zone: 'Central & West',
    coords: { latitude: 23.7570, longitude: 90.3888 },
    desc: 'Ananda Cinema · Metro Rail Station',
  },
  {
    name: 'Dhanmondi 27',
    nameBn: 'ধানমন্ডি ২৭',
    zone: 'Central & West',
    coords: { latitude: 23.7529, longitude: 90.3752 },
    desc: 'Rapa Plaza · Shatmasjid Road Link',
  },
  {
    name: 'Mohammadpur Town Hall',
    nameBn: 'মোহাম্মদপুর টাউন হল',
    zone: 'Central & West',
    coords: { latitude: 23.7635, longitude: 90.3615 },
    desc: 'Town Hall Market · Shia Masjid Link',
  },
  {
    name: 'Uttara Sector 3',
    nameBn: 'উত্তরা ৩',
    zone: 'North Dhaka',
    coords: { latitude: 23.8696, longitude: 90.3986 },
    desc: 'Rajlakshmi Complex · Dhaka Mymensingh Hwy',
  },
  {
    name: 'Banani 11',
    nameBn: 'বনানী ১১',
    zone: 'North Dhaka',
    coords: { latitude: 23.7935, longitude: 90.4045 },
    desc: 'Kamal Ataturk Ave · Kakoli Link',
  },
  {
    name: 'Gulshan 1 Circle',
    nameBn: 'গুলশান ১',
    zone: 'North Dhaka',
    coords: { latitude: 23.7780, longitude: 90.4170 },
    desc: 'Gulshan 1 Circle · Shooting Club Link',
  },
  {
    name: 'Mohakhali',
    nameBn: 'মহাখালী',
    zone: 'North Dhaka',
    coords: { latitude: 23.7776, longitude: 90.4054 },
    desc: 'Flyover Junction · Inter-District Terminal',
  },
  {
    name: 'Kuril Flyover',
    nameBn: 'কুড়িল বিশ্বরোড',
    zone: 'North Dhaka',
    coords: { latitude: 23.8172, longitude: 90.4208 },
    desc: 'Kuril Chowrasta · Purbachal 300 Feet Link',
  },
  {
    name: 'Bashundhara R/A Gate',
    nameBn: 'বসুন্ধরা গেট',
    zone: 'North Dhaka',
    coords: { latitude: 23.8160, longitude: 90.4260 },
    desc: 'Main Gate · Jamuna Future Park',
  },
];

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
  maxDistanceMeters: number = 280
): LandmarkLocation | null {
  let nearest: LandmarkLocation | null = null;
  let minDistance = maxDistanceMeters;

  for (const landmark of CAMPUS_AND_DHAKA_LANDMARKS) {
    const dist = getDistanceMeters(
      coords.latitude,
      coords.longitude,
      landmark.coords.latitude,
      landmark.coords.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = landmark;
    }
  }

  return nearest;
}

export function findLandmarkByName(name?: string | null): LandmarkLocation | null {
  if (!name || !name.trim()) return null;
  const q = name.trim().toLowerCase();
  return (
    CAMPUS_AND_DHAKA_LANDMARKS.find(
      l =>
        l.name.toLowerCase() === q ||
        (l.nameBn && l.nameBn.toLowerCase() === q) ||
        l.name.toLowerCase().includes(q) ||
        q.includes(l.name.toLowerCase())
    ) || null
  );
}

export async function getCurrentUserCoordinates(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
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

export async function reverseGeocodeCoords(coords: Coordinates): Promise<GeocodedPlace> {
  const nearestLandmark = findNearestLandmark(coords, 280);
  if (nearestLandmark) {
    return {
      name: nearestLandmark.name,
      zone: nearestLandmark.zone,
      subText: nearestLandmark.desc || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      formattedAddress: nearestLandmark.name,
      coords,
    };
  }

  try {
    const nativePlaces = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (nativePlaces && nativePlaces.length > 0) {
      const p = nativePlaces[0];
      const primaryName = p.name || p.street || p.subregion || p.district || 'Selected Location';
      const area = p.subregion || p.district || p.city || 'Dhaka';
      const label = primaryName !== area ? `${primaryName}, ${area}` : primaryName;

      return {
        name: label,
        zone: area,
        subText: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: label,
        coords,
      };
    }
  } catch (nativeErr) {
    // Native geocoder can fail on emulator or without play services, fall through to OSM Nominatim
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

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

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const placeName =
        addr.amenity ||
        addr.building ||
        addr.road ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        data.name ||
        'Dhaka Location';
      const cityArea = addr.suburb || addr.city_district || addr.city || 'Dhaka';
      const formatted = placeName !== cityArea ? `${placeName}, ${cityArea}` : placeName;

      return {
        name: formatted,
        zone: cityArea,
        subText: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: formatted,
        coords,
      };
    }
  } catch (osmErr) {
    // Fallback if network request fails
  }

  return {
    name: `Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    zone: 'Dhaka',
    subText: 'Custom Map Pin',
    formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    coords,
  };
}
