jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 23.8103, longitude: 90.3567 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([]),
  Accuracy: { Balanced: 3 },
}));

import {
  searchLandmarks,
  searchPlacesOnline,
  reverseGeocodeCoords,
  getDistanceMeters,
  BUBT_COORDS,
} from '../locationService';

describe('locationService - search and autocomplete', () => {
  it('instantly matches Jatrabari on typing "jat"', () => {
    const results = searchLandmarks('jat', 8, BUBT_COORDS);
    expect(results.length).toBeGreaterThan(0);

    const names = results.map(r => r.name);
    expect(names).toContain('Jatrabari');
    expect(names).toContain('Jatrabari Bus Stop');
    expect(names).toContain('Jatrabari Flyover');
  });

  it('matches Jatrabari on partial word "jatrabar"', () => {
    const results = searchLandmarks('jatrabar', 5, BUBT_COORDS);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('Jatrabari');
  });

  it('ranks exact prefix matches first', () => {
    const results = searchLandmarks('jat', 5);
    expect(results[0].name.toLowerCase().startsWith('jat')).toBe(true);
  });

  it('computes distance and assigns placeType in searchPlacesOnline', async () => {
    const places = await searchPlacesOnline('jat', BUBT_COORDS);
    expect(places.length).toBeGreaterThan(0);

    const jatrabari = places.find(p => p.name === 'Jatrabari');
    expect(jatrabari).toBeDefined();
    expect(jatrabari?.distanceText).toBeDefined();
    expect(jatrabari?.distanceText).toMatch(/km|m/);

    const busStop = places.find(p => p.name === 'Jatrabari Bus Stop');
    expect(busStop?.placeType).toBe('transit');
  });

  it('accurately calculates Haversine distance between two coordinates', () => {
    // Distance from BUBT (23.8103, 90.3567) to Sony Square (23.8093, 90.3578) is approx ~150m
    const dist = getDistanceMeters(23.8103, 90.3567, 23.8093, 90.3578);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(250);
  });

  it('reverse geocodes coordinates with contextual landmark subtext', async () => {
    const place = await reverseGeocodeCoords(BUBT_COORDS);
    expect(place.name).toBe('BUBT Main Campus');
    expect(place.zone).toBe('Mirpur & Campus');
    expect(place.subText).toContain('Rupnagar');
  });

  it('correctly validates coordinates within Bangladesh boundaries and rejects outside/invalid coords', () => {
    const { isWithinBangladesh } = require('../locationService');
    expect(isWithinBangladesh({ latitude: 23.8103, longitude: 90.3567 })).toBe(true); // Dhaka
    expect(isWithinBangladesh({ latitude: 22.3569, longitude: 91.7832 })).toBe(true); // Chittagong
    expect(isWithinBangladesh({ latitude: 51.5074, longitude: -0.1278 })).toBe(false); // London
    expect(isWithinBangladesh({ latitude: NaN, longitude: 90.3567 })).toBe(false); // Invalid
    expect(isWithinBangladesh({ latitude: 23.8103, longitude: NaN })).toBe(false); // Invalid
  });

  it('immediately cancels reverseGeocodeCoords when passed an aborted AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();
    // Non-landmark coordinate that would hit network
    const customCoords = { latitude: 23.7500, longitude: 90.4000 };
    await expect(reverseGeocodeCoords(customCoords, controller.signal)).rejects.toThrow('Aborted');
  });

  it('gracefully falls back on NaN or invalid coordinates in reverseGeocodeCoords', async () => {
    const invalidCoords = { latitude: NaN, longitude: NaN };
    const place = await reverseGeocodeCoords(invalidCoords);
    expect(place.name).toBe('BUBT Main Campus');
    expect(place.coords).toEqual(BUBT_COORDS);
  });
});


