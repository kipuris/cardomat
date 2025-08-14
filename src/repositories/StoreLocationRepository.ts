import pool from '../config/database';
import { StoreLocation, Coordinates } from '../services/LocationService';

export interface CreateStoreLocationData {
  store_name: string;
  store_chain?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
  geofence_radius?: number;
  is_active?: boolean;
}

export interface UpdateStoreLocationData {
  store_name?: string;
  store_chain?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius?: number;
  is_active?: boolean;
}

export interface StoreSearchFilters {
  store_chain?: string;
  city?: string;
  state?: string;
  country?: string;
  is_active?: boolean;
  near_location?: {
    coordinates: Coordinates;
    radius_km: number;
  };
}

export class StoreLocationRepository {

  /**
   * Get all store locations with optional filtering
   */
  async findAll(filters: StoreSearchFilters = {}): Promise<StoreLocation[]> {
    try {
      let query = 'SELECT * FROM store_locations WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.store_chain) {
        query += ` AND store_chain = $${paramIndex++}`;
        values.push(filters.store_chain);
      }

      if (filters.city) {
        query += ` AND LOWER(city) = LOWER($${paramIndex++})`;
        values.push(filters.city);
      }

      if (filters.state) {
        query += ` AND LOWER(state) = LOWER($${paramIndex++})`;
        values.push(filters.state);
      }

      if (filters.country) {
        query += ` AND LOWER(country) = LOWER($${paramIndex++})`;
        values.push(filters.country);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        values.push(filters.is_active);
      }

      // Geographic proximity filter
      if (filters.near_location) {
        const { coordinates, radius_km } = filters.near_location;
        // Use Haversine formula in SQL for efficient geographic search
        query += ` AND (
          6371 * acos(
            cos(radians($${paramIndex})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians($${paramIndex + 1})) + 
            sin(radians($${paramIndex})) * 
            sin(radians(latitude))
          )
        ) <= $${paramIndex + 2}`;
        values.push(coordinates.latitude, coordinates.longitude, radius_km);
        paramIndex += 3;
      }

      query += ' ORDER BY store_name, city';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding store locations:', error);
      throw error;
    }
  }

  /**
   * Find store locations near coordinates
   */
  async findNearby(
    coordinates: Coordinates, 
    radiusKm: number = 5, 
    limit: number = 50
  ): Promise<StoreLocation[]> {
    try {
      const query = `
        SELECT *, (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(latitude))
          )
        ) AS distance_km
        FROM store_locations 
        WHERE is_active = true
        AND (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(latitude))
          )
        ) <= $3
        ORDER BY distance_km
        LIMIT $4
      `;

      const result = await pool.query(query, [
        coordinates.latitude,
        coordinates.longitude,
        radiusKm,
        limit
      ]);

      return result.rows;
    } catch (error) {
      console.error('Error finding nearby stores:', error);
      throw error;
    }
  }

  /**
   * Find store by ID
   */
  async findById(id: number): Promise<StoreLocation | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM store_locations WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding store by ID:', error);
      throw error;
    }
  }

  /**
   * Create new store location
   */
  async create(storeData: CreateStoreLocationData): Promise<StoreLocation> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO store_locations 
         (store_name, store_chain, address, city, state, zip_code, country, 
          latitude, longitude, geofence_radius, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          storeData.store_name,
          storeData.store_chain,
          storeData.address,
          storeData.city,
          storeData.state,
          storeData.zip_code,
          storeData.country || 'US',
          storeData.latitude,
          storeData.longitude,
          storeData.geofence_radius || 100,
          storeData.is_active !== false
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating store location:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update store location
   */
  async update(id: number, updateData: UpdateStoreLocationData): Promise<StoreLocation | null> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex++}`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return this.findById(id);
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const result = await client.query(
        `UPDATE store_locations 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        updateValues
      );

      await client.query('COMMIT');
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating store location:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete store location
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM store_locations WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting store location:', error);
      throw error;
    }
  }

  /**
   * Get stores by chain
   */
  async findByChain(storeChain: string): Promise<StoreLocation[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM store_locations WHERE LOWER(store_chain) = LOWER($1) AND is_active = true ORDER BY city, store_name',
        [storeChain]
      );

      return result.rows;
    } catch (error) {
      console.error('Error finding stores by chain:', error);
      throw error;
    }
  }

  /**
   * Bulk create store locations
   */
  async createBulk(stores: CreateStoreLocationData[]): Promise<StoreLocation[]> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const results: StoreLocation[] = [];

      for (const store of stores) {
        const result = await client.query(
          `INSERT INTO store_locations 
           (store_name, store_chain, address, city, state, zip_code, country, 
            latitude, longitude, geofence_radius, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            store.store_name,
            store.store_chain,
            store.address,
            store.city,
            store.state,
            store.zip_code,
            store.country || 'US',
            store.latitude,
            store.longitude,
            store.geofence_radius || 100,
            store.is_active !== false
          ]
        );

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error bulk creating store locations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get statistics about store locations
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    by_chain: { [key: string]: number };
    by_country: { [key: string]: number };
  }> {
    try {
      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM store_locations'
      );

      const activeResult = await pool.query(
        'SELECT COUNT(*) as active FROM store_locations WHERE is_active = true'
      );

      const chainResult = await pool.query(
        'SELECT store_chain, COUNT(*) as count FROM store_locations WHERE store_chain IS NOT NULL GROUP BY store_chain ORDER BY count DESC'
      );

      const countryResult = await pool.query(
        'SELECT country, COUNT(*) as count FROM store_locations GROUP BY country ORDER BY count DESC'
      );

      const byChain: { [key: string]: number } = {};
      chainResult.rows.forEach(row => {
        byChain[row.store_chain] = parseInt(row.count);
      });

      const byCountry: { [key: string]: number } = {};
      countryResult.rows.forEach(row => {
        byCountry[row.country] = parseInt(row.count);
      });

      return {
        total: parseInt(totalResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
        by_chain: byChain,
        by_country: byCountry
      };
    } catch (error) {
      console.error('Error getting store statistics:', error);
      throw error;
    }
  }
}