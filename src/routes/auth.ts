import express from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../utils/jwt';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema, deviceRegistrationSchema } from '../validation/schemas';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const userRepository = new UserRepository();

// Register new user
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, name, phone, device_id, device_name, device_type, push_token } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await userRepository.create({
      email,
      password,
      name,
      phone
    });

    // Register device
    const device = await userRepository.registerDevice(user.id, {
      device_id,
      device_name,
      device_type,
      push_token
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      deviceId: device.device_id
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          is_verified: user.is_verified
        },
        device: {
          id: device.id,
          device_id: device.device_id,
          device_name: device.device_name,
          device_type: device.device_type
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password, device_id, device_name, device_type, push_token } = req.body;

    // Verify credentials
    const user = await userRepository.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Register/update device
    const device = await userRepository.registerDevice(user.id, {
      device_id,
      device_name,
      device_type,
      push_token
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      deviceId: device.device_id
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          is_verified: user.is_verified
        },
        device: {
          id: device.id,
          device_id: device.device_id,
          device_name: device.device_name,
          device_type: device.device_type
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          is_verified: user.is_verified,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user devices
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const devices = await userRepository.getUserDevices(req.user!.id);

    res.json({
      success: true,
      data: {
        devices: devices.map(device => ({
          id: device.id,
          device_id: device.device_id,
          device_name: device.device_name,
          device_type: device.device_type,
          last_synced_at: device.last_synced_at,
          created_at: device.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register new device
router.post('/devices', authenticateToken, validateRequest(deviceRegistrationSchema), async (req, res) => {
  try {
    const { device_id, device_name, device_type, push_token } = req.body;

    const device = await userRepository.registerDevice(req.user!.id, {
      device_id,
      device_name,
      device_type,
      push_token
    });

    res.json({
      success: true,
      message: 'Device registered successfully',
      data: {
        device: {
          id: device.id,
          device_id: device.device_id,
          device_name: device.device_name,
          device_type: device.device_type,
          created_at: device.created_at
        }
      }
    });

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;