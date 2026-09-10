/**
 * api.js — API service layer
 * All keys, methods and paths match the actual backend in server.js.
 */

import {
  vehicles as mockVehicles,
  incidents as mockIncidents,
  roads as mockRoads,
  deliveries as mockDeliveries,
  dashboardKPIs,
} from '../data/mockData';

// ─── Config ─────────────────────────────────────────────────────────────────
// In dev: BASE_URL is '' — Vite proxy forwards /api/* to http://localhost:1710
// In production: set VITE_API_URL=https://your-backend.onrender.com
export const BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Token helpers ───────────────────────────────────────────────────────────
export const auth = {
  getToken:     () => localStorage.getItem('sih_token'),
  getUser:      () => { try { return JSON.parse(localStorage.getItem('sih_user') || 'null'); } catch { return null; } },
  setSession:   (token, user) => { localStorage.setItem('sih_token', token); localStorage.setItem('sih_user', JSON.stringify(user)); },
  clearSession: () => { localStorage.removeItem('sih_token'); localStorage.removeItem('sih_user'); },
  isLoggedIn:   () => !!localStorage.getItem('sih_token'),
};

// ─── Base fetch (auto-attaches auth header) ──────────────────────────────────
async function request(path, options = {}) {
  const token = auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    auth.clearSession();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (userId, password, role) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, role }),
    });
    if (data.token && data.user) auth.setSession(data.token, data.user);
    return data;
  },

  logout: () => { auth.clearSession(); window.location.href = '/login'; },

  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe:    () => request('/api/auth/me'),

  // Admin: GET /api/auth/users?role=&status=  →  { users:[...] }
  getPending: async () => {
    const data = await request('/api/auth/users');
    return { data: data.users ?? data.data ?? [] };
  },

  // Admin: get users with optional role/status filters
  getUsers: async (role, status) => {
    let qs = '';
    if (role)   qs += `role=${role}&`;
    if (status) qs += `status=${status}&`;
    const data = await request(`/api/auth/users${qs ? '?' + qs.slice(0, -1) : ''}`);
    return data.users ?? [];
  },

  // Admin: edit user fields
  updateUser: (id, payload) => request(`/api/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Admin: enable/disable account
  setUserStatus: (id, status) => request(`/api/auth/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin: PATCH /api/auth/users/:id/approve|reject
  approve: (id) => request(`/api/auth/users/${id}/approve`, { method: 'PATCH' }),
  reject:  (id) => request(`/api/auth/users/${id}/reject`,  { method: 'PATCH' }),
};

// ─── Vehicles ────────────────────────────────────────────────────────────────
// Backend → { success, vehicles:[...], total }
export const vehiclesAPI = {
  getAll: async () => {
    const data = await request('/api/vehicles');
    return data.vehicles?.length ? data.vehicles : mockVehicles;
  },
  create: (payload) => request('/api/vehicles',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/vehicles/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

// ─── Roads ───────────────────────────────────────────────────────────────────
// Backend → { success, roads:[...], total }
export const roadsAPI = {
  getAll: async () => {
    const data = await request('/api/roads');
    return data.roads?.length ? data.roads : mockRoads;
  },
  create: (payload) => request('/api/roads',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/roads/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/roads/${id}`, { method: 'DELETE' }),
};

// ─── Incidents ───────────────────────────────────────────────────────────────
// Backend → { success, incidents:[...], total }
export const incidentsAPI = {
  getAll: async () => {
    const data = await request('/api/incidents');
    return data.incidents?.length ? data.incidents : mockIncidents;
  },
  create: (payload) => request('/api/incidents',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/incidents/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/incidents/${id}`, { method: 'DELETE' }),
};

// ─── Deliveries ──────────────────────────────────────────────────────────────
// Backend → { success, deliveries:[...], total }
export const deliveriesAPI = {
  getAll: async () => {
    const data = await request('/api/deliveries');
    return data.deliveries?.length ? data.deliveries : mockDeliveries;
  },
  create: (payload) => request('/api/deliveries',       { method: 'POST',  body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
// Backend → { success, alerts:[...], total }
// Returns plain array so Alerts.jsx can call .filter() directly
export const alertsAPI = {
  getAll:      async () => { const d = await request('/api/alerts'); return d.alerts ?? []; },
  create:      (payload) => request('/api/alerts', { method: 'POST', body: JSON.stringify(payload) }),
  acknowledge: (id)      => request(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' }),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get:    ()        => request('/api/settings'),
  update: (payload) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
};

// ─── Landslide risk  GET /api/landslide/risk?lat=&lon= ──────────────────────
export const getLandslideRisk = (lat, lon) => request(`/api/landslide/risk?lat=${lat}&lon=${lon}`);

// ─── Route risk  POST /api/route-risk  { waypoints:[{lat,lon}] } ─────────────
export const getRouteRisk = (points) =>
  request('/api/route-risk', { method: 'POST', body: JSON.stringify({ waypoints: points }) });

// ─── Critical Roads  GET /api/critical-roads ────────────────────────────────
export const getCriticalRoads = () => request('/api/critical-roads');

// ─── Forecast Risk  GET /api/forecast-risk?lat=&lon= ────────────────────────
export const getForecastRisk = (lat, lon) => request(`/api/forecast-risk?lat=${lat}&lon=${lon}`);

// ─── Geocoding ───────────────────────────────────────────────────────────────
export const geocodePlace   = (q)        => request(`/api/geocode?q=${encodeURIComponent(q)}`);
export const reverseGeocode = (lat, lon) => request(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);

// ─── Legacy api object  (Navbar / Dashboard / Alerts use this) ───────────────
export const api = {
  getDashboardData: async () => dashboardKPIs,
  getAlerts:        ()      => alertsAPI.getAll(),   // plain array
  getVehicles:      ()      => vehiclesAPI.getAll(),
  getIncidents:     ()      => incidentsAPI.getAll(),
  getRoads:         ()      => roadsAPI.getAll(),
  getDeliveries:    ()      => deliveriesAPI.getAll(),
  createIncident:   (d)     => incidentsAPI.create(d),
};
