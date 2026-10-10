import { User, Room, Device, SystemOverview, AuditLog, EventLog } from '../types';

const TOKEN_KEY = 'homecore_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If not on login or status check, clear token
    if (!endpoint.includes('/api/v1/auth/status') && !endpoint.includes('/api/v1/auth/login')) {
      removeToken();
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }

  if (!response.ok) {
    let errorMsg = `请求失败: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
    getStatus: () => apiFetch<{ is_initialized: boolean; version: string; project_name: string }>('/api/v1/auth/status'),
    setup: (data: { username: string; password: string; display_name: string }) =>
      apiFetch<{ access_token: string; token_type: string; user: User }>('/api/v1/auth/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { username: string; password: string }) =>
      apiFetch<{ access_token: string; token_type: string; user: User }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => apiFetch<User>('/api/v1/auth/me'),
    logout: () => apiFetch<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),
  },
  overview: {
    get: () => apiFetch<SystemOverview>('/api/v1/overview'),
  },
  rooms: {
    list: () => apiFetch<Room[]>('/api/v1/rooms'),
    create: (data: Partial<Room>) =>
      apiFetch<Room>('/api/v1/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Room>) =>
      apiFetch<Room>(`/api/v1/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/v1/rooms/${id}`, {
        method: 'DELETE',
      }),
  },
  devices: {
    list: (params?: { room_id?: string; status?: string; device_type?: string; is_demo?: boolean; keyword?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.room_id) searchParams.set('room_id', params.room_id);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.device_type) searchParams.set('device_type', params.device_type);
      if (params?.is_demo !== undefined) searchParams.set('is_demo', String(params.is_demo));
      if (params?.keyword) searchParams.set('keyword', params.keyword);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiFetch<Device[]>(`/api/v1/devices${query}`);
    },
    create: (data: Partial<Device>) =>
      apiFetch<Device>('/api/v1/devices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Device>) =>
      apiFetch<Device>(`/api/v1/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/v1/devices/${id}`, {
        method: 'DELETE',
      }),
    control: (id: string, command: string, params: Record<string, any> = {}) =>
      apiFetch<Device>(`/api/v1/devices/${id}/control`, {
        method: 'POST',
        body: JSON.stringify({ command, params }),
      }),
    seedDemo: () =>
      apiFetch<{ message: string; created_count: number }>('/api/v1/devices/seed-demo', {
        method: 'POST',
      }),
  },
  logs: {
    audit: (limit = 50) => apiFetch<AuditLog[]>(`/api/v1/audit/logs?limit=${limit}`),
    events: (limit = 50) => apiFetch<EventLog[]>(`/api/v1/events?limit=${limit}`),
  },
};
