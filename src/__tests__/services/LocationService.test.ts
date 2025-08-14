import { LocationService } from '../../services/LocationService';

describe('LocationService', () => {
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService();
  });

  describe('Distance Calculation', () => {
    test('should calculate distance between two coordinates', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.0060 }; // New York
      const coord2 = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
      
      const distance = locationService.calculateDistance(coord1, coord2);
      
      // Distance should be approximately 3,944 km (2,451 miles)
      expect(distance).toBeGreaterThan(3900000); // 3,900 km
      expect(distance).toBeLessThan(4000000); // 4,000 km
    });

    test('should return 0 for same coordinates', () => {
      const coord = { latitude: 40.7128, longitude: -74.0060 };
      
      const distance = locationService.calculateDistance(coord, coord);
      
      expect(distance).toBe(0);
    });

    test('should calculate short distances accurately', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.0060 };
      const coord2 = { latitude: 40.7129, longitude: -74.0061 }; // Very close
      
      const distance = locationService.calculateDistance(coord1, coord2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100); // Less than 100 meters
    });
  });

  describe('Coordinate Validation', () => {
    test('should validate correct coordinates', () => {
      expect(locationService.validateCoordinates({ latitude: 40.7128, longitude: -74.0060 })).toBe(true);
      expect(locationService.validateCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
      expect(locationService.validateCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    });

    test('should reject invalid coordinates', () => {
      expect(locationService.validateCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(locationService.validateCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
      expect(locationService.validateCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(locationService.validateCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
      expect(locationService.validateCoordinates({ latitude: NaN, longitude: 0 })).toBe(false);
    });
  });

  describe('Nearby Store Finding', () => {
    test('should find stores within radius', () => {
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };
      const stores = [
        {
          id: 1,
          store_name: 'Store A',
          latitude: 40.7130,
          longitude: -74.0062,
          geofence_radius: 100,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          store_name: 'Store B',
          latitude: 40.8128, // Much further away
          longitude: -74.0060,
          geofence_radius: 100,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const nearby = locationService.findNearbyStores(userLocation, stores, 1000);
      
      expect(nearby.length).toBe(1); // Only Store A should be within 1km
      expect(nearby[0].store.store_name).toBe('Store A');
      expect(nearby[0].distance).toBeLessThan(1000);
    });

    test('should mark stores within geofence', () => {
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };
      const stores = [
        {
          id: 1,
          store_name: 'Close Store',
          latitude: 40.7129, // Very close
          longitude: -74.0061,
          geofence_radius: 200,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const nearby = locationService.findNearbyStores(userLocation, stores, 5000);
      
      expect(nearby[0].isWithinGeofence).toBe(true);
      expect(nearby[0].confidence).toBe('high');
    });

    test('should sort by distance', () => {
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };
      const stores = [
        {
          id: 1,
          store_name: 'Far Store',
          latitude: 40.7150,
          longitude: -74.0060,
          geofence_radius: 100,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          store_name: 'Near Store',
          latitude: 40.7129,
          longitude: -74.0060,
          geofence_radius: 100,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const nearby = locationService.findNearbyStores(userLocation, stores, 5000);
      
      expect(nearby.length).toBe(2);
      expect(nearby[0].store.store_name).toBe('Near Store');
      expect(nearby[1].store.store_name).toBe('Far Store');
      expect(nearby[0].distance).toBeLessThan(nearby[1].distance);
    });
  });

  describe('Utility Functions', () => {
    test('should format distances correctly', () => {
      expect(locationService.formatDistance(500)).toBe('500m');
      expect(locationService.formatDistance(1000)).toBe('1.0km');
      expect(locationService.formatDistance(1500)).toBe('1.5km');
      expect(locationService.formatDistance(12000)).toBe('12.0km');
    });

    test('should estimate travel time', () => {
      const travelTime = locationService.estimateTravelTime(1000, 5); // 1km at 5km/h
      expect(travelTime).toBe(12); // 12 minutes
    });

    test('should calculate bearing', () => {
      const from = { latitude: 0, longitude: 0 };
      const to = { latitude: 1, longitude: 0 }; // Due north
      
      const bearing = locationService.getBearing(from, to);
      expect(bearing).toBeCloseTo(0, 0); // Should be approximately 0 degrees (north)
    });

    test('should determine location accuracy', () => {
      expect(locationService.getLocationAccuracy(5)).toBe('high');
      expect(locationService.getLocationAccuracy(25)).toBe('medium');
      expect(locationService.getLocationAccuracy(100)).toBe('low');
    });
  });

  describe('Privacy and Recommendations', () => {
    test('should provide privacy recommendations', () => {
      const recommendations = locationService.getPrivacyRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Location data is used only'))).toBe(true);
    });

    test('should suggest location services appropriately', () => {
      expect(locationService.shouldSuggestLocationServices(5, 10)).toBe(true);
      expect(locationService.shouldSuggestLocationServices(1, 2)).toBe(false);
    });
  });
});