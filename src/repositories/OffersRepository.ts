import pool from '../config/database';
import { Offer, UserSavedOffer } from '../services/OffersService';

export interface CreateOfferData {
  store_chain: string;
  title: string;
  description?: string;
  offer_type: 'discount' | 'cashback' | 'bogo' | 'points' | 'freebie';
  discount_value?: number;
  minimum_purchase?: number;
  terms_conditions?: string;
  valid_from?: Date;
  valid_until?: Date;
  is_active?: boolean;
}

export interface UpdateOfferData {
  title?: string;
  description?: string;
  offer_type?: 'discount' | 'cashback' | 'bogo' | 'points' | 'freebie';
  discount_value?: number;
  minimum_purchase?: number;
  terms_conditions?: string;
  valid_from?: Date;
  valid_until?: Date;
  is_active?: boolean;
}

export interface OfferFilters {
  store_chain?: string;
  offer_type?: string;
  is_active?: boolean;
  valid_only?: boolean;
  search?: string;
}

export class OffersRepository {

  /**
   * Find all offers with optional filtering
   */
  async findAll(filters: OfferFilters = {}): Promise<Offer[]> {
    try {
      let query = 'SELECT * FROM offers WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.store_chain) {
        query += ` AND LOWER(store_chain) = LOWER($${paramIndex++})`;
        values.push(filters.store_chain);
      }

      if (filters.offer_type) {
        query += ` AND offer_type = $${paramIndex++}`;
        values.push(filters.offer_type);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        values.push(filters.is_active);
      }

      if (filters.valid_only) {
        query += ` AND (valid_until IS NULL OR valid_until > NOW())`;
        query += ` AND (valid_from IS NULL OR valid_from <= NOW())`;
      }

      if (filters.search) {
        query += ` AND (LOWER(title) LIKE LOWER($${paramIndex}) OR LOWER(description) LIKE LOWER($${paramIndex}))`;
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding offers:', error);
      throw error;
    }
  }

  /**
   * Find offer by ID
   */
  async findById(id: number): Promise<Offer | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM offers WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding offer by ID:', error);
      throw error;
    }
  }

  /**
   * Find offers by store chain
   */
  async findByStoreChain(storeChain: string, activeOnly: boolean = true): Promise<Offer[]> {
    try {
      let query = 'SELECT * FROM offers WHERE LOWER(store_chain) = LOWER($1)';
      const values: any[] = [storeChain];

      if (activeOnly) {
        query += ' AND is_active = true AND (valid_until IS NULL OR valid_until > NOW())';
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding offers by store chain:', error);
      throw error;
    }
  }

  /**
   * Create new offer
   */
  async create(offerData: CreateOfferData): Promise<Offer> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO offers 
         (store_chain, title, description, offer_type, discount_value, 
          minimum_purchase, terms_conditions, valid_from, valid_until, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          offerData.store_chain,
          offerData.title,
          offerData.description,
          offerData.offer_type,
          offerData.discount_value,
          offerData.minimum_purchase,
          offerData.terms_conditions,
          offerData.valid_from,
          offerData.valid_until,
          offerData.is_active !== false
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating offer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update offer
   */
  async update(id: number, updateData: UpdateOfferData): Promise<Offer | null> {
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
        `UPDATE offers 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        updateValues
      );

      await client.query('COMMIT');
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating offer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete offer
   */
  async delete(id: number): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete related user saved offers first
      await client.query('DELETE FROM user_saved_offers WHERE offer_id = $1', [id]);

      // Delete the offer
      const result = await client.query('DELETE FROM offers WHERE id = $1', [id]);

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting offer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save offer for user
   */
  async saveOfferForUser(userId: number, offerId: number): Promise<UserSavedOffer> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if already saved
      const existing = await client.query(
        'SELECT * FROM user_saved_offers WHERE user_id = $1 AND offer_id = $2',
        [userId, offerId]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return existing.rows[0];
      }

      const result = await client.query(
        `INSERT INTO user_saved_offers (user_id, offer_id) 
         VALUES ($1, $2) 
         RETURNING *`,
        [userId, offerId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving offer for user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove saved offer for user
   */
  async removeSavedOfferForUser(userId: number, offerId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM user_saved_offers WHERE user_id = $1 AND offer_id = $2',
        [userId, offerId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error removing saved offer:', error);
      throw error;
    }
  }

  /**
   * Mark offer as used
   */
  async markOfferAsUsed(userId: number, offerId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE user_saved_offers 
         SET is_used = true, used_at = NOW() 
         WHERE user_id = $1 AND offer_id = $2`,
        [userId, offerId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error marking offer as used:', error);
      throw error;
    }
  }

  /**
   * Get user's saved offers
   */
  async getUserSavedOffers(userId: number, includeUsed: boolean = false): Promise<UserSavedOffer[]> {
    try {
      let query = `
        SELECT uso.*, o.* 
        FROM user_saved_offers uso
        JOIN offers o ON uso.offer_id = o.id
        WHERE uso.user_id = $1
      `;

      if (!includeUsed) {
        query += ' AND uso.is_used = false';
      }

      query += ' ORDER BY uso.created_at DESC';

      const result = await pool.query(query, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        offer_id: row.offer_id,
        is_used: row.is_used,
        used_at: row.used_at,
        created_at: row.created_at,
        offer: {
          id: row.offer_id,
          store_chain: row.store_chain,
          title: row.title,
          description: row.description,
          offer_type: row.offer_type,
          discount_value: row.discount_value,
          minimum_purchase: row.minimum_purchase,
          terms_conditions: row.terms_conditions,
          valid_from: row.valid_from,
          valid_until: row.valid_until,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting user saved offers:', error);
      throw error;
    }
  }

  /**
   * Get offers for multiple store chains
   */
  async findByStoreChains(storeChains: string[], activeOnly: boolean = true): Promise<Offer[]> {
    try {
      if (storeChains.length === 0) {
        return [];
      }

      let query = `
        SELECT * FROM offers 
        WHERE LOWER(store_chain) = ANY($1)
      `;
      
      const lowerStoreChains = storeChains.map(chain => chain.toLowerCase());
      const values: any[] = [lowerStoreChains];

      if (activeOnly) {
        query += ` AND is_active = true 
                   AND (valid_until IS NULL OR valid_until > NOW())
                   AND (valid_from IS NULL OR valid_from <= NOW())`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding offers by store chains:', error);
      throw error;
    }
  }

  /**
   * Get offer statistics
   */
  async getStatistics(): Promise<{
    totalOffers: number;
    activeOffers: number;
    expiredOffers: number;
    totalSaves: number;
    totalRedemptions: number;
    offersByType: { [key: string]: number };
    offersByStore: { [key: string]: number };
  }> {
    try {
      const [
        totalResult,
        activeResult,
        expiredResult,
        savesResult,
        redemptionsResult,
        typeResult,
        storeResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM offers'),
        pool.query('SELECT COUNT(*) as count FROM offers WHERE is_active = true AND (valid_until IS NULL OR valid_until > NOW())'),
        pool.query('SELECT COUNT(*) as count FROM offers WHERE valid_until IS NOT NULL AND valid_until <= NOW()'),
        pool.query('SELECT COUNT(*) as count FROM user_saved_offers'),
        pool.query('SELECT COUNT(*) as count FROM user_saved_offers WHERE is_used = true'),
        pool.query('SELECT offer_type, COUNT(*) as count FROM offers GROUP BY offer_type'),
        pool.query('SELECT store_chain, COUNT(*) as count FROM offers GROUP BY store_chain ORDER BY count DESC')
      ]);

      const offersByType: { [key: string]: number } = {};
      typeResult.rows.forEach(row => {
        offersByType[row.offer_type] = parseInt(row.count);
      });

      const offersByStore: { [key: string]: number } = {};
      storeResult.rows.forEach(row => {
        offersByStore[row.store_chain] = parseInt(row.count);
      });

      return {
        totalOffers: parseInt(totalResult.rows[0].count),
        activeOffers: parseInt(activeResult.rows[0].count),
        expiredOffers: parseInt(expiredResult.rows[0].count),
        totalSaves: parseInt(savesResult.rows[0].count),
        totalRedemptions: parseInt(redemptionsResult.rows[0].count),
        offersByType,
        offersByStore
      };
    } catch (error) {
      console.error('Error getting offer statistics:', error);
      throw error;
    }
  }

  /**
   * Get expiring offers (within specified days)
   */
  async getExpiringOffers(withinDays: number = 7): Promise<Offer[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM offers 
         WHERE is_active = true 
         AND valid_until IS NOT NULL 
         AND valid_until > NOW() 
         AND valid_until <= NOW() + INTERVAL '${withinDays} days'
         ORDER BY valid_until ASC`
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting expiring offers:', error);
      throw error;
    }
  }
}