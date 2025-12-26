import pool from '../config/database';
import { User, CreateUserData, UserDevice } from '../models/User';
import { hashPassword, comparePassword } from '../utils/encryption';

export class UserRepository {
  
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async create(userData: CreateUserData): Promise<User> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, phone) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.email, hashedPassword, userData.name, userData.phone]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await hashPassword(newPassword);
      
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      
      if (!user) {
        return null;
      }
      
      const isValid = await comparePassword(password, user.password_hash);
      
      return isValid ? user : null;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }

  async registerDevice(userId: number, deviceData: {
    device_id: string;
    device_name: string;
    device_type: 'ios' | 'android' | 'web';
    push_token?: string;
  }): Promise<UserDevice> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if device already exists
      const existingDevice = await client.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND device_id = $2',
        [userId, deviceData.device_id]
      );

      let result;
      if (existingDevice.rows.length > 0) {
        // Update existing device
        result = await client.query(
          `UPDATE user_devices 
           SET device_name = $1, device_type = $2, push_token = $3, last_synced_at = NOW(), updated_at = NOW()
           WHERE user_id = $4 AND device_id = $5 
           RETURNING *`,
          [deviceData.device_name, deviceData.device_type, deviceData.push_token, userId, deviceData.device_id]
        );
      } else {
        // Create new device
        result = await client.query(
          `INSERT INTO user_devices (user_id, device_id, device_name, device_type, push_token) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [userId, deviceData.device_id, deviceData.device_name, deviceData.device_type, deviceData.push_token]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error registering device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserDevices(userId: number): Promise<UserDevice[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw error;
    }
  }
}