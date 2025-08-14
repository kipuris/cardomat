import pool from '../config/database';
import { LoyaltyCard, CreateLoyaltyCardData, UpdateLoyaltyCardData, LoyaltyCardResponse } from '../models/LoyaltyCard';
import { encrypt, decrypt } from '../utils/encryption';

export class LoyaltyCardRepository {

  async findByUserId(userId: number): Promise<LoyaltyCardResponse[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM loyalty_cards 
         WHERE user_id = $1 
         ORDER BY display_order ASC, created_at DESC`,
        [userId]
      );
      
      // Decrypt sensitive fields
      return result.rows.map(card => this.decryptCard(card));
    } catch (error) {
      console.error('Error finding cards by user ID:', error);
      throw error;
    }
  }

  async findById(cardId: number, userId: number): Promise<LoyaltyCardResponse | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM loyalty_cards WHERE id = $1 AND user_id = $2',
        [cardId, userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.decryptCard(result.rows[0]);
    } catch (error) {
      console.error('Error finding card by ID:', error);
      throw error;
    }
  }

  async create(userId: number, cardData: CreateLoyaltyCardData): Promise<LoyaltyCardResponse> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Encrypt sensitive fields
      const encryptedCardNumber = encrypt(cardData.card_number);
      const encryptedBarcodeData = encrypt(cardData.barcode_data);
      
      const result = await client.query(
        `INSERT INTO loyalty_cards 
         (user_id, card_name, store_name, card_number_encrypted, barcode_type, 
          barcode_data_encrypted, card_color, notes, is_favorite, display_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING *`,
        [
          userId,
          cardData.card_name,
          cardData.store_name,
          encryptedCardNumber,
          cardData.barcode_type,
          encryptedBarcodeData,
          cardData.card_color || '#2196F3',
          cardData.notes,
          cardData.is_favorite || false,
          cardData.display_order || 0
        ]
      );

      // Log card creation
      await client.query(
        `INSERT INTO card_usage_logs (card_id, user_id, action_type) 
         VALUES ($1, $2, $3)`,
        [result.rows[0].id, userId, 'add']
      );

      await client.query('COMMIT');
      return this.decryptCard(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating loyalty card:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(cardId: number, userId: number, updateData: UpdateLoyaltyCardData): Promise<LoyaltyCardResponse | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current card data
      const currentCard = await client.query(
        'SELECT * FROM loyalty_cards WHERE id = $1 AND user_id = $2',
        [cardId, userId]
      );

      if (currentCard.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 3; // Start after cardId and userId

      if (updateData.card_name !== undefined) {
        updateFields.push(`card_name = $${paramIndex++}`);
        updateValues.push(updateData.card_name);
      }
      
      if (updateData.store_name !== undefined) {
        updateFields.push(`store_name = $${paramIndex++}`);
        updateValues.push(updateData.store_name);
      }
      
      if (updateData.card_number !== undefined) {
        updateFields.push(`card_number_encrypted = $${paramIndex++}`);
        updateValues.push(encrypt(updateData.card_number));
      }
      
      if (updateData.barcode_type !== undefined) {
        updateFields.push(`barcode_type = $${paramIndex++}`);
        updateValues.push(updateData.barcode_type);
      }
      
      if (updateData.barcode_data !== undefined) {
        updateFields.push(`barcode_data_encrypted = $${paramIndex++}`);
        updateValues.push(encrypt(updateData.barcode_data));
      }
      
      if (updateData.card_color !== undefined) {
        updateFields.push(`card_color = $${paramIndex++}`);
        updateValues.push(updateData.card_color);
      }
      
      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(updateData.notes);
      }
      
      if (updateData.is_favorite !== undefined) {
        updateFields.push(`is_favorite = $${paramIndex++}`);
        updateValues.push(updateData.is_favorite);
      }
      
      if (updateData.display_order !== undefined) {
        updateFields.push(`display_order = $${paramIndex++}`);
        updateValues.push(updateData.display_order);
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return this.decryptCard(currentCard.rows[0]);
      }

      updateFields.push('updated_at = NOW()');
      
      const result = await client.query(
        `UPDATE loyalty_cards 
         SET ${updateFields.join(', ')} 
         WHERE id = $1 AND user_id = $2 
         RETURNING *`,
        [cardId, userId, ...updateValues]
      );

      // Log card edit
      await client.query(
        `INSERT INTO card_usage_logs (card_id, user_id, action_type) 
         VALUES ($1, $2, $3)`,
        [cardId, userId, 'edit']
      );

      await client.query('COMMIT');
      return this.decryptCard(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating loyalty card:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(cardId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Log card deletion before deleting
      await client.query(
        `INSERT INTO card_usage_logs (card_id, user_id, action_type) 
         VALUES ($1, $2, $3)`,
        [cardId, userId, 'delete']
      );

      const result = await client.query(
        'DELETE FROM loyalty_cards WHERE id = $1 AND user_id = $2',
        [cardId, userId]
      );

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting loyalty card:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async logCardUsage(cardId: number, userId: number, actionType: string, metadata?: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO card_usage_logs (card_id, user_id, action_type, metadata) 
         VALUES ($1, $2, $3, $4)`,
        [cardId, userId, actionType, JSON.stringify(metadata || {})]
      );
    } catch (error) {
      console.error('Error logging card usage:', error);
      // Don't throw error as this is just logging
    }
  }

  private decryptCard(encryptedCard: LoyaltyCard): LoyaltyCardResponse {
    try {
      return {
        id: encryptedCard.id,
        card_name: encryptedCard.card_name,
        store_name: encryptedCard.store_name,
        card_number: decrypt(encryptedCard.card_number_encrypted),
        barcode_type: encryptedCard.barcode_type,
        barcode_data: decrypt(encryptedCard.barcode_data_encrypted),
        card_color: encryptedCard.card_color,
        notes: encryptedCard.notes,
        is_favorite: encryptedCard.is_favorite,
        display_order: encryptedCard.display_order,
        created_at: encryptedCard.created_at,
        updated_at: encryptedCard.updated_at
      };
    } catch (error) {
      console.error('Error decrypting card:', error);
      throw new Error('Failed to decrypt card data');
    }
  }
}