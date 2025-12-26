export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface UserDevice {
  id: number;
  user_id: number;
  device_id: string;
  device_name: string;
  device_type: 'ios' | 'android' | 'web';
  push_token?: string;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
}