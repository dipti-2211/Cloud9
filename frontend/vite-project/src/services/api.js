/**
 * api.js — Production-ready API service layer
 * All calls hit the real Express backend at port 1710.
 * Mock data is used ONLY as a UI fallback when the backend collection is empty.
 */

import { vehicles as mockVehicles, incidents as mockIncidents, roads as mockRoads, deliveries as mockDeliveries, dashboardKPIs } from '../data/mockData';

// ─── Config ────────────────────────────────────────────────────────────────
export const BASE_URL = 'http://localhost:1710';

// ─── Token helpers ─────────────────────────────────────────────────────────
export const auth = {
  getToken:   ()        => localStorage.getItem('sih_token'),
  getUser:    ()        => { try { return JSON.parse(localStorage.getItem('sih_user') || 'null'); } catch { return null; } },
  setSession: (token, user) => { localStorage.setItem('sih_token', token); localStorage.setItem('sih_user', JSON.stringify(user)); },
  clearSession: ()      => { localStorage.removeItem('sih_token'); localStorage.removeItem('sih_user'); },
  isLoggedIn: ()        => !!localStorage.getItem('sih_token'),
};

// ─── Base fetch with auth header ───────────────────────────────────────────
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

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  /**
   * Login. role: 'admin' | 'officer' | 'driver'
   * Returns { token, user }
   */
  login: async (userId, password, role) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, role }),
    });
    if (data.token && data.user) {
      auth.setSession(data.token, data.user);
    }
    return data;
  },

  logout: () => {
    auth.clearSession();
    window.location.href = '/login';
  },

  /** Register a field officer or vehicle operator (PENDING until admin approves) */
  register: async (payload) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  /** Get current logged-in user profile */
  getMe: () => request('/api/auth/me'),

  /** Admin: list pending approval requests */
  getPending: () => request('/api/auth/pending'),

  /** Admin: approve a user by DB id */
  approve: (id) => request(`/api/auth/approve/${id}`, { method: 'PUT' }),

  /** Admin: reject a user by DB id */
  reject: (id) => request(`/api/auth/reject/${id}`, { method: 'PUT' }),
};

// ─── Vehicles ─────────────────────────────────────────────────────────────
export const vehiclesAPI = {
  getAll: async () => {
    const data = await request('/api/vehicles');
    // If DB is empty, fall back to mock data so UI is never blank
    if (!data.data || data.data.length === 0) return mockVehicles;
    return data.data;
  },
  create: (payload) => request('/api/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/api/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => request(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

// ─── Roads ────────────────────────────────────────────────────────────────
export const roadsAPI = {
  getAll: async () => {
    const data = await request('/api/roads');
    if (!data.data || data.data.length === 0) return mockRoads;
    return data.data;
  },
  create: (payload) => request('/api/roads', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/api/roads/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => request(`/api/roads/${id}`, { method: 'DELETE' }),
};

// ─── Incidents ────────────────────────────────────────────────────────────
export const incidentsAPI = {
  getAll: async () => {
    const data = await request('/api/incidents');
    if (!data.data || data.data.length === 0) return mockIncidents;
    return data.data;
  },
  create: (payload) => request('/api/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/api/incidents/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => request(`/api/incidents/${id}`, { method: 'DELETE' }),
};

// ─── Deliveries ───────────────────────────────────────────────────────────
export const deliveriesAPI = {
  getAll: async () => {
    const data = await request('/api/deliveries');
    if (!data.data || data.data.length === 0) return mockDeliveries;
    return data.data;
  },
  create: (payload) => request('/api/deliveries', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/api/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
};

// ─── Alerts (real-time landslide alerts) ─────────────────────────────────
export const alertsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/api/alerts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // returns plain array
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────
export const settingsAPI = {
  get: () => request('/api/settings'),
  update: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
};

// ─── Landslide risk engine ────────────────────────────────────────────────
export const getLandslideRisk = async (lat, lon) => {
  const res = await fetch(`${BASE_URL}/api/landslide?lat=${lat}&lon=${lon}`);
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

export const getRouteRisk = async (points) => {
  const res = await fetch(`${BASE_URL}/api/route-risk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points }),
  });
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

export const geocodePlace = async (q) => {
  const res = await fetch(`${BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`);
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

// ─── Legacy `api` object (used by Navbar, Dashboard — keep compatible) ────
export const api = {
  getDashboardData: async () => dashboardKPIs,
  getAlerts:        () => alertsAPI.getAll(),
  getVehicles:      () => vehiclesAPI.getAll(),
  getIncidents:     () => incidentsAPI.getAll(),
  getRoads:         () => roadsAPI.getAll(),
  getDeliveries:    () => deliveriesAPI.getAll(),
  createIncident:   (d) => incidentsAPI.create(d),
};