export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StoreLocation {
  id: number;
  store_name: string;
  store_chain?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GeofenceMatch {
  store: StoreLocation;
  distance: number;
  isWithinGeofence: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface LocationPermissionStatus {
  granted: boolean;
  accuracy: 'high' | 'medium' | 'low' | 'none';
  lastUpdated?: Date;
}

export class LocationService {

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = this.toRadians(coord1.latitude);
    const φ2 = this.toRadians(coord2.latitude);
    const Δφ = this.toRadians(coord2.latitude - coord1.latitude);
    const Δλ = this.toRadians(coord2.longitude - coord1.longitude);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Find stores within a given radius of user location
   */
  findNearbyStores(
    userLocation: Coordinates, 
    stores: StoreLocation[], 
    maxRadius: number = 1000
  ): GeofenceMatch[] {
    const matches: GeofenceMatch[] = [];

    for (const store of stores.filter(s => s.is_active)) {
      const distance = this.calculateDistance(userLocation, {
        latitude: store.latitude,
        longitude: store.longitude
      });

      // Check if within the store's geofence or the max radius
      const geofenceRadius = Math.max(store.geofence_radius, 50); // Minimum 50m
      const isWithinGeofence = distance <= geofenceRadius;
      const isWithinSearchRadius = distance <= maxRadius;

      if (isWithinSearchRadius) {
        matches.push({
          store,
          distance,
          isWithinGeofence,
          confidence: this.calculateConfidence(distance, geofenceRadius)
        });
      }
    }

    // Sort by distance (closest first)
    return matches.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if user is within geofence of specific stores
   */
  checkGeofenceEntry(
    userLocation: Coordinates,
    stores: StoreLocation[]
  ): GeofenceMatch[] {
    return this.findNearbyStores(userLocation, stores, Number.MAX_SAFE_INTEGER)
      .filter(match => match.isWithinGeofence)
      .slice(0, 5); // Limit to 5 closest matches
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(coords: Coordinates): boolean {
    return (
      coords.latitude >= -90 && coords.latitude <= 90 &&
      coords.longitude >= -180 && coords.longitude <= 180 &&
      !isNaN(coords.latitude) && !isNaN(coords.longitude)
    );
  }

  /**
   * Get location accuracy level based on distance from stores
   */
  getLocationAccuracy(distance: number): 'high' | 'medium' | 'low' {
    if (distance <= 10) return 'high';
    if (distance <= 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence level for store match
   */
  private calculateConfidence(
    distance: number, 
    geofenceRadius: number
  ): 'high' | 'medium' | 'low' {
    const ratio = distance / geofenceRadius;
    
    if (ratio <= 0.3) return 'high';
    if (ratio <= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get bearing (direction) between two coordinates
   */
  getBearing(from: Coordinates, to: Coordinates): number {
    const φ1 = this.toRadians(from.latitude);
    const φ2 = this.toRadians(to.latitude);
    const Δλ = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Estimate travel time (walking) to destination
   */
  estimateTravelTime(distanceInMeters: number, walkingSpeedKmh: number = 5): number {
    // Return time in minutes
    const distanceInKm = distanceInMeters / 1000;
    const timeInHours = distanceInKm / walkingSpeedKmh;
    return Math.round(timeInHours * 60);
  }

  /**
   * Get location privacy settings recommendations
   */
  getPrivacyRecommendations(): string[] {
    return [
      'Location data is used only for suggesting relevant loyalty cards',
      'Location history is not stored permanently',
      'You can disable location features at any time in settings',
      'Location requests are made only when the app is active',
      'No location data is shared with third parties',
      'Geofence areas are approximate and may include nearby areas'
    ];
  }

  /**
   * Check if location services would be beneficial for user
   */
  shouldSuggestLocationServices(userCardCount: number, storeCount: number): boolean {
    // Suggest location services if user has multiple cards and there are nearby stores
    return userCardCount >= 3 && storeCount >= 5;
  }
}