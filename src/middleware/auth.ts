import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import pool from '../config/database';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        deviceId?: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
    return;
  }

  try {
    const decoded = verifyToken(token) as JWTPayload;
    
    // Verify user still exists in database
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
      return;
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      deviceId: decoded.deviceId
    };

    next();
  } catch (error) {
    res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const authenticateAPIKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ 
      success: false, 
      message: 'API key required' 
    });
    return;
  }

  try {
    const crypto = require('node:crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyResult = await pool.query(
      `SELECT ak.user_id, ak.permissions, u.email 
       FROM api_keys ak 
       JOIN users u ON ak.user_id = u.id 
       WHERE ak.api_key_hash = $1 AND ak.is_active = true 
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash]
    );

    if (keyResult.rows.length === 0) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid API key' 
      });
      return;
    }

    const keyData = keyResult.rows[0];
    
    // Update last_used_at
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE api_key_hash = $1',
      [keyHash]
    );

    req.user = {
      id: keyData.user_id,
      email: keyData.email
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};