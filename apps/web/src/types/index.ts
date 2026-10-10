export interface User {
  id: string;
  username: string;
  display_name: string;
  role: 'admin' | 'member' | 'guest';
  is_active: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  area: string;
  icon: string;
  sort_order: number;
  description: string;
  created_at: string;
  updated_at: string;
  device_count: number;
  online_count: number;
}

export interface DeviceState {
  state_value: string;
  attributes: Record<string, any>;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  identifier: string;
  source: 'manual' | 'homeassistant' | 'mqtt' | 'simulator';
  protocol: 'wifi' | 'zigbee' | 'matter' | 'ble' | 'virtual';
  device_type: 'light' | 'switch' | 'climate' | 'sensor' | 'curtain' | 'media' | 'gateway';
  room_id: string | null;
  room_name?: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'error' | 'unknown';
  is_demo: boolean;
  source_connection_id?: string | null;
  external_id?: string | null;
  last_error?: string | null;
  last_seen: string | null;
  state?: DeviceState | null;
  extra_meta: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  id: string;
  integration_type: 'homeassistant' | 'mqtt';
  name: string;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'unconfigured';
  is_enabled: boolean;
  last_connected_at: string | null;
  last_error: string | null;
  device_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredEntity {
  external_id: string;
  name: string;
  device_type: string;
  capabilities: string[];
  current_state: string;
  attributes: Record<string, any>;
  is_available: boolean;
  source_protocol: string;
  already_imported: boolean;
  suggested_room_id?: string | null;
}

export interface IntegrationTestResult {
  success: boolean;
  version?: string;
  location_name?: string;
  entity_count?: number;
  latency_ms?: number;
  message?: string;
  error?: string;
}


export interface EventLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

export interface SystemOverview {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  demo_devices: number;
  total_rooms: number;
  service_health: string;
  database_status: string;
  unconnected_warning: string | null;
  recent_events: EventLog[];
  recent_audits: AuditLog[];
}
